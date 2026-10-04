import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('@polkadot/util-crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@polkadot/util-crypto')>()),
  cryptoWaitReady: async () => true,
  sha256AsU8a: () => new Uint8Array(32),
  blake2AsHex: () => `0x${'1'.repeat(64)}`,
}));
import { of } from 'rxjs';
import { encodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@/lib/substrate/math';
import { createPolkaswapAgentApi, type AgentTradingDependencies } from '@/features/agent-trading/service';
import { assertPrepared } from '@/features/bot-trading/policy';
import { assertTradeFunds, remainingFeeReserveCodec, spendableHoldingCodec } from '@/features/bot-trading/allocation';
import {
  createBotLiveExecutor,
  parseBotReceipt,
  type BotLiveExecutor,
  type BotLiveDependencies,
} from '@/features/bot-trading/live';
import { recordGoalProgress, reserveOrder, settleOrder, type BotStorage } from '@/features/bot-trading/storage';
import { executionBot, executionOrder } from './execution-fixtures';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import type { BotOrder } from '@/features/bot-trading/types';
import { toCodec } from '@/features/bot-trading/amounts';
import {
  advanceDiscoveryCampaign,
  assertDiscoveryMarkLedger,
  createDiscoveryCampaign,
  grantDiscoveryCampaign,
  type DiscoveryCampaignMark,
} from '@/features/bot-trading/campaign';

const clone = <T>(item: T): T => JSON.parse(JSON.stringify(item));
const bots: BotLiveExecutor[] = [];
const event = (section: string, method: string, data: unknown[], index = 0) => ({
  phase: { isApplyExtrinsic: true, asApplyExtrinsic: { toNumber: () => index } },
  event: { section, method, data },
});
const receipts = () => [
  event('xorFee', 'FeeWithdrawn', ['cn-account', XOR.address, '100000000000000000']),
  event('liquidityProxy', 'Exchange', [
    'cn-account',
    '0',
    '0xin',
    '0xout',
    '1000000000000000000',
    '2000000000000000000',
  ]),
  event('system', 'ExtrinsicSuccess', []),
];

/** Exercise the actual prepare service against a mocked SDK; envelopes are never hand-built here. */
function agentHarness(network = '0xgenesis') {
  const bot = executionBot();
  bot.network = network;
  const assets = [bot.assetIn, bot.assetOut, XOR].map((a) => ({
    ...a,
    name: a.symbol,
    type: 'Regular',
    isMintable: true,
    balance: { transferable: '1000000000000000000000' },
  }));
  const settings = { nodeIsConnected: true, blockNumber: 42, isWalletLoaded: true, slippageTolerance: '5' };
  const wallet = {
    address: bot.account,
    source: 'polkadot-js',
    isLoggedIn: true,
    availableWallets: [],
    assets,
    accountAssetsAddressTable: Object.fromEntries(assets.map((a) => [a.address, a])),
    networkFees: { Swap: '100000000000000000' },
  };
  const quote = {
    isAvailable: true,
    liquiditySources: ['XYKPool'],
    quote: () => ({
      dexId: 0,
      result: {
        amount: '2000000000000000000',
        amountWithoutImpact: '2000000000000000000',
        fee: '0',
        rewards: [],
        route: ['0xin', '0xout'],
        distribution: [],
      },
    }),
  };
  const preparePaymentInfo = vi.fn(async (_address: string) => ({
    partialFee: { toString: () => '100000000000000000' },
  }));
  const api = {
    accountPair: { address: bot.account },
    api: {
      genesisHash: bot.network,
      runtimeVersion: { specVersion: 123 },
      tx: { liquidityProxy: { swap: vi.fn(() => ({ paymentInfo: preparePaymentInfo })) } },
    },
    system: { specVersion: 123 },
    formatAddress: (a: string) => a,
    dex: { publicDexes: [{ dexId: 0 }], poolBaseAssetsIds: ['0xin'], baseAssetsIds: ['0xin'] },
    assets: { getAccountAsset: async (a: string) => assets.find((asset) => asset.address === a) },
    swap: {
      update: async () => undefined,
      checkSwap: async () => true,
      getDexesSwapQuoteObservable: () => of(quote),
      getSwapQuoteObservable: () => of(quote),
      getMinMaxValue: (_a: unknown, _b: unknown, _in: string, out: string, _side: boolean, slip: string) =>
        new FPNumber(out).mul(new FPNumber('1').sub(new FPNumber(slip).div(new FPNumber('100')))).toCodecString(),
      getPriceImpact: () => '-1.00',
    },
  };
  const deps = {
    api,
    getSettingsStore: () => settings,
    getWalletStore: () => wallet,
    getAssetsStore: () => ({ assetDataByAddress: (a: string) => assets.find((asset) => asset.address === a) }),
    getWalletProvider: async () => ({}),
    now: () => Date.now(),
    delay: async () => undefined,
  } as unknown as AgentTradingDependencies;
  return { agent: createPolkaswapAgentApi(deps), bot, wallet, settings, preparePaymentInfo };
}
function liveHarness(network?: string) {
  const { agent, bot, wallet, settings, preparePaymentInfo } = agentHarness(network);
  const ledger = { bots: [clone(bot)], orders: [] as BotOrder[] };
  const operations: string[] = [];
  const storage: BotStorage = {
    listBots: vi.fn(async () => clone(ledger.bots)),
    saveGoalProgress: vi.fn(async (id, goal, state) => recordGoalProgress(ledger, id, goal, state)),
    saveBot: vi.fn(async (bot) => {
      ledger.bots = [clone(bot)];
    }),
    deleteBot: vi.fn(),
    listOrders: vi.fn(async () => clone(ledger.orders)),
    allocate: vi.fn(async (b) => {
      ledger.bots = [clone(b)];
    }),
    reserve: vi.fn(async (o, balances) => {
      reserveOrder(ledger, o, balances);
      operations.push('reserve');
    }),
    markSigned: vi.fn(async (id, txHash, signedAtBlock, signedEnvelopeDigest, signedCallHex) => {
      Object.assign(ledger.orders.find((o) => o.id === id)!, {
        status: 'signed', txHash, signedAtBlock, signedEnvelopeDigest, signedCallHex,
      });
      operations.push('persist-hash');
    }),
    markSubmitted: vi.fn(async (id) => {
      ledger.orders.find((o) => o.id === id)!.status = 'submitted';
      operations.push('submitted');
    }),
    settle: vi.fn(async (id, receipt) => {
      settleOrder(ledger, id, receipt);
      operations.push('settle');
    }),
    stopBot: vi.fn(),
  };
  const lock = vi.fn();
  const tx = {
    toHex: () => '0x1234',
    method: { section: 'liquidityProxy', method: 'swap', toHex: () => '0x1234' },
    paymentInfo: vi.fn(async (): Promise<{ partialFee: { toString: () => string } }> => ({
      partialFee: { toString: () => '100000000000000000' },
    })),
    isSigned: true,
    era: { isMortalEra: true, asMortalEra: { period: { toNumber: () => 64 } } },
    signer: { toString: () => bot.account },
    hash: { toHex: () => `0x${'1'.repeat(64)}` },
    send: vi.fn(async (callback) => {
      operations.push('broadcast');
      callback({ status: { isFinalized: true, asFinalized: { toHex: () => `0x${'2'.repeat(64)}` } }, txIndex: 0, events: receipts() });
      return vi.fn();
    }),
  };
  const sign = vi.fn(async () => {
    operations.push('sign');
    return tx;
  });
  const release = vi.fn();
  const overrides = {
    agent,
    market: vi.fn(async () => ({ timestamp: Date.now(), close: '0.5', feeClose: '1' })),
    signer: vi.fn(async () => ({ sign, lock })),
    build: () => tx,
    balances: async () => clone(ledger.bots[0].portfolio.holdings),
    block: vi.fn(async () => 42),
    receipt: vi.fn(async (order, candidate) => candidate ? {
      success: true,
      outputCodec: '2000000000000000000',
      actualFeeCodec: '100000000000000000',
      finalized: {
        blockHash: candidate, blockNumber: 43, extrinsicIndex: 0,
        txHash: order.txHash!, signedEnvelopeDigest: order.signedEnvelopeDigest!,
      },
    } : null),
    acquire: vi.fn(async () => release),
  } as unknown as BotLiveDependencies;
  const executor = createBotLiveExecutor(storage, agent, overrides);
  bots.push(executor);
  return {
    executor,
    storage,
    ledger,
    operations,
    tx,
    sign,
    lock,
    release,
    overrides,
    agent,
    bot,
    wallet,
    settings,
    preparePaymentInfo,
  };
}

/** Run campaign orders against the real ledger reducer with controlled finalized marks. */
function campaignLiveHarness() {
  const network = `0x${'d'.repeat(64)}`;
  const h = liveHarness(network);
  h.wallet.source = 'sora';
  h.bot.status = 'paused';
  h.bot.sessionExpiresAt = 0;
  h.bot.discoveryCampaignId = 'reviewed-campaign';
  h.bot.policy.sessionDurationMs = 14 * 24 * 60 * 60_000;
  h.ledger.bots = [clone(h.bot)];
  const at = Date.now();
  const baseMark: DiscoveryCampaignMark = {
    network,
    blockHash: `0x${'a'.repeat(64)}`,
    blockNumber: 100,
    timestampMs: at - 1000,
    denominator: '1000000000000000000',
    values: { [h.bot.id]: {
      currentOutputCodec: '10000000000000000000',
      holdOutputCodec: '10000000000000000000',
      capitalXorCodec: '11000000000000000000',
    } },
  };
  const campaign = createDiscoveryCampaign(
    h.bot.discoveryCampaignId, h.ledger.bots, baseMark, '12000000000000000000', { [h.bot.id]: '5' }, at
  );
  Object.assign(h.ledger, { campaigns: [campaign] });
  const nextMark = (currentOutputCodec: string, blockNumber = 101): DiscoveryCampaignMark => ({
    ...baseMark,
    blockHash: `0x${(blockNumber % 2 ? 'b' : 'c').repeat(64)}`,
    blockNumber,
    timestampMs: Date.now(),
    values: { [h.bot.id]: {
      currentOutputCodec,
      holdOutputCodec: baseMark.values[h.bot.id].holdOutputCodec,
      capitalXorCodec: '0',
    } },
  });
  h.storage.createCampaign = vi.fn();
  h.storage.listCampaigns = vi.fn(async () => [clone(campaign)]);
  h.storage.grantCampaign = vi.fn(async (_id, now) => {
    grantDiscoveryCampaign(campaign, h.ledger.bots, now);
    return clone(campaign);
  });
  h.storage.pauseCampaign = vi.fn(async () => {
    campaign.status = 'paused';
    delete campaign.grant;
    for (const bot of h.ledger.bots) if (bot.status === 'running') bot.status = 'paused';
  });
  h.storage.closeCampaign = vi.fn();
  h.storage.recordCampaignMark = vi.fn(async (_id, mark, portfolios, admissionOrderId) => {
    assertDiscoveryMarkLedger(campaign, h.ledger.bots, h.ledger.orders, mark, portfolios, admissionOrderId);
    advanceDiscoveryCampaign(campaign, h.ledger.bots, mark, h.ledger.orders);
    return clone(campaign);
  });
  vi.mocked(h.storage.allocate).mockImplementation(async (bot) => {
    h.ledger.bots = h.ledger.bots.map((item) => item.id === bot.id ? clone(bot) : item);
  });
  const campaignMark = vi.fn(async () => nextMark('10000000000000000000'));
  const executor = createBotLiveExecutor(h.storage, h.agent, { ...h.overrides, campaignMark });
  bots.push(executor);
  return { ...h, campaign, campaignMark, executor, nextMark };
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  for (const bot of bots.splice(0)) bot.dispose();
});

