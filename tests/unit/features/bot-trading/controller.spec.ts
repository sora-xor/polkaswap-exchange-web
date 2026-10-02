import { createQuantBot } from '@/features/bot-trading/quant-deploy';
import { generateQuantCandidates, type QuantMarketResult } from '@/features/bot-trading/quant-loop';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBotTradingController,
  createBotDefinition,
  createPaperBotFromTemplate,
  checkedStudiedDiscoveryLimits,
  livePriceSmaCandles,
  readPublicWalletTransferableBalance,
  validateBotDefinition,
} from '@/features/bot-trading/controller';
import type {
  BotDefinition,
  BotGoal,
  BotGoalState,
  BotHistory,
  BotResearchSnapshot,
} from '@/features/bot-trading/types';
import { botFixture } from './fixtures';
import { goalHistoryFixture } from './goal-history.fixture';
import { goalStorageBot, goalStorageOrder } from './goal-storage-fixtures';
import { executionBot, executionOrder } from './execution-fixtures';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import * as assetConstants from '@/lib/substrate/sdk/assets/consts';
import { createPlaygroundBot, PLAYGROUND_DEFAULT_SETTINGS } from '@/features/bot-trading/playground';
import { toCodec } from '@/features/bot-trading/amounts';
import { copyExperimentDefinition, type ExperimentRun } from '@/features/bot-trading/experiments';
import { copyStoredExperiment } from '@/features/bot-trading/experiment-storage';
import { createResearchBot, RESEARCH_DEFAULT_SETTINGS, runResearch } from '@/features/bot-trading/research';
import { recordGoalProgress } from '@/features/bot-trading/storage';
import {
  createGoalResearchBinding,
  summarizeGoalEpisodes,
  type GoalEpisodeEvidence,
  type GoalResearchEvidence,
  type GoalResearchSnapshot,
} from '@/features/bot-trading/goal-research';

vi.mock('@polkadot/util-crypto', async (original) => ({
  ...(await original<typeof import('@polkadot/util-crypto')>()),
  decodeAddress: () => new Uint8Array(),
  cryptoWaitReady: async () => true,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { signer: null } }));
vi.mock('@/features/agent-trading', () => ({ installPolkaswapAgentApi: vi.fn() }));
vi.mock('@/features/bot-trading/live', () => ({ createBotLiveExecutor: vi.fn() }));
vi.mock('@/features/bot-trading/history', () => ({ fetchBotHistory: vi.fn() }));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
/** Completed study fixture with an explicit observed price; new unpriced templates cannot be saved. */
function createTestedPlaygroundBot(...args: Parameters<typeof createPlaygroundBot>): BotDefinition {
  const bot = createPlaygroundBot(...args);
  bot.strategy.threshold = '1.9';
  bot.policy.maxTradeCodec[bot.assetOut.address] = toCodec('50', bot.assetOut.decimals);
  return bot;
}
/** A completed, bounded report with metrics kept separate from newly allocated capital. */
function researchSnapshot(source: BotResearchSnapshot['source'] = 'historical'): BotResearchSnapshot {
  return {
    version: 1,
    source,
    testedAt: 900_000,
    startAt: 100_000,
    endAt: 800_000,
    coverage: 0.95,
    validation: 'holdout',
    trainPercent: 70,
    folds: 3,
    optimized: true,
    returnPercent: '12.34567890123456789',
    drawdownPercent: '4.2',
    trades: 12,
    networkFeeXor: '0.0007',
    swapFeePercent: '0.6',
    sellNetworkFeeXor: '0.100020612589707326',
    sellSwapFeePercent: '0.7',
    feeObservation: {
      blockNumber: 27_642_604,
      blockHash: `0x${'1'.repeat(64)}`,
      genesisHash: `0x${'2'.repeat(64)}`,
      endpoint: 'wss://ws.mof.sora.org',
      queriedAt: 800_000,
      finalizedAt: 100_000,
      amountIn: '10',
      sellAmountIn: '0.5',
    },
  };
}
function harness(initial = botFixture()) {
  let saved: BotDefinition[] = [clone(initial)];
  let now = 1_000_000;
  const status = {
    wallet: { connected: true, address: 'account', source: 'internal' },
    node: { connected: true, genesisHash: 'genesis' },
  };
  const quote = {
    assetIn: initial.assetIn,
    assetOut: initial.assetOut,
    request: { side: 'input', slippageTolerance: '0.5' },
    amountIn: '1',
    amountInMeta: { codec: '100' },
    amountOut: '0.41',
    minMaxCodec: '40',
    priceImpact: '1',
  };
  const agent = {
    status: () => status,
    assets: vi.fn(async () => []),
    ready: vi.fn(async () => status),
    prepareSwap: vi.fn(),
    executeSwap: vi.fn(),
    planSwap: vi.fn(async (_request?: unknown) => ({
      quote,
      expiresAt: now + 10_000,
      warnings: [],
      fees: [{ asset: initial.assetIn, amountCodec: '10', source: 'static' }],
    })),
  };
  const storage = {
    listBots: vi.fn(async () => clone(saved)),
    listOrders: vi.fn(async (_id: string) => [] as import('@/features/bot-trading/types').BotOrder[]),
    saveBot: vi.fn(async (bot: BotDefinition) => {
      saved = saved.filter((b) => b.id !== bot.id).concat(clone(bot));
    }),
    saveGoalProgress: vi.fn(async (id: string, goal: BotGoal, state: BotGoalState) =>
      recordGoalProgress({ bots: saved, orders: [] }, id, goal, state)
    ),
    stopBot: vi.fn(async (id: string) => {
      saved.find((b) => b.id === id)!.status = 'stopped';
    }),
    deleteBot: vi.fn(async (id: string) => {
      saved = saved.filter((b) => b.id !== id);
    }),
  };
  const live = {
    previewAllocation: vi.fn(async () => ({ sufficient: true, assets: [] })),
    authorize: vi.fn(async (bot: BotDefinition) => {
      bot.status = 'running';
      bot.sessionExpiresAt = now + 3_600_000;
      await storage.saveBot(bot);
    }),
    execute: vi.fn(),
    reconcile: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  };
  const readAssetBalance = vi.fn(
    async (address: string): Promise<string> => (address === XOR.address ? '250' : '1000')
  );
  const deps = {
    agent,
    storage,
    live,
    history: vi.fn(async () => ({
      candles: [{ timestamp: now - 1000, close: '2' }],
      missing: 0,
      denominationVerified: true,
    })),
    market: vi.fn(async () => ({ timestamp: now, close: '2' })),
    identity: vi.fn(async () => ({
      key: 'test',
      genesisHash: 'genesis',
      currentDenominator: '1',
      assertCurrent: () => undefined,
    })),
    ai: vi.fn(),
    now: () => now,
    isExternal: () => false,
    readAssetBalance,
  };
  const controller = createBotTradingController(deps as unknown as Parameters<typeof createBotTradingController>[0]);
  return {
    controller,
    agent,
    live,
    readAssetBalance,
    storage,
    deps,
    saved: () => saved,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
let controllers: ReturnType<typeof createBotTradingController>[] = [];
beforeEach(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
afterEach(() => {
  controllers.forEach((c) => c.dispose());
  controllers = [];
  vi.restoreAllMocks();
});
const make = (bot?: BotDefinition) => {
  const h = harness(bot);
  controllers.push(h.controller);
  return h;
};

describe('explicit goal protocol cannot fall through legacy controller paths', () => {
  it('binds live campaign allocation, order ceiling and XOR reserve to studied codec values', () => {
    const bot = executionBot();
    const values = { allocation: '10', orderLimit: '10', feeBudgetXor: '1' };
    expect(checkedStudiedDiscoveryLimits(bot, values)).toEqual({
      allocation: '10000000000000000000',
      orderLimit: '10000000000000000000',
      fee: '1000000000000000000',
    });
    for (const changed of [
      { ...values, allocation: '11' },
      { ...values, orderLimit: '9' },
      { ...values, feeBudgetXor: '2' },
    ])
      expect(() => checkedStudiedDiscoveryLimits(bot, changed)).toThrow('bots.errors.research');
    bot.assetIn = XOR;
    bot.portfolio.initial[XOR.address] = '11000000000000000000';
    bot.policy.maxTradeCodec[XOR.address] = '10000000000000000000';
    expect(checkedStudiedDiscoveryLimits(bot, values).allocation).toBe('10000000000000000000');
  });

  it('reads only an existing campaign’s persisted orders without accessing a signer', async () => {
    const h = make();
    const botId = h.saved()[0].id;
    Object.assign(h.storage, {
      createCampaign: vi.fn(),
      listCampaigns: vi.fn(async () => [{ id: 'campaign-1', botIds: [botId] }]),
      grantCampaign: vi.fn(),
      pauseCampaign: vi.fn(),
      closeCampaign: vi.fn(),
      recordCampaignMark: vi.fn(),
    });
    const included = { ...executionOrder(), botId };
    vi.mocked(h.storage.listOrders).mockResolvedValue([included, { ...included, id: 'other', botId: 'other-bot' }]);
    expect(await h.controller.readDiscoveryCampaignOrders('campaign-1')).toEqual([included]);
    await expect(h.controller.readDiscoveryCampaignOrders('missing')).rejects.toThrow('bots.errors.policy');
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });

  it('revokes a whole campaign before its atomic allocation release', async () => {
    const h = make();
    const botId = h.saved()[0].id;
    const stopCampaign = vi.fn(async () => undefined);
    const closeCampaign = vi.fn(async () => undefined);
    Object.assign(h.live, { stopCampaign });
    Object.assign(h.storage, {
      createCampaign: vi.fn(),
      listCampaigns: vi.fn(async () => [
        {
          id: 'campaign-1',
          botIds: [botId],
          account: 'account',
          network: 'genesis',
          status: 'paused',
        },
      ]),
      grantCampaign: vi.fn(),
      pauseCampaign: vi.fn(),
      closeCampaign,
      recordCampaignMark: vi.fn(),
    });
    const closing = h.controller.closeDiscoveryCampaign('campaign-1');
    expect(stopCampaign).toHaveBeenCalledWith('campaign-1');
    await closing;
    expect(closeCampaign).toHaveBeenCalledWith('campaign-1');
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  it('reads a setup funding hint from the current wallet without authorizing a trade', async () => {
    const h = make();
    const balances = await h.controller.readWalletFunding(VAL.address);
    expect(balances).toEqual({ assetInAddress: VAL.address, assetInCodec: '1000', xorCodec: '250' });
    expect(h.readAssetBalance).toHaveBeenCalledTimes(2);
    expect(h.readAssetBalance).toHaveBeenCalledWith(VAL.address, 'account', VAL.decimals);
    expect(h.readAssetBalance).toHaveBeenCalledWith(XOR.address, 'account', XOR.decimals);
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    await expect(h.controller.readWalletFunding('unlisted')).rejects.toThrow('bots.errors.wallet');
  });

  it('reads transferable balances from the public chain while the SDK account is absent', async () => {
    const codecValue = (value: string) => ({ toJSON: () => value, toString: () => value });
    const chain = {
      isConnected: true,
      query: {
        tokens: {
          accounts: vi.fn(async () => ({
            free: codecValue('1000000000000000001'),
            reserved: codecValue('0'),
            frozen: codecValue('1'),
          })),
        },
        system: {
          account: vi.fn(async () => ({
            data: { free: codecValue('250'), reserved: codecValue('0'), frozen: codecValue('0') },
          })),
        },
        referrals: { referrerBalances: vi.fn(async () => ({ isEmpty: true })) },
      },
    } as unknown as Parameters<typeof readPublicWalletTransferableBalance>[0];

    expect(await readPublicWalletTransferableBalance(chain, 'account', VAL.address, VAL.decimals)).toBe(
      '1000000000000000000'
    );
    expect(await readPublicWalletTransferableBalance(chain, 'account', XOR.address, XOR.decimals)).toBe('250');
    expect(chain.query.tokens.accounts).toHaveBeenCalledWith('account', VAL.address);
    expect(chain.query.system.account).toHaveBeenCalledWith('account');
    expect(chain.query.referrals.referrerBalances).toHaveBeenCalledWith('account');
  });

  it('discards a funding read after the wallet identity changes', async () => {
    const h = make();
    let finish!: (value: string) => void;
    h.readAssetBalance.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        })
    );
    const pending = h.controller.readWalletFunding(XOR.address);
    h.agent.status().wallet.address = 'other-account';
    finish('250');
    await expect(pending).rejects.toThrow('bots.errors.session');
    expect(h.readAssetBalance).toHaveBeenCalledTimes(1);
  });

  it('reads exact order evidence without authorizing, reconciling, trading or writing', async () => {
    const bot = goalStorageBot();
    const h = harness(bot);
    const order = goalStorageOrder(bot);
    h.storage.listOrders.mockResolvedValue([order]);
    expect(await h.controller.readGoalOrders(bot.id)).toEqual([order]);
    expect(h.storage.listOrders).toHaveBeenCalledWith(bot.id);
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.reconcile).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.agent.executeSwap).not.toHaveBeenCalled();
    const legacy = harness();
    await expect(legacy.controller.readGoalOrders(botFixture().id)).rejects.toThrow('bots.errors.config');
    expect(legacy.storage.listOrders).not.toHaveBeenCalled();
  });

  it.each([{ goalExecution: null }, { goalExecution: undefined }, { exactGoalState: null }])(
    'rejects protocol markers before legacy validation or template reconstruction',
    (marker) => {
      const bot = { ...botFixture(), ...marker };
      expect(() => validateBotDefinition(bot)).toThrow('bots.errors.policy');
      expect(() => createPaperBotFromTemplate(bot, [], 1000)).toThrow('bots.errors.policy');
    }
  );
  it('rejects new-protocol startup before legacy price reads or wallet authorization', async () => {
    const h = make({ ...botFixture(), goalExecution: { protocol: 'finalized-xyk-goal-v1' } } as BotDefinition);
    await expect(h.controller.startBot(h.saved()[0].id, { password: 'password' })).rejects.toThrow(
      'bots.errors.policy'
    );
    expect(h.deps.market).not.toHaveBeenCalled();
    expect(h.live.reconcile).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.storage.saveGoalProgress).not.toHaveBeenCalled();
  });
});

