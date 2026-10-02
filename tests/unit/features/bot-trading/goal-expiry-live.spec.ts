// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createGoalLiveExecutor, type GoalLiveDependencies } from '@/features/bot-trading/goal-live';
import type { GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { GoalExecutionBot, GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
import { goalExpiryFixture } from './goal-expiry-fixture';
import { executionStatus } from './execution-fixtures';
vi.unmock('@polkadot/util-crypto');
function setup() {
  const f = goalExpiryFixture(),
    status = executionStatus();
  status.node.genesisHash = f.bot.network;
  status.node.connected = true;
  const release = vi.fn();
  const deps: GoalLiveDependencies = {
    client: () => f.client,
    status: () => status,
    now: f.options.now,
    acquire: vi.fn(async () => release),
    prepare: vi.fn(),
    qualification: vi.fn(),
    signer: vi.fn(),
    build: vi.fn(),
    balances: vi.fn(),
  };
  const storage = {
    goals: f.storage,
    listOrders: async () => f.read().orders,
    listBots: async () => f.read().bots,
  } as unknown as GoalEnabledBotStorage;
  const executor = createGoalLiveExecutor(storage, deps);
  return { ...f, deps, release, executor };
}
describe('actual expiry recovery through the live executor', () => {
  it('recovers a reloaded unbroadcast signed order without wallet access or another signature', async () => {
    const f = setup(),
      before = f.read();
    await f.executor.reconcile(f.bot);
    expect((f.read().orders[0] as GoalExecutionOrder).goalExecution.phase).toBe('expired');
    expect(f.read().bots).toEqual(before.bots);
    for (const method of ['signer', 'build', 'prepare', 'balances'] as const)
      expect(f.deps[method]).not.toHaveBeenCalled();
    expect(f.release).toHaveBeenCalledOnce();
    f.executor.dispose();
  });
  it('keeps actual inclusion pending at the original deadline instead of converting it into expiry', async () => {
    const f = setup(),
      before = f.read();
    f.setNow(f.bot.exactGoalState.episode.endedAtMs + 60000);
    f.blocks.set(350, [f.signed]);
    await f.executor.reconcile(f.bot);
    const order = f.read().orders[0] as GoalExecutionOrder;
    expect(order.goalExecution.phase).toBe('finalized-pending');
    expect(order.finalReceipt?.receipt).toMatchObject({ blockNumber: 350, actualFeeCodec: '11' });
    expect(order.expiryEvidence).toBeUndefined();
    expect((f.read().bots[0] as GoalExecutionBot).exactGoalState).toEqual(
      (before.bots[0] as GoalExecutionBot).exactGoalState
    );
    expect(f.deps.prepare).not.toHaveBeenCalled();
    f.executor.dispose();
  });
  it('does not infer expiry for old records without the captured payload', async () => {
    const f = setup();
    const ledger = f.read();
    delete (ledger.orders[0] as GoalExecutionOrder).signingEvidence;
    f.setLedger(ledger);
    await f.executor.reconcile(f.bot);
    expect(f.read().orders[0].status).toBe('signed');
    f.executor.dispose();
  });
  it('leaves the order pending if Stop changes the control revision during the scan', async () => {
    const f = setup();
    let entered!: () => void, resolve!: () => void;
    const started = new Promise<void>((done) => {
        entered = done;
      }),
      gate = new Promise<void>((done) => {
        resolve = done;
      });
    const original = f.client.rpc.chain.getBlock.getMockImplementation()!;
    f.client.rpc.chain.getBlock.mockImplementationOnce(async (hash) => {
      entered();
      await gate;
      return original(hash);
    });
    const pending = f.executor.reconcile(f.bot),
      rejected = expect(pending).rejects.toThrow();
    await started;
    await f.executor.stop(f.bot.id);
    resolve();
    await rejected;
    expect(f.read().orders[0].status).toBe('signed');
    expect((f.read().bots[0] as GoalExecutionBot).goalControl.revision).toBeGreaterThan(0);
    expect([...f.listeners.values()].every((set) => set.size === 0)).toBe(true);
    f.executor.dispose();
  });
});
