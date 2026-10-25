// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import { createHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/pool';
import {
  createGoalTerminalProvider,
  assertGoalTerminalEvidence,
  terminalGoalExactLedger,
  readGoalTerminalEvidence,
} from '@/features/bot-trading/goal-terminal';
import {
  createGoalStorage,
  type GoalStorageLedger,
  readGoalExecutionBot,
  assertGoalOrderAccounting,
  assertGoalAccountClear,
} from '@/features/bot-trading/goal-storage';
import { assertAllocations } from '@/features/bot-trading/policy';
import { projectExactGoalProgress } from '@/features/bot-trading/goal-progress';
import {
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  markGoalExactLedger,
} from '@/features/bot-trading/goal-exact-ledger';
import type { GoalExecutionBot, GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
import { expiredGoalOrderFixture } from './goal-expiry-fixture';
import {
  goalStorageBot,
  goalInitializeInput,
  goalStorageOrder,
  goalStorageReceipt,
  goalExpected,
  goalAccountingExpected,
  goalTestHash as hash,
  goalTestCodec as codec,
  goalTestMark,
  GOAL_TEST_START as START,
} from './goal-storage-fixtures';
import type { ExecutionRpcMethod } from '@/features/bot-trading/execution-state';
vi.unmock('@polkadot/util-crypto');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const pool = createHistoricalPoolFixture();
const keys = createHistoricalExecutionPoolCodec(pool.identity).storageKeys();
const DEADLINE = START + 86400000;
const le = (n: number) => {
  const b = new Uint8Array(8);
  let v = BigInt(n);
  for (let i = 0; i < 8; i++, v >>= 8n) b[i] = Number(v & 255n);
  return `0x${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}`;
};
function setup() {
  const bot = goalStorageBot();
  let time = DEADLINE + 3600000,
    identity = {},
    connected = true,
    finalizedHeight = 14503;
  let transform = (_method: ExecutionRpcMethod, _params: readonly unknown[], result: unknown): unknown => result;
  const request = vi.fn(async (method: ExecutionRpcMethod, params: readonly unknown[]) => {
    let result: unknown;
    const height = method === 'chain_getBlockHash' ? Number(params[0]) : Number(BigInt(String(params.at(-1) ?? '0')));
    switch (method) {
      case 'chain_getBlockHash':
        result = height === 0 ? bot.network : hash(height);
        break;
      case 'chain_getFinalizedHead':
        result = hash(finalizedHeight);
        break;
      case 'chain_getHeader':
        result = {
          number: `0x${height.toString(16)}`,
          parentHash: hash(height - 1),
          stateRoot: hash(5),
          extrinsicsRoot: hash(6),
          digest: { logs: [] },
        };
        break;
      case 'state_getRuntimeVersion':
        result = { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130 };
        break;
      case 'state_getMetadata':
        result = pool.identity.metadataHex;
        break;
      case 'state_getStorageHash':
        result = hash(900);
        break;
      case 'state_queryStorageAt': {
        const values = { ...pool.proof, timestamp: le(START + (height - 100) * 6000) };
        result = [
          {
            block: params[1],
            changes: Object.entries(keys).map(([label, key]) => [key, values[label as keyof typeof values]]),
          },
        ];
        break;
      }
      default:
        throw Error(`Disallowed method ${method}`);
    }
    return transform(method, params, result);
  });
  const provider = createGoalTerminalProvider({
    request,
    connection: () => ({ identity, connected }),
    now: () => time,
  });
  const input = {
    goalId: bot.exactGoalState.goalId,
    deadlineAtMs: DEADLINE,
    minimumBlockNumber: 100,
    minimumBlockHash: hash(100),
    minimumTimestampMs: START,
    expectedDenominator: '1',
  };
  let ledger: GoalStorageLedger = { bots: [bot], orders: [] };
  let failCommit = false;
  let nextGate: Promise<void> | undefined;
  const storage = createGoalStorage(
    async (_write, action) => {
      const gate = nextGate;
      nextGate = undefined;
      if (gate) await gate;
      const next = clone(ledger);
      const out = action(next);
      if (failCommit) {
        failCommit = false;
        throw Error('synthetic commit failure');
      }
      ledger = next;
      return out;
    },
    () => time
  );
  return {
    bot,
    input,
    provider,
    request,
    storage,
    failNextCommit: () => {
      failCommit = true;
    },
    gateNextTransaction: (gate: Promise<void>) => {
      nextGate = gate;
    },
    get ledger() {
      return ledger;
    },
    setTime: (v: number) => {
      time = v;
    },
    revoke: () => {
      identity = {};
    },
    disconnect: () => {
      connected = false;
    },
    setFinalized: (n: number) => {
      finalizedHeight = n;
    },
    mutate: (f: typeof transform) => {
      transform = f;
    },
  };
}
/** Retain invented already-finalized effects through the actual storage receipt path. */
async function retain(
  f: ReturnType<typeof setup>,
  id: string,
  block: number,
  success = true,
  outputCodec = codec(2),
  actualFeeCodec = '11'
) {
  const txHash = hash(500 + f.ledger.orders.length),
    order = goalStorageOrder(f.bot, id);
  f.ledger.orders.push(order);
  await f.storage.sign({
    orderId: id,
    expectedOrderRevision: 0,
    txHash,
    signedAtBlock: 100,
    envelopeDigest: order.goalExecution.envelopeDigest,
    signedEnvelopeDigest: 'a'.repeat(64),
  });
  return f.storage.persistFinalReceipt({
    orderId: id,
    receipt: {
      ...goalStorageReceipt(order),
      txHash,
      blockHash: hash(block),
      blockNumber: block,
      success,
      outputCodec,
      actualFeeCodec,
    },
  });
}
afterEach(() => vi.useRealTimers());
describe('original-deadline terminal accounting', () => {
  it('allows proven canonical expiry to close without erasing the signed fact or charging a fee', async () => {
    const expired = await expiredGoalOrderFixture(),
      f = setup();
    f.bot.account = expired.account;
    f.ledger.orders.push(expired);
    const before = clone(f.bot.exactGoalState),
      evidence = await f.provider.capture(f.input);
    const closed = await f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
    expect(closed.exactGoalState.feesPaidCodec).toBe('0');
    expect(closed.exactGoalState.holdings).toEqual(before.holdings);
    expect(closed.exactGoalState.accountingAtMs).toBe(DEADLINE);
    expect(f.ledger.orders[0]).toEqual(expired);
  });
  it('locates the exact canonical deadline and immediate successor using actual metadata/pool codecs', async () => {
    const f = setup();
    const e = await f.provider.capture(f.input);
    expect(e.block).toMatchObject({ hash: hash(14500), height: 14500, timestampMs: DEADLINE });
    expect(e.successor).toMatchObject({ height: 14501, parentHash: hash(14500), timestampMs: DEADLINE + 6000 });
    expect(e.receivedAtMs).toBe(DEADLINE + 3600000);
    expect(e.rpcCalls).toBeLessThan(128);
    expect(e.mark.kusdReserveCodec).toBe(codec(2));
    expect(e.mark.xorReserveCodec).toBe(codec(3));
    expect(Object.isFrozen(e.mark)).toBe(true);
    assertGoalTerminalEvidence(e);
    expect(readGoalTerminalEvidence(clone(e))).toEqual(e);
    expect(f.request.mock.calls.every(([method]) => !['liquidityProxy_quote', 'state_call'].includes(method))).toBe(
      true
    );
    const terminal = terminalGoalExactLedger(f.bot.exactGoalState, e);
    expect(terminal.accountingAtMs).toBe(DEADLINE);
    expect(terminal.stoppedAtMs).toBe(DEADLINE);
    expect(terminal.outcome).toBe('expired');
    expect(terminal.feesPaidCodec).toBe('0');
    expect(terminal.holdings).toEqual(f.bot.exactGoalState.holdings);
  });
  it('closes atomically and persists the original deadline even an hour after it', async () => {
    const f = setup(),
      evidence = await f.provider.capture(f.input);
    const out = await f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
    expect(out.status).toBe('paused');
    expect(out.sessionExpiresAt).toBe(0);
    expect(out.exactGoalState.accountingAtMs).toBe(DEADLINE);
    expect(out.goalTerminal?.ledgerStateSha256).toBe(out.exactGoalState.stateSha256);
    expect(readGoalExecutionBot(clone(out))).toEqual(out);
    const duplicate = await f.storage.terminal({ botId: out.id, expected: goalExpected(out), evidence });
    expect(duplicate).toEqual(out);
    await expect(
      f.storage.observe({
        botId: out.id,
        expected: goalExpected(out),
        accountingAtMs: DEADLINE + 3600000,
        mark: goalTestMark(15000, DEADLINE + 3600000),
        assertCurrent: () => undefined,
      })
    ).rejects.toThrow('bots.errors.goalComplete');
    expect(f.ledger.bots[0]).toEqual(out);
  });
  it.each(['reserved', 'signed', 'submitted'] as const)(
    'preserves unresolved %s orders and refuses terminal writes',
    async (phase) => {
      const f = setup();
      const order = goalStorageOrder(f.bot);
      f.ledger.orders.push(order);
      // Use actual storage transitions to obtain valid persisted phases.
      if (phase !== 'reserved')
        await f.storage.sign({
          orderId: order.id,
          expectedOrderRevision: 0,
          txHash: hash(500),
          signedAtBlock: 100,
          envelopeDigest: order.goalExecution.envelopeDigest,
          signedEnvelopeDigest: 'a'.repeat(64),
        });
      if (phase === 'submitted') {
        f.setTime(START);
        const signed = f.ledger.orders[0] as ReturnType<typeof goalStorageOrder>;
        await f.storage.submit({
          orderId: signed.id,
          expected: goalExpected(f.bot),
          expectedOrderRevision: signed.goalExecution.orderRevision,
          txHash: hash(500),
          assertCurrent: () => undefined,
        });
        f.setTime(DEADLINE + 3600000);
      }
      const before = clone(f.ledger),
        evidence = await f.provider.capture(f.input);
      await expect(f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence })).rejects.toThrow(
        'bots.errors.pending'
      );
      expect(f.ledger).toEqual(before);
    }
  );
  it.each([true, false])(
    'accounts a late predeadline finalized receipt with success=%s at the original deadline',
    async (success) => {
      const f = setup(),
        order = goalStorageOrder(f.bot);
      f.ledger.orders.push(order);
      await f.storage.sign({
        orderId: order.id,
        expectedOrderRevision: 0,
        txHash: hash(500),
        signedAtBlock: 100,
        envelopeDigest: order.goalExecution.envelopeDigest,
        signedEnvelopeDigest: 'a'.repeat(64),
      });
      const receipt = {
        ...goalStorageReceipt(order),
        txHash: hash(500),
        success,
        outputCodec: success ? codec(2) : '0',
        actualFeeCodec: '20000000000000000',
      };
      await f.storage.persistFinalReceipt({ orderId: order.id, receipt });
      const before = clone(f.ledger);
      await expect(
        f.storage.applyReceipt({
          botId: f.bot.id,
          orderId: order.id,
          expected: goalAccountingExpected(f.bot),
          accountingAtMs: DEADLINE + 3600000,
          mark: goalTestMark(15000, DEADLINE + 3600000),
          assertCurrent: () => undefined,
        })
      ).rejects.toThrow('bots.errors.goalComplete');
      expect(f.ledger).toEqual(before);
      const evidence = await f.provider.capture(f.input);
      const out = await f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
      expect(out.exactGoalState.accountingAtMs).toBe(DEADLINE);
      expect(out.exactGoalState.feesPaidCodec).toBe(receipt.actualFeeCodec);
      expect(out.exactGoalState.trades).toBe(success ? 1 : 0);
      expect(out.exactGoalState.failures).toBe(success ? 0 : 1);
      expect(out.exactGoalState.holdings).toEqual({
        kusdCodec: success ? codec(8) : codec(10),
        xorCodec: String(BigInt(success ? codec(3) : codec(1)) - BigInt(receipt.actualFeeCodec)),
      });
      expect(out.exactGoalState.attention).toContain('fee-ceiling-exceeded');
      const retained = f.ledger.orders[0] as ReturnType<typeof goalStorageOrder>;
      expect(retained.finalReceipt?.receipt).toEqual(receipt);
      expect(retained.goalExecution.phase).toBe('accounted');
      expect(retained.finalReceipt?.appliedStateSha256).toBe(out.exactGoalState.stateSha256);
      const duplicate = await f.storage.terminal({ botId: f.bot.id, expected: goalExpected(out), evidence });
      expect(duplicate).toEqual(out);
      expect(f.ledger.orders[0]).toEqual(retained);
    }
  );
  it('accounts a genuine terminal fee deficit and blocks every new account allocation', async () => {
    const f = setup(),
      order = goalStorageOrder(f.bot);
    f.ledger.orders.push(order);
    await f.storage.sign({
      orderId: order.id,
      expectedOrderRevision: 0,
      txHash: hash(500),
      signedAtBlock: 100,
      envelopeDigest: order.goalExecution.envelopeDigest,
      signedEnvelopeDigest: 'a'.repeat(64),
    });
    await f.storage.persistFinalReceipt({
      orderId: order.id,
      receipt: {
        ...goalStorageReceipt(order),
        txHash: hash(500),
        success: false,
        outputCodec: '0',
        actualFeeCodec: codec(12),
      },
    });
    const out = await f.storage.terminal({
      botId: f.bot.id,
      expected: goalExpected(f.bot),
      evidence: await f.provider.capture(f.input),
    });
    expect(out.exactGoalState.accountingAtMs).toBe(DEADLINE);
    expect(out.exactGoalState.holdings.xorCodec).toBe('0');
    expect(out.exactGoalState.deficit.xorCodec).toBe(codec(11));
    expect(out.portfolio.feesPaidCodec).toBe(codec(12));
    expect(out.exactGoalState.failures).toBe(1);
    expect(out.exactGoalState.trades).toBe(0);
    await expect(
      f.storage.initialize({ ...goalInitializeInput(goalStorageBot('new')), assertCurrent: () => undefined })
    ).rejects.toThrow('bots.errors.balance');
  });
  it('freezes the deadline result and journals actual later success and failure effects atomically', async () => {
    const f = setup();
    const late = await retain(f, 'post-success', 14502, true, codec(3), '22');
    const early = await retain(f, 'pre', 101, true, codec(2), '11');
    await retain(f, 'post-failure', 14501, false, '0', '33');
    const evidence = await f.provider.capture(f.input);
    const r = early.finalReceipt!.receipt;
    const expectedDeadline = terminalGoalExactLedger(f.bot.exactGoalState, evidence, [
      {
        orderId: early.id,
        receipt: {
          blockHash: r.blockHash,
          blockNumber: r.blockNumber,
          extrinsicHash: r.txHash,
          extrinsicIndex: r.extrinsicIndex,
        },
        fill: {
          inputAsset: early.inputAsset,
          inputCodec: early.inputCodec,
          outputAsset: early.outputAsset,
          minimumOutputCodec: early.minOutputCodec,
          feeCeilingCodec: early.feeCodec,
        },
        success: r.success,
        actualOutputCodec: r.outputCodec,
        actualFeeCodec: r.actualFeeCodec,
      },
    ]);
    const out = await f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
    expect(out.exactGoalState).toEqual(expectedDeadline);
    expect(out.goalTerminal?.ledgerStateSha256).toBe(expectedDeadline.stateSha256);
    expect(out.goalPostDeadline).toMatchObject({
      feesPaidAfterDeadlineCodec: '55',
      tradesAfterDeadline: 1,
      failuresAfterDeadline: 1,
      holdings: { kusdCodec: codec(6), xorCodec: String(BigInt(codec(6)) - 66n) },
    });
    expect(out.goalPostDeadline?.settlements.map((s) => s.orderId)).toEqual(['post-failure', 'post-success']);
    expect(out.portfolio).toMatchObject({
      feesPaidCodec: '66',
      trades: 2,
      holdings: { [KUSD]: codec(6), [XOR]: String(BigInt(codec(6)) - 66n) },
    });
    expect(() => assertAllocations([out], out.portfolio.holdings)).not.toThrow();
    expect(readGoalExecutionBot(clone(out))).toEqual(out);
    const orders = f.ledger.orders as GoalExecutionOrder[];
    assertGoalOrderAccounting(out, orders);
    const display = projectExactGoalProgress(out, { now: DEADLINE + 3600000, orders });
    expect(display).toMatchObject({
      kind: 'exact',
      terminal: true,
      accountingComplete: true,
      canResume: false,
      value: expectedDeadline.latestValue,
      valuedAtMs: expectedDeadline.lastMark.timestampMs,
      feesPaidCodec: '66',
      trades: 2,
      spentKusdCodec: codec(4),
      holdings: out.goalPostDeadline!.holdings,
      postDeadline: { fees: '<0.000001', trades: 1, failures: 1 },
    });
    const withoutLater = projectExactGoalProgress(out, {
      now: DEADLINE + 3600000,
      orders: orders.filter((o) => o.id !== late.id),
    });
    expect(withoutLater).toMatchObject({ kind: 'exact', status: 'attention', accountingComplete: false });
    expect(orders.find((o) => o.id === late.id)?.finalReceipt).toMatchObject({
      accounting: 'applied-after-deadline',
      appliedStateSha256: out.goalPostDeadline!.journalSha256,
    });
    expect(orders.find((o) => o.id === early.id)?.goalExecution.phase).toBe('accounted');
    const duplicate = await f.storage.terminal({ botId: out.id, expected: goalExpected(out), evidence });
    expect(duplicate).toEqual(out);
    expect(() =>
      assertGoalOrderAccounting(
        out,
        orders.filter((o) => o.id !== late.id)
      )
    ).toThrow('bots.errors.receipt');
    expect(() => assertGoalOrderAccounting(out, [...orders, orders[0]])).toThrow('bots.errors.receipt');
    const wrongPhase = clone(orders);
    const laterOrder = wrongPhase.find((o) => o.id === late.id)!;
    laterOrder.goalExecution.phase = 'accounted';
    laterOrder.finalReceipt!.accounting = 'applied';
    laterOrder.finalReceipt!.appliedStateSha256 = out.exactGoalState.stateSha256;
    expect(() => assertGoalOrderAccounting(out, wrongPhase)).toThrow('bots.errors.receipt');
    const wrongJournal = clone(orders);
    wrongJournal.find((o) => o.id === late.id)!.finalReceipt!.appliedStateSha256 = 'f'.repeat(64);
    expect(() => assertGoalOrderAccounting(out, wrongJournal)).toThrow('bots.errors.receipt');
  });
  it('retains real later breaches and deficits without changing the deadline fees, value or peaks', async () => {
    const f = setup();
    await retain(f, 'late', 14501, true, '1', codec(12));
    const evidence = await f.provider.capture(f.input),
      expectedDeadline = terminalGoalExactLedger(f.bot.exactGoalState, evidence);
    const out = await f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
    expect(out.exactGoalState).toEqual(expectedDeadline);
    expect(out.exactGoalState.feesPaidCodec).toBe('0');
    expect(out.goalPostDeadline?.deficit.xorCodec).toBe(String(BigInt(codec(11)) - 1n));
    expect(out.goalPostDeadline?.attention).toEqual(
      expect.arrayContaining([
        'fee-ceiling-exceeded',
        'fee-budget-exceeded',
        'minimum-output-breached',
        'allocation-deficit',
      ])
    );
    expect(out.portfolio.holdings[XOR]).toBe('0');
    expect(out.status).toBe('attention');
    expect(() => assertGoalAccountClear(f.ledger, out.account, out.network)).toThrow('bots.errors.balance');
    expect(out.exactGoalState.attention).toEqual([]);
    const ordersBeforeStop = clone(f.ledger.orders);
    const stopped = await f.storage.pause({
      botId: out.id,
      expected: { goalId: out.goalExecution.goalId, controlRevision: out.goalControl.revision },
    });
    expect(stopped.status).toBe('attention');
    expect(stopped.sessionExpiresAt).toBe(0);
    expect(stopped.goalControl.revision).toBe(out.goalControl.revision + 1);
    expect(stopped.exactGoalState).toEqual(out.exactGoalState);
    expect(stopped.goalTerminal).toEqual(out.goalTerminal);
    expect(stopped.goalPostDeadline).toEqual(out.goalPostDeadline);
    expect(f.ledger.orders).toEqual(ordersBeforeStop);
    expect(readGoalExecutionBot(stopped).status).toBe('attention');
    expect(() => assertGoalAccountClear(f.ledger, out.account, out.network)).toThrow('bots.errors.balance');
  });
  it('does not partially commit either ledger or an order when terminal persistence fails', async () => {
    const f = setup();
    await retain(f, 'pre', 101);
    await retain(f, 'post', 14501);
    const before = clone(f.ledger),
      evidence = await f.provider.capture(f.input);
    f.failNextCommit();
    await expect(f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence })).rejects.toThrow(
      'synthetic commit failure'
    );
    expect(f.ledger).toEqual(before);
    const out = await f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
    expect(out.goalPostDeadline?.settlements).toHaveLength(1);
    expect(out.exactGoalState.settlements).toHaveLength(1);
  });
  it('includes a concurrently retained receipt from the transactional order snapshot', async () => {
    const f = setup();
    await retain(f, 'one', 14501);
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const evidence = await f.provider.capture(f.input);
    f.gateNextTransaction(gate);
    const closing = f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
    await retain(f, 'two', 14502);
    release();
    const out = await closing;
    expect(out.goalPostDeadline?.settlements.map((s) => s.orderId)).toEqual(['one', 'two']);
    expect(
      (f.ledger.orders as GoalExecutionOrder[]).every((o) => o.goalExecution.phase === 'accounted-after-deadline')
    ).toBe(true);
  });
  it('leaves the deadline and late receipts untouched when Stop wins the control revision race', async () => {
    const f = setup();
    await retain(f, 'late', 14501);
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const evidence = await f.provider.capture(f.input);
    f.gateNextTransaction(gate);
    const closing = f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence });
    await f.storage.pause({
      botId: f.bot.id,
      expected: { goalId: f.bot.goalExecution.goalId, controlRevision: f.bot.goalControl.revision },
    });
    const stopped = clone(f.ledger);
    release();
    await expect(closing).rejects.toThrow('bots.errors.stale');
    expect(f.ledger).toEqual(stopped);
    expect((f.ledger.orders[0] as GoalExecutionOrder).goalExecution.phase).toBe('finalized-pending');
    expect((f.ledger.bots[0] as GoalExecutionBot).goalTerminal).toBeUndefined();
  });
  it('keeps all known late receipts pending while another signed order is unresolved', async () => {
    const f = setup();
    await retain(f, 'known', 14501);
    const unknown = goalStorageOrder(f.bot, 'unknown');
    f.ledger.orders.push(unknown);
    await f.storage.sign({
      orderId: unknown.id,
      expectedOrderRevision: 0,
      txHash: hash(999),
      signedAtBlock: 100,
      envelopeDigest: unknown.goalExecution.envelopeDigest,
      signedEnvelopeDigest: 'a'.repeat(64),
    });
    const before = clone(f.ledger);
    await expect(
      f.storage.terminal({
        botId: f.bot.id,
        expected: goalExpected(f.bot),
        evidence: await f.provider.capture(f.input),
      })
    ).rejects.toThrow('bots.errors.pending');
    expect(f.ledger).toEqual(before);
  });
  it('binds a restored journal to actual terminal evidence and rejects stale portfolio mirrors', async () => {
    const f = setup();
    await retain(f, 'late', 14501);
    const out = await f.storage.terminal({
      botId: f.bot.id,
      expected: goalExpected(f.bot),
      evidence: await f.provider.capture(f.input),
    });
    const stale = clone(out);
    stale.portfolio.holdings[KUSD] = codec(10);
    expect(() => readGoalExecutionBot(stale)).toThrow();
    const forged = clone(out);
    Object.assign(forged.goalPostDeadline!.boundary, { evidenceSha256: 'f'.repeat(64) });
    expect(() => readGoalExecutionBot(forged)).toThrow();
    const missing = clone(out);
    delete missing.goalTerminal;
    expect(() => readGoalExecutionBot(missing)).toThrow();
  });
  it('accepts cancelled reservations without inventing a fill or fee', async () => {
    const f = setup(),
      order = goalStorageOrder(f.bot);
    f.ledger.orders.push(order);
    await f.storage.cancel({ orderId: order.id, expectedOrderRevision: 0 });
    const out = await f.storage.terminal({
      botId: f.bot.id,
      expected: goalExpected(f.bot),
      evidence: await f.provider.capture(f.input),
    });
    expect(out.exactGoalState.trades).toBe(0);
    expect(out.exactGoalState.feesPaidCodec).toBe('0');
  });
  it('preserves actual accounted fills and fees without applying them twice', async () => {
    const f = setup(),
      order = goalStorageOrder(f.bot);
    f.ledger.orders.push(order);
    f.setTime(START);
    await f.storage.sign({
      orderId: order.id,
      expectedOrderRevision: 0,
      txHash: hash(500),
      signedAtBlock: 100,
      envelopeDigest: order.goalExecution.envelopeDigest,
      signedEnvelopeDigest: 'a'.repeat(64),
    });
    await f.storage.persistFinalReceipt({
      orderId: order.id,
      receipt: { ...goalStorageReceipt(order), txHash: hash(500) },
    });
    f.setTime(START + 6000);
    const settled = await f.storage.applyReceipt({
      botId: f.bot.id,
      expected: goalAccountingExpected(f.bot),
      orderId: order.id,
      accountingAtMs: START + 6000,
      mark: goalTestMark(101, START + 6000),
      assertCurrent: () => undefined,
    });
    f.setTime(DEADLINE + 3600000);
    f.input.minimumBlockNumber = 101;
    f.input.minimumBlockHash = hash(101);
    f.input.minimumTimestampMs = START + 6000;
    const out = await f.storage.terminal({
      botId: f.bot.id,
      expected: goalExpected(settled.bot),
      evidence: await f.provider.capture(f.input),
    });
    expect(out.exactGoalState.settlements).toEqual(settled.bot.exactGoalState.settlements);
    expect(out.exactGoalState.feesPaidCodec).toEqual(settled.bot.exactGoalState.feesPaidCodec);
    expect(out.exactGoalState.holdings).toEqual(settled.bot.exactGoalState.holdings);
  });
  it('preserves an earlier target outcome while valuing the original terminal state', async () => {
    const f = setup(),
      before = markGoalExactLedger(f.bot.exactGoalState, {
        expectedRevision: 0,
        accountingAtMs: START + 6000,
        mark: { ...goalTestMark(101, START + 6000), xorReserveCodec: codec(110) },
      });
    expect(before.outcome).toBe('target');
    f.input.minimumBlockNumber = 101;
    f.input.minimumBlockHash = hash(101);
    f.input.minimumTimestampMs = START + 6000;
    const out = terminalGoalExactLedger(before, await f.provider.capture(f.input));
    expect(out.outcome).toBe('target');
    expect(out.stoppedAtMs).toBe(START + 6000);
    expect(out.accountingAtMs).toBe(DEADLINE);
  });
  it('rejects backwards accounting after a post-deadline observation', async () => {
    const f = setup(),
      before = markGoalExactLedger(f.bot.exactGoalState, {
        expectedRevision: 0,
        accountingAtMs: DEADLINE + 6000,
        mark: goalTestMark(14501, DEADLINE + 6000),
      });
    expect(() => terminalGoalExactLedger(before, {} as never)).toThrow('unowned');
    const evidence = await f.provider.capture(f.input);
    expect(() => terminalGoalExactLedger(before, evidence)).toThrow('accounting');
  });
  it('rejects imported or altered evidence and CAS conflicts without mutation', async () => {
    const f = setup(),
      e = await f.provider.capture(f.input),
      before = clone(f.ledger);
    await expect(
      f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence: clone(e) })
    ).rejects.toThrow('unowned');
    await expect(
      f.storage.terminal({ botId: f.bot.id, expected: { ...goalExpected(f.bot), revision: 1 }, evidence: e })
    ).rejects.toThrow('bots.errors.storage');
    expect(() => readGoalTerminalEvidence({ ...e, successor: { ...e.successor, parentHash: hash(9) } })).toThrow();
    expect(f.ledger).toEqual(before);
  });
  it.each(['disconnect', 'epoch-change'] as const)('revokes owned evidence on %s', async (kind) => {
    const f = setup(),
      e = await f.provider.capture(f.input);
    kind === 'disconnect' ? f.disconnect() : f.revoke();
    expect(() => assertGoalTerminalEvidence(e)).toThrow('context-changed');
    await expect(f.storage.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence: e })).rejects.toThrow(
      'context-changed'
    );
  });
  it('requires a finalized successor strictly after the deadline', async () => {
    const f = setup();
    f.setFinalized(14500);
    await expect(f.provider.capture(f.input)).rejects.toThrow('not-finalized');
    expect(f.ledger.bots[0]).toEqual(f.bot);
  });
  it.each(['canonical-hash', 'successor-parent', 'timestamp-future', 'denominator', 'absent-pool'] as const)(
    'rejects inconsistent %s evidence',
    async (kind) => {
      const f = setup();
      f.mutate((method, params, result) => {
        if (kind === 'canonical-hash' && method === 'chain_getBlockHash' && params[0] === 14503) return hash(8);
        if (kind === 'successor-parent' && method === 'chain_getHeader' && params[0] === hash(14501))
          return { ...(result as object), parentHash: hash(9) };
        if (method === 'state_queryStorageAt') {
          const r = clone(result) as [{ changes: Array<[string, string | null]> }];
          if (kind === 'timestamp-future') r[0].changes[0][1] = le(DEADLINE + 7200000);
          if (kind === 'denominator') r[0].changes[1][1] = `0x02${'00'.repeat(15)}`;
          if (kind === 'absent-pool' && params[1] === hash(14500)) {
            r[0].changes[5][1] = null;
            r[0].changes[6][1] = null;
          }
          return r;
        }
        return result;
      });
      await expect(f.provider.capture(f.input)).rejects.toThrow();
    }
  );
  it('rejects a changed canonical last-accounted anchor before terminal selection', async () => {
    const f = setup();
    f.input.minimumTimestampMs = START - 1;
    await expect(f.provider.capture(f.input)).rejects.toThrow('accounting');
    expect(f.ledger.bots[0]).toEqual(f.bot);
  });
  it('rolls back a closure if its owned connection changes inside the transaction', async () => {
    const f = setup(),
      evidence = await f.provider.capture(f.input);
    const before = clone(f.ledger);
    const store = createGoalStorage(
      async (_write, action) => {
        const candidate = clone(f.ledger);
        f.revoke();
        return action(candidate);
      },
      () => DEADLINE + 3600000
    );
    await expect(store.terminal({ botId: f.bot.id, expected: goalExpected(f.bot), evidence })).rejects.toThrow(
      'context-changed'
    );
    expect(f.ledger).toEqual(before);
  });
  it('rejects request accessors before invoking them or reading RPC state', async () => {
    const f = setup(),
      getter = vi.fn(() => DEADLINE);
    Object.defineProperty(f.input, 'deadlineAtMs', { get: getter, enumerable: true });
    await expect(f.provider.capture(f.input)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(f.request).not.toHaveBeenCalled();
  });
  it('bounds an uncooperative RPC wait and ignores late work', async () => {
    vi.useFakeTimers();
    const f = setup();
    f.request.mockImplementation(() => new Promise(() => undefined));
    const pending = f.provider.capture(f.input);
    const rejected = expect(pending).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(30000);
    await rejected;
    expect(f.request).toHaveBeenCalledTimes(1);
  });
});