describe('goal episode live preparation', () => {
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;
  const START = Date.UTC(2026, 8, 1);
  const NOW = START + 168 * HOUR;
  const genesisHash = `0x${'4'.repeat(64)}`;
  const denomination = { genesisHash, denominator: '1' };
  const inputAsset = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
  const outputAsset = { address: `0x0200${'0'.repeat(60)}`, symbol: 'XOR', decimals: 18 };
  const costs = {
    networkFeeXor: '0.01',
    sellNetworkFeeXor: '0.02',
    swapFeePercent: '0.6',
    sellSwapFeePercent: '0.7',
    priceImpactPercent: '1',
    sellPriceImpactPercent: '2',
  };

  beforeEach(() => {
    // Canonical IDs are required by evidence validation; other controller fixtures keep their shared stub IDs.
    vi.spyOn(assetConstants, 'XOR', 'get').mockReturnValue({ ...XOR, ...outputAsset });
  });

  /** Synthetic public arithmetic exercises the live boundary; these rows claim no observed market result. */
  function fixture() {
    const template = botFixture();
    template.assetIn = { ...inputAsset };
    template.assetOut = { ...outputAsset };
    template.strategy.amount = '5';
    template.strategy.intervalMs = DAY;
    template.policy.feeAsset = { ...outputAsset };
    template.policy.feeBudgetCodec = toCodec('1', 18);
    template.policy.maxTradeCodec = {
      [inputAsset.address]: toCodec('5', 18),
      [outputAsset.address]: toCodec('0.625', 18),
    };
    template.portfolio.initial = {
      [inputAsset.address]: toCodec('10', 18),
      [outputAsset.address]: toCodec('1', 18),
    };
    template.portfolio.holdings = { ...template.portfolio.initial };
    template.goal = {
      title: 'Grow XOR',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: DAY,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    };
    const row = (startAt: number, traded: boolean): GoalEpisodeEvidence => ({
      startAt,
      endAt: startAt + DAY,
      initialValue: '100',
      finalValue: traded ? '101' : '100',
      heldFinalValue: '100',
      returnPercent: traded ? '1' : '0',
      drawdownPercent: traded ? '0.5' : '0',
      trades: traded ? 1 : 0,
      coverage: 1,
      outcome: 'expired',
    });
    const evidence: GoalResearchEvidence = {
      protocol: 'goal-episodes-v2',
      aggregation: 'mean-net-return',
      goal: { ...template.goal },
      binding: createGoalResearchBinding(template, costs),
      training: {
        startAt: START,
        endAt: START + 116 * HOUR,
        tailCandles: 20,
        episodes: Array.from({ length: 4 }, (_, index) => row(START + index * DAY, index === 0)),
      },
      validation: {
        startAt: START + 118 * HOUR,
        endAt: START + 167 * HOUR,
        tailCandles: 1,
        episodes: Array.from({ length: 2 }, (_, index) => row(START + (118 + 24 * index) * HOUR, index === 0)),
      },
    };
    const all = summarizeGoalEpisodes([...evidence.training.episodes, ...evidence.validation.episodes]);
    const test = summarizeGoalEpisodes(evidence.validation.episodes);
    const research: GoalResearchSnapshot = {
      version: 1,
      source: 'historical',
      testedAt: NOW,
      startAt: START,
      endAt: START + 167 * HOUR,
      coverage: 1,
      validation: 'holdout',
      trainPercent: 70,
      folds: 2,
      optimized: true,
      returnPercent: all.returnPercent,
      drawdownPercent: all.drawdownPercent,
      trades: all.trades,
      valuationAsset: 'output',
      ...costs,
      qualification: {
        candidates: 3,
        startAt: evidence.validation.episodes[0].startAt,
        endAt: evidence.validation.episodes.at(-1)!.endAt,
        returnPercent: test.returnPercent,
        drawdownPercent: test.drawdownPercent,
        trades: test.trades,
        coverage: 1,
      },
      feeObservation: {
        blockNumber: 1,
        blockHash: `0x${'3'.repeat(64)}`,
        genesisHash,
        endpoint: 'wss://controller-test.invalid',
        queriedAt: NOW,
        finalizedAt: NOW,
        amountIn: '5',
        sellAmountIn: '0.625',
      },
      goalEpisodes: evidence,
    };
    const h = make();
    h.advance(NOW - h.deps.now());
    h.controller.assets.value = [{ ...inputAsset }, { ...outputAsset }];
    h.agent.status().node.genesisHash = genesisHash;
    h.deps.identity.mockResolvedValue({
      key: 'goal-test',
      genesisHash,
      currentDenominator: '1',
      assertCurrent: () => undefined,
    });
    h.deps.market.mockResolvedValue({ timestamp: NOW, close: '100' });
    return { h, template, research };
  }

  it('preserves detached episode metadata and the exact training cap despite a changed live quote', async () => {
    const { h, template, research } = fixture();
    const original = clone(research);
    expect(research.qualification!.trades).toBe(1);
    const prepared = await h.controller.prepareLiveBot(template, research, denomination);
    expect(prepared.research).toEqual(original);
    expect(prepared.research).not.toBe(research);
    expect((prepared.research as GoalResearchSnapshot).goalEpisodes).not.toBe(research.goalEpisodes);
    expect(prepared.policy.maxTradeCodec[outputAsset.address]).toBe(toCodec('0.625', 18));
    expect(prepared.policy.maxTradeCodec[outputAsset.address]).not.toBe(toCodec('0.1', 18));
    expect(prepared.portfolio.initial).toEqual(template.portfolio.initial);
    expect(prepared).toMatchObject({ mode: 'live', status: 'idle', sessionExpiresAt: 0 });
    expect(prepared).not.toHaveProperty('goalState');
    expect(h.deps.market).toHaveBeenCalledOnce();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.agent.prepareSwap).not.toHaveBeenCalled();
    research.goalEpisodes!.validation.episodes[0].finalValue = '999';
    template.policy.maxTradeCodec[outputAsset.address] = '1';
    await h.controller.saveLiveBot(prepared);
    expect(h.saved().at(-1)!.research).toEqual(original);
    expect(h.saved().at(-1)!.policy.maxTradeCodec[outputAsset.address]).toBe(toCodec('0.625', 18));
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });

  /** Add synthetic, integrity-bound context while retaining all existing allocation and episode dates. */
  function warmedFixture() {
    const value = fixture();
    value.research.goalEpisodes = {
      ...value.research.goalEpisodes!,
      protocol: 'goal-episodes-v3',
      history: goalHistoryFixture(value.template, START - HOUR).history.goalHistory,
    };
    return value;
  }

  it('preserves the complete v3 history receipt through prepare, save and live start', async () => {
    const { h, template, research } = warmedFixture();
    await h.controller.tick();
    const original = clone(research);
    const prepared = await h.controller.prepareLiveBot(template, research, denomination);
    expect(prepared.research).toEqual(original);
    expect((prepared.research as GoalResearchSnapshot).goalEpisodes).not.toBe(research.goalEpisodes);
    await h.controller.saveLiveBot(prepared);
    await h.controller.startBot(prepared.id);
    expect(h.live.authorize).toHaveBeenCalledOnce();
    expect(h.saved().at(-1)!.research).toEqual(original);
    expect(h.saved().at(-1)!.network).toBe(genesisHash);
  });

  it.each(['genesisHash', 'denominator'] as const)(
    'rejects a v3 review whose supplied %s differs from its retained study',
    async (field) => {
      const { h, template, research } = warmedFixture();
      const different = { ...denomination, [field]: field === 'denominator' ? '2' : `0x${'9'.repeat(64)}` };
      await expect(h.controller.prepareLiveBot(template, research, different)).rejects.toThrow(
        'bots.errors.denomination'
      );
      expect(h.agent.ready).not.toHaveBeenCalled();
      expect(h.deps.market).not.toHaveBeenCalled();
      expect(h.live.authorize).not.toHaveBeenCalled();
    }
  );

  it('rejects a paper-to-live v3 bot on a different network before reconciliation or authorization', async () => {
    const { h, template, research } = warmedFixture();
    await h.controller.tick();
    const prepared = await h.controller.prepareLiveBot(template, research, denomination);
    const paper = { ...prepared, mode: 'paper' as const, network: 'paper', account: 'paper' };
    await h.storage.saveBot(paper);
    await h.controller.updateBot({ ...paper, mode: 'live' });
    h.agent.status().node.genesisHash = `0x${'9'.repeat(64)}`;
    await expect(h.controller.startBot(paper.id)).rejects.toThrow('bots.errors.config');
    expect(h.live.reconcile).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  it('rechecks a saved v3 study denomination at live start even without a transient review', async () => {
    const { h, template, research } = warmedFixture();
    await h.controller.tick();
    const prepared = await h.controller.prepareLiveBot(template, research, denomination);
    await h.controller.saveLiveBot(prepared);
    h.deps.identity.mockResolvedValue({
      key: 'goal-test',
      genesisHash,
      currentDenominator: '2',
      assertCurrent: () => undefined,
    });
    await expect(h.controller.startBot(prepared.id)).rejects.toThrow('bots.errors.denomination');
    expect(h.live.reconcile).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  it('rejects v1 qualification from USD-derived history before any live handoff', async () => {
    const { h, template, research } = fixture();
    Object.assign(research.goalEpisodes!, { protocol: 'goal-episodes-v1' });
    await expect(h.controller.prepareLiveBot(template, research, denomination)).rejects.toThrow('bots.errors.config');
    expect(h.deps.market).not.toHaveBeenCalled();
    expect(h.agent.ready).not.toHaveBeenCalled();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });

  it.each(['goal', 'strategy', 'capital', 'reserve', 'maxPriceImpact', 'feeQuoteAmount', 'outputCap'])(
    'rejects modified %s before checking a live quote or creating a review',
    async (field) => {
      const { h, template, research } = fixture();
      if (field === 'goal') template.goal!.targetReturnPercent = '6';
      if (field === 'strategy') template.strategy.intervalMs = 12 * HOUR;
      if (field === 'capital') template.portfolio.initial[inputAsset.address] = toCodec('9', 18);
      if (field === 'reserve') {
        template.policy.feeBudgetCodec = toCodec('2', 18);
        template.portfolio.initial[outputAsset.address] = toCodec('2', 18);
      }
      if (field === 'maxPriceImpact') template.policy.maxPriceImpactPercent = '4';
      if (field === 'feeQuoteAmount') research.feeObservation!.amountIn = '4';
      if (field === 'outputCap') template.policy.maxTradeCodec[outputAsset.address] = toCodec('0.626', 18);
      await expect(h.controller.prepareLiveBot(template, research, denomination)).rejects.toThrow('bots.errors.config');
      expect(h.deps.market).not.toHaveBeenCalled();
      expect(h.agent.ready).not.toHaveBeenCalled();
      expect(h.storage.saveBot).not.toHaveBeenCalled();
      expect(h.live.authorize).not.toHaveBeenCalled();
      expect(h.live.execute).not.toHaveBeenCalled();
    }
  );

  it.each([1, 4])('still rejects legacy qualification with %i fills and no episode protocol', async (trades) => {
    const { h, template, research } = fixture();
    delete research.goalEpisodes;
    research.qualification!.trades = trades;
    await expect(h.controller.prepareLiveBot(template, research, denomination)).rejects.toThrow('bots.errors.config');
    expect(h.deps.market).not.toHaveBeenCalled();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  /** Start a qualified review with separate completed signal closes and current executable market observations. */
  async function startWithSignals(strategy: Partial<BotDefinition['strategy']> = {}, offset = 0) {
    const setup = fixture();
    const { h, template, research } = setup;
    Object.assign(template.strategy, { intervalMs: HOUR, ...strategy });
    research.goalEpisodes!.binding = createGoalResearchBinding(template, costs);
    h.advance(offset);
    await h.controller.tick();
    h.deps.history.mockImplementation(async () => {
      const boundary = Math.floor(h.deps.now() / HOUR) * HOUR;
      return {
        candles: [-2, -1, 0].map((hour) => ({ timestamp: boundary + hour * HOUR, close: '11' })),
        missing: 0,
        denominationVerified: true,
      };
    });
    h.deps.market.mockImplementation(async () => ({ timestamp: h.deps.now(), close: '9' }));
    h.live.authorize.mockImplementation(async (bot: BotDefinition) => {
      bot.status = 'running';
      bot.sessionExpiresAt = h.deps.now() + bot.policy.sessionDurationMs;
      await h.storage.saveBot(bot);
    });
    const prepared = await h.controller.prepareLiveBot(template, research, denomination);
    await h.controller.saveLiveBot(prepared);
    await h.controller.startBot(prepared.id);
    return { ...setup, prepared };
  }

  it('uses the completed threshold close, never an intrahour crossing from the live quote', async () => {
    const { h, prepared } = await startWithSignals({ kind: 'threshold', threshold: '10', direction: 'below' });
    await h.controller.tick();
    expect(h.deps.history).toHaveBeenCalledWith(expect.anything(), { days: 14, interval: 'hour', basis: 'xor-pool' });
    expect(h.saved().find((bot) => bot.id === prepared.id)!.state.lastEvaluatedAt).toBe(NOW);
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    h.advance(60_000);
    await h.controller.tick();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.saved().find((bot) => bot.id === prepared.id)!.status).toBe('running');
  });

  it('refetches an unready hourly close after an explicit restart in the same hour', async () => {
    const { h, prepared } = await startWithSignals({ kind: 'threshold', threshold: '10', direction: 'below' });
    const candles = [-2, -1, 0].map((hour) => ({ timestamp: NOW + hour * HOUR, close: '11' }));
    h.deps.history.mockResolvedValueOnce({ candles: candles.slice(0, -1), missing: 0, denominationVerified: true });

    await h.controller.tick();
    expect(h.deps.history).toHaveBeenCalledOnce();
    expect(h.saved().find((bot) => bot.id === prepared.id)!).toMatchObject({
      status: 'attention',
      state: { lastEvaluatedAt: 0 },
    });
    expect(h.controller.sessionActiveIds.value).not.toContain(prepared.id);
    expect(h.controller.error.value).toBe('bots.errors.stale');
    expect(h.live.execute).not.toHaveBeenCalled();

    h.deps.history.mockResolvedValue({ candles, missing: 0, denominationVerified: true });
    h.advance(60_000);
    await h.controller.startBot(prepared.id);
    await h.controller.tick();
    expect(h.deps.history).toHaveBeenCalledTimes(2);
    expect(h.saved().find((bot) => bot.id === prepared.id)!).toMatchObject({
      status: 'running',
      state: { lastEvaluatedAt: NOW },
    });

    h.advance(60_000);
    await h.controller.tick();
    expect(h.deps.history).toHaveBeenCalledTimes(2);
    expect(h.saved().find((bot) => bot.id === prepared.id)!.status).toBe('running');
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.agent.planSwap).not.toHaveBeenCalled();
  });

  it('consumes a DCA signal once per hour even without a fill and across pause/restart', async () => {
    const { h, prepared } = await startWithSignals();
    // A no-fill executor leaves lastTradeAt unchanged; consuming the signal must not rely on a cooldown.
    await h.controller.tick();
    expect(h.live.execute).toHaveBeenCalledOnce();
    h.advance(60_000);
    await h.controller.tick();
    expect(h.live.execute).toHaveBeenCalledOnce();
    await h.controller.pauseBot(prepared.id);
    await h.controller.startBot(prepared.id);
    await h.controller.tick();
    expect(h.live.execute).toHaveBeenCalledOnce();
    for (let minute = 1; minute < 60; minute++) {
      h.advance(60_000);
      await h.controller.tick();
    }
    expect(h.live.execute).toHaveBeenCalledTimes(2);
    expect(h.saved().find((bot) => bot.id === prepared.id)!.state).toMatchObject({
      lastEvaluatedAt: NOW + HOUR,
      lastTradeAt: 0,
    });
  });

  it('keeps the actual fill cooldown when block cadence is faster and does not retry a consumed hour', async () => {
    const { h, prepared } = await startWithSignals({}, 30 * 60_000);
    h.live.execute.mockImplementation(async (bot: BotDefinition) => {
      bot.state.lastTradeAt = h.deps.now();
      bot.portfolio.trades++;
      await h.storage.saveBot(bot);
    });
    await h.controller.tick(1);
    expect(h.live.execute).toHaveBeenCalledOnce();
    const firstFill = NOW + 30 * 60_000;
    for (let minute = 1; minute <= 60; minute++) {
      h.advance(60_000);
      await h.controller.tick(1 + minute * 100);
    }
    const waiting = h.saved().find((bot) => bot.id === prepared.id)!;
    expect(waiting.state).toMatchObject({ lastEvaluatedAt: NOW + HOUR, lastTradeAt: firstFill });
    expect(h.live.execute).toHaveBeenCalledOnce();
    for (let minute = 61; minute <= 90; minute++) {
      h.advance(60_000);
      await h.controller.tick(1 + minute * 100);
    }
    expect(h.live.execute).toHaveBeenCalledTimes(2);
    expect(h.saved().find((bot) => bot.id === prepared.id)!.state.lastTradeAt).toBe(NOW + 2 * HOUR);
  });

  it('continues fresh goal valuation and stops on drawdown without a new signal hour', async () => {
    const { h, prepared } = await startWithSignals();
    await h.controller.tick();
    expect(h.live.execute).toHaveBeenCalledOnce();
    h.deps.market.mockImplementation(async () => ({ timestamp: h.deps.now(), close: '12' }));
    h.advance(60_000);
    await h.controller.tick();
    const stopped = h.saved().find((bot) => bot.id === prepared.id)!;
    expect(stopped).toMatchObject({ status: 'paused', goalState: { outcome: 'loss' } });
    expect(stopped.state.lastEvaluatedAt).toBe(NOW);
    expect(h.live.execute).toHaveBeenCalledOnce();
    expect(h.controller.sessionActiveIds.value).not.toContain(prepared.id);
  });

  it.each(['stale', 'future', 'forming', 'window-gap'] as const)(
    'rejects %s signal history before execution',
    async (fault) => {
      const { h, prepared } = await startWithSignals(
        fault === 'window-gap' ? { kind: 'sma', fastWindow: 2, slowWindow: 3, signalTiming: 'closed-hour' } : {},
        15 * 60_000
      );
      const candles = [-2, -1, 0].map((hour) => ({ timestamp: NOW + hour * HOUR, close: '11' }));
      if (fault === 'stale') candles.pop();
      if (fault === 'future') candles.push({ timestamp: NOW + HOUR, close: '9' });
      if (fault === 'forming') candles.push({ timestamp: NOW + 10 * 60_000, close: '9' });
      if (fault === 'window-gap') candles[0].timestamp -= HOUR;
      h.deps.history.mockResolvedValue({ candles, missing: 0, denominationVerified: true });
      await h.controller.tick();
      expect(h.saved().find((bot) => bot.id === prepared.id)!.status).toBe('attention');
      expect(h.controller.error.value).toBe(fault === 'stale' ? 'bots.errors.stale' : 'bots.errors.history');
      expect(h.live.execute).not.toHaveBeenCalled();
      expect(h.agent.planSwap).not.toHaveBeenCalled();
    }
  );
});

describe('goal bot orchestration', () => {
  const goal = { title: 'Grow my capital', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 3_600_000 };
  const goalBot = () => {
    const bot = botFixture();
    bot.goal = { ...goal };
    bot.strategy.kind = 'ai';
    bot.provider = 'jev';
    bot.portfolio.holdings = { in: '5000', out: '2500' };
    return bot;
  };
  const connect = async (h: ReturnType<typeof make>) => {
    const client = {
      propose: vi.fn(async () => ({
        proposal: { action: 'hold', amount: '0', reason: 'No signal' },
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      })),
      disconnect: vi.fn(),
    };
    h.deps.ai.mockReturnValue(client);
    await h.controller.connectProvider('bot-1', { apiKey: 'test-only', model: 'jev', endpoint: '' });
    return client;
  };

  it('creates a paper Jev goal without starting a session or granting authority', () => {
    const bot = createBotDefinition(
      {
        name: 'Goal bot',
        assetInAddress: XOR.address,
        assetOutAddress: VAL.address,
        allocation: '100',
        feeBudget: '1',
        strategyKind: 'dca',
        goal,
      },
      [XOR, VAL],
      1000
    );
    expect(bot).toMatchObject({ mode: 'paper', provider: 'jev', status: 'idle', strategy: { kind: 'ai' }, goal });
    expect(bot.goalState).toBeUndefined();
    expect(() => validateBotDefinition(bot)).not.toThrow();
  });

  it.each([
    { price: '2.2', outcome: 'target' },
    { price: '1.88', outcome: 'loss' },
  ])('pauses on $outcome before requesting a decision or executable quote', async ({ price, outcome }) => {
    const h = make(goalBot());
    const client = await connect(h);
    await h.controller.startBot('bot-1');
    h.deps.market.mockImplementation(async () => ({ timestamp: h.deps.now(), close: price }));
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({ status: 'paused', goalState: { outcome, baselineValue: '100' } });
    expect(client.propose).not.toHaveBeenCalled();
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.live.stop).toHaveBeenCalledWith('bot-1');
    expect(h.saved()[0].portfolio.holdings).toEqual({ in: '5000', out: '2500' });
    await expect(h.controller.startBot('bot-1')).rejects.toThrow('bots.errors.goalComplete');
  });

  it('revokes a drawdown session before another decision while the portfolio remains above opening value', async () => {
    const bot = goalBot();
    bot.goal = { ...bot.goal!, targetReturnPercent: '20', maxLossPercent: '5', lossMetric: 'drawdown' };
    const h = make(bot);
    const client = await connect(h);
    client.propose.mockResolvedValue({
      proposal: { action: 'hold', amount: '0', reason: 'No signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await h.controller.startBot('bot-1');
    h.deps.market.mockImplementation(async () => ({ timestamp: h.deps.now(), close: '2.4' }));
    await h.controller.tick();
    expect(h.saved()[0].goalState).toMatchObject({ baselineValue: '100', peakValue: '110', outcome: 'active' });
    h.advance(60_000);
    h.deps.market.mockImplementation(async () => ({ timestamp: h.deps.now(), close: '2.136' }));
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'paused',
      goalState: { baselineValue: '100', peakValue: '110', lastValue: '103.4', returnPercent: '3.4', outcome: 'loss' },
    });
    expect(client.propose).toHaveBeenCalledOnce();
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.live.stop).toHaveBeenCalledWith('bot-1');
    expect(h.saved()[0].portfolio.holdings).toEqual(bot.portfolio.holdings);
  });

  it('preserves the goal baseline and original horizon on pause, resume, reload and bounded chart changes', async () => {
    const h = make(goalBot());
    await connect(h);
    await h.controller.startBot('bot-1');
    const original = clone(h.saved()[0].goalState);
    await h.controller.pauseBot('bot-1');
    h.advance(1000);
    await h.controller.startBot('bot-1');
    expect(h.saved()[0].goalState).toEqual(original);
    const restored = clone(h.saved()[0]);
    restored.equity = Array.from({ length: 1000 }, (_, timestamp) => ({ timestamp, value: '900', benchmark: '900' }));
    const other = make(restored);
    await other.controller.pauseBot('bot-1');
    await connect(other);
    await other.controller.startBot('bot-1');
    expect(other.saved()[0].goalState).toEqual(original);
  });

  it('checks expiry before market data and does not replay an expired goal after restart', async () => {
    const bot = goalBot();
    bot.goalState = { startedAt: 1, baselineValue: '100', lastValue: '100', returnPercent: '0', outcome: 'active' };
    const h = make(bot);
    h.advance(3_600_001 - h.deps.now());
    await expect(h.controller.startBot('bot-1')).rejects.toThrow('bots.errors.goalComplete');
    expect(h.deps.market).not.toHaveBeenCalled();
    expect(h.agent.ready).not.toHaveBeenCalled();
    expect(h.saved()[0].goalState).toMatchObject({ startedAt: 1, outcome: 'expired' });
    await h.controller.resetGoal('bot-1');
    expect(h.saved()[0].goalState).toBeUndefined();
    expect(h.saved()[0].portfolio.holdings).toEqual(bot.portfolio.holdings);
  });

  it('discards a model response when the goal deadline passes during its request', async () => {
    const bot = goalBot();
    bot.goalState = { startedAt: 1, baselineValue: '100', lastValue: '100', returnPercent: '0', outcome: 'active' };
    const h = make(bot);
    h.advance(3_599_001 - h.deps.now());
    // A maintenance tick records that the browser is awake before the explicit start.
    await h.controller.tick();
    const client = await connect(h);
    let finish!: (value: Awaited<ReturnType<typeof client.propose>>) => void;
    client.propose.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await h.controller.startBot('bot-1');
    const pending = h.controller.tick();
    await vi.waitFor(() => expect(client.propose).toHaveBeenCalled());
    h.advance(1000);
    finish({
      proposal: { action: 'buy', amount: '1', reason: 'Signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await pending;
    expect(h.saved()[0]).toMatchObject({ status: 'paused', goalState: { outcome: 'expired' } });
    expect(h.agent.planSwap).not.toHaveBeenCalled();
  });

  it('ignores submitted runtime edits and resets progress only when the approved goal changes', async () => {
    const h = make(goalBot());
    await connect(h);
    await h.controller.startBot('bot-1');
    await h.controller.pauseBot('bot-1');
    const edited = clone(h.saved()[0]);
    const original = clone(edited.goalState);
    delete edited.goalState;
    edited.name = 'Same goal';
    await h.controller.updateBot(edited);
    expect(h.saved()[0].goalState).toEqual(original);
    edited.goal!.targetReturnPercent = '6';
    await h.controller.updateBot(edited);
    expect(h.saved()[0].goalState).toBeUndefined();
  });

  it('refreshes market value after the model response and pauses if its price has crossed the loss threshold', async () => {
    const h = make(goalBot());
    const client = await connect(h);
    await h.controller.startBot('bot-1');
    client.propose.mockImplementation(async () => {
      h.advance(10_000);
      h.deps.market.mockImplementation(async () => ({ timestamp: h.deps.now(), close: '1.8' }));
      return {
        proposal: { action: 'buy', amount: '1', reason: 'Signal' },
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });
    await h.controller.tick();
    expect(client.propose).toHaveBeenCalledOnce();
    expect(h.saved()[0]).toMatchObject({ status: 'paused', goalState: { outcome: 'loss', returnPercent: '-5' } });
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });

  it('persists paper fills and fees before a resulting loss threshold pauses the goal', async () => {
    const bot = goalBot();
    bot.goal!.maxLossPercent = '0.3';
    const h = make(bot);
    const client = await connect(h);
    client.propose.mockResolvedValue({
      proposal: { action: 'buy', amount: '1', reason: 'Signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'paused',
      portfolio: { holdings: { in: '4890', out: '2540' }, trades: 1, feesPaidCodec: '10' },
      goalState: { outcome: 'loss', baselineValue: '100', lastValue: '99.7', returnPercent: '-0.3' },
    });
    expect(h.saved()[0].equity.at(-1)?.value).toBe('99.7');
    expect(h.saved()[0].activity.some((activity) => activity.kind === 'trade')).toBe(true);
    expect(h.saved()[0].activity[0].message).toBe('bots.goals.events.loss');
    await expect(h.controller.startBot('bot-1')).rejects.toThrow('bots.errors.goalComplete');
  });

  it('rejects known paper costs at the drawdown boundary without recording a realized loss or fill', async () => {
    const bot = goalBot();
    bot.goal = { ...bot.goal!, maxLossPercent: '0.3', lossMetric: 'drawdown' };
    const h = make(bot);
    const client = await connect(h);
    client.propose.mockResolvedValue({
      proposal: { action: 'buy', amount: '1', reason: 'Signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'attention',
      portfolio: { holdings: bot.portfolio.holdings, trades: 0, feesPaidCodec: '0' },
      goalState: { outcome: 'active', baselineValue: '100', peakValue: '100', lastValue: '100', returnPercent: '0' },
    });
    expect(h.saved()[0].activity[0].message).toBe('bots.errors.goalTradeCost');
    expect(h.saved()[0].activity.some((item) => item.kind === 'trade')).toBe(false);
  });

  it('does not overwrite concurrent paper inventory changed during the admission price read', async () => {
    const bot = goalBot();
    bot.goal = { ...bot.goal!, lossMetric: 'drawdown' };
    const h = make(bot);
    const client = await connect(h);
    client.propose.mockResolvedValue({
      proposal: { action: 'buy', amount: '1', reason: 'Signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await h.controller.startBot('bot-1');
    let reads = 0;
    h.deps.market.mockImplementation(async () => {
      if (++reads === 3) h.saved()[0].portfolio.holdings.in = '4999';
      return { timestamp: h.deps.now(), close: '2' };
    });
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'attention',
      portfolio: { holdings: { in: '4999', out: '2500' }, trades: 0, feesPaidCodec: '0' },
    });
    expect(h.saved()[0].activity[0].message).toBe('bots.errors.stale');
  });

  it('rejects a paper plan that expires during the admission observation', async () => {
    const bot = goalBot();
    bot.goal = { ...bot.goal!, lossMetric: 'drawdown' };
    const h = make(bot);
    const client = await connect(h);
    client.propose.mockResolvedValue({
      proposal: { action: 'buy', amount: '1', reason: 'Signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await h.controller.startBot('bot-1');
    let reads = 0;
    h.deps.market.mockImplementation(async () => {
      if (++reads === 3) h.advance(10_000);
      return { timestamp: h.deps.now(), close: '2' };
    });
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'attention',
      portfolio: { holdings: bot.portfolio.holdings, trades: 0, feesPaidCodec: '0' },
    });
    expect(h.saved()[0].activity[0].message).toBe('bots.errors.quote');
  });

  it('updates active goal return after a fill and retains it if the post-fill price read fails', async () => {
    const h = make(goalBot());
    const client = await connect(h);
    client.propose.mockResolvedValue({
      proposal: { action: 'buy', amount: '1', reason: 'Signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'running',
      goalState: { outcome: 'active', returnPercent: '-0.3', lastValue: '99.7' },
    });
    h.advance(60_000);
    let observations = 0;
    h.deps.market.mockImplementation(async () => {
      if (++observations === 3) throw new Error('bots.errors.quote');
      return { timestamp: h.deps.now(), close: '2' };
    });
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'attention',
      portfolio: { holdings: { in: '4780', out: '2580' }, trades: 2, feesPaidCodec: '20' },
    });
  });

  it('records finalized live proceeds before expiring a goal whose deadline passes during settlement', async () => {
    const bot = goalBot();
    bot.mode = 'live';
    bot.goalState = { startedAt: 1, baselineValue: '100', lastValue: '100', returnPercent: '0', outcome: 'active' };
    const h = make(bot);
    h.advance(3_599_001 - h.deps.now());
    await h.controller.tick();
    const client = await connect(h);
    client.propose.mockResolvedValue({
      proposal: { action: 'buy', amount: '1', reason: 'Signal' },
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    h.live.execute.mockImplementation(async () => {
      const finalized = h.saved()[0];
      finalized.portfolio.holdings = { in: '4890', out: '2540' };
      finalized.portfolio.trades = 1;
      finalized.portfolio.feesPaidCodec = '10';
      h.advance(1500);
    });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0]).toMatchObject({
      status: 'paused',
      portfolio: { holdings: { in: '4890', out: '2540' }, trades: 1, feesPaidCodec: '10' },
      goalState: { outcome: 'expired', lastValue: '99.7', returnPercent: '-0.3' },
    });
    expect(h.saved()[0].equity.at(-1)?.value).toBe('99.7');
  });
});

describe('browser bot orchestration', () => {
  it.each(['rules', 'sma'] as const)(
    'retains exact %s settings through a completed saved study, copy and paper promotion',
    (kind) => {
      const now = 70 * 3_600_000;
      const settings = {
        ...RESEARCH_DEFAULT_SETTINGS,
        preset: kind === 'sma' ? ('sma' as const) : RESEARCH_DEFAULT_SETTINGS.preset,
        historyStartAt: undefined,
        networkFeeXor: '0.1',
        swapFeePercent: '0',
        sellNetworkFeeXor: '0.1',
        sellSwapFeePercent: '0',
      };
      const strategy = createResearchBot(settings, [XOR, VAL], now).strategy;
      strategy.kind = kind;
      if (kind === 'rules')
        strategy.rules = {
          version: 1,
          entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
          exit: { operator: 'any', conditions: [{ kind: 'breakout', window: 3, direction: 'below' }] },
        };
      else {
        strategy.signalTiming = 'live-price';
        // Preserve the first observed study price in the otherwise unused legacy trigger carrier.
        strategy.threshold = '1';
      }
      const result = runResearch(
        settings,
        [XOR, VAL],
        {
          kind: 'historical',
          history: {
            candles: Array.from({ length: 70 }, (_, index) => ({
              timestamp: (index + 1) * 3_600_000,
              close: String(index + 1),
            })),
            missing: 0,
            denominationVerified: true,
            identity: { genesisHash: 'genesis', denominator: '1' },
          },
        },
        now,
        { strategy }
      );
      const run: ExperimentRun = {
        id: 'roundtrip',
        name: 'Exact rules',
        settings,
        strategy,
        result,
        status: 'complete',
        progress: 1,
        createdAt: now,
        fees: {
          networkFeeXor: '0.1',
          networkFeeCodec: toCodec('0.1', 18),
          swapFeePercent: '0',
          sellNetworkFeeXor: '0.1',
          sellNetworkFeeCodec: toCodec('0.1', 18),
          sellSwapFeePercent: '0',
          priceImpactPercent: '0',
          sellPriceImpactPercent: '0',
          queriedAt: now,
          expiresAt: now + 60000,
          blockNumber: 1,
          blockHash: 'hash',
          genesisHash: 'genesis',
          endpoint: 'wss://research-test.invalid',
          denominator: '1',
          amountIn: strategy.amount,
          amountOut: '1',
          sellAmountIn: '1',
          sellAmountOut: '1',
          assetInAddress: XOR.address,
          assetOutAddress: VAL.address,
          dexId: 0,
          route: [XOR.address, VAL.address],
          routeFees: [],
          sellDexId: 0,
          sellRoute: [VAL.address, XOR.address],
          sellRouteFees: [],
        },
      };
      const stored = copyStoredExperiment(run);
      const copied = copyExperimentDefinition({ ...stored, id: 'roundtrip-copy' });
      const paper = createPaperBotFromTemplate(stored.result!.bot, [XOR, VAL], now + 1);
      expect(paper.strategy).toEqual(copied.strategy);
      expect(paper.state).toEqual({ lastEvaluatedAt: 0, lastTradeAt: 0 });
      expect(paper.portfolio.trades).toBe(0);
      if (kind === 'rules') {
        copied.strategy!.rules!.entry.conditions[0].window = 10;
        expect(paper.strategy.rules!.entry.conditions[0].window).toBe(2);
        expect(stored.result!.bot.strategy.rules!.entry.conditions[0].window).toBe(2);
      } else {
        expect(paper.strategy.signalTiming).toBe('live-price');
        copied.strategy!.signalTiming = 'closed-hour';
        expect(stored.result!.bot.strategy.signalTiming).toBe('live-price');
        expect(paper.strategy.signalTiming).toBe('live-price');
      }
    }
  );

  it('promotes exact researched rules with detached conditions and no replay observation state', () => {
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS }, [XOR, VAL], 1);
    template.strategy.kind = 'rules';
    template.strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: null,
    };
    template.state.lastRuleObservationAt = 50;
    template.goal = { title: 'Grow', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 86400000 };
    const fresh = createPaperBotFromTemplate(template, [XOR, VAL], 2);
    expect(fresh.strategy.rules).toEqual(template.strategy.rules);
    expect(fresh.strategy.rules!.entry.conditions[0]).not.toBe(template.strategy.rules.entry.conditions[0]);
    expect(fresh.state.lastRuleObservationAt).toBeUndefined();
    expect(fresh.portfolio.trades).toBe(0);
    expect(fresh.strategy.kind).toBe('rules');
    expect(fresh.goal).toEqual(template.goal);
    expect(fresh.goal).not.toBe(template.goal);
    expect(fresh.goalState).toBeUndefined();
  });

  it('resets consumed rule observations only when the strategy changes', async () => {
    const bot = botFixture();
    bot.strategy.kind = 'rules';
    bot.strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: null,
    };
    bot.state.lastRuleObservationAt = 900_000;
    bot.research = researchSnapshot();
    bot.createdAt = 1_000_000;
    const h = make(bot);
    await h.controller.updateBot({ ...bot, name: 'Renamed' });
    expect(h.saved()[0].state.lastRuleObservationAt).toBe(900_000);
    expect(h.saved()[0].research).toEqual(bot.research);
    const edited = clone(h.saved()[0]);
    edited.strategy.rules!.entry.conditions[0].window = 3;
    await h.controller.updateBot(edited);
    expect(h.saved()[0].state.lastRuleObservationAt).toBeUndefined();
    expect(h.saved()[0].research).toBeUndefined();
  });

  it('removes stale research attribution when execution limits change', async () => {
    const bot = botFixture();
    bot.research = researchSnapshot();
    bot.createdAt = 1_000_000;
    const h = make(bot);
    const edited = clone(bot);
    edited.policy.slippagePercent = '0.7';
    await h.controller.updateBot(edited);
    expect(h.saved()[0].research).toBeUndefined();
  });

  it('uses completed hourly rule history and ignores repeated quotes of the same close', async () => {
    const bot = botFixture();
    bot.strategy.kind = 'rules';
    bot.strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: null,
    };
    const h = make(bot);
    h.deps.history.mockResolvedValue({
      candles: [
        { timestamp: 998000, close: '1' },
        { timestamp: 999000, close: '3' },
      ],
      missing: 0,
      denominationVerified: true,
    });
    h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '1' });
    await h.controller.startBot(bot.id);
    await h.controller.tick();
    expect(h.deps.history).toHaveBeenCalledWith(expect.anything(), { days: 14, interval: 'hour' });
    expect(h.saved()[0].state.lastRuleObservationAt).toBe(999000);
    expect(h.saved()[0].portfolio.trades).toBe(1);
    h.advance(60_000);
    await h.controller.tick();
    expect(h.agent.planSwap).toHaveBeenCalledTimes(1);
    expect(h.live.execute).not.toHaveBeenCalled();
  });

  /** A transient study identity is revalidated independently from the historical summary. */
  function liveStudy() {
    const snapshot = researchSnapshot();
    delete snapshot.feeObservation;
    return snapshot;
  }
  const studyIdentity = { genesisHash: 'genesis', denominator: '1' };

  it('turns a Quant Loop template into a valid paper bot and live draft', async () => {
    const h = make();
    h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.02' });
    const candidate = generateQuantCandidates().find((item) => item.id === 'reversion:48/15/10:3')!;
    const market = {
      asset: { address: VAL.address, symbol: VAL.symbol, decimals: VAL.decimals },
      status: 'deploy',
      medianXorDepth: 29,
      folds: [],
      walkForward: {
        startAt: 0,
        endAt: 1,
        returnPercent: '43.49',
        drawdownPercent: '33.72',
        trades: 37,
        priceChangePercent: '60.04',
        equity: [{ timestamp: 1, value: '10', price: '0.02' }],
        fills: [],
        cadence: { episodes: 1, daysPerEpisode: 20, holdHours: { min: 26, max: 164 }, lastEntryAt: 0 },
      },
      final: {
        candidate,
        robust: 1,
        train: { returnPercent: '1', drawdownPercent: '1', trades: 1, maxImpactPercent: '14.06' },
      },
    } as QuantMarketResult;
    const template = createQuantBot(market, [XOR, VAL], 'VAL liquidity harvester', 1);
    const research = { ...liveStudy(), validation: 'walk-forward' as const, trainPercent: 50, folds: 4 };
    await h.controller.createPaperBot(template, { research });
    const paper = h.saved().at(-1)!;
    expect(paper).toMatchObject({ mode: 'paper', status: 'idle', name: 'VAL liquidity harvester' });
    expect(paper.strategy.rules).toEqual(candidate.rules);
    expect(paper.policy.maxPriceImpactPercent).toBe('16');
    const draft = await h.controller.prepareLiveBot(template, research, studyIdentity, {
      sessionDurationMs: 7 * 86_400_000,
    });
    expect(draft).toMatchObject({ mode: 'live', extendedSession: true });
    expect(draft.policy.sessionDurationMs).toBe(7 * 86_400_000);
    expect(draft.policy.maxTradeCodec[VAL.address]).toBe(toCodec('500', VAL.decimals));
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  describe('extended live sessions', () => {
    const DAY = 86_400_000;
    /** A reviewed walk-forward rule study, as the Quant Loop produces it. */
    function walkForward() {
      const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS, preset: 'dca' }, [XOR, VAL], 1);
      template.strategy = {
        ...template.strategy,
        kind: 'rules',
        threshold: '',
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 48, direction: 'below', threshold: '-15' }],
          },
          exit: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 48, direction: 'above', threshold: '10' }],
          },
        },
      };
      return {
        template,
        research: { ...liveStudy(), validation: 'walk-forward' as const, trainPercent: 50, folds: 4 },
      };
    }

    it.each([1, 3, 7, 14])('grants a reviewed walk-forward rule study a %s-day session', async (days) => {
      const h = make();
      h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.02' });
      const { template, research } = walkForward();
      const prepared = await h.controller.prepareLiveBot(template, research, studyIdentity, {
        sessionDurationMs: days * DAY,
      });
      expect(prepared.policy.sessionDurationMs).toBe(days * DAY);
      if (days > 1) expect(prepared.extendedSession).toBe(true);
      else expect(prepared).not.toHaveProperty('extendedSession');
      await h.controller.saveLiveBot(prepared);
      expect(h.saved().at(-1)!.policy.sessionDurationMs).toBe(days * DAY);
      expect(h.live.authorize).not.toHaveBeenCalled();
    });

    it('keeps the one-day default and rejects sessions outside the reviewed bounds', async () => {
      const h = make();
      h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.02' });
      const { template, research } = walkForward();
      const standard = await h.controller.prepareLiveBot(template, research, studyIdentity);
      expect(standard.policy.sessionDurationMs).toBe(DAY);
      expect(standard).not.toHaveProperty('extendedSession');
      for (const sessionDurationMs of [15 * DAY, 30 * 60_000, 1.5, Number.NaN]) {
        await expect(
          h.controller.prepareLiveBot(template, research, studyIdentity, { sessionDurationMs })
        ).rejects.toThrow('bots.errors.policy');
      }
      // Longer than a day needs both a rule strategy and walk-forward evidence.
      const threshold = createTestedPlaygroundBot(
        { ...PLAYGROUND_DEFAULT_SETTINGS, preset: 'threshold' },
        [XOR, VAL],
        1
      );
      await expect(
        h.controller.prepareLiveBot(threshold, research, studyIdentity, { sessionDurationMs: 7 * DAY })
      ).rejects.toThrow('bots.errors.policy');
      await expect(
        h.controller.prepareLiveBot(template, { ...research, validation: 'holdout' }, studyIdentity, {
          sessionDurationMs: 7 * DAY,
        })
      ).rejects.toThrow('bots.errors.policy');
      expect(h.live.authorize).not.toHaveBeenCalled();
    });
  });

  it.each(['threshold', 'sma'] as const)(
    'prepares a precise unsaved %s live draft with original capital and no simulated authority',
    async (preset) => {
      const h = make();
      const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS, preset }, [XOR, VAL], 1);
      if (preset === 'sma') template.strategy.signalTiming = 'live-price';
      template.state.lastLiveObservationAt = 900_000;
      template.portfolio.initial[VAL.address] = toCodec('2.123456789123456789', VAL.decimals);
      template.portfolio.holdings[VAL.address] = toCodec('999', VAL.decimals);
      template.portfolio.trades = 500;
      template.account = 'old';
      template.sessionExpiresAt = 5_000_000;
      template.strategy.prompt = 'private instructions';
      h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.02' });
      const prepared = await h.controller.prepareLiveBot(template, liveStudy(), studyIdentity);
      expect(prepared.mode).toBe('live');
      expect(prepared.status).toBe('idle');
      expect(prepared.account).toBe('account');
      expect(prepared.network).toBe('genesis');
      expect(prepared.strategy.threshold).toBe('1.9');
      expect(prepared.strategy.prompt).toBe('');
      expect(prepared.strategy.signalTiming).toBe(preset === 'sma' ? 'live-price' : undefined);
      expect(prepared.state.lastLiveObservationAt).toBeUndefined();
      expect(prepared.portfolio.initial).toEqual(template.portfolio.initial);
      expect(prepared.portfolio.holdings).toEqual(template.portfolio.initial);
      expect(prepared.portfolio.trades).toBe(0);
      expect(prepared.sessionExpiresAt).toBe(0);
      expect(prepared.policy.maxTradeCodec[VAL.address]).toBe(toCodec('5000', VAL.decimals));
      expect(h.storage.saveBot).not.toHaveBeenCalled();
      expect(h.live.authorize).not.toHaveBeenCalled();
      expect(h.live.execute).not.toHaveBeenCalled();
      expect(h.agent.prepareSwap).not.toHaveBeenCalled();
      expect(h.agent.ready).toHaveBeenCalledWith({ requireNode: true, requireWallet: true });
      const identity = h.controller.readConnectionIdentity();
      await h.controller.saveLiveBot(prepared);
      await h.controller.saveLiveBot(prepared);
      expect(h.storage.saveBot).toHaveBeenCalledOnce();
      expect(h.saved().at(-1)!.strategy.signalTiming).toBe(preset === 'sma' ? 'live-price' : undefined);
      expect(h.live.authorize).not.toHaveBeenCalled();
      await h.controller.startBot(prepared.id, { password: 'private', expectedConnection: identity });
      expect(h.live.authorize).toHaveBeenCalledWith(
        expect.objectContaining({ id: prepared.id, mode: 'live' }),
        'private'
      );
      expect(h.controller.sessionActiveIds.value).toContain(prepared.id);
    }
  );

  it('rejects changed, discarded, expired, and cross-wallet live reviews before saving', async () => {
    const h = make();
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS }, [XOR, VAL], 1);
    const first = await h.controller.prepareLiveBot(template, liveStudy(), studyIdentity);
    const changed = clone(first);
    changed.strategy.amount = '99';
    await expect(h.controller.saveLiveBot(changed)).rejects.toThrow('bots.errors.config');
    h.controller.discardLiveReview(first.id);
    await expect(h.controller.saveLiveBot(first)).rejects.toThrow('bots.errors.session');
    const second = await h.controller.prepareLiveBot(template, liveStudy(), studyIdentity);
    h.advance(300_001);
    await expect(h.controller.saveLiveBot(second)).rejects.toThrow('bots.errors.session');
    const third = await h.controller.prepareLiveBot(template, liveStudy(), studyIdentity);
    h.agent.status().wallet.address = 'another-account';
    await expect(h.controller.saveLiveBot(third)).rejects.toThrow('bots.errors.session');
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  it('rejects demo/AI or changed-network preparations without inventing a live strategy', async () => {
    const h = make();
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS }, [XOR, VAL], 1);
    await expect(h.controller.prepareLiveBot(template, researchSnapshot('demo'), studyIdentity)).rejects.toThrow(
      'bots.errors.config'
    );
    await expect(
      h.controller.prepareLiveBot(
        { ...template, strategy: { ...template.strategy, kind: 'ai' } },
        liveStudy(),
        studyIdentity
      )
    ).rejects.toThrow('bots.errors.config');
    h.deps.market.mockImplementationOnce(async () => {
      h.agent.status().node.genesisHash = 'other';
      return { timestamp: 1_000_000, close: '0.02' };
    });
    await expect(h.controller.prepareLiveBot(template, liveStudy(), studyIdentity)).rejects.toThrow(
      'bots.errors.session'
    );
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  it('rejects a signing-context change between reviewed save and start', async () => {
    const h = make();
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS }, [XOR, VAL], 1);
    const prepared = await h.controller.prepareLiveBot(template, liveStudy(), studyIdentity);
    const identity = h.controller.readConnectionIdentity();
    await h.controller.saveLiveBot(prepared);
    h.agent.status().wallet.source = 'external';
    await expect(h.controller.startBot(prepared.id, { expectedConnection: identity })).rejects.toThrow(
      'bots.errors.session'
    );
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.controller.sessionActiveIds.value).toEqual([]);
  });

  it('blocks a mismatched research chain and denomination changes before confirm or authorize', async () => {
    const h = make();
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS }, [XOR, VAL], 1);
    await expect(h.controller.prepareLiveBot(template, researchSnapshot(), studyIdentity)).rejects.toThrow(
      'bots.errors.network'
    );
    const prepared = await h.controller.prepareLiveBot(template, liveStudy(), studyIdentity);
    await h.controller.saveLiveBot(prepared);
    h.deps.identity.mockResolvedValue({
      key: 'changed',
      genesisHash: 'genesis',
      currentDenominator: '1000',
      assertCurrent: () => undefined,
    });
    await expect(h.controller.previewLiveFunding(prepared.id)).rejects.toThrow('bots.errors.denomination');
    await expect(h.controller.saveLiveBot(prepared)).rejects.toThrow('bots.errors.denomination');
    await expect(
      h.controller.startBot(prepared.id, { expectedConnection: h.controller.readConnectionIdentity() })
    ).rejects.toThrow('bots.errors.denomination');
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.controller.sessionActiveIds.value).toEqual([]);
  });

  it('shows insufficient funding without a signer and prevents saving until funds cover the budget', async () => {
    const h = make();
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS }, [XOR, VAL], 1);
    const prepared = await h.controller.prepareLiveBot(template, liveStudy(), studyIdentity);
    h.live.previewAllocation.mockResolvedValue({ sufficient: false, assets: [] });
    await expect(h.controller.previewLiveFunding(prepared.id)).resolves.toEqual({ sufficient: false, assets: [] });
    await expect(h.controller.saveLiveBot(prepared)).rejects.toThrow('bots.errors.balance');
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
    h.live.previewAllocation.mockResolvedValue({ sufficient: true, assets: [] });
    await h.controller.saveLiveBot(prepared);
    expect(h.storage.saveBot).toHaveBeenCalledOnce();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  it('saves a playground configuration atomically with fresh paper state and no simulated gains or signing', async () => {
    const h = make();
    const template = createBotDefinition(
      {
        name: 'Quick test',
        assetInAddress: XOR.address,
        assetOutAddress: VAL.address,
        allocation: '100.000000000000000001',
        feeBudget: '1',
        strategyKind: 'sma',
      },
      [XOR, VAL],
      1
    );
    template.portfolio.holdings[XOR.address] = '999999999999999999999999';
    template.portfolio.trades = 40;
    template.equity = [{ timestamp: 1, value: '999999', benchmark: '1' }];
    template.sessionExpiresAt = 9999999;
    template.account = 'old-account';
    template.model = 'private-model';
    template.strategy.prompt = 'private-instructions';
    const fresh = createPaperBotFromTemplate(template, [XOR, VAL], 2);
    expect(fresh.id).not.toBe(template.id);
    expect(fresh.portfolio.holdings[XOR.address]).toBe('101000000000000000001');
    expect(fresh.portfolio.trades).toBe(0);
    expect(fresh.equity).toEqual([]);
    expect(fresh.sessionExpiresAt).toBe(0);
    expect(fresh.account).toBe('paper');
    expect(fresh.model).toBe('');
    expect(fresh.strategy.prompt).toBe('');
    await h.controller.createPaperBot(template);
    expect(h.storage.saveBot).toHaveBeenCalledTimes(1);
    expect(h.saved().at(-1)?.status).toBe('idle');
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.agent.prepareSwap).not.toHaveBeenCalled();
    expect(h.deps.market).toHaveBeenCalledTimes(1);
    expect(h.agent.ready).toHaveBeenCalledWith({ requireNode: true, requireWallet: false });
    expect(() => createPaperBotFromTemplate({ ...template, mode: 'live' }, [XOR, VAL], 2)).toThrow(
      'bots.errors.config'
    );
  });
  it.each(['dca', 'threshold', 'sma'] as const)(
    'reprices saved %s output limits from real market data instead of the demo price',
    async (preset) => {
      const h = make();
      const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS, preset }, [XOR, VAL], 1);
      expect(template.policy.maxTradeCodec[VAL.address]).toBe(toCodec('50', VAL.decimals));
      template.portfolio.holdings[XOR.address] = toCodec('99999', XOR.decimals);
      h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.02' });
      await h.controller.createPaperBot(template, { thresholdPercent: 8 });
      const saved = h.saved().at(-1)!;
      expect(saved.policy.maxTradeCodec[VAL.address]).toBe(toCodec('5000', VAL.decimals));
      expect(saved.policy.maxTradeCodec[XOR.address]).toBe(toCodec('10', XOR.decimals));
      expect(saved.portfolio.initial[XOR.address]).toBe(toCodec('100', XOR.decimals));
      expect(saved.portfolio.holdings).toEqual(saved.portfolio.initial);
      expect(saved.strategy.threshold).toBe(preset === 'threshold' ? '0.0184' : '0.02');
      expect(saved.status).toBe('idle');
      expect(saved.sessionExpiresAt).toBe(0);
      expect(template.policy.maxTradeCodec[VAL.address]).toBe(toCodec('50', VAL.decimals));
      expect(h.live.authorize).not.toHaveBeenCalled();
      expect(h.live.execute).not.toHaveBeenCalled();
      expect(h.agent.prepareSwap).not.toHaveBeenCalled();
    }
  );
  it('does not persist a saved preset when its real quote fails or changes networks', async () => {
    const h = make();
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS, preset: 'sma' }, [XOR, VAL], 1);
    h.deps.market.mockRejectedValueOnce(new Error('bots.errors.stale'));
    await expect(h.controller.createPaperBot(template)).rejects.toThrow('bots.errors.stale');
    h.deps.market.mockImplementationOnce(async () => {
      h.agent.status().node.genesisHash = 'other';
      return { timestamp: 1_000_000, close: '0.02' };
    });
    await expect(h.controller.createPaperBot(template)).rejects.toThrow('bots.errors.network');
    expect(h.storage.saveBot).not.toHaveBeenCalled();
  });
  it('anchors a saved dip trigger to a fresh unsigned market quote, never the synthetic price', async () => {
    const h = make();
    const template = createBotDefinition(
      {
        name: 'Dip',
        assetInAddress: XOR.address,
        assetOutAddress: VAL.address,
        allocation: '100',
        feeBudget: '1',
        strategyKind: 'threshold',
      },
      [XOR, VAL],
      1
    );
    template.strategy.threshold = '999';
    h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.025' });
    await h.controller.createPaperBot(template, { thresholdPercent: 10 });
    expect(h.saved().at(-1)?.strategy.threshold).toBe('0.0225');
    expect(h.live.execute).not.toHaveBeenCalled();
    const count = h.storage.saveBot.mock.calls.length;
    h.deps.market.mockRejectedValue(new Error('bots.errors.stale'));
    await expect(h.controller.createPaperBot(template, { thresholdPercent: 10 })).rejects.toThrow('bots.errors.stale');
    expect(h.storage.saveBot).toHaveBeenCalledTimes(count);
    await expect(h.controller.createPaperBot(template, { thresholdPercent: 75 })).rejects.toThrow('bots.errors.config');
  });
  it.each(['historical', 'imported'] as const)(
    'retains the exact tested %s strategy and records provenance while resetting execution',
    async (source) => {
      const h = make();
      const template = createTestedPlaygroundBot(
        { ...PLAYGROUND_DEFAULT_SETTINGS, preset: 'threshold' },
        [XOR, VAL],
        1
      );
      template.strategy.threshold = '0.123456789012345678901234567890123456';
      template.strategy.intervalMs = 7_200_000;
      template.policy.slippagePercent = '1.25';
      template.portfolio.trades = 42;
      template.state.lastTradeAt = 900_000;
      template.activity = [{ id: 'virtual-trade', timestamp: 500_000, kind: 'trade', message: 'test' }];
      const research = researchSnapshot(source);
      h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.02' });

      await h.controller.createPaperBot(template, { research });

      const saved = h.saved().at(-1)!;
      expect(saved.strategy).toEqual(template.strategy);
      expect(saved.policy.slippagePercent).toBe('1.25');
      expect(saved.policy.feeBudgetCodec).toBe(template.policy.feeBudgetCodec);
      expect(saved.policy.maxTradeCodec[XOR.address]).toBe(template.policy.maxTradeCodec[XOR.address]);
      expect(saved.policy.maxTradeCodec[VAL.address]).toBe(toCodec('5000', VAL.decimals));
      expect(saved.research).toEqual(research);
      expect(saved.portfolio.holdings).toEqual(saved.portfolio.initial);
      expect(saved.portfolio.trades).toBe(0);
      expect(saved.portfolio.feesPaidCodec).toBe('0');
      expect(saved.activity).toEqual([]);
      expect(saved.equity).toEqual([]);
      expect(saved.state).toEqual({ lastTradeAt: 0, lastEvaluatedAt: 0 });
      expect(saved.mode).toBe('paper');
      expect(saved.status).toBe('idle');
      expect(h.controller.selectedId.value).toBe(saved.id);
      expect(h.controller.bots.value.at(-1)?.id).toBe(saved.id);
      expect(h.live.authorize).not.toHaveBeenCalled();
      expect(h.agent.prepareSwap).not.toHaveBeenCalled();
      research.returnPercent = '999';
      expect(saved.research?.returnPercent).toBe('12.34567890123456789');
    }
  );
  it('keeps demo provenance explicit and reanchors its synthetic trigger before creating a bot', async () => {
    const h = make();
    const template = createTestedPlaygroundBot({ ...PLAYGROUND_DEFAULT_SETTINGS, preset: 'threshold' }, [XOR, VAL], 1);
    const research = { ...researchSnapshot('demo'), extraneousSimulation: template.portfolio };
    h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.025' });
    await h.controller.createPaperBot(template, { thresholdPercent: 10, research });
    expect(h.saved().at(-1)?.strategy.threshold).toBe('0.0225');
    expect(h.saved().at(-1)?.research).toEqual(researchSnapshot('demo'));
  });
  it('retains a detached automatic holdout qualification separately from full-period returns', async () => {
    const h = make();
    const template = createTestedPlaygroundBot(PLAYGROUND_DEFAULT_SETTINGS, [XOR, VAL], 1);
    const research = {
      ...researchSnapshot(),
      coverage: 1,
      valuationAsset: 'output' as const,
      qualification: {
        candidates: 3,
        startAt: 600_000,
        endAt: 800_000,
        returnPercent: '1.000000000000000019',
        drawdownPercent: '0.9',
        trades: 6,
        coverage: 1,
        ignored: 'untrusted extra field',
      },
    };
    h.deps.market.mockResolvedValue({ timestamp: 1_000_000, close: '0.025' });
    await h.controller.createPaperBot(template, { research });
    const saved = h.saved().at(-1)!.research!;
    expect(saved.valuationAsset).toBe('output');
    expect(saved.qualification).toEqual({
      candidates: 3,
      startAt: 600_000,
      endAt: 800_000,
      returnPercent: '1.000000000000000019',
      drawdownPercent: '0.9',
      trades: 6,
      coverage: 1,
    });
    expect(saved.returnPercent).toBe(research.returnPercent);
    research.qualification.returnPercent = '999';
    expect(saved.qualification!.returnPercent).toBe('1.000000000000000019');
  });
  it.each([
    { candidates: 13 },
    { startAt: 100_000 },
    { endAt: 900_000 },
    { trades: 4 },
    { coverage: 0.9 },
    { returnPercent: '-1' },
    { returnPercent: 'Infinity' },
    { returnPercent: '0' },
    { drawdownPercent: '101' },
  ])('rejects tampered automatic qualification before quoting or saving: %o', async (change) => {
    const h = make();
    const template = createTestedPlaygroundBot(PLAYGROUND_DEFAULT_SETTINGS, [XOR, VAL], 1);
    const research = {
      ...researchSnapshot(),
      coverage: 1,
      qualification: {
        candidates: 3,
        startAt: 600_000,
        endAt: 800_000,
        returnPercent: '1.2',
        drawdownPercent: '0.9',
        trades: 6,
        coverage: 1,
        ...change,
      },
    };
    await expect(h.controller.createPaperBot(template, { research })).rejects.toThrow('bots.errors.config');
    expect(h.deps.market).not.toHaveBeenCalled();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
  });
  it('creates a selected non-XOR pair with exact independent XOR fee capital', async () => {
    const h = make();
    const selectedAssets = [
      { address: 'input-six', symbol: 'SIX', decimals: 6 },
      { address: 'output-eight', symbol: 'EIGHT', decimals: 8 },
    ];
    h.controller.assets.value = selectedAssets;
    const template = createTestedPlaygroundBot(
      {
        ...PLAYGROUND_DEFAULT_SETTINGS,
        assetInAddress: selectedAssets[0].address,
        assetOutAddress: selectedAssets[1].address,
        capital: '100.123456',
        feeBudgetXor: '0.123456789012345678',
      },
      selectedAssets,
      1
    );
    await h.controller.createPaperBot(template, { research: researchSnapshot() });
    const saved = h.saved().at(-1)!;
    expect(saved.assetIn).toEqual(selectedAssets[0]);
    expect(saved.assetOut).toEqual(selectedAssets[1]);
    expect(saved.portfolio.initial).toEqual({
      'input-six': '100123456',
      'output-eight': '0',
      [XOR.address]: '123456789012345678',
    });
    expect(saved.portfolio.holdings).toEqual(saved.portfolio.initial);
    expect(saved.policy.feeAsset.address).toBe(XOR.address);
    expect(saved.policy.feeBudgetCodec).toBe('123456789012345678');
    expect(saved.policy.maxTradeCodec['output-eight']).toBe('5006172800');
  });
  it('preserves initial XOR output fees once when creating a researched bot', () => {
    const template = createTestedPlaygroundBot(
      {
        ...PLAYGROUND_DEFAULT_SETTINGS,
        assetInAddress: VAL.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '0.2',
      },
      [XOR, VAL],
      1
    );
    const saved = createPaperBotFromTemplate(template, [XOR, VAL], 2);
    expect(saved.portfolio.initial).toEqual({
      [VAL.address]: toCodec('10', VAL.decimals),
      [XOR.address]: toCodec('0.2', XOR.decimals),
    });
    expect(saved.policy.feeBudgetCodec).toBe(toCodec('0.2', XOR.decimals));
  });
  it('rejects a template whose token or XOR fee decimals changed before creation', () => {
    const template = createTestedPlaygroundBot(PLAYGROUND_DEFAULT_SETTINGS, [XOR, VAL], 1);
    expect(() => createPaperBotFromTemplate(template, [{ ...XOR, decimals: 6 }, VAL], 2)).toThrow('bots.errors.config');
    expect(() =>
      createPaperBotFromTemplate(
        {
          ...template,
          policy: {
            ...template.policy,
            feeAsset: { ...VAL },
          },
        },
        [XOR, VAL],
        2
      )
    ).toThrow('bots.errors.config');
  });
  it.each([
    { testedAt: 2_000_000 },
    { startAt: 850_000 },
    { coverage: Number.NaN },
    { returnPercent: 'Infinity' },
    { drawdownPercent: '-1' },
    { trades: 10_001 },
    { trainPercent: 100 },
    { folds: 1 },
    { valuationAsset: 'unrecognized' as 'output' },
    { feeObservation: { ...researchSnapshot().feeObservation!, blockNumber: -1 } },
    { feeObservation: { ...researchSnapshot().feeObservation!, queriedAt: 999_999 } },
    { feeObservation: { ...researchSnapshot().feeObservation!, finalizedAt: 0 } },
    { feeObservation: { ...researchSnapshot().feeObservation!, finalizedAt: -1 } },
    { feeObservation: { ...researchSnapshot().feeObservation!, finalizedAt: 0.5 } },
    { feeObservation: { ...researchSnapshot().feeObservation!, finalizedAt: Number.NaN } },
    { feeObservation: { ...researchSnapshot().feeObservation!, finalizedAt: 830_001 } },
    { feeObservation: { ...researchSnapshot().feeObservation!, endpoint: 'wss://name:secret@example.org' } },
    { feeObservation: { ...researchSnapshot().feeObservation!, blockHash: 'not-a-block' } },
  ])('rejects invalid research provenance before quoting or saving: %o', async (change) => {
    const h = make();
    const template = createTestedPlaygroundBot(PLAYGROUND_DEFAULT_SETTINGS, [XOR, VAL], 1);
    await expect(
      h.controller.createPaperBot(template, { research: { ...researchSnapshot(), ...change } })
    ).rejects.toThrow('bots.errors.config');
    expect(h.deps.market).not.toHaveBeenCalled();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
  });
  it.each([{ networkFeeXor: '-1' }, { networkFeeXor: '0.0000000000000000001' }, { swapFeePercent: '11' }])(
    'rejects invalid saved fee assumptions before requesting a quote: %o',
    async (change) => {
      const h = make();
      const template = createTestedPlaygroundBot(PLAYGROUND_DEFAULT_SETTINGS, [XOR, VAL], 1);
      await expect(
        h.controller.createPaperBot(template, { research: { ...researchSnapshot(), ...change } })
      ).rejects.toThrow();
      expect(h.deps.market).not.toHaveBeenCalled();
      expect(h.storage.saveBot).not.toHaveBeenCalled();
    }
  );
  it('transfers a reviewed provider client without recreating or persisting its credential', async () => {
    const h = make();
    const client = {
      listModels: vi.fn(),
      selectModel: vi.fn(),
      propose: vi.fn(),
      suggest: vi.fn(),
      disconnect: vi.fn(),
    };
    const bot = h.saved()[0];
    const config = { provider: bot.provider, model: bot.model, endpoint: bot.endpoint };
    await expect(h.controller.connectProviderClient(bot.id, client, { ...config, model: 'different' })).rejects.toThrow(
      'bots.errors.provider'
    );
    expect(h.controller.providerConnectedIds.value).toEqual([]);
    await h.controller.connectProviderClient(bot.id, client, config);
    expect(h.controller.providerConnectedIds.value).toEqual([bot.id]);
    expect(h.deps.ai).not.toHaveBeenCalled();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
    const replacement = { ...client, disconnect: vi.fn() };
    await h.controller.connectProviderClient(bot.id, replacement, config);
    expect(client.disconnect).toHaveBeenCalledOnce();
    await h.controller.startBot(bot.id);
    await expect(h.controller.connectProviderClient(bot.id, client, config)).rejects.toThrow('bots.errors.stopToEdit');
    h.controller.dispose();
    expect(replacement.disconnect).toHaveBeenCalledOnce();
  });

  it('does not register a disconnected client after its pending UI handoff is aborted', async () => {
    const h = make();
    const bot = h.saved()[0];
    const client = {
      listModels: vi.fn(),
      selectModel: vi.fn(),
      propose: vi.fn(),
      suggest: vi.fn(),
      disconnect: vi.fn(),
    };
    const config = { provider: bot.provider, model: bot.model, endpoint: bot.endpoint };
    let release!: (bots: BotDefinition[]) => void;
    h.storage.listBots.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const lifetime = new AbortController();
    const pending = h.controller.connectProviderClient(bot.id, client, config, lifetime.signal);
    lifetime.abort();
    client.disconnect();
    release([bot]);
    await expect(pending).rejects.toThrow('bots.errors.stale');
    expect(h.controller.providerConnectedIds.value).toEqual([]);
    expect(h.storage.saveBot).not.toHaveBeenCalled();
  });

  it('accepts one six-second block and rejects sub-block live definitions', () => {
    const bot = botFixture();
    bot.strategy.intervalMs = 6000;
    expect(() => validateBotDefinition(bot)).not.toThrow();
    bot.strategy.intervalMs = 5999;
    expect(() => validateBotDefinition(bot)).toThrow('bots.errors.config');
  });
  it('evaluates on finalized blocks, coalesces in-flight blocks, and revokes callbacks on disposal', async () => {
    const bot = botFixture();
    bot.strategy.intervalMs = 6000;
    const h = make(bot);
    let onBlock!: () => void;
    const stop = vi.fn();
    Object.assign(h.deps, {
      subscribeBlocks: vi.fn(async (callback: () => void) => {
        onBlock = callback;
        return stop;
      }),
    });
    await h.controller.initialize();
    await h.controller.startBot('bot-1');
    onBlock();
    await vi.waitFor(() => expect(h.saved()[0].portfolio.trades).toBe(1));
    h.advance(6000);
    let resolveMarket!: (value: { timestamp: number; close: string }) => void;
    h.deps.market.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMarket = resolve;
        })
    );
    onBlock();
    await vi.waitFor(() => expect(resolveMarket).toBeTypeOf('function'));
    onBlock();
    onBlock();
    expect(h.deps.market).toHaveBeenCalledTimes(2);
    resolveMarket({ timestamp: 1006000, close: '2' });
    await vi.waitFor(() => expect(h.saved()[0].portfolio.trades).toBe(2));
    expect(h.deps.market).toHaveBeenCalledTimes(2);
    h.controller.dispose();
    expect(stop).toHaveBeenCalledOnce();
    h.advance(6000);
    onBlock();
    expect(h.deps.market).toHaveBeenCalledTimes(2);
  });
  it('admits each finalized block despite quote latency while retaining actual execution timestamps', async () => {
    const bot = botFixture();
    bot.strategy.intervalMs = 6000;
    const h = make(bot);
    const plan = h.agent.planSwap.getMockImplementation()!;
    h.deps.market.mockImplementation(async () => {
      h.advance(1000);
      return { timestamp: h.deps.now(), close: '2' };
    });
    h.agent.planSwap.mockImplementation(async () => {
      h.advance(2000);
      return plan();
    });
    await h.controller.startBot(bot.id);
    await h.controller.tick(100);
    expect(h.saved()[0].state).toMatchObject({ lastEvaluatedAt: 1000000, lastTradeAt: 1003000 });
    h.advance(2800);
    await h.controller.tick(101);
    expect(h.saved()[0].portfolio.trades).toBe(2);
    expect(h.saved()[0].state).toMatchObject({ lastEvaluatedAt: 1005800, lastTradeAt: 1008800 });
    h.advance(6000);
    await h.controller.tick(101);
    await h.controller.tick(100);
    expect(h.deps.market).toHaveBeenCalledTimes(2);
  });
  it('keeps a two-block cadence and records AI hold usage without creating a fill', async () => {
    const bot = botFixture();
    bot.strategy.kind = 'ai';
    bot.strategy.intervalMs = 12000;
    const h = make(bot);
    const client = {
      propose: vi.fn(async () => ({
        proposal: { action: 'hold', amount: '0', reason: 'wait' },
        usage: { requests: 1, inputTokens: 10, outputTokens: 2 },
      })),
      disconnect: vi.fn(),
      suggest: vi.fn(),
    };
    h.deps.ai.mockReturnValue(client);
    await h.controller.connectProvider(bot.id, { apiKey: 'memory-only', model: 'test', endpoint: '' });
    await h.controller.startBot(bot.id);
    await h.controller.tick(100);
    h.advance(6000);
    await h.controller.tick(101);
    expect(client.propose).toHaveBeenCalledTimes(1);
    h.advance(6000);
    await h.controller.tick(102);
    expect(client.propose).toHaveBeenCalledTimes(2);
    expect(h.saved()[0].apiUsage).toEqual({ requests: 2, inputTokens: 20, outputTokens: 4 });
    expect(h.saved()[0].portfolio.trades).toBe(0);
    expect(h.saved()[0].status).toBe('running');
  });

  it('uses the complete liquidity-qualified asset catalog rather than common-token discovery', async () => {
    const h = make();
    const discovered = [XOR, { address: `0x${'c'.repeat(64)}`, symbol: 'OTHER', decimals: 36 }];
    Object.assign(h.deps, { eligibleAssets: vi.fn(async () => discovered) });
    await h.controller.initialize();
    expect(h.controller.assets.value.map((asset) => asset.symbol)).toEqual(['XOR', 'OTHER']);
    expect(h.agent.assets).not.toHaveBeenCalled();
  });

  it('accepts price triggers with the full supported 36-decimal precision', () => {
    const bot = botFixture();
    bot.strategy.kind = 'threshold';
    bot.strategy.threshold = '0.' + '0'.repeat(35) + '1';
    expect(() => validateBotDefinition(bot)).not.toThrow();
  });
  it('an explicit start can establish a node without immediately revoking itself', async () => {
    const h = make();
    h.agent.status().node.connected = false;
    await h.controller.tick();
    h.agent.ready.mockImplementationOnce(async () => {
      h.agent.status().node.connected = true;
      return h.agent.status();
    });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('running');
    expect(h.saved()[0].portfolio.trades).toBe(1);
  });
  it('a network switch during a paper quote prevents stale fills and clears cached prices', async () => {
    const h = make();
    await h.controller.initialize();
    await h.controller.selectBot('bot-1');
    const result = await h.agent.planSwap();
    let release!: (value: typeof result) => void;
    h.agent.planSwap.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    await h.controller.startBot('bot-1');
    const pending = h.controller.tick();
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    h.agent.status().node.genesisHash = 'different-network';
    release(result);
    await pending;
    expect(h.saved()[0].portfolio.trades).toBe(0);
    expect(h.saved()[0].status).toBe('attention');
    await h.controller.tick();
    expect(h.controller.chartCandles.value).toEqual([]);
    await expect(h.controller.startBot('bot-1')).rejects.toThrow('bots.errors.network');
  });
  it('creates paper-only capital without wallet keys or automatic signing', () => {
    const assets = [
      { address: 'a', symbol: 'A', decimals: 18 },
      { address: 'b', symbol: 'B', decimals: 18 },
    ];
    const bot = createBotDefinition(
      {
        name: 'Test',
        assetInAddress: 'a',
        assetOutAddress: 'b',
        allocation: '100',
        feeBudget: '1',
        strategyKind: 'dca',
      },
      assets,
      1
    );
    expect(bot.mode).toBe('paper');
    expect(bot.status).toBe('idle');
    expect(bot.account).toBe('paper');
    expect(bot.portfolio.holdings.a).toBe('100000000000000000000');
    expect(JSON.stringify(bot)).not.toMatch(/password|privateKey|apiKey/);
  });
  it('paper uses unsigned plans and conserves virtual inventory plus fee', async () => {
    const h = make();
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.controller.error.value).toBe('');
    expect(h.agent.planSwap).toHaveBeenCalledTimes(1);
    expect(h.agent.prepareSwap).not.toHaveBeenCalled();
    expect(h.agent.executeSwap).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.deps.history).not.toHaveBeenCalled();
    expect(h.deps.market).toHaveBeenCalledTimes(1);
    expect(h.saved()[0].portfolio.holdings).toEqual({ in: '9890', out: '40' });
    expect(h.saved()[0].portfolio.feesPaidCodec).toBe('10');
    expect(h.saved()[0].equity).toHaveLength(2);
  });
  it('does not restart a persisted running bot on reload', async () => {
    const bot = botFixture();
    bot.status = 'running';
    bot.sessionExpiresAt = 2_000_000;
    const h = make(bot);
    await h.controller.initialize();
    await h.controller.tick();
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });
  it('stale quotes and missing fees stop paper execution', async () => {
    const h = make();
    h.agent.planSwap.mockResolvedValueOnce({ quote: {} as never, expiresAt: 0, warnings: [], fees: [] });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('attention');
    expect(h.saved()[0].portfolio.trades).toBe(0);
  });
  it('pause wins over a quote which resolves late', async () => {
    const h = make();
    const result = await h.agent.planSwap();
    let release!: (value: typeof result) => void;
    h.agent.planSwap.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    await h.controller.startBot('bot-1');
    const pending = h.controller.tick();
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await h.controller.pauseBot('bot-1');
    release(result);
    await pending;
    expect(h.saved()[0].status).toBe('paused');
    expect(h.saved()[0].portfolio.trades).toBe(0);
  });
  it('sleep pauses without replaying missed intervals', async () => {
    const h = make();
    await h.controller.startBot('bot-1');
    h.advance(120_000);
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('paused');
    expect(h.agent.planSwap).not.toHaveBeenCalled();
  });
  it('a new session does not accept an old session response', async () => {
    const h = make();
    const result = await h.agent.planSwap();
    let release!: (value: typeof result) => void;
    h.agent.planSwap.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    await h.controller.startBot('bot-1');
    const pending = h.controller.tick();
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await h.controller.pauseBot('bot-1');
    await h.controller.startBot('bot-1');
    release(result);
    await pending;
    expect(h.saved()[0].status).toBe('running');
    expect(h.saved()[0].portfolio.trades).toBe(0);
  });
  it('expiry while waiting for a quote prevents its fill', async () => {
    const h = make();
    const result = await h.agent.planSwap();
    h.agent.planSwap.mockImplementationOnce(async () => {
      h.advance(3_600_001);
      return { ...result, expiresAt: 9_000_000 };
    });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('attention');
    expect(h.saved()[0].portfolio.trades).toBe(0);
  });
  it('market failures suspend execution without reaching signing or paper fill', async () => {
    const h = make();
    h.deps.market.mockRejectedValueOnce(new Error('bots.errors.stale'));
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('attention');
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });
  it('SMA suspends when historical denomination cannot be verified', async () => {
    const bot = botFixture();
    bot.strategy.kind = 'sma';
    const h = make(bot);
    h.deps.history.mockResolvedValueOnce({
      candles: [{ timestamp: 999000, close: '2' }],
      missing: 0,
      denominationVerified: false,
    });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('attention');
    expect(h.controller.error.value).toBe('bots.errors.denomination');
    expect(h.agent.planSwap).not.toHaveBeenCalled();
  });
  it.each(['pause', 'stop', 'expiry'] as const)(
    'does not start a paid AI request after %s during pending market data',
    async (interruption) => {
      const bot = botFixture();
      bot.strategy.kind = 'ai';
      bot.strategy.intervalMs = 6000;
      const h = make(bot);
      const client = { propose: vi.fn(), disconnect: vi.fn(), suggest: vi.fn() };
      h.deps.ai.mockReturnValue(client);
      let release!: (value: { timestamp: number; close: string }) => void;
      h.deps.market.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          })
      );
      await h.controller.connectProvider(bot.id, { apiKey: 'memory-only', model: 'test', endpoint: '' });
      await h.controller.startBot(bot.id);
      const pending = h.controller.tick(100);
      await vi.waitFor(() => expect(release).toBeTypeOf('function'));
      if (interruption === 'pause') await h.controller.pauseBot(bot.id);
      else if (interruption === 'stop') await h.controller.stopBot(bot.id);
      else h.advance(bot.policy.sessionDurationMs + 1);
      release({ timestamp: h.deps.now(), close: '2' });
      await pending;
      expect(client.propose).not.toHaveBeenCalled();
      expect(h.saved()[0].apiUsage.requests).toBe(0);
      expect(h.agent.planSwap).not.toHaveBeenCalled();
      expect(h.saved()[0].status).not.toBe('running');
    }
  );

  it('provider authentication failures suspend AI with no signing or fill', async () => {
    const bot = botFixture();
    bot.strategy.kind = 'ai';
    const h = make(bot);
    const client = {
      propose: vi.fn().mockRejectedValue(new Error('provider error containing secret')),
      disconnect: vi.fn(),
      suggest: vi.fn(),
    };
    h.deps.ai.mockReturnValue(client);
    await h.controller.connectProvider('bot-1', { apiKey: 'memory-only', model: 'test', endpoint: '' });
    await h.controller.startBot('bot-1');
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('attention');
    expect(h.controller.error.value).toBe('bots.errors.operation');
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(JSON.stringify(h.saved())).not.toMatch(/memory-only|provider error/);
  });
  it('backtests remain isolated from persisted portfolios and all signing paths', async () => {
    const h = make();
    const before = clone(h.saved());
    await h.controller.backtestBot('bot-1', { days: 14, interval: 'hour', slippagePercent: '0.5', feeAmount: '0.1' });
    expect(h.controller.backtestResult.value).not.toBeNull();
    expect(h.saved()).toEqual(before);
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.agent.planSwap).not.toHaveBeenCalled();
    expect(h.agent.prepareSwap).not.toHaveBeenCalled();
  });
  it('includes the observed swap fee as well as the network fee in saved-bot backtests', async () => {
    const h = make();
    h.deps.history.mockResolvedValueOnce({
      candles: [
        { timestamp: 800_000, close: '2' },
        { timestamp: 860_000, close: '2' },
      ],
      missing: 0,
      denominationVerified: true,
    });
    await h.controller.backtestBot('bot-1', {
      days: 14,
      interval: 'hour',
      slippagePercent: '0',
      feeAmount: '0.1',
      swapFeePercent: '2',
    });
    expect(h.controller.backtestResult.value?.portfolio.holdings.out).toBe('49');
    expect(h.controller.backtestResult.value?.portfolio.feesPaidCodec).toBe('10');
    expect(h.saved()[0].portfolio.trades).toBe(0);
  });
  it('uses the shared verified March history without requesting a different relative date window', async () => {
    const h = make();
    await h.controller.backtestBot('bot-1', {
      days: 30,
      interval: 'hour',
      slippagePercent: '0',
      feeAmount: '0.1',
      swapFeePercent: '2',
      history: {
        candles: [
          { timestamp: Date.UTC(2026, 2, 1, 1), close: '2' },
          { timestamp: Date.UTC(2026, 2, 1, 2), close: '2' },
        ],
        missing: 0,
        denominationVerified: true,
      },
    });
    expect(h.deps.history).not.toHaveBeenCalled();
    expect(h.controller.backtestResult.value?.portfolio.holdings.out).toBe('49');
  });
  it('mode changes discard paper results before live consent', async () => {
    const bot = botFixture();
    bot.portfolio.holdings.in = '500';
    bot.portfolio.trades = 10;
    const h = make(bot);
    await h.controller.updateBot({ ...bot, mode: 'live' });
    expect(h.saved()[0].portfolio.holdings).toEqual(bot.portfolio.initial);
    expect(h.saved()[0].portfolio.trades).toBe(0);
    expect(h.live.authorize).not.toHaveBeenCalled();
  });
  it('Stop remains effective while Start waits for node readiness', async () => {
    const h = make();
    const ready = await h.agent.ready();
    let release!: (value: typeof ready) => void;
    h.agent.ready.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const pending = h.controller.startBot('bot-1');
    const rejection = expect(pending).rejects.toThrow('bots.errors.session');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(h.controller.busy.value).toBe(true);
    await h.controller.stopBot('bot-1');
    expect(h.saved()[0].status).toBe('stopped');
    release(ready);
    await rejection;
    expect(h.controller.sessionActiveIds.value).toEqual([]);
    expect(h.controller.busy.value).toBe(false);
  });
  it('continues an authorized live session while hidden without unlocking or authorizing again', async () => {
    const bot = botFixture();
    bot.mode = 'live';
    const h = make(bot);
    await h.controller.initialize();
    await h.controller.startBot('bot-1', { password: 'session-only-secret' });
    const stops = h.live.stop.mock.calls.length;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await h.controller.tick();
    h.advance(60_000);
    await h.controller.tick();
    expect(h.live.execute).toHaveBeenCalledTimes(2);
    expect(h.live.authorize).toHaveBeenCalledTimes(1);
    expect(h.live.stop).toHaveBeenCalledTimes(stops);
    expect(h.controller.sessionActiveIds.value).toEqual(['bot-1']);
    expect(h.saved()[0].status).toBe('running');
    expect(JSON.stringify(h.saved())).not.toContain('session-only-secret');
  });
  it.each(['offline', 'pagehide'])('still revokes a hidden authorized session on %s', async (event) => {
    const bot = botFixture();
    bot.mode = 'live';
    const h = make(bot);
    await h.controller.initialize();
    await h.controller.startBot('bot-1', { password: 'not-saved' });
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event(event));
    await h.controller.tick();
    await vi.waitFor(() => expect(h.saved()[0].status).toBe('paused'));
    expect(h.controller.sessionActiveIds.value).toEqual([]);
    expect(h.live.stop).toHaveBeenCalledWith('bot-1');
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.live.authorize).toHaveBeenCalledTimes(1);
  });
  it('preserves expiry and visible-only initial consent for background execution', async () => {
    const bot = botFixture();
    bot.mode = 'live';
    const h = make(bot);
    await h.controller.initialize();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    await expect(h.controller.startBot('bot-1')).rejects.toThrow('bots.errors.hidden');
    expect(h.live.authorize).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await h.controller.startBot('bot-1', { password: 'not-saved' });
    h.saved()[0].sessionExpiresAt = h.deps.now() + 6000;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    h.advance(6000);
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('paused');
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.controller.sessionActiveIds.value).toEqual([]);
    expect(h.live.authorize).toHaveBeenCalledTimes(1);
  });
  it('hiding then returning during authorization still requires fresh consent', async () => {
    const bot = botFixture();
    bot.mode = 'live';
    const h = make(bot);
    await h.controller.initialize();
    let release!: () => void;
    h.live.authorize.mockImplementationOnce(
      async () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const pending = h.controller.startBot('bot-1', { password: 'not-saved' });
    const rejection = expect(pending).rejects.toThrow('bots.errors.session');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    release();
    await rejection;
    expect(h.live.stop).toHaveBeenCalledWith('bot-1');
    expect(h.controller.sessionActiveIds.value).toEqual([]);
    expect(JSON.stringify(h.saved())).not.toContain('not-saved');
  });
  it('sleep during pending readiness cannot become a fresh running session', async () => {
    const h = make();
    const ready = await h.agent.ready();
    let release!: (value: typeof ready) => void;
    h.agent.ready.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const pending = h.controller.startBot('bot-1');
    const rejection = expect(pending).rejects.toThrow('bots.errors.session');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    h.advance(120_000);
    release(ready);
    await rejection;
    expect(h.controller.sessionActiveIds.value).toEqual([]);
    expect(h.live.stop).toHaveBeenCalledWith('bot-1');
  });
  it('Stop revokes a running session while an unrelated backtest is busy', async () => {
    const h = make();
    await h.controller.startBot('bot-1');
    const data = await h.deps.history();
    let release!: (value: typeof data) => void;
    h.deps.history.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const pending = h.controller.backtestBot('bot-1', {
      days: 14,
      interval: 'hour',
      slippagePercent: '0.5',
      feeAmount: '0.1',
    });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await h.controller.stopBot('bot-1');
    expect(h.live.stop).toHaveBeenCalledWith('bot-1');
    expect(h.saved()[0].status).toBe('stopped');
    release(data);
    await pending;
    expect(h.saved()[0].status).toBe('stopped');
  });
  it('storage failures revoke active sessions and report a stable error', async () => {
    const h = make();
    await h.controller.startBot('bot-1');
    h.storage.listBots.mockRejectedValueOnce(new Error('db failed sensitive details'));
    await h.controller.tick();
    expect(h.live.stop).toHaveBeenCalledWith('bot-1');
    expect(h.controller.error.value).toBe('bots.errors.operation');
  });
});

