// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { encodeAddress } from '@polkadot/util-crypto';
import {
  createGoalFundingService,
  type GoalFundingDependencies,
  type GoalFundingRequest,
} from '@/features/bot-trading/goal-funding';
import { createGoalExecutionSession } from '@/features/agent-trading/goal-execution-session';
import {
  createGoalQualificationBoundary,
  type GoalQualificationVerification,
} from '@/features/bot-trading/goal-qualification';
import { createGoalStorage, type GoalStorageLedger } from '@/features/bot-trading/goal-storage';
import {
  GOAL_EXACT_POLICY,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
} from '@/features/bot-trading/goal-exact-ledger';
import type { GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { ExecutionStateContext } from '@/features/bot-trading/execution-state';
import { createExecutionStateFixture } from './execution-state-fixture';
import { syntheticQualificationEvaluator, syntheticQualificationPlan } from './goal-qualification-fixtures';
import { executionStatus } from './execution-fixtures';
import {
  goalStorageBot,
  goalStorageOrder,
  goalTestCodec,
  goalTestHash,
  GOAL_TEST_START,
} from './goal-storage-fixtures';
vi.unmock('@polkadot/util-crypto');
vi.mock('@/features/agent-trading/goal-execution-session', () => ({ createGoalExecutionSession: vi.fn() }));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const data = createExecutionStateFixture();
if (data.pool.status !== 'present') throw Error('missing invented pool');
const profile = {
  ...data.pool.binding.runtimeVersion,
  metadataSha256: data.pool.binding.metadataSha256,
  codeHash: goalTestHash(104),
};
const account = encodeAddress(`0x${'12'.repeat(32)}`, 69);
let verification: GoalQualificationVerification;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
beforeAll(async () => {
  const plan = syntheticQualificationPlan();
  plan.runtimeProfiles = [profile as (typeof plan.runtimeProfiles)[number]];
  const boundary = createGoalQualificationBoundary(syntheticQualificationEvaluator(plan).evaluator);
  verification = (await boundary.qualify(plan)).verification;
}, 120000);
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
function context(now: number): ExecutionStateContext {
  const original = clone(data.pool);
  if (original.status !== 'present') throw Error('missing pool');
  const pool = { ...original, state: { ...original.state, timestampMs: now } };
  return {
    kind: 'finalized-browser-execution-context',
    policy: { maximumContextAgeMsExclusive: 5000 } as ExecutionStateContext['policy'],
    genesisHash: pool.binding.genesisHash,
    block: { height: 100, hash: pool.binding.blockHash, parentHash: goalTestHash(99), timestampMs: now },
    checkedAtMs: now,
    receivedAtMs: now,
    expectedDenominator: '1',
    codecBinding: pool.binding,
    codeHash: profile.codeHash,
    pool,
    finalityAttestation: 'rpc-canonical-finalized',
    rpcCalls: 8,
    observedFill: false,
    transactionSubmitted: false,
  };
}
function setup() {
  let now = GOAL_TEST_START,
    epoch = 0;
  let ledger: GoalStorageLedger = { bots: [], orders: [] };
  const goals = createGoalStorage(
    async (write, action) => {
      const next = clone(ledger),
        result = action(next);
      if (write) ledger = next;
      return result;
    },
    () => now
  );
  const initialize = vi.spyOn(goals, 'initialize');
  const storage = {
    goals,
    listBots: vi.fn(async () => clone(ledger.bots)),
    listOrders: vi.fn(async () => clone(ledger.orders)),
  } as unknown as GoalEnabledBotStorage;
  const status = executionStatus();
  status.wallet.address = account;
  status.wallet.source = 'synthetic-wallet';
  status.node.genesisHash = GOAL_EXACT_POLICY.genesisHash;
  const client = {
    isConnected: true,
    genesisHash: { toHex: () => GOAL_EXACT_POLICY.genesisHash },
    runtimeVersion: {},
    runtimeMetadata: {},
  } as unknown as ReturnType<GoalFundingDependencies['client']>;
  const capture = vi.fn(async () => context(now));
  const dispose = vi.fn();
  vi.mocked(createGoalExecutionSession).mockImplementation((options) => {
    let disposed = false;
    const originalEpoch = epoch,
      runtime = client.runtimeVersion,
      metadata = client.runtimeMetadata;
    const owned = new WeakSet<object>();
    const guard = () => {
      if (
        disposed ||
        originalEpoch !== epoch ||
        client.runtimeVersion !== runtime ||
        client.runtimeMetadata !== metadata ||
        !options.isCurrent()
      )
        throw Error('session-revoked');
    };
    return {
      capture: async () => {
        guard();
        const result = await capture();
        guard();
        owned.add(result);
        return result;
      },
      assertCurrent: (value: ExecutionStateContext) => {
        guard();
        if (!owned.has(value) || now - value.receivedAtMs >= 5000 || now < value.receivedAtMs)
          throw Error('stale-owned-context');
      },
      dispose: () => {
        disposed = true;
        dispose();
      },
    } as unknown as ReturnType<typeof createGoalExecutionSession>;
  });
  const release = vi.fn();
  const deps: GoalFundingDependencies = {
    client: () => client,
    status: () => status,
    now: () => now,
    balances: vi.fn(async () => ({ [KUSD]: goalTestCodec(100), [XOR]: goalTestCodec(100) })),
    acquire: vi.fn(async () => release),
  };
  const request: GoalFundingRequest = {
    draftId: 'review-1',
    account,
    source: status.wallet.source,
    qualification: verification,
  };
  const make = () => createGoalFundingService(storage, deps);
  return {
    service: make(),
    make,
    request,
    deps,
    status,
    client,
    capture,
    dispose,
    release,
    initialize,
    storage,
    read: () => clone(ledger),
    seed: (value: GoalStorageLedger) => {
      ledger = clone(value);
    },
    setNow: (value: number) => {
      now = value;
    },
    reconnect: () => {
      epoch++;
    },
  };
}
describe('explicit qualified goal funding', () => {
  it('previews the exact qualified budget and reserve without storage writes or a lease', async () => {
    const f = setup(),
      result = await f.service.preview(f.request);
    expect(result).toMatchObject({
      kind: 'preview',
      sufficient: true,
      initialKusdCodec: goalTestCodec(10),
      feeReserveCodec: goalTestCodec(1),
      maxTradeKusdCodec: goalTestCodec(2),
      maxTradeXorCodec: goalTestCodec(2),
    });
    expect(f.initialize).not.toHaveBeenCalled();
    expect(f.deps.acquire).not.toHaveBeenCalled();
    expect(f.read()).toEqual({ bots: [], orders: [] });
    expect(f.dispose).toHaveBeenCalledOnce();
  });
  it('funds only at approval with a fresh original mark and leaves the exact epoch paused', async () => {
    const f = setup();
    await f.service.preview(f.request);
    f.setNow(GOAL_TEST_START + 10000);
    const bot = await f.service.approve(f.request);
    expect(bot.status).toBe('paused');
    expect(bot.sessionExpiresAt).toBe(0);
    expect(bot.exactGoalState.episode.startedAtMs).toBe(GOAL_TEST_START + 10000);
    expect(bot.exactGoalState.openingMark.timestampMs).toBe(GOAL_TEST_START + 10000);
    expect(bot.exactGoalState.episode.endedAtMs).toBe(GOAL_TEST_START + 10000 + 86400000);
    expect(bot.portfolio.holdings).toEqual({ [KUSD]: goalTestCodec(10), [XOR]: goalTestCodec(1) });
    expect(bot.strategy).toEqual(verification.binding.strategy);
    expect(bot.goalExecution.qualificationDigest).toBe(verification.certificateSha256);
    expect(bot.goalExecution.policyDigest).toBe(verification.policySha256);
    expect(f.initialize.mock.calls[0][0].bot).not.toHaveProperty('exactGoalState');
    expect(f.read().orders).toEqual([]);
    expect(f.capture).toHaveBeenCalledTimes(2);
    expect(f.release).toHaveBeenCalledOnce();
  });
  it('returns the same epoch for double clicks and after service recreation, without extending it', async () => {
    const f = setup();
    const [a, b] = await Promise.all([f.service.approve(f.request), f.service.approve(f.request)]);
    f.setNow(GOAL_TEST_START + 100000);
    const c = await f.make().approve(f.request);
    expect(a).toEqual(b);
    expect(a).toEqual(c);
    expect(f.initialize).toHaveBeenCalledOnce();
    expect(f.read().bots).toHaveLength(1);
    expect(f.capture).toHaveBeenCalledOnce();
  });
  it('uses atomic storage uniqueness when concurrent service instances race', async () => {
    const f = setup();
    const [a, b] = await Promise.all([f.service.approve(f.request), f.make().approve(f.request)]);
    expect(a).toEqual(b);
    expect(f.read().bots).toHaveLength(1);
  });
  it('cannot overallocate when different approved drafts race for the same balance', async () => {
    const f = setup();
    vi.mocked(f.deps.balances).mockResolvedValue({ [KUSD]: goalTestCodec(10), [XOR]: goalTestCodec(1) });
    const outcomes = await Promise.allSettled([
      f.service.approve(f.request),
      f.make().approve({ ...f.request, draftId: 'review-2' }),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(f.read().bots).toHaveLength(1);
  });
  it('rechecks wallet identity inside the actual storage transaction before committing', async () => {
    const f = setup(),
      original = f.initialize.getMockImplementation()!;
    f.initialize.mockImplementationOnce(async (input) => {
      f.status.wallet.source = 'changed-before-commit';
      return original(input);
    });
    await expect(f.service.approve(f.request)).rejects.toThrow();
    expect(f.read().bots).toHaveLength(0);
    expect(f.release).toHaveBeenCalledOnce();
  });
  it('hashes the maximum-length stable draft ID into bounded IDs and rejects longer requests', async () => {
    const f = setup(),
      draftId = 'a'.repeat(128);
    const bot = await f.service.approve({ ...f.request, draftId });
    expect(bot.id.length).toBeLessThanOrEqual(128);
    expect(bot.goalExecution.goalId.length).toBeLessThanOrEqual(128);
    expect(await f.make().approve({ ...f.request, draftId })).toEqual(bot);
    await expect(f.service.approve({ ...f.request, draftId: 'a'.repeat(129) })).rejects.toThrow();
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it('attempts every cleanup without turning a committed paused allocation into an approval failure', async () => {
    const f = setup();
    f.dispose.mockImplementation(() => {
      throw Error('dispose-failed');
    });
    f.release.mockImplementation(() => {
      throw Error('release-failed');
    });
    const funded = await f.service.approve(f.request);
    expect(funded.status).toBe('paused');
    expect(f.read().bots).toHaveLength(1);
    expect(f.dispose).toHaveBeenCalledOnce();
    expect(f.release).toHaveBeenCalledOnce();
  });
  it('keeps the funded paused record available when a later Start fails', async () => {
    const f = setup(),
      funded = await f.service.approve(f.request);
    const start = vi.fn(async () => {
      throw Error('wallet-unlock-cancelled');
    });
    await expect(start()).rejects.toThrow('wallet-unlock-cancelled');
    expect(await f.make().approve(f.request)).toEqual(funded);
    expect(f.read().bots[0].status).toBe('paused');
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it.each([KUSD, XOR])(
    'previews insufficient %s and rejects approval without scaling the qualified amount',
    async (asset) => {
      const f = setup();
      vi.mocked(f.deps.balances).mockResolvedValue({
        [KUSD]: goalTestCodec(10),
        [XOR]: goalTestCodec(1),
        [asset]: String(BigInt(asset === KUSD ? goalTestCodec(10) : goalTestCodec(1)) - 1n),
      });
      expect(await f.service.preview(f.request)).toMatchObject({ sufficient: false });
      await expect(f.service.approve(f.request)).rejects.toThrow('bots.errors.balance');
      expect(f.initialize).not.toHaveBeenCalled();
      expect(f.read().bots).toHaveLength(0);
    }
  );
  it('subtracts paused existing allocations and cannot spend their tokens', async () => {
    const f = setup(),
      other = goalStorageBot('other');
    other.account = account;
    other.status = 'paused';
    other.sessionExpiresAt = 0;
    f.seed({ bots: [other], orders: [] });
    vi.mocked(f.deps.balances).mockResolvedValue({ [KUSD]: goalTestCodec(15), [XOR]: goalTestCodec(2) });
    const result = await f.service.preview(f.request);
    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') throw Error('expected preview');
    expect(result.assets.find((a) => a.asset.address === KUSD)?.availableCodec).toBe(goalTestCodec(5));
    await expect(f.service.approve(f.request)).rejects.toThrow('bots.errors.balance');
    expect(f.read().bots).toHaveLength(1);
  });
  it('rejects unresolved orders and same-key address aliases', async () => {
    const f = setup(),
      other = goalStorageBot('other');
    other.account = account;
    f.seed({ bots: [other], orders: [goalStorageOrder(other)] });
    await expect(f.service.approve(f.request)).rejects.toThrow('bots.errors.pending');
    other.account = encodeAddress(`0x${'12'.repeat(32)}`, 42);
    f.seed({ bots: [other], orders: [] });
    await expect(f.service.approve(f.request)).rejects.toThrow('bots.errors.wallet');
    expect(f.initialize).not.toHaveBeenCalled();
  });
  it.each(['wallet', 'source', 'client', 'runtime', 'epoch', 'stale'] as const)(
    'rejects a changed %s across a balance read',
    async (change) => {
      const f = setup();
      vi.mocked(f.deps.balances).mockImplementation(async () => {
        if (change === 'wallet') f.status.wallet.address = encodeAddress(`0x${'13'.repeat(32)}`, 69);
        if (change === 'source') f.status.wallet.source = 'another';
        if (change === 'client') f.deps.client = () => ({ ...f.client });
        if (change === 'runtime') Object.assign(f.client, { runtimeVersion: {} });
        if (change === 'epoch') f.reconnect();
        if (change === 'stale') f.setNow(GOAL_TEST_START + 5000);
        return { [KUSD]: goalTestCodec(100), [XOR]: goalTestCodec(100) };
      });
      await expect(f.service.approve(f.request)).rejects.toThrow();
      expect(f.initialize).not.toHaveBeenCalled();
      expect(f.read().bots).toHaveLength(0);
      expect(f.release).toHaveBeenCalledOnce();
    }
  );
  it('rejects a different decoded runtime profile even with matching spec numbers', async () => {
    const f = setup();
    f.capture.mockImplementation(async () => ({ ...context(GOAL_TEST_START), codeHash: goalTestHash(999) }));
    await expect(f.service.approve(f.request)).rejects.toThrow('bots.errors.research');
    expect(f.initialize).not.toHaveBeenCalled();
  });
  it('rejects JSON qualifications, hooks, accessors and unqualified amount overrides before I/O', () => {
    const f = setup(),
      getter = vi.fn(() => 'review-1');
    const accessor = { ...f.request };
    Object.defineProperty(accessor, 'draftId', { enumerable: true, get: getter });
    for (const input of [
      { ...f.request, qualification: clone(verification) },
      { ...f.request, qualification: { ...verification, assertCurrent: () => true } },
      { ...f.request, initialKusdCodec: '1' },
      accessor,
    ])
      expect(() => f.service.preview(input as GoalFundingRequest)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(f.capture).not.toHaveBeenCalled();
    expect(f.deps.balances).not.toHaveBeenCalled();
  });
  it('refuses to repurpose an existing draft under another wallet source', async () => {
    const f = setup();
    await f.service.approve(f.request);
    f.status.wallet.source = 'another';
    await expect(f.service.approve({ ...f.request, source: 'another' })).rejects.toThrow();
    expect(f.read().bots).toHaveLength(1);
  });
  it.each(['before-timeout', 'after-timeout'] as const)(
    'releases a lease resolved %s in the timeout turn exactly once without initializing',
    async (order) => {
      vi.useFakeTimers();
      const f = setup(),
        lease = deferred<() => void>();
      vi.mocked(f.deps.acquire).mockReturnValue(lease.promise);
      const work = f.service.approve(f.request);
      const rejected = expect(work).rejects.toThrow();
      await Promise.resolve();
      await Promise.resolve();
      expect(f.deps.acquire).toHaveBeenCalledOnce();
      if (order === 'before-timeout') lease.resolve(f.release);
      vi.advanceTimersByTime(30000);
      if (order === 'after-timeout') lease.resolve(f.release);
      await rejected;
      await Promise.resolve();
      expect(f.release).toHaveBeenCalledOnce();
      expect(f.initialize).not.toHaveBeenCalled();
      expect(f.read().bots).toEqual([]);
    }
  );
  it.each([false, true])(
    'bounds unresponsive reads and contains late lease cleanup failure=%s',
    async (throwOnRelease) => {
      vi.useFakeTimers();
      const f = setup(),
        lease = deferred<() => void>();
      vi.mocked(f.deps.acquire).mockReturnValue(lease.promise);
      const approval = f.service.approve(f.request),
        rejected = expect(approval).rejects.toThrow('bots.errors.stale');
      await vi.advanceTimersByTimeAsync(30000);
      await rejected;
      if (throwOnRelease)
        f.release.mockImplementation(() => {
          throw Error('release-failed');
        });
      lease.resolve(f.release);
      await Promise.resolve();
      await Promise.resolve();
      expect(f.release).toHaveBeenCalledOnce();
      expect(f.initialize).not.toHaveBeenCalled();
      expect(f.dispose).toHaveBeenCalled();
    }
  );
});
