import * as cryptoImplementation from '@polkadot/util-crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BotLiveDependencies, BotLiveExecutor } from '@/features/bot-trading/live';
import type { GoalLiveDependencies, GoalLiveExecutor } from '@/features/bot-trading/goal-live';
import type { GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { AgentSwapRequest, PolkaswapAgentApi } from '@/features/agent-trading/types';
import { goalStorageBot, goalTestHash } from './goal-storage-fixtures';
import { executionBot, executionStatus } from './execution-fixtures';

vi.unmock('@polkadot/util-crypto');
vi.mock('@/features/agent-trading/service', () => ({ createPolkaswapAgentApi: vi.fn() }));
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
};
const active: BotLiveExecutor[] = [];
afterEach(async () => {
  for (const executor of active.splice(0)) executor.dispose();
  await Promise.resolve();
  vi.doUnmock('@/features/bot-trading/goal-live');
  vi.doUnmock('@/features/agent-trading/goal-preparation');
});

/** Only the dispatcher is under test; executor correctness has its own synthetic integration suite. */
async function harness(options: { gate?: Promise<void>; goal?: boolean; storage?: boolean; client?: boolean } = {}) {
  vi.resetModules();
  vi.doMock('@polkadot/util-crypto', () => cryptoImplementation);
  const bot = goalStorageBot();
  const bots = [bot];
  const qualification = vi.fn();
  const client = vi.fn();
  const status = vi.fn(() => executionStatus());
  const agent = { status } as unknown as PolkaswapAgentApi;
  const goal: GoalLiveExecutor = {
    previewAllocation: vi.fn(async () => ({ sufficient: true, assets: [] })),
    authorize: vi.fn(async () => undefined),
    execute: vi.fn(async () => undefined),
    reconcile: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    dispose: vi.fn(),
  };
  const createGoal = vi.fn((_storage: GoalEnabledBotStorage, _deps: GoalLiveDependencies) => goal);
  const load = vi.fn();
  vi.doMock('@/features/bot-trading/goal-live', async () => {
    load();
    await options.gate;
    return { createGoalLiveExecutor: createGoal };
  });
  const owned = {} as Awaited<ReturnType<GoalLiveDependencies['prepare']>>;
  const prepare = vi.fn(async () => owned);
  vi.doMock('@/features/agent-trading/goal-preparation', () => ({ prepareOwnedGoalSwap: prepare }));
  const pause = vi.fn(async () => undefined);
  const storage = {
    listBots: vi.fn(async () => copy(bots)),
    listOrders: vi.fn(async () => []),
    saveBot: vi.fn(),
    saveGoalProgress: vi.fn(),
    deleteBot: vi.fn(),
    allocate: vi.fn(),
    reserve: vi.fn(),
    markSigned: vi.fn(),
    markSubmitted: vi.fn(),
    settle: vi.fn(),
    stopBot: vi.fn(),
    ...(options.storage === false ? {} : { goals: { pause } }),
  } as unknown as GoalEnabledBotStorage;
  const dependencies: Partial<BotLiveDependencies> = {
    agent,
    now: vi.fn(() => 1_000_000),
    balances: vi.fn(async (b) => ({ ...b.portfolio.holdings })),
    signer: vi.fn(),
    build: vi.fn(),
    market: vi.fn(),
    block: vi.fn(),
    receipt: vi.fn(),
    acquire: vi.fn(),
    ...(options.goal === false ? {} : { goal: { qualification, ...(options.client === false ? {} : { client }) } }),
  };
  const { createBotLiveExecutor } = await import('@/features/bot-trading/live');
  const executor = createBotLiveExecutor(storage, agent, dependencies);
  active.push(executor);
  return {
    bot,
    bots,
    storage,
    pause,
    goal,
    executor,
    createGoal,
    load,
    prepare,
    owned,
    qualification,
    client,
    agent,
    dependencies,
    status,
  };
}