describe('explicit live-price SMA observations', () => {
  const hour = 3_600_000;
  const hourlyHistory = (): BotHistory => ({
    candles: [
      { timestamp: hour, close: '5' },
      { timestamp: 2 * hour, close: '3' },
      { timestamp: 3 * hour, close: '1' },
      { timestamp: 4 * hour, close: '1000' },
    ],
    missing: 0,
    denominationVerified: true,
  });

  it('updates one forming-hour slot without accumulating quotes or including a future close', () => {
    const history = hourlyHistory();
    const firstAt = 3 * hour + 10 * 60_000;
    const first = livePriceSmaCandles(history, { timestamp: firstAt, close: '7' }, firstAt);
    const secondAt = firstAt + 20 * 60_000;
    const second = livePriceSmaCandles(history, { timestamp: secondAt, close: '1' }, secondAt);
    expect(first.map(({ close }) => close)).toEqual(['5', '3', '1', '7']);
    expect(second.map(({ close }) => close)).toEqual(['5', '3', '1', '1']);
    expect(second.slice(0, -1)).toEqual(first.slice(0, -1));
    expect(history.candles).toHaveLength(4);
    expect(livePriceSmaCandles(history, { timestamp: 3 * hour, close: '2' }, 3 * hour)).toEqual([
      ...history.candles.slice(0, 2),
      { timestamp: 3 * hour, close: '2' },
    ]);
  });

  it('rejects stale or future quotes and prevents a fresh quote from disguising old history', () => {
    const now = 3 * hour + 60_000;
    for (const timestamp of [now - 5000, now + 1, NaN]) {
      expect(() => livePriceSmaCandles(hourlyHistory(), { timestamp, close: '1' }, now)).toThrow('bots.errors.stale');
    }
    expect(() =>
      livePriceSmaCandles(
        { ...hourlyHistory(), candles: [{ timestamp: hour, close: '1' }] },
        { timestamp: now, close: '1' },
        now
      )
    ).toThrow('bots.errors.stale');
    expect(() =>
      livePriceSmaCandles(
        { ...hourlyHistory(), candles: hourlyHistory().candles.slice(0, 2) },
        { timestamp: now, close: '1' },
        now
      )
    ).toThrow('bots.errors.stale');
    expect(() =>
      livePriceSmaCandles(
        { ...hourlyHistory(), candles: [{ timestamp: now - 1, close: '1' }] },
        { timestamp: now, close: '1' },
        now
      )
    ).toThrow('bots.errors.history');
  });

  it('requires fresh contiguous hourly warmup after a missing historical hour', () => {
    const now = 3 * hour + 60_000;
    const history = hourlyHistory();
    history.candles.splice(1, 1);
    const observed = livePriceSmaCandles(history, { timestamp: now, close: '7' }, now);
    expect(observed).toEqual([
      { timestamp: 3 * hour, close: '1' },
      { timestamp: now, close: '7' },
    ]);
  });

  it('loads cold history before obtaining the short-lived live quote', async () => {
    const bot = botFixture();
    bot.strategy.kind = 'sma';
    bot.strategy.signalTiming = 'live-price';
    const h = make(bot);
    h.advance(3 * hour + 20 * 60_000 - h.deps.now());
    await h.controller.tick();
    h.deps.history.mockImplementation(async () => {
      h.advance(5_500);
      return hourlyHistory();
    });
    await h.controller.startBot(bot.id);
    await h.controller.tick();
    expect(h.saved()[0].status).toBe('running');
    expect(h.saved()[0].state.lastLiveObservationAt).toBe(h.deps.now());
    expect(h.deps.history.mock.invocationCallOrder[0]).toBeLessThan(h.deps.market.mock.invocationCallOrder[0]);
  });

  it.each([undefined, 'closed-hour', 'live-price'] as const)(
    'executes two intrahour crosses only for explicit live-price timing: %s',
    async (signalTiming) => {
      const bot = botFixture();
      bot.strategy.kind = 'sma';
      if (signalTiming !== undefined) bot.strategy.signalTiming = signalTiming;
      const h = make(bot);
      h.advance(3 * hour + 20 * 60_000 - h.deps.now());
      await h.controller.tick();
      h.deps.history.mockResolvedValue(hourlyHistory());
      let price = '1';
      h.deps.market.mockImplementation(async () => ({ timestamp: h.deps.now(), close: price }));
      await h.controller.startBot(bot.id);
      await h.controller.tick();
      expect(h.saved()[0].portfolio.trades).toBe(0);
      price = '7';
      h.advance(60_000);
      h.agent.planSwap.mockResolvedValueOnce({
        quote: {
          assetIn: bot.assetIn,
          assetOut: bot.assetOut,
          request: { side: 'input', slippageTolerance: '0.5' },
          amountIn: '1',
          amountInMeta: { codec: '100' },
          amountOut: '0.15',
          minMaxCodec: '14',
          priceImpact: '1',
        },
        expiresAt: h.deps.now() + 10_000,
        warnings: [],
        fees: [{ asset: bot.assetIn, amountCodec: '10', source: 'static' }],
      });
      await h.controller.tick();
      price = '1';
      h.advance(60_000);
      h.agent.planSwap.mockResolvedValueOnce({
        quote: {
          assetIn: bot.assetOut,
          assetOut: bot.assetIn,
          request: { side: 'input', slippageTolerance: '0.5' },
          amountIn: '0.14',
          amountInMeta: { codec: '14' },
          amountOut: '0.15',
          minMaxCodec: '14',
          priceImpact: '1',
        },
        expiresAt: h.deps.now() + 10_000,
        warnings: [],
        fees: [{ asset: bot.assetIn, amountCodec: '10', source: 'static' }],
      });
      await h.controller.tick();
      expect(h.saved()[0].status).toBe('running');
      expect(h.deps.history).toHaveBeenCalledTimes(1);
      expect(h.deps.history).toHaveBeenCalledWith(expect.anything(), { days: 14, interval: 'hour' });
      if (signalTiming === 'live-price') {
        expect(h.saved()[0].portfolio.trades).toBe(2);
        expect(h.agent.planSwap.mock.calls.map((args) => args[0])).toEqual([
          expect.objectContaining({ assetIn: { address: 'in' }, assetOut: { address: 'out' } }),
          expect.objectContaining({ assetIn: { address: 'out' }, assetOut: { address: 'in' } }),
        ]);
        expect(h.saved()[0].portfolio.holdings.out).toBe('0');
        expect(h.saved()[0].state.lastLiveObservationAt).toBe(h.deps.now());
      } else {
        expect(h.agent.planSwap).not.toHaveBeenCalled();
        expect(h.saved()[0].state.lastLiveObservationAt).toBeUndefined();
      }
    }
  );

  it('clears consumed live quotes and research attribution when signal timing changes', async () => {
    const bot = botFixture();
    bot.strategy.kind = 'sma';
    bot.strategy.signalTiming = 'live-price';
    bot.state.lastLiveObservationAt = 900_000;
    bot.state.previousSignal = 1;
    const h = make(bot);
    const edited = clone(bot);
    edited.strategy.signalTiming = 'closed-hour';
    await h.controller.updateBot(edited);
    expect(h.saved()[0].strategy.signalTiming).toBe('closed-hour');
    expect(h.saved()[0].state.lastLiveObservationAt).toBeUndefined();
    expect(h.saved()[0].state.previousSignal).toBeUndefined();
  });
});