describe('scoped live execution', () => {
  it('reserves and accounts for the exact prepared fee when the cached generic fee is too low', async () => {
    const h = liveHarness();
    h.wallet.networkFees.Swap = '1';
    await h.executor.authorize(h.bot, 'password');
    await h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' });
    expect(h.preparePaymentInfo).toHaveBeenCalledWith(h.bot.account);
    expect(h.tx.paymentInfo).toHaveBeenCalledWith(h.bot.account);
    expect(h.tx.paymentInfo).toHaveBeenCalledTimes(2);
    expect(h.storage.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ feeCodec: '100000000000000000' }),
      expect.any(Object)
    );
    expect(h.tx.send).toHaveBeenCalledOnce();
    expect(h.ledger.bots[0].portfolio.feesPaidCodec).toBe('100000000000000000');
  });
  it.each(['over ceiling', 'zero'] as const)('does not broadcast when the signed fee is %s', async (caseName) => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    h.tx.paymentInfo
      .mockResolvedValueOnce({ partialFee: { toString: () => '100000000000000000' } })
      .mockResolvedValueOnce({ partialFee: { toString: () => caseName === 'zero' ? '0' : '1100000000000000000' } });
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.feeBudget'
    );
    expect(h.tx.paymentInfo).toHaveBeenCalledTimes(2);
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.ledger.orders[0].status).toBe('failed');
    expect(h.ledger.orders[0].unbroadcast).toBe(true);
    expect(h.ledger.bots[0].portfolio.feesPaidCodec).toBe('0');
  });
  it('prices the signed envelope rather than trusting the cheaper prepared call', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    const signedPaymentInfo = vi.fn(async () => ({ partialFee: { toString: () => '1100000000000000000' } }));
    const signedSend = vi.fn();
    const signed = { ...h.tx, toHex: () => '0x123456', paymentInfo: signedPaymentInfo, send: signedSend };
    h.sign.mockResolvedValueOnce(signed);
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.feeBudget'
    );
    expect(h.tx.paymentInfo).toHaveBeenCalledOnce();
    expect(signedPaymentInfo).toHaveBeenCalledOnce();
    expect(signedSend).not.toHaveBeenCalled();
    expect(h.ledger.orders[0].unbroadcast).toBe(true);
  });
  it('rechecks the session after an awaited signed-fee estimate', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    h.tx.paymentInfo
      .mockResolvedValueOnce({ partialFee: { toString: () => '100000000000000000' } })
      .mockImplementationOnce(async () => {
        h.settings.blockNumber = 1_000;
        return { partialFee: { toString: () => '100000000000000000' } };
      });
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow();
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.ledger.orders[0].unbroadcast).toBe(true);
  });

  /** 110 peak and 5% drawdown leave a 104.5 floor, independently of the opening 100 value. */
  function withDrawdown(h: ReturnType<typeof liveHarness>, input = '103.6') {
    h.bot.portfolio.holdings['0xin'] = toCodec(input, 18);
    h.bot.portfolio.initial = clone(h.bot.portfolio.holdings);
    h.bot.goal = {
      title: 'Grow the allocation',
      targetReturnPercent: '20',
      maxLossPercent: '5',
      durationMs: 3_600_000,
      lossMetric: 'drawdown',
    };
    const latest = new FPNumber(input, 36).add(new FPNumber('1', 36)).toString();
    h.bot.goalState = {
      startedAt: Date.now(),
      baselineValue: '100',
      peakValue: '110',
      lastValue: latest,
      returnPercent: new FPNumber(latest, 36).sub(new FPNumber('100', 36)).toString(),
      outcome: 'active',
    };
  }

  it.each(['103.6', '103.65'])(
    'rejects projected loss at or below the floor before reserving or signing (%s)',
    async (input) => {
      const h = liveHarness();
      withDrawdown(h, input);
      const portfolio = clone(h.bot.portfolio);
      await h.executor.authorize(h.bot, 'password');
      await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
        'bots.errors.goalTradeCost'
      );
      expect(h.storage.reserve).not.toHaveBeenCalled();
      expect(h.sign).not.toHaveBeenCalled();
      expect(h.tx.send).not.toHaveBeenCalled();
      expect(h.ledger.bots[0].portfolio).toEqual(portfolio);
      expect(h.ledger.bots[0].goalState).toEqual(h.bot.goalState);
    }
  );

  it('admits a representable unit above the floor and retains finalized receipt accounting', async () => {
    const h = liveHarness();
    withDrawdown(h, '103.650000000000000001');
    await h.executor.authorize(h.bot, 'password');
    await h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' });
    expect(h.tx.send).toHaveBeenCalledOnce();
    expect(h.ledger.bots[0].portfolio).toMatchObject({ trades: 1, feesPaidCodec: '100000000000000000' });
    expect(h.ledger.bots[0].portfolio.holdings['0xout']).toBe('2000000000000000000');
    expect(h.overrides.market).toHaveBeenCalledTimes(2);
  });

  it('rejects unaffordable failure fees even when successful minimum output would increase value', async () => {
    const h = liveHarness();
    withDrawdown(h);
    vi.mocked(h.overrides.market).mockImplementation(async () => ({
      timestamp: Date.now(),
      close: '2',
      feeClose: '1',
    }));
    await h.executor.authorize(h.bot, 'password');
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.goalTradeCost'
    );
    expect(h.storage.reserve).not.toHaveBeenCalled();
    expect(h.sign).not.toHaveBeenCalled();
  });

  it.each(['before-sign', 'wallet-prompt', 'before-broadcast'])(
    'rejects a higher durable peak during %s without broadcasting or charging fees',
    async (phase) => {
      const h = liveHarness();
      withDrawdown(h, '103.8');
      await h.executor.authorize(h.bot, 'password');
      const portfolio = clone(h.ledger.bots[0].portfolio);
      const increasePeak = () => {
        h.ledger.bots[0].goalState!.peakValue = '110.2';
      };
      if (phase === 'before-sign')
        vi.mocked(h.overrides.block).mockImplementationOnce(async () => {
          increasePeak();
          return 42;
        });
      if (phase === 'wallet-prompt')
        h.sign.mockImplementationOnce(async () => {
          increasePeak();
          return h.tx;
        });
      if (phase === 'before-broadcast')
        vi.mocked(h.storage.markSubmitted).mockImplementationOnce(async () => {
          increasePeak();
        });
      await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
        'bots.errors.goalTradeCost'
      );
      expect(h.sign).toHaveBeenCalledTimes(phase === 'before-sign' ? 0 : 1);
      expect(h.tx.send).not.toHaveBeenCalled();
      expect(h.ledger.bots[0].portfolio).toEqual(portfolio);
      expect(h.ledger.bots[0].goalState).toMatchObject({ peakValue: '110.2', outcome: 'active', lastValue: '104.8' });
      expect(h.ledger.orders[0].status).toBe('failed');
    }
  );

  it('persists a real market loss during a wallet prompt without inventing a trade', async () => {
    const h = liveHarness();
    withDrawdown(h, '103.8');
    await h.executor.authorize(h.bot, 'password');
    h.sign.mockImplementationOnce(async () => {
      vi.mocked(h.overrides.market).mockImplementation(async () => ({
        timestamp: Date.now(),
        close: '0.5',
        feeClose: '0.5',
      }));
      return h.tx;
    });
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.goalComplete'
    );
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.ledger.bots[0]).toMatchObject({
      status: 'paused',
      goalState: { outcome: 'loss', lastValue: '104.3', peakValue: '110' },
    });
    expect(h.ledger.bots[0].portfolio).toEqual(h.bot.portfolio);
  });

  it('rejects stale admission prices before reservation', async () => {
    const h = liveHarness();
    withDrawdown(h, '103.8');
    vi.mocked(h.overrides.market).mockImplementation(async () => ({
      timestamp: Date.now() - 5_000,
      close: '0.5',
      feeClose: '1',
    }));
    await h.executor.authorize(h.bot, 'password');
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.stale'
    );
    expect(h.storage.reserve).not.toHaveBeenCalled();
    expect(h.sign).not.toHaveBeenCalled();
  });

  it.each([undefined, 'baseline'] as const)(
    'preserves legacy %s goals without additional market admission calls',
    async (lossMetric) => {
      const h = liveHarness();
      withDrawdown(h);
      h.bot.goal!.lossMetric = lossMetric;
      delete h.bot.goalState!.peakValue;
      await h.executor.authorize(h.bot, 'password');
      await h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' });
      expect(h.overrides.market).not.toHaveBeenCalled();
      expect(h.tx.send).toHaveBeenCalledOnce();
    }
  );

  it.each([
    ['before-sign', 'time'],
    ['before-sign', 'block'],
    ['before-broadcast', 'time'],
    ['before-broadcast', 'block'],
  ])('rechecks prepared %s validity after a fresh admission observation crosses its %s limit', async (phase, limit) => {
    const h = liveHarness();
    withDrawdown(h, '103.8');
    let now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    let observations = 0;
    vi.mocked(h.overrides.market).mockImplementation(async () => {
      if (++observations === (phase === 'before-sign' ? 1 : 2)) {
        if (limit === 'time') now += 31_000;
        else h.settings.blockNumber += 10_000;
      }
      return { timestamp: now, close: '0.5', feeClose: '1' };
    });
    try {
      await h.executor.authorize(h.bot, 'password');
      await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
        'bots.errors.intent'
      );
      expect(h.sign).toHaveBeenCalledTimes(phase === 'before-sign' ? 0 : 1);
      expect(h.tx.send).not.toHaveBeenCalled();
      expect(h.ledger.bots[0].portfolio).toEqual(h.bot.portfolio);
    } finally {
      clock.mockRestore();
    }
  });

  it('previews exact available funds minus other active bot budgets without a signer or allocation', async () => {
    const h = liveHarness();
    const other = clone(h.bot);
    other.id = 'other-bot';
    other.status = 'paused';
    other.portfolio.holdings[h.bot.assetIn.address] = '1000000000000000001';
    h.ledger.bots.push(other);
    const budget = await h.executor.previewAllocation(h.bot);
    const input = budget.assets.find((item) => item.asset.address === h.bot.assetIn.address)!;
    expect(input.requiredCodec).toBe(h.bot.portfolio.holdings[h.bot.assetIn.address]);
    expect(input.availableCodec).toBe((BigInt(input.requiredCodec) - 1000000000000000001n).toString());
    expect(budget.sufficient).toBe(false);
    expect(h.overrides.signer).not.toHaveBeenCalled();
    expect(h.overrides.acquire).not.toHaveBeenCalled();
    expect(h.storage.allocate).not.toHaveBeenCalled();
    other.status = 'stopped';
    expect((await h.executor.previewAllocation(h.bot)).sufficient).toBe(true);
  });

  it('accepts actual prepareSwap envelopes including normalized percentage strings, and rejects tampering', async () => {
    const { agent, bot } = agentHarness();
    const proposal = { action: 'buy' as const, amount: '1', reason: 'signal' };
    const prepared = await agent.prepareSwap({
      assetIn: { address: '0xin' },
      assetOut: { address: '0xout' },
      amount: '1',
      slippageTolerance: '5.0',
    });
    await expect(assertPrepared(bot, proposal, prepared, agent.status())).resolves.toBeUndefined();
    const changed = clone(prepared);
    changed.envelope.call.args.assetOut = 'attacker';
    await expect(assertPrepared(bot, proposal, changed, agent.status())).rejects.toThrow('bots.errors.intent');
    const transfer = clone(prepared);
    transfer.envelope.call.sdkCall = 'api.assets.simpleTransfer';
    await expect(assertPrepared(bot, proposal, transfer, agent.status())).rejects.toThrow('bots.errors.intent');
  });
  it('persists the signed hash before any broadcast, then credits actual finalized proceeds', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    await h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' });
    expect(h.operations).toEqual(['reserve', 'sign', 'persist-hash', 'submitted', 'broadcast', 'settle']);
    expect(h.ledger.bots[0].portfolio.holdings['0xout']).toBe('2000000000000000000');
    expect(h.ledger.orders[0].status).toBe('confirmed');
  });
  it('rejects a sale of the output XOR fee reserve before quote preparation, signing, or broadcast', async () => {
    const h = liveHarness();
    h.bot.assetOut = XOR;
    h.bot.policy.maxTradeCodec[XOR.address] = h.bot.policy.feeBudgetCodec;
    const prepare = vi.spyOn(h.agent, 'prepareSwap');
    await h.executor.authorize(h.bot, 'password');
    await expect(h.executor.execute(h.bot, { action: 'sell', amount: '0.1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.balance'
    );
    expect(prepare).not.toHaveBeenCalled();
    expect(h.sign).not.toHaveBeenCalled();
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.ledger.orders).toEqual([]);
  });
  it('rechecks the current protected reserve after a wallet signing prompt and before broadcast', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    h.sign.mockImplementationOnce(async () => {
      h.ledger.bots[0].portfolio.holdings[XOR.address] = '50000000000000000';
      return h.tx;
    });
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.balance'
    );
    expect(h.sign).toHaveBeenCalledTimes(1);
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.ledger.bots[0].portfolio.feesPaidCodec).toBe('0');
  });
  it('stops before broadcast if consent is revoked while the wallet prompt is signing', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    h.sign.mockImplementationOnce(async () => {
      h.executor.stop(h.bot.id);
      return h.tx;
    });
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: '' })).rejects.toThrow(
      'bots.errors.session'
    );
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.lock).toHaveBeenCalled();
    expect(h.ledger.orders[0].status).toBe('failed');
  });
  it('blocks changed wallet, network, and all paper-mode signing', async () => {
    const h = liveHarness();
    await expect(h.executor.authorize({ ...h.bot, mode: 'paper' })).rejects.toThrow('bots.errors.policy');
    expect(h.overrides.signer).not.toHaveBeenCalled();
    await h.executor.authorize(h.bot, 'password');
    h.wallet.address = 'other';
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: '' })).rejects.toThrow(
      'bots.errors.session'
    );
    expect(h.sign).not.toHaveBeenCalled();
  });
  it('does not permit a campaign member to use the ordinary single-bot unlock', async () => {
    const h = liveHarness();
    h.bot.discoveryCampaignId = 'reviewed-campaign';
    h.bot.policy.sessionDurationMs = 14 * 24 * 60 * 60_000;
    await expect(h.executor.authorize(h.bot, 'password')).rejects.toThrow('bots.errors.policy');
    expect(h.overrides.signer).not.toHaveBeenCalled();
    expect(h.storage.allocate).not.toHaveBeenCalled();
  });
  it('shares one decoded wallet grant across two campaign bots until both are stopped', async () => {
    const h = liveHarness();
    const network = `0x${'d'.repeat(64)}`;
    const originalStatus = h.agent.status();
    vi.spyOn(h.agent, 'status').mockImplementation(() => ({
      ...originalStatus,
      wallet: { ...originalStatus.wallet, source: 'sora' },
      node: { ...originalStatus.node, genesisHash: network },
    }));
    h.bot.network = network;
    h.bot.status = 'paused';
    h.bot.sessionExpiresAt = 0;
    h.bot.discoveryCampaignId = 'reviewed-campaign';
    h.bot.policy.sessionDurationMs = 14 * 24 * 60 * 60_000;
    const second = clone(h.bot);
    second.id = 'bot-2';
    h.ledger.bots = [clone(h.bot), second];
    const now = Date.now();
    const campaign = createDiscoveryCampaign('reviewed-campaign', h.ledger.bots, {
      network, blockHash: `0x${'a'.repeat(64)}`, blockNumber: 100,
      timestampMs: now - 1000, denominator: '1000000000000000000',
      values: Object.fromEntries(h.ledger.bots.map((bot) => [bot.id, {
        currentOutputCodec: '10000000000000000000',
        holdOutputCodec: '10000000000000000000',
        capitalXorCodec: '11000000000000000000',
      }])),
    }, '22000000000000000000', { [h.bot.id]: '5', [second.id]: '5' }, now);
    h.storage.createCampaign = vi.fn();
    h.storage.listCampaigns = vi.fn(async () => [clone(campaign)]);
    h.storage.grantCampaign = vi.fn(async (_id, at) => {
      grantDiscoveryCampaign(campaign, h.ledger.bots, at);
      return clone(campaign);
    });
    h.storage.pauseCampaign = vi.fn(async () => { campaign.status = 'paused'; delete campaign.grant; });
    h.storage.closeCampaign = vi.fn();
    h.storage.recordCampaignMark = vi.fn();
    vi.mocked(h.storage.allocate).mockImplementation(async (bot) => {
      h.ledger.bots = h.ledger.bots.map((item) => item.id === bot.id ? clone(bot) : item);
    });
    const executor = createBotLiveExecutor(h.storage, h.agent, {
      ...h.overrides,
      balances: async () => ({ '0xin': '20000000000000000000', '0xout': '0', [XOR.address]: '2000000000000000000' }),
    });
    bots.push(executor);
    await executor.authorizeCampaign(campaign.id, 'password');
    expect(h.overrides.signer).toHaveBeenCalledTimes(1);
    executor.stop(h.bot.id);
    expect(h.lock).not.toHaveBeenCalled();
    const otherTab = createBotLiveExecutor(h.storage, h.agent, h.overrides);
    bots.push(otherTab);
    await otherTab.stopCampaign(campaign.id);
    await vi.waitFor(() => expect(h.lock).toHaveBeenCalledTimes(1));
  });
  it('stops a campaign order before signing when a new finalized mark breaches drawdown', async () => {
    const h = campaignLiveHarness();
    await h.executor.authorizeCampaign(h.campaign.id, 'password');
    // The scheduler has not yet observed block 101; the order admission must.
    h.campaignMark.mockResolvedValueOnce(h.nextMark('9400000000000000000'));
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' }))
      .rejects.toThrow('bots.errors.goalComplete');
    expect(h.storage.recordCampaignMark).toHaveBeenCalledTimes(1);
    expect(h.campaign.progress[h.bot.id].outcome).toBe('loss');
    expect(h.ledger.bots[0].status).toBe('paused');
    expect(h.sign).not.toHaveBeenCalled();
    expect(h.storage.reserve).not.toHaveBeenCalled();
  });
  it('checks drawdown again after signing and cancels the unbroadcast order on a new loss', async () => {
    const h = campaignLiveHarness();
    await h.executor.authorizeCampaign(h.campaign.id, 'password');
    h.campaignMark
      .mockResolvedValueOnce(h.nextMark('10000000000000000000', 101))
      .mockResolvedValueOnce(h.nextMark('9400000000000000000', 102));
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
      'bots.errors.goalComplete'
    );
    expect(h.campaignMark).toHaveBeenCalledTimes(2);
    expect(h.sign).toHaveBeenCalledTimes(1);
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.campaign.progress[h.bot.id].outcome).toBe('loss');
    expect(h.ledger.orders[0].status).toBe('failed');
  });
  it.each(['stale', 'unavailable'] as const)('pauses the campaign without signing when the finalized mark is %s', async (failure) => {
    const h = campaignLiveHarness();
    await h.executor.authorizeCampaign(h.campaign.id, 'password');
    if (failure === 'stale') {
      h.campaignMark.mockResolvedValueOnce({
        ...h.nextMark('10000000000000000000'), timestampMs: Date.now() - 61_000,
      });
    } else h.campaignMark.mockRejectedValueOnce(new Error('bots.errors.stale'));
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: 'signal' }))
      .rejects.toThrow('bots.errors.stale');
    expect(h.storage.pauseCampaign).toHaveBeenCalledWith(h.campaign.id);
    expect(h.campaign.status).toBe('paused');
    expect(h.sign).not.toHaveBeenCalled();
    expect(h.storage.reserve).not.toHaveBeenCalled();
  });
  it('fails closed on signed-hash storage failure and retains uncertain submissions for reconciliation', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    vi.mocked(h.storage.markSigned).mockRejectedValueOnce(new Error('bots.errors.storage'));
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: '' })).rejects.toThrow(
      'bots.errors.storage'
    );
    expect(h.tx.send).not.toHaveBeenCalled();
    await h.executor.authorize(h.ledger.bots[0], 'password');
    h.tx.send.mockRejectedValueOnce(new Error('disconnected'));
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: '' })).rejects.toThrow('disconnected');
    expect(h.ledger.orders[1].status).toBe('submitted');
    await h.executor.reconcile(h.bot);
    expect(h.ledger.orders[1].status).toBe('submitted');
    vi.mocked(h.overrides.receipt).mockResolvedValueOnce({
      success: true,
      outputCodec: '2000000000000000000',
      actualFeeCodec: '100000000000000000',
      finalized: {
        blockHash: `0x${'2'.repeat(64)}`, blockNumber: 43, extrinsicIndex: 0,
        txHash: h.ledger.orders[1].txHash!, signedEnvelopeDigest: h.ledger.orders[1].signedEnvelopeDigest!,
      },
    });
    await h.executor.reconcile(h.bot);
    expect(h.ledger.orders[1].status).toBe('confirmed');
  });
  it('cancels a proven local pre-send submission when the grant is revoked during its durable mark', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    h.storage.cancelUnbroadcastSubmitted = vi.fn(async (id) => {
      const order = h.ledger.orders.find((item) => item.id === id)!;
      order.status = 'signed';
      settleOrder(h.ledger, id, { success: false, outputCodec: '0', actualFeeCodec: '0', unbroadcast: true });
    });
    h.storage.markBroadcastAttempted = vi.fn();
    vi.mocked(h.storage.markSubmitted).mockImplementationOnce(async (id) => {
      h.ledger.orders.find((item) => item.id === id)!.status = 'submitted';
      h.executor.stop(h.bot.id);
    });
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: '' }))
      .rejects.toThrow('bots.errors.session');
    expect(h.tx.send).not.toHaveBeenCalled();
    expect(h.storage.markBroadcastAttempted).not.toHaveBeenCalled();
    expect(h.storage.cancelUnbroadcastSubmitted).toHaveBeenCalledWith(h.ledger.orders[0].id);
    expect(h.ledger.orders[0].status).toBe('failed');
  });
  it('preserves a rejected reservation error and never signs an unreserved order', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    vi.mocked(h.storage.reserve).mockRejectedValueOnce(new Error('bots.errors.balance'));
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: '' })).rejects.toThrow(
      'bots.errors.balance'
    );
    expect(h.sign).not.toHaveBeenCalled();
    expect(h.storage.settle).not.toHaveBeenCalled();
  });
  it('cancels an authorization that was still awaiting wallet access when Stop was pressed', async () => {
    const h = liveHarness();
    vi.mocked(h.overrides.signer).mockImplementationOnce(async () => {
      h.executor.stop(h.bot.id);
      return { sign: h.sign, lock: h.lock } as never;
    });
    await expect(h.executor.authorize(h.bot, 'password')).rejects.toThrow('bots.errors.session');
    expect(h.storage.allocate).not.toHaveBeenCalled();
    expect(h.lock).toHaveBeenCalled();
  });
  it('rejects changed call bytes, and never lets the private signer authorize a transfer', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    h.tx.method.method = 'transfer';
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '1', reason: '' })).rejects.toThrow(
      'bots.errors.intent'
    );
    expect(h.sign).not.toHaveBeenCalled();
    expect(h.tx.send).not.toHaveBeenCalled();
  });
  it('holds one lifetime account lease for multiple bots and rejects another tab before unlocking', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    await h.executor.authorize({ ...h.bot, id: 'bot-2' }, 'password');
    expect(h.overrides.acquire).toHaveBeenCalledTimes(1);
    h.executor.stop(h.bot.id);
    expect(h.release).not.toHaveBeenCalled();
    h.executor.stop('bot-2');
    expect(h.release).toHaveBeenCalledTimes(1);
    vi.mocked(h.overrides.acquire).mockRejectedValueOnce(new Error('bots.errors.busy'));
    await expect(h.executor.authorize(h.bot, 'password')).rejects.toThrow('bots.errors.busy');
    expect(h.overrides.signer).toHaveBeenCalledTimes(2);
  });
  it('holds one lease when the same wallet uses different SS58 prefixes', async () => {
    const h = liveHarness();
    const account69 = encodeAddress(new Uint8Array(32).fill(17), 69);
    const account42 = encodeAddress(new Uint8Array(32).fill(17), 42);
    h.bot.account = account69;
    h.ledger.bots[0].account = account69;
    h.wallet.address = account42;
    await h.executor.authorize(h.bot, 'password');
    await h.executor.authorize({ ...h.bot, id: 'bot-2', account: account42 }, 'password');
    expect(h.overrides.acquire).toHaveBeenCalledTimes(1);
    expect(h.overrides.acquire).toHaveBeenCalledWith(`${h.bot.network}:${account69}`);
    h.executor.stop(h.bot.id);
    expect(h.release).not.toHaveBeenCalled();
    h.executor.stop('bot-2');
    expect(h.release).toHaveBeenCalledTimes(1);
  });
  it('revokes sessions on pagehide but permits a new consent after Safari restores the page', async () => {
    const h = liveHarness();
    await h.executor.authorize(h.bot, 'password');
    window.dispatchEvent(new Event('pagehide'));
    expect(h.lock).toHaveBeenCalled();
    await h.executor.authorize(h.ledger.bots[0], 'password');
    expect(h.overrides.signer).toHaveBeenCalledTimes(2);
  });
});

