// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blake2AsHex } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import {
  createGoalLiveExecutor,
  type GoalLiveDependencies,
  type GoalOwnedPreparation,
} from '@/features/bot-trading/goal-live';
import { createGoalStorage, type GoalStorageLedger } from '@/features/bot-trading/goal-storage';
import type { GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { GoalExecutionBot, GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
import { goalMarkFromExecutionContext } from '@/features/bot-trading/goal-policy';
import { createGoalExecutionSession } from '@/features/agent-trading/goal-execution-session';
import { assertGoalQualificationRuntime, assertGoalQualificationFee } from '@/features/bot-trading/goal-qualification';
import { readGoalFinalizedReceipt } from '@/features/bot-trading/goal-receipt';
import { discoverGoalFinalizedReceipt } from '@/features/bot-trading/goal-recovery';
import {
  captureGoalSigningPayload,
  retainGoalSignedMortality,
  verifyGoalPersistedSigning,
} from '@/features/bot-trading/goal-mortality';
import { goalSigningFixture } from './goal-signing-fixture';
import type { ExecutionStateContext } from '@/features/bot-trading/execution-state';
import type { AgentPreparedSwap } from '@/features/agent-trading/types';
import { createExecutionStateFixture } from './execution-state-fixture';
import { executionStatus } from './execution-fixtures';
import { GOAL_TEST_START, goalStorageBot, goalTestCodec, goalTestHash, goalTestSha } from './goal-storage-fixtures';

vi.unmock('@polkadot/util-crypto');
const mocks = vi.hoisted(() => ({ qualified: new WeakSet<object>() }));
vi.mock('@/features/bot-trading/goal-qualification', () => ({
  assertGoalQualificationVerification: (q: object) => {
    if (!mocks.qualified.has(q)) throw Error('unqualified');
  },
  assertGoalQualificationRuntime: vi.fn(),
  assertGoalQualificationFee: vi.fn((q: object) => {
    if (!mocks.qualified.has(q)) throw Error('unqualified');
  }),
}));
vi.mock('@/features/agent-trading/goal-execution-session', () => ({ createGoalExecutionSession: vi.fn() }));
vi.mock('@/features/agent-trading/goal-swap', async (original) => ({
  ...(await original<object>()),
  projectGoalSwapEstimate: ({ estimate }: { estimate: { testQuote: object } }) => ({ quote: estimate.testQuote }),
}));
vi.mock('@/features/bot-trading/goal-policy', async (original) => ({
  ...(await original<object>()),
  assertGoalPrepared: vi.fn(async (_bot, _proposal, p: AgentPreparedSwap) => ({
    mark: goalMarkFromExecutionContext(p.quote.execution!.estimate.context),
    fill: {
      inputAsset: p.quote.assetIn.address,
      inputCodec: p.quote.amountInMeta.codec,
      outputAsset: p.quote.assetOut.address,
      minimumOutputCodec: p.quote.minMaxCodec,
      feeCeilingCodec: goalTestCodec(1).slice(0, -2),
    },
    callHex: '0x0102',
    envelopeDigest: goalTestSha(15),
  })),
  assertGoalPreparedContext: vi.fn(),
  assertGoalQuote: vi.fn(() => ({ fill: { feeCeilingCodec: '10000000000000000' } })),
  assertGoalCallHex: (_p: unknown, call: string) => {
    if (call !== '0x0102') throw Error('wrong-call');
  },
}));
vi.mock('@/features/bot-trading/goal-receipt', async (original) => ({
  ...(await original<object>()),
  readGoalFinalizedReceipt: vi.fn(),
}));
vi.mock('@/features/bot-trading/goal-recovery', () => ({ discoverGoalFinalizedReceipt: vi.fn() }));

const data = createExecutionStateFixture();
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const active: ReturnType<typeof createGoalLiveExecutor>[] = [];
afterEach(async () => {
  for (const executor of active.splice(0)) executor.dispose();
  await Promise.resolve();
  vi.clearAllMocks();
});
function context(height: number, timestampMs: number): ExecutionStateContext {
  const originalPool = clone(data.pool);
  if (originalPool.status !== 'present') throw Error('synthetic pool must be present');
  const pool = {
    ...originalPool,
    binding: { ...originalPool.binding, blockHash: goalTestHash(height) },
    state: { ...originalPool.state, timestampMs },
    ...(height === 100
      ? { reserves: { ...originalPool.reserves, kusdCodec: goalTestCodec(100), xorCodec: goalTestCodec(100) } }
      : {}),
  };
  return {
    kind: 'finalized-browser-execution-context',
    policy: { maximumContextAgeMsExclusive: 5000 } as ExecutionStateContext['policy'],
    genesisHash: pool.binding.genesisHash,
    block: { height, hash: goalTestHash(height), parentHash: goalTestHash(height - 1), timestampMs },
    checkedAtMs: timestampMs,
    receivedAtMs: timestampMs,
    expectedDenominator: '1',
    codecBinding: pool.binding,
    codeHash: goalTestHash(9),
    pool,
    finalityAttestation: 'rpc-canonical-finalized',
    rpcCalls: 8,
    observedFill: false,
    transactionSubmitted: false,
  };
}
function setup(account = `0x${'12'.repeat(32)}`) {
  const bot = goalStorageBot();
  bot.status = 'paused';
  bot.sessionExpiresAt = 0;
  bot.account = account;
  let now = GOAL_TEST_START;
  let ledger: GoalStorageLedger = { bots: [clone(bot)], orders: [] };
  const goals = createGoalStorage(
    async (write, action) => {
      const next = clone(ledger);
      const result = action(next);
      if (write) ledger = next;
      return result;
    },
    () => now
  );
  const storage = {
    goals,
    listBots: vi.fn(async () => clone(ledger.bots)),
    listOrders: vi.fn(async (id?: string) => clone(ledger.orders.filter((o) => !id || o.botId === id))),
  } as unknown as GoalEnabledBotStorage;
  for (const key of ['reserve', 'sign', 'submit', 'cancel', 'persistFinalReceipt', 'applyReceipt', 'pause'] as const)
    vi.spyOn(goals, key);
  const status = executionStatus();
  status.wallet.address = bot.account;
  status.wallet.source = 'synthetic';
  status.node.genesisHash = bot.network;
  status.node.blockNumber = 100;
  status.node.runtimeSpecVersion = 130;
  const listeners = new Map<string, Set<() => void>>();
  const client = {
    isConnected: true,
    genesisHash: { toHex: () => bot.network },
    runtimeVersion: { toHex: () => '0x0102' },
    runtimeMetadata: {},
    on: vi.fn((event: string, fn: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    }),
    off: vi.fn((event: string, fn: () => void) => listeners.get(event)?.delete(fn)),
  } as unknown as ReturnType<GoalLiveDependencies['client']>;
  const initial = context(100, GOAL_TEST_START),
    fresh = context(101, GOAL_TEST_START + 6000),
    settlement = context(102, GOAL_TEST_START + 12000);
  const fee = '10000000000000000';
  const quote = {
    assetIn: { ...bot.assetIn, name: 'KUSD' },
    assetOut: { ...bot.assetOut, name: 'XOR' },
    amountInMeta: { codec: goalTestCodec(2) },
    raw: { amount: goalTestCodec(2) },
    quoteDigest: goalTestSha(14),
    minMaxCodec: '1990000000000000000',
    execution: { estimate: { context: initial, fee: { policySha256: goalTestSha(16) } } },
  };
  const prepared = {
    intentId: 'polkaswap:swap:sha256:' + goalTestSha(17),
    quote,
    envelope: {
      preparedAt: GOAL_TEST_START,
      expiresAt: GOAL_TEST_START + 30000,
      preparedAtBlock: 100,
      expiresAtBlock: 106,
      network: { genesisHash: bot.network, runtimeSpecVersion: 130 },
      signer: { address: bot.account, source: 'synthetic' },
    },
  } as unknown as AgentPreparedSwap;
  let signedHex = '0x8401020304';
  const signed = {
    method: { section: 'liquidityProxy', method: 'swap', toHex: () => '0x0102' },
    isSigned: true,
    era: { isMortalEra: true, asMortalEra: { period: { toNumber: () => 64 } } },
    signer: { toString: () => bot.account },
    toHex: () => signedHex,
    hash: { toHex: () => blake2AsHex(hexToU8a(signedHex), 256) },
    send: vi.fn(async (cb: (value: unknown) => void) => {
      cb({ status: { isFinalized: true, asFinalized: { toHex: () => goalTestHash(102) } } });
      return vi.fn();
    }),
  } as unknown as ReturnType<GoalLiveDependencies['build']>;
  const signer = { sign: vi.fn(async () => signed), lock: vi.fn() };
  const seen = new WeakSet([initial, fresh]);
  const ownedSession = {
    capture: vi.fn(async () => {
      now = GOAL_TEST_START + 6000;
      status.node.blockNumber = 101;
      return fresh;
    }),
    quote: vi.fn(async (ctx: ExecutionStateContext) => {
      expect(ctx).toBe(fresh);
      return { status: 'available', testQuote: { ...quote, minMaxCodec: '1995000000000000000' } };
    }),
    estimateEnvelopeFee: vi.fn(async (ctx: ExecutionStateContext, input: unknown) => {
      expect(ctx).toBe(fresh);
      expect(input).toMatchObject({ envelopeHex: signedHex, quotedAmountOutCodec: goalTestCodec(2) });
      return { fee: { amountCodec: fee } };
    }),
    assertCurrent: vi.fn((ctx: ExecutionStateContext) => {
      if (!seen.has(ctx)) throw Error('not-owned');
    }),
    dispose: vi.fn(),
  };
  const owned = {
    prepared,
    context: initial,
    session: ownedSession,
    assertCurrent: vi.fn(),
    dispose: vi.fn(),
  } as unknown as GoalOwnedPreparation;
  const reconciliationSession = {
    capture: vi.fn(async () => {
      now = GOAL_TEST_START + 12000;
      return settlement;
    }),
    assertCurrent: vi.fn(),
    dispose: vi.fn(),
  };
  const authorizationSession = { capture: vi.fn(async () => initial), assertCurrent: vi.fn(), dispose: vi.fn() };
  vi.mocked(createGoalExecutionSession)
    .mockReset()
    .mockReturnValue(reconciliationSession as unknown as ReturnType<typeof createGoalExecutionSession>)
    .mockReturnValueOnce(authorizationSession as unknown as ReturnType<typeof createGoalExecutionSession>);
  vi.mocked(readGoalFinalizedReceipt).mockImplementation(async (options) => ({
    goalId: options.order.goalExecution.goalId,
    orderId: options.order.id,
    account: bot.account,
    network: bot.network,
    txHash: options.order.txHash!,
    blockHash: goalTestHash(102),
    blockNumber: 102,
    extrinsicIndex: 0,
    success: true,
    outputCodec: goalTestCodec(2),
    actualFeeCodec: fee,
    evidenceDigest: goalTestSha(20),
  }));
  vi.mocked(discoverGoalFinalizedReceipt)
    .mockReset()
    .mockResolvedValue({
      status: 'not-found',
      finalizedBlockHash: goalTestHash(102),
      firstScannedBlock: 1,
      lastScannedBlock: 102,
      scannedBlocks: 102,
      expiryProven: false,
    });
  const qualification = {} as ReturnType<GoalLiveDependencies['qualification']>;
  mocks.qualified.add(qualification);
  const deps: GoalLiveDependencies = {
    prepare: vi.fn(async () => owned),
    qualification: vi.fn(() => qualification),
    signer: vi.fn(async () => signer),
    build: vi.fn(() => signed),
    balances: vi.fn(async () => ({
      [bot.assetIn.address]: goalTestCodec(100),
      [bot.assetOut.address]: goalTestCodec(100),
    })),
    status: () => status,
    client: () => client,
    acquire: vi.fn(async () => vi.fn()),
    now: () => now,
  };
  const executor = createGoalLiveExecutor(storage, deps);
  active.push(executor);
  return {
    bot,
    storage,
    goals,
    status,
    client,
    listeners,
    signer,
    signed,
    owned,
    ownedSession,
    reconciliationSession,
    authorizationSession,
    deps,
    executor,
    read: () => clone(ledger),
    setNow: (value: number) => {
      now = value;
    },
    setHex: (v: string) => {
      signedHex = v;
    },
    emit: (event: string) => {
      for (const fn of listeners.get(event) ?? []) fn();
    },
  };
}
const proposal = { action: 'buy' as const, amount: '2', reason: 'synthetic' };
async function authorized(account?: string) {
  const f = setup(account);
  await f.executor.authorize(f.bot);
  return f;
}

describe('goal live orchestration with real exact storage and mocked verified I/O boundaries', () => {
  it('durably preserves the actual captured payload when Stop wins a late signing await', async () => {
    const crypto = goalSigningFixture(),
      f = await authorized(crypto.pair.address);
    const signed = crypto.signed();
    expect(retainGoalSignedMortality(captureGoalSigningPayload(crypto.input), signed)).toBe(true);
    f.signer.sign.mockImplementationOnce(async () => {
      await f.executor.stop(f.bot.id);
      return signed as unknown as Awaited<ReturnType<typeof f.signer.sign>>;
    });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow();
    const order = f.read().orders[0] as GoalExecutionOrder;
    expect(order.goalExecution.phase).toBe('signed');
    expect(order.signingEvidence?.signedEnvelopeHex).toBe(signed.toHex());
    expect(
      verifyGoalPersistedSigning(order.signingEvidence, {
        account: order.account,
        network: order.network,
        txHash: order.txHash!,
        signedEnvelopeDigest: order.goalExecution.signedEnvelopeDigest!,
      })
    ).toMatchObject({ birthBlockNumber: 335, deathBlockNumber: 399, nonceCodec: '7' });
    expect(f.signed.send).not.toHaveBeenCalled();
    expect(f.goals.cancel).not.toHaveBeenCalled();
  });
  it('uses explicit XYK input, owned post-signing context and exact signed fees; settles once and keeps a clean session', async () => {
    const f = await authorized();
    await f.executor.execute(f.bot, proposal);
    expect(f.deps.prepare).toHaveBeenCalledWith(
      expect.objectContaining({
        side: 'input',
        dexId: 0,
        liquiditySource: 'XYKPool',
        amount: '2',
        slippageTolerance: '0.5',
      })
    );
    expect(f.ownedSession.estimateEnvelopeFee).toHaveBeenCalledOnce();
    expect(vi.mocked(f.goals.sign).mock.invocationCallOrder[0]).toBeLessThan(
      f.ownedSession.capture.mock.invocationCallOrder[0]
    );
    expect(vi.mocked(f.goals.persistFinalReceipt).mock.invocationCallOrder[0]).toBeLessThan(
      f.reconciliationSession.capture.mock.invocationCallOrder[0]
    );
    const final = f.read();
    expect(final.bots[0].status).toBe('running');
    expect(final.bots[0].portfolio.trades).toBe(1);
    expect(final.orders[0].status).toBe('confirmed');
    expect(final.bots[0].portfolio.feesPaidCodec).toBe('10000000000000000');
    expect(f.goals.submit).toHaveBeenCalledOnce();
    expect(f.signer.lock).not.toHaveBeenCalled();
  });
  it.each(['XOR reserve', 'KUSD input'] as const)(
    'pauses after a finalized fill if unrelated wallet spending depletes the %s allocation',
    async (asset) => {
      const f = await authorized();
      const readBalances = vi.mocked(f.deps.balances).getMockImplementation()!;
      const readMark = f.reconciliationSession.capture.getMockImplementation()!;
      let depleted = false;
      vi.mocked(f.deps.balances).mockImplementation(async (bot) => {
        const balances = await readBalances(bot);
        if (depleted) balances[asset === 'XOR reserve' ? bot.assetOut.address : bot.assetIn.address] = '0';
        return balances;
      });
      f.reconciliationSession.capture.mockImplementation(async () => {
        const mark = await readMark();
        depleted = true;
        return mark;
      });

      await f.executor.execute(f.bot, proposal);

      const final = f.read();
      expect(final.orders[0].status).toBe('confirmed');
      expect(final.bots[0].portfolio.trades).toBe(1);
      expect(final.bots[0].portfolio.feesPaidCodec).toBe('10000000000000000');
      expect(final.bots[0].status).toBe('paused');
      expect(f.signer.lock).toHaveBeenCalledOnce();
      expect(f.goals.pause).toHaveBeenCalledOnce();
      expect(f.signed.send).toHaveBeenCalledOnce();
    }
  );
  it('does not repeat Stop when a post-finalization balance read finishes late', async () => {
    const f = await authorized();
    const regular = vi.mocked(f.deps.balances).getMockImplementation()!;
    const lateRead = deferred<Record<string, string>>();
    let reads = 0;
    vi.mocked(f.deps.balances).mockImplementation((bot) => {
      reads++;
      return reads === 3 ? lateRead.promise : regular(bot);
    });
    const executing = f.executor.execute(f.bot, proposal);
    // Authorization used two reads before the mock was installed. Execution's
    // first and second reads are synchronous-to-await; the third follows receipt accounting.
    await vi.waitFor(() => expect(reads).toBe(3));
    expect(f.read().orders[0].status).toBe('confirmed');
    await f.executor.stop(f.bot.id);
    lateRead.resolve({ [f.bot.assetIn.address]: '0', [f.bot.assetOut.address]: '0' });
    await executing;

    expect(f.read().bots[0].status).toBe('paused');
    expect(f.goals.pause).toHaveBeenCalledOnce();
    expect(f.signer.lock).toHaveBeenCalledOnce();
    expect(f.signed.send).toHaveBeenCalledOnce();
    await f.executor.authorize(f.read().bots[0] as GoalExecutionBot);
    expect(f.read().bots[0].status).toBe('running');
  });
  it('rejects a forged qualification before a signer or lease is touched', async () => {
    const f = setup();
    f.deps.qualification = () => ({}) as ReturnType<GoalLiveDependencies['qualification']>;
    await expect(f.executor.authorize(f.bot)).rejects.toThrow('unqualified');
    expect(f.deps.signer).not.toHaveBeenCalled();
    expect(f.deps.acquire).not.toHaveBeenCalled();
  });
  it('checks current runtime qualification and balance readiness before wallet unlock', async () => {
    const unqualified = setup();
    vi.mocked(assertGoalQualificationRuntime).mockImplementationOnce(() => {
      throw Error('runtime-not-qualified');
    });
    await expect(unqualified.executor.authorize(unqualified.bot)).rejects.toThrow('runtime-not-qualified');
    expect(unqualified.deps.signer).not.toHaveBeenCalled();
    expect(unqualified.authorizationSession.dispose).toHaveBeenCalledOnce();
    const unfunded = setup();
    vi.mocked(unfunded.deps.balances).mockResolvedValue({});
    await expect(unfunded.executor.authorize(unfunded.bot)).rejects.toThrow('bots.errors.balance');
    expect(unfunded.deps.signer).not.toHaveBeenCalled();
  });
  it('checks the actual SDK genesis even when public status still advertises the approved network', async () => {
    const f = setup();
    f.client.genesisHash.toHex = () => goalTestHash(88);
    await expect(f.executor.authorize(f.bot)).rejects.toThrow();
    expect(f.deps.signer).not.toHaveBeenCalled();
    expect(f.status.node.genesisHash).toBe(f.bot.network);
  });
  it('revokes synchronously while the account lease is pending and releases its late result', async () => {
    const f = setup(),
      d = deferred<() => void>(),
      release = vi.fn();
    f.deps.acquire = vi.fn(() => d.promise);
    const running = f.executor.authorize(f.bot);
    await vi.waitFor(() => expect(f.deps.acquire).toHaveBeenCalled());
    await f.executor.stop(f.bot.id);
    d.resolve(release);
    await expect(running).rejects.toThrow();
    expect(release).toHaveBeenCalledOnce();
    expect(f.deps.signer).not.toHaveBeenCalled();
  });
  it('latches disconnect/reconnect while wallet authorization awaits', async () => {
    const f = setup(),
      d = deferred<typeof f.signer>();
    f.deps.signer = vi.fn(() => d.promise);
    const running = f.executor.authorize(f.bot);
    await vi.waitFor(() => expect(f.deps.signer).toHaveBeenCalled());
    f.emit('disconnected');
    f.emit('connected');
    d.resolve(f.signer);
    await expect(running).rejects.toThrow();
    expect(f.signer.lock).toHaveBeenCalled();
    expect(f.deps.client().off).toHaveBeenCalled();
  });
  it('retains eventual signed bytes after Stop and never broadcasts or invents a zero-fee cancellation', async () => {
    const f = await authorized(),
      d = deferred<typeof f.signed>();
    f.signer.sign.mockImplementation(() => d.promise);
    const running = f.executor.execute(f.bot, proposal);
    await vi.waitFor(() => expect(f.signer.sign).toHaveBeenCalled());
    await f.executor.stop(f.bot.id);
    d.resolve(f.signed);
    await expect(running).rejects.toThrow();
    expect(f.goals.sign).toHaveBeenCalledOnce();
    expect(f.read().orders[0].status).toBe('signed');
    expect(f.signed.send).not.toHaveBeenCalled();
    expect(f.goals.cancel).not.toHaveBeenCalled();
  });
  it.each(['time', 'block', 'wallet', 'runtime', 'actual-genesis'] as const)(
    'retains signed facts but refuses a review whose %s identity or deadline changed during signing',
    async (change) => {
      const f = await authorized();
      f.signer.sign.mockImplementation(async () => {
        if (change === 'time') f.setNow(GOAL_TEST_START + 30000);
        if (change === 'block') f.status.node.blockNumber = 107;
        if (change === 'wallet') f.status.wallet.source = 'changed';
        if (change === 'runtime') f.status.node.runtimeSpecVersion = 131;
        if (change === 'actual-genesis') f.client.genesisHash.toHex = () => goalTestHash(88);
        return f.signed;
      });
      await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow();
      expect(f.read().orders[0].status).toBe('signed');
      expect(f.ownedSession.capture).not.toHaveBeenCalled();
      expect(f.signed.send).not.toHaveBeenCalled();
      expect(f.goals.cancel).not.toHaveBeenCalled();
    }
  );
  it('rechecks the original review deadline after fresh signed-envelope fee work', async () => {
    const f = await authorized();
    f.ownedSession.estimateEnvelopeFee.mockImplementation(async () => {
      f.setNow(GOAL_TEST_START + 30000);
      return { fee: { amountCodec: '10000000000000000' } };
    });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('bots.errors.intent');
    expect(f.read().orders[0].status).toBe('signed');
    expect(f.goals.submit).not.toHaveBeenCalled();
    expect(f.signed.send).not.toHaveBeenCalled();
  });
  it('attempts every owned cleanup and pauses durably even when SDK cleanup throws', async () => {
    const f = await authorized(),
      d = deferred<typeof f.signed>();
    const release = vi.mocked(f.deps.acquire).mock.results[0];
    const releaseFn = (await release.value) as ReturnType<GoalLiveDependencies['acquire']> extends Promise<infer R>
      ? R
      : never;
    vi.mocked(f.owned.dispose).mockImplementation(() => {
      throw Error('dispose-failed');
    });
    f.signer.lock.mockImplementation(() => {
      throw Error('lock-failed');
    });
    vi.mocked(f.client.off).mockImplementation(() => {
      throw Error('off-failed');
    });
    vi.mocked(releaseFn).mockImplementation(() => {
      throw Error('release-failed');
    });
    f.signer.sign.mockImplementation(() => d.promise);
    const executing = f.executor.execute(f.bot, proposal);
    await vi.waitFor(() => expect(f.signer.sign).toHaveBeenCalled());
    await expect(f.executor.stop(f.bot.id)).rejects.toThrow('dispose-failed');
    expect(f.read().bots[0].status).toBe('paused');
    expect(f.signer.lock).toHaveBeenCalledOnce();
    expect(f.client.off).toHaveBeenCalledTimes(2);
    expect(releaseFn).toHaveBeenCalledOnce();
    d.resolve(f.signed);
    await expect(executing).rejects.toThrow();
    expect(f.read().orders[0].status).toBe('signed');
    expect(f.signed.send).not.toHaveBeenCalled();
  });
  it('keeps an uncertain rejected signing request pending rather than manufacturing a settlement', async () => {
    const f = await authorized();
    f.signer.sign.mockRejectedValue(Error('unknown-signing-result'));
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow();
    expect(f.read().orders[0].status).toBe('reserved');
    expect(f.goals.cancel).not.toHaveBeenCalled();
    expect(f.goals.applyReceipt).not.toHaveBeenCalled();
  });
  it('preserves a changed signed call as a fact before refusing to send it', async () => {
    const f = await authorized();
    f.signer.sign.mockImplementation(async () => {
      f.signed.method.toHex = () => '0x0304';
      return f.signed;
    });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('wrong-call');
    expect(f.read().orders[0].status).toBe('signed');
    expect(f.goals.cancel).not.toHaveBeenCalled();
    expect(f.signed.send).not.toHaveBeenCalled();
  });
  it('rejects an actual signed-envelope fee above the reserved ceiling without changing the signed minimum', async () => {
    const f = await authorized();
    f.ownedSession.estimateEnvelopeFee.mockResolvedValue({ fee: { amountCodec: '10000000000000001' } });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('bots.errors.feeBudget');
    expect(f.read().orders[0].minOutputCodec).toBe('1990000000000000000');
    expect(f.read().orders[0].status).toBe('signed');
    expect(f.signed.send).not.toHaveBeenCalled();
  });
  it('rejects a fresh executable minimum below the original signed minimum', async () => {
    const f = await authorized();
    f.ownedSession.quote.mockResolvedValue({
      status: 'available',
      testQuote: { ...f.owned.prepared.quote, minMaxCodec: '1980000000000000000' } as Awaited<
        ReturnType<typeof f.ownedSession.quote>
      >['testQuote'],
    });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('bots.errors.policy');
    expect(f.signed.send).not.toHaveBeenCalled();
    expect(f.goals.cancel).not.toHaveBeenCalled();
  });
  it('checks qualification runtime identity before requesting any signature', async () => {
    const f = await authorized();
    vi.mocked(assertGoalQualificationRuntime).mockImplementationOnce(() => {
      throw Error('runtime-not-qualified');
    });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('runtime-not-qualified');
    expect(f.signer.sign).not.toHaveBeenCalled();
  });
  it('rejects a qualified monetary fee cap before reserving or signing', async () => {
    const f = await authorized();
    vi.mocked(assertGoalQualificationFee).mockImplementationOnce(() => {
      throw Error('qualified-fee-cap');
    });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('qualified-fee-cap');
    expect(f.signer.sign).not.toHaveBeenCalled();
    expect(f.read().orders).toHaveLength(0);
  });
  it.each([2, 3])('rechecks the qualified cap at post-signing fee stage %s before submission', async (stage) => {
    const f = await authorized();
    for (let i = 1; i < stage; i++) vi.mocked(assertGoalQualificationFee).mockImplementationOnce(() => undefined);
    vi.mocked(assertGoalQualificationFee).mockImplementationOnce(() => {
      throw Error('qualified-fee-cap');
    });
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('qualified-fee-cap');
    expect(f.signer.sign).toHaveBeenCalledOnce();
    expect(f.signed.send).not.toHaveBeenCalled();
    expect(f.read().orders[0].status).toBe('signed');
  });
  it('retains a canonical receipt before a failed valuation and reconciles it without another receipt lookup', async () => {
    const f = await authorized();
    f.reconciliationSession.capture.mockRejectedValueOnce(Error('mark-unavailable'));
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('mark-unavailable');
    expect((f.read().orders[0] as GoalExecutionOrder).finalReceipt?.accounting).toBe('pending');
    await f.executor.reconcile(f.read().bots[0] as GoalExecutionBot);
    expect(f.read().orders[0].status).toBe('confirmed');
    expect(readGoalFinalizedReceipt).toHaveBeenCalledOnce();
    expect(f.read().bots[0].status).toBe('paused');
  });
  it('retains a discovered late receipt without observing or accounting at the late wall clock', async () => {
    const f = await authorized();
    f.ownedSession.estimateEnvelopeFee.mockRejectedValueOnce(Error('no-fee'));
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow();
    const before = f.read().bots[0] as GoalExecutionBot;
    f.setNow(before.exactGoalState.episode.endedAtMs + 60000);
    vi.mocked(discoverGoalFinalizedReceipt).mockImplementationOnce(async (options) => ({
      status: 'included',
      receipt: await readGoalFinalizedReceipt({ ...options, blockHash: goalTestHash(102) }),
    }));
    await f.executor.reconcile(before);
    const order = f.read().orders[0] as GoalExecutionOrder;
    expect(order.goalExecution.phase).toBe('finalized-pending');
    expect(order.finalReceipt?.receipt.actualFeeCodec).toBe('10000000000000000');
    expect((f.read().bots[0] as GoalExecutionBot).exactGoalState).toEqual(before.exactGoalState);
    expect(f.reconciliationSession.capture).not.toHaveBeenCalled();
    expect(f.goals.applyReceipt).not.toHaveBeenCalled();
    expect(f.signed.send).not.toHaveBeenCalled();
  });
  it('stops ordinary receipt accounting if its valuation read crosses the original deadline', async () => {
    const f = await authorized();
    const before = f.read().bots[0] as GoalExecutionBot;
    let beforeReceipt = before.exactGoalState;
    const capture = f.reconciliationSession.capture.getMockImplementation()!;
    f.reconciliationSession.capture.mockImplementation(async () => {
      beforeReceipt = (f.read().bots[0] as GoalExecutionBot).exactGoalState;
      const context = await capture();
      f.setNow(before.exactGoalState.episode.endedAtMs + 1);
      return context;
    });
    await f.executor.execute(f.bot, proposal);
    expect((f.read().orders[0] as GoalExecutionOrder).goalExecution.phase).toBe('finalized-pending');
    expect((f.read().bots[0] as GoalExecutionBot).exactGoalState).toEqual(beforeReceipt);
    expect(f.goals.applyReceipt).not.toHaveBeenCalled();
    expect(f.signer.lock).toHaveBeenCalled();
  });
  it('records genuine failed-extrinsic fee overruns without treating them as admission failures', async () => {
    const f = await authorized();
    vi.mocked(readGoalFinalizedReceipt).mockImplementationOnce(async (o) => ({
      goalId: o.order.goalExecution.goalId,
      orderId: o.order.id,
      account: o.order.account,
      network: o.order.network,
      txHash: o.order.txHash!,
      blockHash: goalTestHash(102),
      blockNumber: 102,
      extrinsicIndex: 0,
      success: false,
      outputCodec: '0',
      actualFeeCodec: '20000000000000000',
      evidenceDigest: goalTestSha(20),
    }));
    await f.executor.execute(f.bot, proposal);
    expect(f.read().orders[0].status).toBe('failed');
    expect(f.read().bots[0].portfolio.feesPaidCodec).toBe('20000000000000000');
    expect(f.read().bots[0].portfolio.trades).toBe(0);
    expect(f.read().bots[0].status).toBe('attention');
    expect(f.signer.lock).toHaveBeenCalledOnce();
  });
  it('does not turn a missing candidate or unavailable receipt into an expired zero-fee transaction', async () => {
    const f = await authorized();
    f.ownedSession.estimateEnvelopeFee.mockRejectedValueOnce(Error('no-fee'));
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow();
    await f.executor.reconcile(f.read().bots[0] as GoalExecutionBot);
    expect(readGoalFinalizedReceipt).not.toHaveBeenCalled();
    expect(f.read().orders[0].status).toBe('signed');
    vi.mocked(readGoalFinalizedReceipt).mockRejectedValueOnce(Error('not-in-block'));
    await expect(f.executor.reconcile(f.read().bots[0] as GoalExecutionBot, goalTestHash(999))).rejects.toThrow();
    expect(f.read().orders[0].status).toBe('signed');
    expect(f.goals.cancel).not.toHaveBeenCalled();
  });
  it('discovers a finalized receipt without a candidate and retains it before accounting', async () => {
    const f = await authorized();
    f.ownedSession.estimateEnvelopeFee.mockRejectedValueOnce(Error('no-fee'));
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow();
    vi.mocked(discoverGoalFinalizedReceipt).mockImplementationOnce(async (options) => ({
      status: 'included',
      receipt: await readGoalFinalizedReceipt({ ...options, blockHash: goalTestHash(102) }),
    }));
    await f.executor.reconcile(f.read().bots[0] as GoalExecutionBot);
    expect(discoverGoalFinalizedReceipt).toHaveBeenCalledOnce();
    expect(f.read().orders[0].status).toBe('confirmed');
    expect(f.read().bots[0].portfolio.trades).toBe(1);
    expect(f.read().bots[0].status).toBe('paused');
    expect(vi.mocked(f.goals.persistFinalReceipt).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(f.goals.applyReceipt).mock.invocationCallOrder[0]
    );
    expect(f.signer.sign).toHaveBeenCalledOnce();
    expect(f.signed.send).not.toHaveBeenCalled();
  });
  it('keeps an unavailable discovery pending and never asks the signer to retry', async () => {
    const f = await authorized();
    f.ownedSession.estimateEnvelopeFee.mockRejectedValueOnce(Error('no-fee'));
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow();
    vi.mocked(discoverGoalFinalizedReceipt).mockRejectedValueOnce(Error('archive-unavailable'));
    await expect(f.executor.reconcile(f.read().bots[0] as GoalExecutionBot)).rejects.toThrow('archive-unavailable');
    expect(f.read().orders[0].status).toBe('signed');
    expect(f.goals.persistFinalReceipt).not.toHaveBeenCalled();
    expect(f.goals.cancel).not.toHaveBeenCalled();
    expect(f.signer.sign).toHaveBeenCalledOnce();
  });
  it('refuses detached public context clones as provider-owned preparation', async () => {
    const f = await authorized();
    f.owned.context = clone(f.owned.context);
    await expect(f.executor.execute(f.bot, proposal)).rejects.toThrow('not-owned');
    expect(f.signer.sign).not.toHaveBeenCalled();
  });
  it('previews budget availability without asking for a signer or allocating again', async () => {
    const f = setup();
    expect((await f.executor.previewAllocation(f.bot)).sufficient).toBe(true);
    expect(f.deps.signer).not.toHaveBeenCalled();
    expect(f.read().bots[0].status).toBe('paused');
  });
});