/** The initial catalog must explain failure and recover through the existing automatic public-data retry. */
describe('public eligibility initialization status', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function eligibilityHarness(eligibleAssets: () => Promise<import('@/features/bot-trading/types').BotAsset[]>) {
    const h = harness();
    h.storage.listBots.mockResolvedValue([]);
    const next = createBotTradingController({ ...h.deps, eligibleAssets } as unknown as Parameters<
      typeof createBotTradingController
    >[0]);
    controllers.push(next);
    return { ...h, controller: next };
  }

  it('finishes initialization after a stalled finalized RPC, retries at30s and rejects its late head after recovery', async () => {
    vi.useFakeTimers();
    const wallet = (await import('@/lib/soraneo-wallet/src/api')).api as unknown as { connection?: unknown };
    const priorConnection = wallet.connection;
    const ownedConnectionProperty = Object.prototype.hasOwnProperty.call(wallet, 'connection');
    const { fetchLiquidBotAssets } = await import('@/features/bot-trading/eligible-assets');
    const token = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    const entries = vi.fn(async () => [
      [{ args: [{ code: XOR.address }, { code: token.address }] }, [toCodec('2', 18), '1']],
    ]);
    const state = {
      query: {
        denomination: { denominator: vi.fn(async () => '100000000000000000000000000000000000000') },
        poolXYK: { reserves: { entries } },
      },
    };
    let finishHead!: (hash: string) => void;
    const chain = {
      isConnected: true,
      isReady: Promise.resolve(),
      genesisHash: { toString: () => 'genesis' },
      rpc: { chain: { getFinalizedHead: vi.fn(async () => 'finalized') } },
      at: vi.fn(async (_hash: string) => state),
    };
    chain.rpc.chain.getFinalizedHead.mockImplementationOnce(() => new Promise((resolve) => (finishHead = resolve)));
    wallet.connection = { api: chain, endpoint: 'wss://unit-test.invalid' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [token] }))
    );
    const eligibleAssets = vi.fn(fetchLiquidBotAssets);
    const h = eligibilityHarness(eligibleAssets);
    try {
      const initialization = h.controller.initialize();
      await vi.advanceTimersByTimeAsync(0);
      expect(h.controller.assets.value).toEqual([]);
      expect(h.controller.assetsLoading.value).toBe(true);
      expect(h.controller.assetsError.value).toBe('');
      expect(h.controller.assetsLoaded.value).toBe(false);
      await vi.advanceTimersByTimeAsync(15_000);
      await initialization;
      expect(h.controller.loading.value).toBe(false);
      expect(h.controller.assetsLoading.value).toBe(false);
      expect(h.controller.assetsError.value).toBe('bots.errors.stale');
      expect(h.controller.assets.value).toEqual([]);
      expect(chain.at).not.toHaveBeenCalled();
      expect(h.controller.assetsLoaded.value).toBe(false);

      h.advance(29_999);
      await vi.advanceTimersByTimeAsync(29_999);
      expect(eligibleAssets).toHaveBeenCalledTimes(1);
      h.advance(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(eligibleAssets).toHaveBeenCalledTimes(2);
      expect(h.controller.assets.value.map((asset) => asset.symbol)).toEqual(['XOR', 'KUSD']);
      expect(h.controller.assetsError.value).toBe('');
      expect(h.controller.assetsLoading.value).toBe(false);
      expect(h.controller.assetsLoaded.value).toBe(true);
      finishHead('late-finalized');
      await vi.advanceTimersByTimeAsync(0);
      expect(chain.at).toHaveBeenCalledTimes(1);
      expect(chain.at).toHaveBeenCalledWith('finalized');
      expect(h.controller.assetsError.value).toBe('');
      expect(h.controller.assets.value.map((asset) => asset.symbol)).toEqual(['XOR', 'KUSD']);
      expect(h.agent.assets).not.toHaveBeenCalled();
      expect(h.storage.saveBot).not.toHaveBeenCalled();
      expect(h.live.authorize).not.toHaveBeenCalled();
      expect(h.live.execute).not.toHaveBeenCalled();
      expect(h.agent.executeSwap).not.toHaveBeenCalled();
    } finally {
      if (ownedConnectionProperty) wallet.connection = priorConnection;
      else delete wallet.connection;
    }
  });

  it('keeps the last public failure during a pending retry, sanitizes unknown transport text and preserves the action error', async () => {
    vi.useFakeTimers();
    let finishRetry!: (assets: import('@/features/bot-trading/types').BotAsset[]) => void;
    const eligibleAssets = vi.fn(async () => [XOR, VAL]);
    eligibleAssets.mockRejectedValueOnce(new Error('raw provider transport details'));
    eligibleAssets.mockImplementationOnce(() => new Promise((resolve) => (finishRetry = resolve)));
    const h = eligibilityHarness(eligibleAssets);
    h.controller.error.value = 'bots.errors.storage';
    await h.controller.initialize();
    expect(h.controller.assetsError.value).toBe('bots.errors.stale');
    expect(h.controller.error.value).toBe('bots.errors.storage');
    expect(h.controller.assets.value).toEqual([]);
    h.advance(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(eligibleAssets).toHaveBeenCalledTimes(2);
    expect(h.controller.assetsLoading.value).toBe(true);
    expect(h.controller.assetsError.value).toBe('bots.errors.stale');
    finishRetry([XOR, VAL]);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.controller.assetsError.value).toBe('');
    expect(h.controller.assetsLoading.value).toBe(false);
    expect(h.controller.error.value).toBe('bots.errors.storage');
    expect(h.controller.assets.value.map((asset) => asset.symbol)).toEqual(['XOR', 'VAL']);
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.storage.saveBot).not.toHaveBeenCalled();
  });
});