describe('finalized event accounting', () => {
  it('settles deferred native XOR fees once after gross XOR output while protecting the unspent reserve', () => {
    const bot = executionBot();
    bot.assetIn = KUSD;
    bot.assetOut = XOR;
    bot.policy.maxTradeCodec = { [KUSD.address]: '10000000000000000000', [XOR.address]: '1000000000000000000' };
    bot.portfolio.initial = { [KUSD.address]: '10000000000000000000', [XOR.address]: '1000000000000000000' };
    bot.portfolio.holdings = { ...bot.portfolio.initial };
    const order = {
      ...executionOrder(),
      inputAsset: KUSD.address,
      inputCodec: '3000000000000000000',
      outputAsset: XOR.address,
      minOutputCodec: '220000000000000000',
    };
    const ledger = { bots: [bot], orders: [] as BotOrder[] };
    reserveOrder(ledger, order, bot.portfolio.holdings);
    const settlement = parseBotReceipt(order, [
      event('liquidityProxy', 'Exchange', [
        bot.account, '0', KUSD.address, XOR.address, order.inputCodec, '230000000000000000',
      ]),
      // SORA's non-wip event contains account and fee; this fee may follow dispatch.
      event('xorFee', 'FeeWithdrawn', [bot.account, '91000000000000000']),
      event('transactionPayment', 'TransactionFeePaid', [bot.account, '91000000000000000', '0']),
      event('system', 'ExtrinsicSuccess', []),
    ], 0);
    expect(settlement).toEqual({ success: true, outputCodec: '230000000000000000', actualFeeCodec: '91000000000000000' });
    settleOrder(ledger, order.id, settlement);
    expect(bot.portfolio.holdings).toEqual({ [KUSD.address]: '7000000000000000000', [XOR.address]: '1139000000000000000' });
    expect(bot.portfolio.feesPaidCodec).toBe('91000000000000000');
    expect(bot.portfolio.trades).toBe(1);
    expect(remainingFeeReserveCodec(bot)).toBe('909000000000000000');
    expect(spendableHoldingCodec(bot, XOR.address)).toBe('230000000000000000');
    expect(() => assertTradeFunds(bot, XOR.address, '230000000000000001')).toThrow('bots.errors.balance');
    const settled = clone(ledger);
    settleOrder(ledger, order.id, settlement);
    expect(ledger).toEqual(settled);
  });
  it('checks caller, pair, input, fee asset, and extrinsic phase before crediting proceeds', () => {
    const order = executionOrder();
    expect(parseBotReceipt(order, receipts(), 0)).toEqual({
      success: true,
      outputCodec: '2000000000000000000',
      actualFeeCodec: '100000000000000000',
    });
    expect(() => parseBotReceipt(order, receipts(), 1)).toThrow('bots.errors.receipt');
    const wrong = receipts();
    wrong[1].event.data[0] = 'other';
    expect(() => parseBotReceipt(order, wrong, 0)).toThrow('bots.errors.receipt');
    expect(() => parseBotReceipt(order, receipts().slice(1), 0)).toThrow('bots.errors.receipt');
  });
  it('accounts for failed extrinsic fees without manufacturing swap output', () => {
    expect(parseBotReceipt(executionOrder(), [receipts()[0], event('system', 'ExtrinsicFailed', [])], 0)).toEqual({
      success: false,
      outputCodec: '0',
      actualFeeCodec: '100000000000000000',
    });
  });
});