describe('explicit finalized goal live dispatcher', () => {
  it('lazily forwards all four operations with a detached validated bot and the exact candidate block', async () => {
    const h = await harness();
    expect(h.load).not.toHaveBeenCalled();
    expect(await h.executor.previewAllocation(h.bot)).toEqual({ sufficient: true, assets: [] });
    const proposal = { action: 'buy', amount: '2', reason: 'signal' } as const;
    await h.executor.authorize(h.bot, 'synthetic-password');
    await h.executor.execute(h.bot, proposal);
    await h.executor.reconcile(h.bot, goalTestHash(101));
    expect(h.createGoal).toHaveBeenCalledOnce();
    expect(h.goal.authorize).toHaveBeenCalledWith(h.bot, 'synthetic-password');
    expect(vi.mocked(h.goal.authorize).mock.calls[0][0]).not.toBe(h.bot);
    expect(h.goal.execute).toHaveBeenCalledWith(h.bot, proposal);
    expect(h.goal.reconcile).toHaveBeenCalledWith(h.bot, goalTestHash(101));
    for (const key of ['market', 'block', 'receipt', 'signer', 'build'] as const)
      expect(h.dependencies[key]).not.toHaveBeenCalled();
    expect(h.storage.allocate).not.toHaveBeenCalled();
    expect(h.storage.reserve).not.toHaveBeenCalled();
  });

  it('snapshots the exact proposal before lazy loading and never reads proposal accessors', async () => {
    const gate = deferred<void>();
    const h = await harness({ gate: gate.promise });
    const proposal = { action: 'buy' as const, amount: '2', reason: 'signal' };
    const pending = h.executor.execute(h.bot, proposal);
    proposal.amount = '10';
    gate.resolve();
    await pending;
    expect(h.goal.execute).toHaveBeenCalledWith(h.bot, { action: 'buy', amount: '2', reason: 'signal' });
    const getter = vi.fn(() => '2');
    Object.defineProperty(proposal, 'amount', { get: getter });
    await expect(h.executor.execute(h.bot, proposal)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(h.goal.execute).toHaveBeenCalledOnce();
  });

  it('reuses production adapter interfaces and the private owned preparation factory', async () => {
    const h = await harness();
    await h.executor.previewAllocation(h.bot);
    const [storage, d] = h.createGoal.mock.calls[0];
    expect(storage).toBe(h.storage);
    for (const key of ['signer', 'build', 'balances', 'acquire', 'now'] as const)
      expect(d[key]).toBe(h.dependencies[key]);
    expect(d.qualification).toBe(h.qualification);
    expect(d.client).toBe(h.client);
    expect(d.status()).toEqual(h.status());
    const request: AgentSwapRequest = {
      assetIn: { address: 'synthetic-in' },
      assetOut: { address: 'synthetic-out' },
      amount: '2',
    };
    expect(await d.prepare(request)).toBe(h.owned);
    expect(h.prepare).toHaveBeenCalledWith(h.agent, request);
  });

  it('defaults to the shared public SDK client without a private provider lookup', async () => {
    const h = await harness({ client: false });
    await h.executor.previewAllocation(h.bot);
    const { api } = await import('@/lib/soraneo-wallet/src/api');
    expect(h.createGoal.mock.calls[0][1].client()).toBe(api.api);
  });

  it('requires explicit qualification dependency before loading the goal executor', async () => {
    const h = await harness({ goal: false });
    await expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.policy');
    expect(h.load).not.toHaveBeenCalled();
    expect(h.dependencies.signer).not.toHaveBeenCalled();
  });

  it('requires goal storage before loading or invoking any wallet adapter', async () => {
    const h = await harness({ storage: false });
    await expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.storage');
    expect(h.load).not.toHaveBeenCalled();
    expect(h.dependencies.signer).not.toHaveBeenCalled();
  });

  it.each(['goalExecution', 'exactGoalState', 'goalControl', 'goalSignal'] as const)(
    'rejects malformed %s without falling through to the legacy path',
    async (field) => {
      const h = await harness();
      const invalid = { ...h.bot, [field]: undefined };
      await expect(h.executor.authorize(invalid)).rejects.toThrow();
      expect(h.load).not.toHaveBeenCalled();
      expect(h.dependencies.signer).not.toHaveBeenCalled();
      expect(h.storage.allocate).not.toHaveBeenCalled();
    }
  );

  it('does not evaluate dependency accessors', async () => {
    const h = await harness();
    const getter = vi.fn();
    Object.defineProperty(h.dependencies.goal!, 'qualification', { get: getter });
    await expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.research');
    expect(getter).not.toHaveBeenCalled();
    expect(h.load).not.toHaveBeenCalled();
  });

  it('preserves the legacy preview and does not load goal modules for an ordinary bot', async () => {
    const h = await harness();
    const bot = executionBot();
    h.bots.splice(0, 1, bot as typeof h.bot);
    expect((await h.executor.previewAllocation(bot)).sufficient).toBe(true);
    expect(h.dependencies.balances).toHaveBeenCalledOnce();
    expect(h.load).not.toHaveBeenCalled();
    await h.executor.stop(bot.id);
    expect(h.pause).not.toHaveBeenCalled();
  });

  it('retains the stored marker guard when a caller removes public markers', async () => {
    const h = await harness();
    const stripped = { ...h.bot };
    for (const field of ['goalExecution', 'exactGoalState', 'goalControl', 'goalSignal'] as const)
      delete (stripped as Partial<typeof h.bot>)[field];
    await expect(h.executor.authorize(stripped)).rejects.toThrow('bots.errors.policy');
    expect(h.load).not.toHaveBeenCalled();
    expect(h.dependencies.signer).not.toHaveBeenCalled();
  });

  it('revokes the goal synchronously and returns its outstanding durable pause promise', async () => {
    const h = await harness();
    await h.executor.authorize(h.bot);
    const durable = deferred<void>();
    vi.mocked(h.goal.stop).mockReturnValue(durable.promise);
    const stopping = h.executor.stop(h.bot.id);
    expect(h.goal.stop).toHaveBeenCalledWith(h.bot.id);
    expect(stopping).toBe(durable.promise);
    durable.resolve();
    await stopping;
  });

  it('can durably pause a stored goal before the first lazy dispatch', async () => {
    const h = await harness();
    await h.executor.stop(h.bot.id);
    expect(h.pause).toHaveBeenCalledWith({
      botId: h.bot.id,
      expected: { goalId: h.bot.goalExecution.goalId, controlRevision: 0 },
    });
    expect(h.load).not.toHaveBeenCalled();
  });

  it('fences stop during lazy loading and never constructs or calls a late executor', async () => {
    const gate = deferred<void>();
    const h = await harness({ gate: gate.promise });
    const authorizing = h.executor.authorize(h.bot);
    const rejected = expect(authorizing).rejects.toThrow('bots.errors.session');
    await h.executor.stop(h.bot.id);
    gate.resolve();
    await rejected;
    expect(h.pause).toHaveBeenCalledOnce();
    expect(h.createGoal).not.toHaveBeenCalled();
    expect(h.goal.authorize).not.toHaveBeenCalled();
  });

  it('allows a later explicit authorization but never resurrects the stopped pending one', async () => {
    const gate = deferred<void>();
    const h = await harness({ gate: gate.promise });
    const first = expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.session');
    await h.executor.stop(h.bot.id);
    const next = h.executor.authorize(h.bot);
    gate.resolve();
    await first;
    await next;
    expect(h.goal.authorize).toHaveBeenCalledOnce();
  });

  it('fences disposal during lazy loading, releases only its own executor and cannot reopen', async () => {
    const gate = deferred<void>();
    const h = await harness({ gate: gate.promise });
    const pending = expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.session');
    h.executor.dispose();
    gate.resolve();
    await pending;
    await Promise.resolve();
    expect(h.createGoal).not.toHaveBeenCalled();
    expect(h.pause).toHaveBeenCalledOnce();
    await expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.session');
  });

  it('fences a late successful action result after stop', async () => {
    const h = await harness();
    const work = deferred<void>();
    vi.mocked(h.goal.authorize).mockReturnValue(work.promise);
    const pending = expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.session');
    await vi.waitFor(() => expect(h.goal.authorize).toHaveBeenCalledOnce());
    await h.executor.stop(h.bot.id);
    work.resolve();
    await pending;
  });

  it('fences pagehide during import and removes only owned listeners on dispose', async () => {
    const gate = deferred<void>();
    const h = await harness({ gate: gate.promise });
    const pending = expect(h.executor.authorize(h.bot)).rejects.toThrow('bots.errors.session');
    globalThis.dispatchEvent(new Event('pagehide'));
    gate.resolve();
    await pending;
    expect(h.createGoal).not.toHaveBeenCalled();
    h.executor.dispose();
    await Promise.resolve();
    const count = h.pause.mock.calls.length;
    globalThis.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();
    expect(h.pause).toHaveBeenCalledTimes(count);
  });

  it('disposes the loaded executor once and prevents any subsequent operation', async () => {
    const h = await harness();
    await h.executor.authorize(h.bot);
    h.executor.dispose();
    h.executor.dispose();
    expect(h.goal.dispose).toHaveBeenCalledOnce();
    await expect(h.executor.execute(h.bot, { action: 'buy', amount: '2', reason: 'signal' })).rejects.toThrow(
      'bots.errors.session'
    );
    expect(h.goal.execute).not.toHaveBeenCalled();
  });
});