/** An accepted catalog can still contain no pair; only a later real catalog read supplies eligible tokens. */
describe('public eligibility accepted no-pair recovery', () => {
  afterEach(() => vi.useRealTimers());
  it.each([{ noPair: [] }, { noPair: [{ address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals }] }] as {
    noPair: import('@/features/bot-trading/types').BotAsset[];
  }[])(
    'retains accepted no-pair catalog %j without a common-token fallback and recovers at the existing retry',
    async ({ noPair }) => {
      vi.useFakeTimers();
      const h = harness();
      h.storage.listBots.mockResolvedValue([]);
      const eligibleAssets = vi.fn(async () => [XOR, VAL]);
      eligibleAssets.mockResolvedValueOnce(noPair);
      const next = createBotTradingController({ ...h.deps, eligibleAssets } as unknown as Parameters<
        typeof createBotTradingController
      >[0]);
      controllers.push(next);
      expect(next.assetsLoaded.value).toBe(false);
      await next.initialize();
      expect(next.assets.value).toEqual(noPair);
      expect(next.assetsLoaded.value).toBe(true);
      expect(next.assetsError.value).toBe('');
      expect(next.assetsLoading.value).toBe(false);
      expect(h.agent.assets).not.toHaveBeenCalled();
      h.advance(30_000);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(eligibleAssets).toHaveBeenCalledTimes(2);
      expect(next.assets.value.map((asset) => asset.symbol)).toEqual(['XOR', 'VAL']);
      expect(next.assetsLoaded.value).toBe(true);
      expect(next.assetsError.value).toBe('');
      expect(h.agent.assets).not.toHaveBeenCalled();
      expect(h.storage.saveBot).not.toHaveBeenCalled();
      expect(h.live.authorize).not.toHaveBeenCalled();
      expect(h.live.execute).not.toHaveBeenCalled();
      expect(h.agent.executeSwap).not.toHaveBeenCalled();
    }
  );
});

