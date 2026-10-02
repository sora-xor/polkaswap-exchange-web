// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { encodeAddress } from '@polkadot/util-crypto';
import { createGoalApplication } from '@/features/bot-trading/goal-application';
import { createBotLiveDependencies, type BotLiveDependencies } from '@/features/bot-trading/live';
import {
  createGoalLiveExecutor,
  type GoalLiveDependencies,
  type GoalLiveExecutor,
} from '@/features/bot-trading/goal-live';
import { createGoalRuntime, type GoalRuntimeDependencies } from '@/features/bot-trading/goal-runtime';
import { loadGoalQualificationRelease } from '@/features/bot-trading/goal-release';
import { createGoalExecutionSession } from '@/features/agent-trading/goal-execution-session';
import { prepareOwnedGoalSwap } from '@/features/agent-trading/goal-preparation';
import { fetchIndexedBotHistoryWithEvidence } from '@/features/bot-trading/history';
import {
  createGoalQualificationBoundary,
  readGoalQualificationBinding,
} from '@/features/bot-trading/goal-qualification';
import { evaluateGoalCompletedSignal } from '@/features/bot-trading/goal-signals';
import type { IndexedPoolHistoryWithEvidence } from '@/features/bot-trading/pool-history';
import { createGoalStorage, type GoalStorageLedger } from '@/features/bot-trading/goal-storage';
import {
  GOAL_EXACT_POLICY,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  createGoalExactLedger,
} from '@/features/bot-trading/goal-exact-ledger';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import type { GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { PolkaswapAgentApi, AgentStatusListener } from '@/features/agent-trading/types';
import type { ExecutionStateContext } from '@/features/bot-trading/execution-state';
import { createExecutionStateFixture } from './execution-state-fixture';
import { syntheticQualificationEvaluator, syntheticQualificationPlan } from './goal-qualification-fixtures';
import { executionStatus } from './execution-fixtures';
import {
  goalTestCodec,
  goalTestHash,
  goalExpected,
  goalStorageBot,
  goalTestMark,
  GOAL_TEST_START,
} from './goal-storage-fixtures';
vi.unmock('@polkadot/util-crypto');
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { api: {} } }));
vi.mock('@/features/bot-trading/live', () => ({ createBotLiveDependencies: vi.fn() }));
vi.mock('@/features/bot-trading/goal-live', () => ({ createGoalLiveExecutor: vi.fn() }));
vi.mock('@/features/bot-trading/goal-runtime', () => ({ createGoalRuntime: vi.fn() }));
vi.mock('@/features/bot-trading/goal-release', () => ({ loadGoalQualificationRelease: vi.fn() }));
vi.mock('@/features/bot-trading/history', () => ({ fetchIndexedBotHistoryWithEvidence: vi.fn() }));
vi.mock('@/features/agent-trading/goal-preparation', () => ({ prepareOwnedGoalSwap: vi.fn() }));
vi.mock('@/features/agent-trading/goal-execution-session', () => ({ createGoalExecutionSession: vi.fn() }));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const data = createExecutionStateFixture();
if (data.pool.status !== 'present') throw Error('fixture');
const profile = {
  ...data.pool.binding.runtimeVersion,
  metadataSha256: data.pool.binding.metadataSha256,
  codeHash: goalTestHash(104),
};
const account = encodeAddress('0x' + '12'.repeat(32), 69);
const bundle = {
  id: 'release',
  url: 'https://evidence.example.org/approved/manifest.json',
  sha256: 'a'.repeat(64),
  bundleIndexSha256: 'b'.repeat(64),
  certificateSha256: 'c'.repeat(64),
};
let qualified: Awaited<ReturnType<ReturnType<typeof createGoalQualificationBoundary>['qualify']>>;
const applications: Array<ReturnType<typeof createGoalApplication>> = [];
beforeAll(async () => {
  const plan = syntheticQualificationPlan();
  plan.runtimeProfiles = [profile as (typeof plan.runtimeProfiles)[number]];
  qualified = await createGoalQualificationBoundary(syntheticQualificationEvaluator(plan).evaluator).qualify(plan);
  bundle.certificateSha256 = qualified.verification.certificateSha256;
}, 120000);
afterEach(() => {
  for (const app of applications.splice(0)) app.dispose();
  vi.clearAllMocks();
});
function setup(releases = [bundle]) {
  let now = GOAL_TEST_START,
    ledger: GoalStorageLedger = { bots: [], orders: [] };
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
    listBots: async () => clone(ledger.bots),
    listOrders: async () => clone(ledger.orders),
  } as unknown as GoalEnabledBotStorage;
  const status = executionStatus();
  status.wallet.address = account;
  status.wallet.source = 'synthetic-wallet';
  status.node.genesisHash = GOAL_EXACT_POLICY.genesisHash;
  let listener: AgentStatusListener = () => {};
  const unsubscribe = vi.fn();
  const agent = {
    status: () => status,
    subscribeStatus: vi.fn((_request, callback) => {
      listener = callback;
      return unsubscribe;
    }),
  } as unknown as PolkaswapAgentApi;
  const chain = {
    isConnected: true,
    genesisHash: { toHex: () => GOAL_EXACT_POLICY.genesisHash },
    runtimeVersion: {},
    runtimeMetadata: {},
    rpc: { chain: { subscribeFinalizedHeads: vi.fn(async () => vi.fn()) } },
  };
  Object.assign(walletApi, { api: chain });
  const adapters = {
    agent,
    now: () => now,
    balances: vi.fn(async () => ({ [KUSD]: goalTestCodec(100), [XOR]: goalTestCodec(100) })),
    acquire: vi.fn(async () => vi.fn()),
    signer: vi.fn(),
    build: vi.fn(),
  } as unknown as BotLiveDependencies;
  vi.mocked(createBotLiveDependencies).mockReturnValue(adapters);
  let liveDeps!: GoalLiveDependencies, runtimeDeps!: GoalRuntimeDependencies;
  const live = {
    authorize: vi.fn(async () => {}),
    execute: vi.fn(),
    reconcile: vi.fn(),
    previewAllocation: vi.fn(async () => ({ sufficient: true, assets: [] })),
    stop: vi.fn(async () => {}),
    dispose: vi.fn(),
  } as unknown as GoalLiveExecutor;
  vi.mocked(createGoalLiveExecutor).mockImplementation((_storage, deps) => {
    liveDeps = deps;
    return live;
  });
  const active = new Set<string>();
  const runtime = {
    start: vi.fn(async (bot, password) => {
      if (!runtimeDeps.isCurrent(bot)) throw Error('runtime-current');
      runtimeDeps.qualification(bot);
      await live.authorize(bot, password);
      active.add(bot.id);
    }),
    stop: vi.fn(async (id) => {
      active.delete(id);
      await live.stop(id);
    }),
    close: vi.fn(),
    active: (id: string) => active.has(id),
    dispose: vi.fn(() => active.clear()),
  } as ReturnType<typeof createGoalRuntime>;
  vi.mocked(createGoalRuntime).mockImplementation((deps) => {
    runtimeDeps = deps;
    return runtime;
  });
  const revoke = vi.fn();
  vi.mocked(loadGoalQualificationRelease).mockResolvedValue({ ...qualified, dispose: revoke });
  const capture = vi.fn(async () => {
    const original = clone(data.pool);
    if (original.status !== 'present') throw Error('fixture');
    const pool = { ...original, state: { ...original.state, timestampMs: now } };
    return {
      kind: 'finalized-browser-execution-context',
      policy: { maximumContextAgeMsExclusive: 5000 },
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
    } as ExecutionStateContext;
  });
  vi.mocked(createGoalExecutionSession).mockImplementation((options) => {
    let closed = false;
    const owned = new WeakSet<object>();
    const guard = () => {
      if (closed || !options.isCurrent()) throw Error('revoked-context');
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
        if (!owned.has(value)) throw Error('unowned');
      },
      dispose: () => {
        closed = true;
      },
    } as unknown as ReturnType<typeof createGoalExecutionSession>;
  });
  const app = createGoalApplication({ storage, agent, releases });
  applications.push(app);
  const draft = { bundleId: 'release', draftId: 'stable-draft', account, source: status.wallet.source };
  return {
    app,
    draft,
    adapters,
    initialize,
    status,
    chain,
    capture,
    revoke,
    unsubscribe,
    agent,
    storage,
    goals,
    runtime,
    live,
    liveDeps: () => liveDeps,
    runtimeDeps: () => runtimeDeps,
    read: () => clone(ledger),
    reopen: (releases = [bundle]) => {
      app.dispose();
      const next = createGoalApplication({ storage, agent, releases });
      applications.push(next);
      return next;
    },
    setNow: (n: number) => {
      now = n;
    },
    notify: () => listener(status),
  };
}
describe('fixed goal application composition', () => {
  it('fails closed with no configured release and never accepts an action-supplied URL or certificate', async () => {
    const f = setup([]);
    expect(f.app.bundleIds).toEqual([]);
    expect(() => f.app.prepareQualification('release')).toThrow('research');
    expect(() => f.app.prepareQualification(bundle.url)).toThrow('research');
    await expect(f.app.preview(f.draft)).rejects.toThrow('research');
    expect(loadGoalQualificationRelease).not.toHaveBeenCalled();
    expect(f.initialize).not.toHaveBeenCalled();
    expect(f.adapters.signer).not.toHaveBeenCalled();
  });
  it('replays only the configured pin once and exposes a detached frozen presentation summary', async () => {
    const f = setup(),
      first = f.app.prepareQualification('release'),
      second = f.app.prepareQualification('release');
    expect(first).toBe(second);
    const summary = await first;
    expect(summary).toMatchObject({
      initialKusdCodec: goalTestCodec(10),
      feeReserveCodec: goalTestCodec(1),
      binding: { strategy: qualified.verification.binding.strategy },
    });
    expect(summary.binding).not.toBe(qualified.verification.binding);
    expect(Object.isFrozen(summary.binding.strategy)).toBe(true);
    expect('verification' in summary).toBe(false);
    expect('assertCurrent' in summary).toBe(false);
    await f.app.prepareQualification('release');
    expect(loadGoalQualificationRelease).toHaveBeenCalledOnce();
    expect(vi.mocked(loadGoalQualificationRelease).mock.calls[0][0]).toEqual({
      url: bundle.url,
      sha256: bundle.sha256,
      bundleIndexSha256: bundle.bundleIndexSha256,
      certificateSha256: bundle.certificateSha256,
    });
    expect(f.initialize).not.toHaveBeenCalled();
    expect(f.runtime.start).not.toHaveBeenCalled();
  });
  it('rejects copied qualification capabilities returned by a broken verifier adapter', async () => {
    const f = setup();
    vi.mocked(loadGoalQualificationRelease).mockResolvedValueOnce({
      ...qualified,
      verification: { ...qualified.verification },
      dispose: f.revoke,
    });
    await expect(f.app.prepareQualification('release')).rejects.toThrow('research');
    expect(f.revoke).toHaveBeenCalledOnce();
    await expect(f.app.preview(f.draft)).rejects.toThrow('research');
  });
  it('snapshots configured pins and rejects getter/extra-field configuration without invoking it', async () => {
    const configured = { ...bundle },
      f = setup([configured]);
    configured.url = 'https://changed.example.org/unapproved/manifest.json';
    await f.app.prepareQualification('release');
    expect(vi.mocked(loadGoalQualificationRelease).mock.calls[0][0].url).toBe(bundle.url);
    const getter = vi.fn(() => bundle.url);
    expect(() =>
      createGoalApplication({
        storage: f.storage,
        agent: f.agent,
        releases: [
          {
            ...bundle,
            get url() {
              return getter();
            },
          },
        ],
      })
    ).toThrow('research');
    expect(getter).not.toHaveBeenCalled();
    expect(() =>
      createGoalApplication({
        storage: f.storage,
        agent: f.agent,
        releases: [{ ...bundle, certificate: qualified.certificate } as typeof bundle],
      })
    ).toThrow('research');
    await expect(f.app.preview({ ...f.draft, draftId: 'x'.repeat(129) })).rejects.toThrow('research');
    expect(f.capture).not.toHaveBeenCalled();
  });
  it('revokes a release result that arrives after the application was disposed', async () => {
    const f = setup();
    let finish!: (result: Awaited<ReturnType<typeof loadGoalQualificationRelease>>) => void;
    vi.mocked(loadGoalQualificationRelease).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = f.app.prepareQualification('release');
    f.app.dispose();
    finish({ ...qualified, dispose: f.revoke });
    await expect(pending).rejects.toThrow('session');
    expect(f.revoke).toHaveBeenCalledOnce();
    expect(f.initialize).not.toHaveBeenCalled();
  });
  it('previews without writes and explicitly funds exactly10 KUSD plus1 XOR in a paused epoch using the shared lease', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const review = await f.app.preview(f.draft);
    expect(review.funding).toMatchObject({
      kind: 'preview',
      initialKusdCodec: goalTestCodec(10),
      feeReserveCodec: goalTestCodec(1),
    });
    expect(f.initialize).not.toHaveBeenCalled();
    expect(f.adapters.acquire).not.toHaveBeenCalled();
    expect(f.adapters.signer).not.toHaveBeenCalled();
    f.setNow(GOAL_TEST_START + 1000);
    const bot = await f.app.approveFunding(review);
    expect(bot.status).toBe('paused');
    expect(bot.sessionExpiresAt).toBe(0);
    expect(bot.portfolio.holdings).toEqual({ [KUSD]: goalTestCodec(10), [XOR]: goalTestCodec(1) });
    expect(bot.exactGoalState.episode.startedAtMs).toBe(GOAL_TEST_START + 1000);
    expect(f.initialize).toHaveBeenCalledOnce();
    expect(f.adapters.acquire).toHaveBeenCalledWith(`${bot.network}:${account}`);
    expect(f.live.authorize).not.toHaveBeenCalled();
    expect(f.runtime.start).not.toHaveBeenCalled();
    await f.app.runtime.start(bot, 'user-password');
    expect(f.live.authorize).toHaveBeenCalledWith(bot, 'user-password');
    expect(f.app.runtime.active(bot.id)).toBe(true);
    await expect(f.app.approveFunding(review)).rejects.toThrow('stale');
    const renewed = await f.app.preview(f.draft);
    expect(renewed.funding.kind).toBe('funded');
    expect((await f.app.approveFunding(renewed)).goalExecution.goalId).toBe(bot.goalExecution.goalId);
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it('rejects copied, superseded, discarded and expired review objects without allocation', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const first = await f.app.preview(f.draft);
    await expect(f.app.approveFunding({ ...first })).rejects.toThrow('stale');
    const next = await f.app.preview(f.draft);
    await expect(f.app.approveFunding(first)).rejects.toThrow('stale');
    f.app.discardReview(next);
    await expect(f.app.approveFunding(next)).rejects.toThrow('stale');
    const expired = await f.app.preview(f.draft);
    f.setNow(GOAL_TEST_START + 30000);
    await expect(f.app.approveFunding(expired)).rejects.toThrow('stale');
    expect(f.initialize).not.toHaveBeenCalled();
    expect(f.revoke).not.toHaveBeenCalled();
  });
  it('rejects source changes before approval and after approval, even after the displayed identity returns', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const stale = await f.app.preview(f.draft);
    f.status.wallet.source = 'other';
    f.notify();
    f.status.wallet.source = f.draft.source;
    f.notify();
    await expect(f.app.approveFunding(stale)).rejects.toThrow('stale');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft));
    await f.app.runtime.start(bot);
    f.status.wallet.source = 'other';
    f.notify();
    expect(f.runtime.stop).toHaveBeenCalledWith(bot.id);
    expect(f.runtimeDeps().isCurrent(bot)).toBe(false);
    f.status.wallet.source = f.draft.source;
    f.notify();
    await expect(f.app.runtime.start(bot)).rejects.toThrow('runtime-current');
  });
  it('does not initialize if a review is cancelled while its fresh approval balances are pending', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const review = await f.app.preview(f.draft);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(f.adapters.balances).mockImplementationOnce(async () => {
      await pending;
      return { [KUSD]: goalTestCodec(100), [XOR]: goalTestCodec(100) };
    });
    const work = f.app.approveFunding(review);
    await vi.waitFor(() => expect(f.adapters.balances).toHaveBeenCalledTimes(2));
    f.app.discardReview(review);
    release();
    await expect(work).rejects.toThrow();
    expect(f.initialize).not.toHaveBeenCalled();
  });
  it('refuses insufficient funds and a replaced client without initializing or starting', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    vi.mocked(f.adapters.balances).mockResolvedValueOnce({ [KUSD]: '0', [XOR]: goalTestCodec(1) });
    const insufficient = await f.app.preview(f.draft);
    expect(insufficient.funding).toMatchObject({ kind: 'preview', sufficient: false });
    await expect(f.app.approveFunding(insufficient)).rejects.toThrow('balance');
    const review = await f.app.preview(f.draft);
    Object.assign(walletApi, { api: { ...f.chain } });
    await expect(f.app.approveFunding(review)).rejects.toThrow('stale');
    expect(f.initialize).not.toHaveBeenCalled();
    Object.assign(walletApi, { api: f.chain });
    const bot = await f.app.approveFunding(await f.app.preview(f.draft));
    f.status.node.endpoint = 'wss://different.example.org';
    expect(f.runtimeDeps().isCurrent(bot)).toBe(false);
    expect(f.runtime.start).not.toHaveBeenCalled();
  });
  it('connects real owned preparation, strategy-sized indexed evidence and the captured client subscription', async () => {
    const f = setup();
    expect(f.liveDeps().signer).toBe(f.adapters.signer);
    expect(f.liveDeps().acquire).toBe(f.adapters.acquire);
    expect(f.liveDeps().balances).toBe(f.adapters.balances);
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft));
    const signal = new AbortController().signal;
    await f.runtimeDeps().history(bot, signal);
    const endAt = Math.floor(GOAL_TEST_START / 3600000) * 3600000;
    expect(fetchIndexedBotHistoryWithEvidence).toHaveBeenCalledWith(bot, {
      startAt: endAt - 4 * 3600000,
      endAt,
      signal,
    });
    const callback = vi.fn();
    await f.runtimeDeps().subscribeFinalizedHeads(f.liveDeps().client(), callback);
    expect(f.chain.rpc.chain.subscribeFinalizedHeads).toHaveBeenCalledWith(callback);
    const request = { execution: { protocol: 'finalized-xyk-native-fee-v1' } } as Parameters<
      GoalLiveDependencies['prepare']
    >[0];
    await f.liveDeps().prepare(request);
    expect(prepareOwnedGoalSwap).toHaveBeenCalledWith(f.agent, request);
  });
  it.each([
    ['trend', 24, 25],
    ['restoring', 24, 27],
    ['restoring', 200, 203],
  ] as const)('queries the exact %s(%i) tail plus a publication buffer (%i hours)', async (kind, window, hours) => {
    const f = setup(),
      bot = goalStorageBot(),
      endAt = 1000 * 3600000;
    f.setNow(endAt + 1000);
    bot.strategy = {
      ...bot.strategy,
      kind: 'rules',
      rules: {
        version: 1,
        entry: {
          operator: 'all',
          conditions: [
            kind === 'trend'
              ? { kind, window, direction: 'above' }
              : { kind, window, direction: 'above', threshold: '0' },
          ],
        },
        exit: null,
      },
    };
    const signal = new AbortController().signal;
    await f.runtimeDeps().history(bot, signal);
    expect(fetchIndexedBotHistoryWithEvidence).toHaveBeenCalledWith(bot, {
      startAt: endAt - hours * 3600000,
      endAt,
      signal,
    });
    expect(f.initialize).not.toHaveBeenCalled();
  });
  it('uses the existing finite SMA bound and rejects malformed rules before any history read', async () => {
    const f = setup(),
      bot = goalStorageBot(),
      endAt = 1000 * 3600000;
    f.setNow(endAt);
    bot.strategy = { ...bot.strategy, kind: 'sma', fastWindow: 2, slowWindow: 500 };
    await f.runtimeDeps().history(bot, new AbortController().signal);
    expect(vi.mocked(fetchIndexedBotHistoryWithEvidence).mock.calls[0][1]).toMatchObject({
      startAt: endAt - 501 * 3600000,
    });
    vi.mocked(fetchIndexedBotHistoryWithEvidence).mockClear();
    bot.strategy = {
      ...bot.strategy,
      kind: 'rules',
      rules: {
        version: 1,
        entry: {
          operator: 'all',
          conditions: [{ kind: 'restoring', window: 201, direction: 'above', threshold: '0' }],
        },
        exit: null,
      },
    };
    expect(() => f.runtimeDeps().history(bot, new AbortController().signal)).toThrow('bots.errors.config');
    expect(fetchIndexedBotHistoryWithEvidence).not.toHaveBeenCalled();
  });
  it('preserves awaiting-publication for the complete restoring prior tail and still refuses a gap', async () => {
    const f = setup(),
      bot = goalStorageBot(),
      HOUR = 3600000,
      endAt = 1000 * HOUR,
      now = endAt + 1000;
    f.setNow(now);
    bot.strategy = {
      ...bot.strategy,
      kind: 'rules',
      amount: '3',
      intervalMs: 6 * HOUR,
      rules: {
        version: 1,
        entry: { operator: 'all', conditions: [{ kind: 'restoring', window: 24, direction: 'above', threshold: '0' }] },
        exit: null,
      },
    };
    bot.exactGoalState = createGoalExactLedger(
      {
        goalId: bot.goalExecution.goalId,
        startedAtMs: endAt,
        initialKusdCodec: goalTestCodec(10),
        maxTradeKusdCodec: goalTestCodec(3),
        maxTradeXorCodec: goalTestCodec(3),
      },
      goalTestMark(100000, endAt)
    );
    bot.sessionExpiresAt = bot.exactGoalState.episode.endedAtMs;
    const makeHistory = (count: number): IndexedPoolHistoryWithEvidence => {
      const hours = Array.from({ length: count }, (_, i) => 974 + i);
      return {
        history: {
          candles: hours.map((hour, i) => ({
            timestamp: hour * HOUR,
            close: String(100 + (i % 7)),
            feeClose: String(100 + (i % 7)),
          })),
          missing: 27 - count,
          denominationVerified: true,
          identity: { genesisHash: bot.network, denominator: '1' },
        },
        boundaries: hours.map((hour) => ({
          kind: 'indexed-finalized-hour-boundary',
          completedAtMs: hour * HOUR,
          genesisHash: bot.network,
          denominator: '1',
          arrivalTimeKnown: false,
          closing: { height: hour * 100, hash: goalTestHash(hour * 100), timestampSeconds: hour * 3600 - 6 },
          successor: { height: hour * 100 + 1, hash: goalTestHash(hour * 100 + 1), timestampSeconds: hour * 3600 },
        })),
      };
    };
    const binding = readGoalQualificationBinding({
      genesisHash: bot.network,
      denominator: '1',
      initialKusdCodec: goalTestCodec(10),
      maxTradeKusdCodec: goalTestCodec(3),
      maxTradeXorCodec: goalTestCodec(3),
      strategy: bot.strategy,
    });
    vi.mocked(fetchIndexedBotHistoryWithEvidence).mockResolvedValueOnce(makeHistory(26));
    const history = await f.runtimeDeps().history(bot, new AbortController().signal);
    const before = clone(bot);
    expect(evaluateGoalCompletedSignal({ bot, binding, history, receivedAtMs: now, now })).toEqual({
      kind: 'awaiting-history',
      completedAtMs: endAt,
      lastAvailableAtMs: endAt - HOUR,
    });
    expect(bot).toEqual(before);
    expect(
      evaluateGoalCompletedSignal({ bot, binding, history: makeHistory(27), receivedAtMs: now, now })
    ).toMatchObject({ kind: 'decision', completedAtMs: endAt });
    const gap = clone(history);
    gap.history.candles.splice(12, 1);
    (gap.boundaries as unknown[]).splice(12, 1);
    gap.history.missing++;
    expect(() => evaluateGoalCompletedSignal({ bot, binding, history: gap, receivedAtMs: now, now })).toThrow(
      'bots.errors.history'
    );
  });
  it('disposes runtime, signers, evidence and pending reads without later registry or funding access', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const review = await f.app.preview(f.draft);
    f.app.dispose();
    f.app.dispose();
    expect(f.runtime.dispose).toHaveBeenCalledOnce();
    expect(f.live.dispose).toHaveBeenCalledOnce();
    expect(f.revoke).toHaveBeenCalledOnce();
    expect(f.unsubscribe).toHaveBeenCalledOnce();
    expect(vi.mocked(loadGoalQualificationRelease).mock.calls[0][1].signal?.aborted).toBe(true);
    await expect(f.app.approveFunding(review)).rejects.toThrow();
    expect(() => f.app.prepareQualification('release')).toThrow('session');
    expect(f.initialize).not.toHaveBeenCalled();
  });
  it('reloads the actual existing allocation through its pinned release and requires fresh approval without any write', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft));
    const persisted = f.read(),
      fresh = f.reopen();
    await expect(fresh.runtime.start(bot)).rejects.toThrow('runtime-current');
    const { review, qualification } = await fresh.previewExisting({ botId: bot.id, account, source: f.draft.source });
    expect(qualification.qualificationDigest).toBe(bot.goalExecution.qualificationDigest);
    expect(review.bot).toEqual(bot);
    expect('draftId' in review).toBe(false);
    expect(f.read()).toEqual(persisted);
    expect(f.initialize).toHaveBeenCalledOnce();
    expect(loadGoalQualificationRelease).toHaveBeenCalledTimes(2);
    await expect(fresh.runtime.start(bot)).rejects.toThrow('runtime-current');
    const resumed = await fresh.approveExisting(review);
    expect(resumed).toEqual(bot);
    expect(f.adapters.acquire).toHaveBeenLastCalledWith(`${bot.network}:${account}`);
    expect(f.read()).toEqual(persisted);
    expect(f.initialize).toHaveBeenCalledOnce();
    expect(f.live.authorize).not.toHaveBeenCalled();
    await fresh.runtime.start(resumed, 'fresh-personal-unlock');
    expect(f.live.authorize).toHaveBeenCalledWith(bot, 'fresh-personal-unlock');
    await expect(fresh.approveExisting(review)).rejects.toThrow('stale');
  });
  it('refuses an unavailable release and wrong wallet for a stored allocation, without guessing a funding draft', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft));
    const persisted = f.read(),
      fresh = f.reopen([]);
    await expect(fresh.previewExisting({ botId: bot.id, account, source: f.draft.source })).rejects.toThrow('research');
    await expect(fresh.previewExisting({ botId: bot.id, account: 'other', source: f.draft.source })).rejects.toThrow(
      'session'
    );
    expect(f.read()).toEqual(persisted);
    expect(f.initialize).toHaveBeenCalledOnce();
    expect(f.live.authorize).not.toHaveBeenCalled();
  });
  it('rejects copied, cancelled and superseded existing reviews, while refresh preserves the exact stored epoch', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft)),
      fresh = f.reopen();
    const request = { botId: bot.id, account, source: f.draft.source };
    const first = await fresh.previewExisting(request);
    await expect(fresh.approveExisting({ ...first.review })).rejects.toThrow('stale');
    const second = await fresh.previewExisting(request);
    await expect(fresh.approveExisting(first.review)).rejects.toThrow('stale');
    fresh.discardReview(second.review);
    await expect(fresh.approveExisting(second.review)).rejects.toThrow('stale');
    const third = await fresh.previewExisting(request);
    expect((await fresh.approveExisting(third.review)).exactGoalState).toEqual(bot.exactGoalState);
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it('rejects changed control state or a revoked source during existing approval, and releases the shared lease', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft)),
      fresh = f.reopen();
    const request = { botId: bot.id, account, source: f.draft.source };
    const { review } = await fresh.previewExisting(request);
    await f.goals.pause({
      botId: bot.id,
      expected: { goalId: bot.goalExecution.goalId, controlRevision: bot.goalControl.revision },
    });
    await expect(fresh.approveExisting(review)).rejects.toThrow('stale');
    const renewed = await fresh.previewExisting(request),
      release = vi.fn();
    vi.mocked(f.adapters.acquire).mockResolvedValueOnce(release);
    let finish!: () => void;
    vi.mocked(f.live.previewAllocation).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { sufficient: true, assets: [] };
    });
    const work = fresh.approveExisting(renewed.review);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    f.status.wallet.source = 'changed';
    f.notify();
    finish();
    await expect(work).rejects.toThrow('stale');
    expect(release).toHaveBeenCalledOnce();
    expect(f.runtimeDeps().isCurrent(bot)).toBe(false);
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it('rechecks balances during explicit existing approval and refuses cancellation while that read is pending', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft)),
      fresh = f.reopen();
    const request = { botId: bot.id, account, source: f.draft.source };
    const first = await fresh.previewExisting(request);
    vi.mocked(f.live.previewAllocation).mockResolvedValueOnce({ sufficient: false, assets: [] });
    await expect(fresh.approveExisting(first.review)).rejects.toThrow('balance');
    const next = await fresh.previewExisting(request);
    let finish!: () => void;
    vi.mocked(f.live.previewAllocation).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { sufficient: true, assets: [] };
    });
    const work = fresh.approveExisting(next.review);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    fresh.discardReview(next.review);
    finish();
    await expect(work).rejects.toThrow('stale');
    expect(f.runtimeDeps().isCurrent(bot)).toBe(false);
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it('cannot renew an expired review or restart the original expired deadline', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft)),
      fresh = f.reopen();
    const request = { botId: bot.id, account, source: f.draft.source };
    const { review } = await fresh.previewExisting(request);
    f.setNow(GOAL_TEST_START + 30000);
    await expect(fresh.approveExisting(review)).rejects.toThrow('stale');
    f.setNow(bot.exactGoalState.episode.endedAtMs);
    await expect(fresh.previewExisting(request)).rejects.toThrow('goalComplete');
    expect(f.initialize).toHaveBeenCalledOnce();
    expect(f.read().bots[0]).toEqual(bot);
  });
  it('refuses a completed goal before its deadline without changing its result or funding epoch', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft));
    const at = GOAL_TEST_START + 1000;
    f.setNow(at);
    const ended = await f.goals.observe({
      botId: bot.id,
      expected: goalExpected(bot),
      accountingAtMs: at,
      assertCurrent: () => undefined,
      mark: {
        ...bot.exactGoalState.lastMark,
        blockHash: goalTestHash(101),
        blockNumber: 101,
        timestampMs: at,
        xorReserveCodec: (BigInt(bot.exactGoalState.lastMark.xorReserveCodec) * 2n).toString(),
      },
    });
    expect(ended.exactGoalState.outcome).not.toBe('active');
    const persisted = f.read(),
      fresh = f.reopen();
    await expect(fresh.previewExisting({ botId: bot.id, account, source: f.draft.source })).rejects.toThrow(
      'goalComplete'
    );
    expect(f.read()).toEqual(persisted);
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it('disposal rejects an existing approval waiting on its lease and releases a lease that arrives later', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft)),
      fresh = f.reopen();
    const { review } = await fresh.previewExisting({ botId: bot.id, account, source: f.draft.source });
    let finish!: (release: () => void) => void;
    vi.mocked(f.adapters.acquire).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const work = fresh.approveExisting(review);
    fresh.dispose();
    await expect(work).rejects.toThrow('session');
    const release = vi.fn(() => {
      throw Error('late-cleanup');
    });
    finish(release);
    await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
    expect(f.read().bots[0]).toEqual(bot);
    expect(f.initialize).toHaveBeenCalledOnce();
  });
  it('releases a lease resolved in the same microtask turn as disposal rather than losing the acquired lock', async () => {
    const f = setup();
    await f.app.prepareQualification('release');
    const bot = await f.app.approveFunding(await f.app.preview(f.draft)),
      fresh = f.reopen();
    const { review } = await fresh.previewExisting({ botId: bot.id, account, source: f.draft.source });
    let finish!: (release: () => void) => void;
    vi.mocked(f.adapters.acquire).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const work = fresh.approveExisting(review),
      release = vi.fn();
    fresh.dispose();
    finish(release);
    await expect(work).rejects.toThrow('session');
    expect(release).toHaveBeenCalledOnce();
    expect(f.read().bots[0]).toEqual(bot);
  });
});