describe('explicit protocol boundary before legacy execution', () => {
  it.each([{ goalExecution: null }, { goalExecution: undefined }, { exactGoalState: null }])(
    'rejects an explicit marker before preview, wallet access or a legacy order',
    async (marker) => {
      const h = liveHarness();
      const supplied = { ...h.bot, ...marker };
      await expect(h.executor.previewAllocation(supplied)).rejects.toThrow('bots.errors.policy');
      await expect(h.executor.authorize(supplied, 'password')).rejects.toThrow('bots.errors.policy');
      await expect(h.executor.execute(supplied, { action: 'buy', amount: '1', reason: 'signal' })).rejects.toThrow(
        'bots.errors.policy'
      );
      expect(h.overrides.signer).not.toHaveBeenCalled();
      expect(h.storage.allocate).not.toHaveBeenCalled();
      expect(h.storage.reserve).not.toHaveBeenCalled();
      expect(h.storage.saveBot).not.toHaveBeenCalled();
      expect(h.tx.send).not.toHaveBeenCalled();
    }
  );

  it('does not let a caller strip the stored protocol marker before wallet authorization', async () => {
    const h = liveHarness();
    Object.assign(h.ledger.bots[0], { goalExecution: { protocol: 'finalized-xyk-goal-v1' } });
    await expect(h.executor.authorize(h.bot, 'password')).rejects.toThrow('bots.errors.policy');
    await expect(h.executor.reconcile(h.bot)).rejects.toThrow('bots.errors.policy');
    expect(h.overrides.signer).not.toHaveBeenCalled();
    expect(h.overrides.receipt).not.toHaveBeenCalled();
    expect(h.storage.allocate).not.toHaveBeenCalled();
  });

  it('cannot reconcile a new-protocol pending order through legacy estimated accounting', async () => {
    const h = liveHarness();
    h.ledger.orders.push({ ...executionOrder(), goalExecution: null } as BotOrder);
    await expect(h.executor.reconcile(h.bot)).rejects.toThrow('bots.errors.policy');
    expect(h.overrides.receipt).not.toHaveBeenCalled();
    expect(h.storage.settle).not.toHaveBeenCalled();
    expect(h.release).toHaveBeenCalledOnce();
  });
});