describe('long-running session memory bounds', () => {
  it('keeps activity, equity and chart observations bounded however long a session runs', async () => {
    const bot = botFixture();
    // The price (2) never reaches the buy trigger, so every one-minute evaluation records a hold and an equity point.
    bot.strategy = { ...bot.strategy, kind: 'threshold', threshold: '1', direction: 'below' };
    bot.policy.sessionDurationMs = 86_400_000;
    const h = make(bot);
    await h.controller.initialize();
    await h.controller.selectBot('bot-1');
    await h.controller.startBot('bot-1');
    for (let minute = 0; minute < 1050; minute++) {
      h.advance(60_000);
      await h.controller.tick();
    }
    const saved = h.saved()[0];
    expect(saved.status).toBe('running');
    expect(saved.portfolio.trades).toBe(0);
    expect(saved.activity).toHaveLength(200);
    expect(saved.activity[0]).toMatchObject({ kind: 'hold', timestamp: h.deps.now() });
    expect(saved.equity).toHaveLength(1000);
    expect(saved.equity.at(-1)?.timestamp).toBe(h.deps.now());
    // 120 live observations plus at most the one loaded history candle that precedes them.
    expect(h.controller.chartCandles.value.length).toBeGreaterThanOrEqual(120);
    expect(h.controller.chartCandles.value.length).toBeLessThanOrEqual(121);
    expect(h.controller.chartCandles.value.at(-1)?.timestamp).toBe(h.deps.now());
  });
});
