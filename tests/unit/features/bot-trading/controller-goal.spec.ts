import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBotTradingController } from '@/features/bot-trading/controller';
import { createGoalStorage, type GoalStorageLedger } from '@/features/bot-trading/goal-storage';
import type { GoalExecutionBot } from '@/features/bot-trading/goal-execution-types';
import type { BotDefinition } from '@/features/bot-trading/types';
import { GOAL_TEST_START, goalStorageBot } from './goal-storage-fixtures';
import { GOAL_APPLICATION_RELEASES } from '@/features/bot-trading/goal-config';
import type {
  GoalApplicationQualification,
  GoalApplicationReview,
  GoalApplicationExistingReview,
} from '@/features/bot-trading/goal-application';

vi.unmock('@polkadot/util-crypto');
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { signer: null } }));
vi.mock('@/features/agent-trading', () => ({ installPolkaswapAgentApi: vi.fn() }));
vi.mock('@/features/bot-trading/live', () => ({ createBotLiveExecutor: vi.fn() }));
vi.mock('@/features/bot-trading/history', () => ({ fetchBotHistory: vi.fn() }));

type Dependencies = Parameters<typeof createBotTradingController>[0];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const controllers: ReturnType<typeof createBotTradingController>[] = [];
beforeEach(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
afterEach(async () => {
  for (const controller of controllers.splice(0)) controller.dispose();
  await Promise.resolve();
  vi.restoreAllMocks();
});

function setup(withRuntime = true, withApplication = false) {
  const bot = goalStorageBot();
  bot.status = 'paused';
  bot.sessionExpiresAt = 0;
  let ledger: GoalStorageLedger = { bots: [clone(bot)], orders: [] };
  const goals = createGoalStorage(
    async (write, action) => {
      const next = clone(ledger);
      const result = action(next);
      if (write) ledger = next;
      return result;
    },
    () => GOAL_TEST_START
  );
  vi.spyOn(goals, 'pause');
  const storage = {
    goals,
    listBots: vi.fn(async () => clone(ledger.bots)),
    saveBot: vi.fn(async () => {
      throw Error('unexpected-legacy-save');
    }),
    stopBot: vi.fn(async () => {
      throw Error('unexpected-legacy-release');
    }),
    saveGoalProgress: vi.fn(async () => {
      throw Error('unexpected-legacy-goal');
    }),
  };
  const status = {
    wallet: { connected: true, address: bot.account, source: 'synthetic' },
    node: { connected: true, genesisHash: bot.network, runtimeSpecVersion: 130, endpoint: 'synthetic' },
  };
  const agent = {
    status: () => status,
    ready: vi.fn(async () => status),
    assets: vi.fn(async () => []),
  };
  let active = false;
  const runtime = {
    start: vi.fn(async (_bot: GoalExecutionBot, _password?: string) => {
      active = true;
      ledger.bots[0].status = 'running';
      ledger.bots[0].sessionExpiresAt = GOAL_TEST_START + 60000;
    }),
    stop: vi.fn((id: string) => {
      active = false;
      const stored = ledger.bots.find((candidate) => candidate.id === id) as GoalExecutionBot;
      return goals
        .pause({
          botId: id,
          expected: { goalId: stored.goalExecution.goalId, controlRevision: stored.goalControl.revision },
        })
        .then(() => undefined);
    }),
    active: vi.fn((_id: string) => active),
    dispose: vi.fn(() => {
      active = false;
    }),
  };
  const live = {
    authorize: vi.fn(),
    execute: vi.fn(),
    reconcile: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  };
  const summary: GoalApplicationQualification = {
    bundleId: 'trusted-release',
    qualificationDigest: bot.goalExecution.qualificationDigest,
    policyDigest: bot.goalExecution.policyDigest,
    initialKusdCodec: bot.exactGoalState.initial.kusdCodec,
    feeReserveCodec: bot.policy.feeBudgetCodec,
    maxTradeKusdCodec: bot.policy.maxTradeCodec[bot.assetIn.address],
    maxTradeXorCodec: bot.policy.maxTradeCodec[bot.assetOut.address],
    binding: {
      genesisHash: bot.network,
      denominator: '1',
      initialKusdCodec: bot.exactGoalState.initial.kusdCodec,
      maxTradeKusdCodec: bot.policy.maxTradeCodec[bot.assetIn.address],
      maxTradeXorCodec: bot.policy.maxTradeCodec[bot.assetOut.address],
      strategy: bot.strategy,
    },
    policy: {
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: 86400000,
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeReserveCodec: bot.policy.feeBudgetCodec,
    },
  };
  const application = {
    bundleIds: ['trusted-release'],
    prepareQualification: vi.fn(async (_id: string) => summary),
    preview: vi.fn(
      async (draft: {
        bundleId: string;
        draftId: string;
        account: string;
        source: string;
      }): Promise<GoalApplicationReview> => ({
        kind: 'goal-application-funding-review-v1',
        ...draft,
        funding: {
          kind: 'preview',
          draftId: draft.draftId,
          botId: bot.id,
          goalId: bot.goalExecution.goalId,
          account: bot.account,
          source: status.wallet.source,
          qualificationDigest: summary.qualificationDigest,
          policyDigest: summary.policyDigest,
          initialKusdCodec: summary.initialKusdCodec,
          feeReserveCodec: summary.feeReserveCodec,
          maxTradeKusdCodec: summary.maxTradeKusdCodec,
          maxTradeXorCodec: summary.maxTradeXorCodec,
          assets: [],
          sufficient: true,
        },
      })
    ),
    approveFunding: vi.fn(async (_review: GoalApplicationReview) => clone(bot)),
    previewExisting: vi.fn(async (request: { botId: string; account: string; source: string }) => ({
      qualification: summary,
      review: {
        kind: 'goal-application-existing-review-v1' as const,
        ...request,
        bundleId: 'trusted-release',
        bot: clone(bot),
        funding: { sufficient: true, assets: [] },
      },
    })),
    approveExisting: vi.fn(async (review: GoalApplicationExistingReview) => clone(review.bot)),
    discardReview: vi.fn(),
    runtime,
    dispose: vi.fn(),
  };
  const deps = {
    agent,
    storage,
    live,
    ...(withRuntime ? { goalRuntime: runtime } : {}),
    ...(withApplication ? { goalApplication: application } : {}),
    history: vi.fn(async () => {
      throw Error('unexpected-legacy-history');
    }),
    market: vi.fn(async () => {
      throw Error('unexpected-legacy-market');
    }),
    ai: vi.fn(),
    now: () => GOAL_TEST_START,
    isExternal: () => false,
  };
  const controller = createBotTradingController(deps as unknown as Dependencies);
  controllers.push(controller);
  return {
    bot,
    controller,
    runtime,
    storage,
    live,
    goals,
    deps,
    agent,
    application,
    status,
    read: () => clone(ledger),
    setActive: (value: boolean) => {
      active = value;
    },
    replace: (value: BotDefinition) => {
      ledger.bots = [value];
    },
  };
}

describe('controller explicit finalized-goal routing', () => {
  it('ships no fictional release and refuses exact review when the optional application is absent', async () => {
    expect(GOAL_APPLICATION_RELEASES).toEqual([]);
    expect(Object.isFrozen(GOAL_APPLICATION_RELEASES)).toBe(true);
    const f = setup();
    expect(f.controller.exactGoalAvailable).toBe(false);
    await expect(f.controller.prepareGoalReview()).rejects.toThrow('research');
    expect(f.storage.saveBot).not.toHaveBeenCalled();
  });
  it('presents an unsaved exact review without an execution marker and approves only through the owned application', async () => {
    const f = setup(true, true);
    await f.controller.initialize();
    const before = f.read();
    const review = await f.controller.prepareGoalReview();
    expect(review.bot).toMatchObject({
      id: f.bot.id,
      mode: 'live',
      status: 'paused',
      portfolio: { initial: f.bot.portfolio.initial },
    });
    expect('goalExecution' in review.bot).toBe(false);
    expect('exactGoalState' in review.bot).toBe(false);
    expect('goalState' in review.bot).toBe(false);
    expect(f.read()).toEqual(before);
    expect(f.application.approveFunding).not.toHaveBeenCalled();
    expect(f.runtime.start).not.toHaveBeenCalled();
    const approved = await f.controller.approveGoalReview(review.bot.id);
    expect(approved.goalExecution).toEqual(f.bot.goalExecution);
    expect(f.application.approveFunding).toHaveBeenCalledWith(
      f.application.preview.mock.results[0].value instanceof Promise
        ? await f.application.preview.mock.results[0].value
        : undefined
    );
    expect(f.storage.saveBot).not.toHaveBeenCalled();
    expect(f.live.authorize).not.toHaveBeenCalled();
    await f.controller.startBot(approved.id, { password: 'explicit-unlock' });
    expect(f.runtime.start).toHaveBeenCalledOnce();
  });
  it('refreshes one draft ID after failed approval and discards cancellation before any allocation', async () => {
    const f = setup(true, true);
    const first = await f.controller.prepareGoalReview();
    f.application.approveFunding.mockRejectedValueOnce(Error('bots.errors.stale'));
    await expect(f.controller.approveGoalReview(first.bot.id)).rejects.toThrow('stale');
    const renewed = await f.controller.refreshGoalReview(first.bot.id);
    expect(renewed).toHaveProperty('draftId', first.draftId);
    expect(f.application.preview.mock.calls[1][0].draftId).toBe(first.draftId);
    f.controller.discardGoalReview(renewed.bot.id);
    await expect(f.controller.approveGoalReview(renewed.bot.id)).rejects.toThrow('session');
    expect(f.application.approveFunding).toHaveBeenCalledOnce();
    expect(f.runtime.start).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
  });
  it('refuses a changed account and cancelled pending preparation before creating any owned funding review', async () => {
    const f = setup(true, true),
      work = deferred<GoalApplicationQualification>(),
      abort = new AbortController();
    f.application.prepareQualification.mockReturnValueOnce(work.promise);
    const pending = f.controller.prepareGoalReview({ signal: abort.signal });
    await Promise.resolve();
    abort.abort();
    work.resolve(await f.application.prepareQualification('trusted-release'));
    await expect(pending).rejects.toThrow('session');
    expect(f.application.preview).not.toHaveBeenCalled();
    const review = await f.controller.prepareGoalReview();
    f.status.wallet.source = 'changed';
    await expect(f.controller.approveGoalReview(review.bot.id)).rejects.toThrow('session');
    expect(f.application.approveFunding).not.toHaveBeenCalled();
  });
  it('reopens a persisted exact goal in a fresh controller without reconstructing or initializing a funding draft', async () => {
    const f = setup(true, true);
    f.controller.dispose();
    const restored = createBotTradingController(f.deps as unknown as Dependencies);
    controllers.push(restored);
    const persisted = f.read();
    const resumed = await restored.resumeGoalReview(f.bot.id);
    expect('draftId' in resumed).toBe(false);
    expect(resumed.bot.portfolio).toEqual(f.bot.portfolio);
    expect(resumed.bot).not.toHaveProperty('goalExecution');
    expect(f.read()).toEqual(persisted);
    await restored.refreshGoalReview(f.bot.id);
    expect(f.application.previewExisting).toHaveBeenCalledTimes(2);
    await restored.approveGoalReview(f.bot.id);
    expect((f.read().bots[0] as GoalExecutionBot).goalExecution).toEqual(f.bot.goalExecution);
    expect((f.read().bots[0] as GoalExecutionBot).exactGoalState).toEqual(f.bot.exactGoalState);
    expect(f.application.approveExisting).toHaveBeenCalledOnce();
    expect(f.application.approveFunding).not.toHaveBeenCalled();
    expect(f.application.preview).not.toHaveBeenCalled();
    expect(f.runtime.start).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
    await restored.startBot(f.bot.id, { password: 'fresh-user-unlock' });
    expect(f.runtime.start).toHaveBeenCalledOnce();
  });
  it('discards a late reload review after cancellation and never falls back to a funding draft', async () => {
    const f = setup(true, true),
      abort = new AbortController();
    const ready = await f.application.previewExisting({
      botId: f.bot.id,
      account: f.bot.account,
      source: f.status.wallet.source,
    });
    const pending = deferred<typeof ready>();
    f.application.previewExisting.mockReturnValueOnce(pending.promise);
    const work = f.controller.resumeGoalReview(f.bot.id, { signal: abort.signal });
    await Promise.resolve();
    abort.abort();
    pending.resolve(ready);
    await expect(work).rejects.toThrow('session');
    expect(f.application.discardReview).toHaveBeenCalledWith(ready.review);
    expect(f.application.preview).not.toHaveBeenCalled();
    expect(f.application.approveExisting).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
  });
  it('loads and selects saved goals without authorizing or asking legacy market/history for a valuation', async () => {
    const f = setup();
    await f.controller.initialize();
    await f.controller.selectBot(f.bot.id);
    await f.controller.tick();
    expect(f.runtime.start).not.toHaveBeenCalled();
    expect(f.controller.sessionActiveIds.value).toEqual([]);
    expect(f.deps.history).not.toHaveBeenCalled();
    expect(f.deps.market).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
  });
  it('routes explicit Start to the supplied runtime and leaves legacy scheduling and authorization untouched', async () => {
    const f = setup();
    await f.controller.initialize();
    await f.controller.startBot(f.bot.id, { password: 'synthetic-not-persisted' });
    expect(f.runtime.start).toHaveBeenCalledWith(
      expect.objectContaining({ goalExecution: f.bot.goalExecution }),
      'synthetic-not-persisted'
    );
    expect(f.controller.sessionActiveIds.value).toEqual([f.bot.id]);
    await f.controller.tick(101);
    await f.controller.tick(102);
    expect(f.live.authorize).not.toHaveBeenCalled();
    expect(f.live.execute).not.toHaveBeenCalled();
    expect(f.live.reconcile).not.toHaveBeenCalled();
    expect(f.deps.history).not.toHaveBeenCalled();
    expect(f.deps.market).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
    expect(f.storage.saveGoalProgress).not.toHaveBeenCalled();
  });
  it.each(['pauseBot', 'stopBot'] as const)(
    '%s revokes synchronously and preserves exact holdings without generic save/release',
    async (method) => {
      const f = setup();
      await f.controller.initialize();
      await f.controller.startBot(f.bot.id);
      const stopped = f.controller[method](f.bot.id);
      expect(f.runtime.stop).toHaveBeenCalledOnce();
      expect(f.runtime.active(f.bot.id)).toBe(false);
      await stopped;
      expect(f.controller.sessionActiveIds.value).toEqual([]);
      expect(f.read().bots[0].status).toBe('paused');
      expect(f.read().bots[0].portfolio).toEqual(f.bot.portfolio);
      expect(f.storage.saveBot).not.toHaveBeenCalled();
      expect(f.storage.stopBot).not.toHaveBeenCalled();
      expect(f.live.reconcile).not.toHaveBeenCalled();
    }
  );
  it('tracks a pending runtime Start so Stop wins its late completion', async () => {
    const f = setup(),
      ready = deferred<void>();
    await f.controller.initialize();
    f.runtime.start.mockImplementation(async () => {
      f.setActive(true);
      await ready.promise;
    });
    const start = f.controller.startBot(f.bot.id);
    const rejected = expect(start).rejects.toThrow('bots.errors.session');
    await vi.waitFor(() => expect(f.runtime.start).toHaveBeenCalled());
    await f.controller.stopBot(f.bot.id);
    ready.resolve();
    await rejected;
    expect(f.controller.sessionActiveIds.value).toEqual([]);
    expect(f.runtime.active(f.bot.id)).toBe(false);
    expect(f.storage.stopBot).not.toHaveBeenCalled();
  });
  it('Stop while the initial record read is pending prevents any runtime Start', async () => {
    const f = setup(),
      record = deferred<BotDefinition[]>();
    f.storage.listBots.mockImplementationOnce(() => record.promise);
    const starting = f.controller.startBot(f.bot.id);
    const rejected = expect(starting).rejects.toThrow('bots.errors.session');
    await f.controller.stopBot(f.bot.id);
    record.resolve([f.bot]);
    await rejected;
    expect(f.runtime.start).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
    expect(f.storage.stopBot).not.toHaveBeenCalled();
  });
  it('Stop while wallet readiness awaits prevents entry into the goal runtime', async () => {
    const f = setup();
    await f.controller.initialize();
    const ready = deferred<Awaited<ReturnType<typeof f.agent.ready>>>();
    f.agent.ready.mockImplementationOnce(() => ready.promise);
    const starting = f.controller.startBot(f.bot.id);
    const rejected = expect(starting).rejects.toThrow('bots.errors.session');
    await vi.waitFor(() => expect(f.agent.ready).toHaveBeenCalled());
    await f.controller.stopBot(f.bot.id);
    ready.resolve(f.agent.status());
    await rejected;
    expect(f.runtime.start).not.toHaveBeenCalled();
    expect(f.read().bots[0].status).toBe('paused');
    expect(f.storage.stopBot).not.toHaveBeenCalled();
  });
  it('reflects a runtime pause without trying to value or save the goal through legacy polling', async () => {
    const f = setup();
    await f.controller.initialize();
    await f.controller.startBot(f.bot.id);
    f.setActive(false);
    await f.controller.tick(101);
    expect(f.controller.sessionActiveIds.value).toEqual([]);
    expect(f.deps.market).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
  });
  it.each(['offline', 'pagehide'])('%s revokes the goal runtime and observes durable pause', async (event) => {
    const f = setup();
    await f.controller.initialize();
    await f.controller.startBot(f.bot.id);
    window.dispatchEvent(new Event(event));
    expect(f.runtime.stop).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(f.read().bots[0].status).toBe('paused'));
    expect(f.storage.saveBot).not.toHaveBeenCalled();
    expect(f.controller.sessionActiveIds.value).toEqual([]);
  });
  it('disposal revokes a goal whose Start is still awaiting authorization', async () => {
    const f = setup(),
      ready = deferred<void>();
    await f.controller.initialize();
    f.runtime.start.mockImplementation(async () => {
      f.setActive(true);
      await ready.promise;
    });
    const starting = f.controller.startBot(f.bot.id);
    const rejected = expect(starting).rejects.toThrow('bots.errors.session');
    await vi.waitFor(() => expect(f.runtime.start).toHaveBeenCalled());
    f.controller.dispose();
    expect(f.runtime.stop).toHaveBeenCalled();
    expect(f.runtime.dispose).toHaveBeenCalled();
    ready.resolve();
    await rejected;
    expect(f.controller.sessionActiveIds.value).toEqual([]);
  });
  it('rejects Start without a qualification runtime but still permits durable Pause and Stop', async () => {
    const f = setup(false);
    await f.controller.initialize();
    await expect(f.controller.startBot(f.bot.id)).rejects.toThrow('bots.errors.policy');
    await f.controller.pauseBot(f.bot.id);
    await f.controller.stopBot(f.bot.id);
    expect(f.goals.pause).toHaveBeenCalled();
    expect(f.read().bots[0].portfolio).toEqual(f.bot.portfolio);
    expect(f.storage.saveBot).not.toHaveBeenCalled();
    expect(f.storage.stopBot).not.toHaveBeenCalled();
    expect(f.live.authorize).not.toHaveBeenCalled();
  });
  it('propagates a user-requested durable stop failure and observes event stop rejections', async () => {
    const f = setup();
    await f.controller.initialize();
    await f.controller.startBot(f.bot.id);
    f.runtime.stop.mockRejectedValue(Error('bots.errors.storage'));
    await expect(f.controller.pauseBot(f.bot.id)).rejects.toThrow('bots.errors.storage');
    expect(f.controller.error.value).toBe('bots.errors.storage');
    await f.controller.startBot(f.bot.id);
    window.dispatchEvent(new Event('offline'));
    await vi.waitFor(() => expect(f.controller.error.value).toBe('bots.errors.storage'));
    expect(f.storage.saveBot).not.toHaveBeenCalled();
  });
  it('does not downgrade a malformed explicit marker into legacy Start', async () => {
    const f = setup();
    const malformed = { ...f.bot, goalExecution: undefined };
    f.replace(malformed as unknown as BotDefinition);
    await expect(f.controller.startBot(f.bot.id)).rejects.toThrow();
    expect(f.runtime.start).not.toHaveBeenCalled();
    expect(f.live.authorize).not.toHaveBeenCalled();
    expect(f.deps.market).not.toHaveBeenCalled();
    expect(f.storage.saveBot).not.toHaveBeenCalled();
  });
});