describe('continued live runs', () => {
  it('keeps the saved end of a continued run and never extends it past a fresh grant', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const h = liveHarness();
      const fresh = now + h.bot.policy.sessionDurationMs;
      await h.executor.authorize(h.bot, 'password', { endsAt: now + 600_000 });
      expect(h.ledger.bots[0].sessionExpiresAt).toBe(now + 600_000);
      h.executor.stop(h.bot.id);
      await h.executor.authorize(h.bot, 'password', { endsAt: fresh + 86_400_000 });
      expect(h.ledger.bots[0].sessionExpiresAt).toBe(fresh);
      h.executor.stop(h.bot.id);
      // Without an end, a start is a new run of the reviewed length.
      await h.executor.authorize(h.bot, 'password');
      expect(h.ledger.bots[0].sessionExpiresAt).toBe(fresh);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('refuses a run whose saved end has passed before any wallet access', async () => {
    const h = liveHarness();
    for (const endsAt of [Date.now() - 1, Number.NaN]) {
      await expect(h.executor.authorize(h.bot, 'password', { endsAt })).rejects.toThrow('bots.errors.session');
    }
    expect(h.overrides.signer).not.toHaveBeenCalled();
    expect(h.storage.allocate).not.toHaveBeenCalled();
    expect(h.release).toHaveBeenCalled();
  });
});
