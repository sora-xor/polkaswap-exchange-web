import { describe, expect, it, vi } from 'vitest';
import { u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import {
  createGoalExactLedger,
  restoreGoalExactLedger,
  markGoalExactLedger,
  assessGoalExactFill,
  settleGoalExactLedger,
  settleGoalExactTerminal,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  GOAL_EXACT_POLICY,
  type GoalExactMark,
  type GoalExactLedgerState,
  type GoalExactFill,
  type GoalExactSettlement,
} from '@/features/bot-trading/goal-exact-ledger';
vi.unmock('@polkadot/util-crypto');
const UNIT = 10n ** 18n;
const START = 1_000_000;
const codec = (n: bigint | number) => String(BigInt(n) * UNIT);
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const sha = (v: unknown) => u8aToHex(sha256AsU8a(new TextEncoder().encode(canonical(v)))).slice(2);
const rehash = (state: GoalExactLedgerState) => {
  const { stateSha256: _hash, ...rest } = state;
  return { ...rest, stateSha256: sha(rest) };
};
const mark = (block = 100, at = START, kusd = 100n, xor = 100n): GoalExactMark => ({
  blockHash: hash(block),
  blockNumber: block,
  timestampMs: at,
  denominator: '1',
  kusdReserveCodec: codec(kusd),
  xorReserveCodec: codec(xor),
});
const config = {
  goalId: 'goal-1',
  startedAtMs: START,
  initialKusdCodec: codec(10),
  maxTradeKusdCodec: codec(3),
  maxTradeXorCodec: codec(3),
};
const fresh = () => createGoalExactLedger(config, mark());
const fill: GoalExactFill = {
  inputAsset: KUSD,
  inputCodec: codec(2),
  outputAsset: XOR,
  minimumOutputCodec: codec(2),
  feeCeilingCodec: String(UNIT / 100n),
};
const observation = (state: GoalExactLedgerState, m = state.lastMark) => ({
  expectedRevision: state.revision,
  accountingAtMs: m.timestampMs,
  mark: m,
});
function settlement(state: GoalExactLedgerState, index = 0, success = true): GoalExactSettlement {
  const m = mark(101 + index, START + 6000 * (index + 1));
  return {
    ...observation(state, m),
    orderId: `order-${index}`,
    receipt: {
      blockHash: m.blockHash,
      blockNumber: m.blockNumber,
      extrinsicHash: hash(1000 + index),
      extrinsicIndex: index,
    },
    fill,
    success,
    actualOutputCodec: success ? codec(2) : '0',
    actualFeeCodec: String(UNIT / 100n),
  };
}
describe('persisted exact goal ledger', () => {
  it('opens <=10 KUSD plus a separate 1 XOR with an explicitly older finalized mark and exact rational baseline', () => {
    const s = createGoalExactLedger(config, mark(100, START - 60000, 3n, 2n));
    expect(s.accountingAtMs).toBe(START);
    expect(s.openingMark.timestampMs).toBe(START - 60000);
    expect(s.openingValue).toEqual({ numerator: String(23n * UNIT), denominator: '3' });
    expect(s.holdings).toEqual({ kusdCodec: codec(10), xorCodec: codec(1) });
    expect(s.episode.endedAtMs - START).toBe(86400000);
    expect(restoreGoalExactLedger(clone(s))).toEqual(s);
    expect(Object.isFrozen(s.lastMark)).toBe(true);
  });
  it.each(['capital', 'full-order', 'zero', 'future', 'stale', 'denominator'] as const)(
    'rejects invalid opening %s',
    (which) => {
      const c = { ...config };
      const m = { ...mark() };
      if (which === 'capital') c.initialKusdCodec = codec(11);
      if (which === 'full-order') c.maxTradeKusdCodec = codec(10);
      if (which === 'zero') c.initialKusdCodec = '0';
      if (which === 'future') m.timestampMs++;
      if (which === 'stale') m.timestampMs -= 60001;
      if (which === 'denominator') m.denominator = '0';
      expect(() => createGoalExactLedger(c, m)).toThrow();
    }
  );
  it('marks through an exact target then decline without unlatching or changing the baseline', () => {
    const a = fresh();
    const target = markGoalExactLedger(a, observation(a, mark(101, START + 6000, 200n, 211n)));
    expect(target.outcome).toBe('target');
    expect(target.latestValue).toEqual({ numerator: String((231n * UNIT) / 20n), denominator: '1' });
    const declined = markGoalExactLedger(target, observation(target, mark(102, START + 12000, 100n, 50n)));
    expect(declined.outcome).toBe('target');
    expect(declined.stoppedAtMs).toBe(target.stoppedAtMs);
    expect(declined.openingValue).toEqual(a.openingValue);
    expect(declined.goalPeakValue).toEqual(target.goalPeakValue);
    expect(restoreGoalExactLedger(clone(declined))).toEqual(declined);
  });
  it('stops at exactly 5% peak loss, preserving one-atom distinctions', () => {
    const a = fresh();
    const m = { ...mark(101, START + 6000), kusdReserveCodec: '200', xorReserveCodec: '189' };
    const stopped = markGoalExactLedger(a, observation(a, m));
    expect(stopped.outcome).toBe('loss');
    expect(stopped.maximumDrawdownRatio).toEqual({ numerator: '1', denominator: '20' });
    const above = { ...m, kusdReserveCodec: codec(200), xorReserveCodec: String(189n * UNIT + 1n) };
    expect(markGoalExactLedger(a, observation(a, above)).outcome).toBe('active');
  });
  it('gives expiry priority without relabeling an old block timestamp or inventing an earlier target', () => {
    const a = fresh();
    const deadline = a.episode.endedAtMs;
    const expired = markGoalExactLedger(a, {
      expectedRevision: 0,
      accountingAtMs: deadline,
      mark: mark(200, deadline - 6000, 1n, 10n),
    });
    expect(expired.outcome).toBe('expired');
    expect(expired.stoppedAtMs).toBe(deadline);
    expect(expired.lastMark.timestampMs).toBe(deadline - 6000);
    expect(expired.goalPeakValue).toEqual(a.goalPeakValue);
    expect(expired.performancePeakValue).not.toEqual(a.performancePeakValue);
    expect(restoreGoalExactLedger(clone(expired))).toEqual(expired);
  });
  it('preserves revision/hash lineage and rejects stale CAS, changed denominator and contradictory marks', () => {
    const a = fresh();
    const b = markGoalExactLedger(a, observation(a, mark(101, START + 6000)));
    expect(b.revision).toBe(1);
    expect(b.previousStateSha256).toBe(a.stateSha256);
    expect(markGoalExactLedger(b, observation(b)).stateSha256).toBe(b.stateSha256);
    expect(() => markGoalExactLedger(b, { ...observation(b), expectedRevision: 0 })).toThrow();
    expect(() => markGoalExactLedger(b, observation(b, { ...b.lastMark, denominator: '2' }))).toThrow();
    expect(() => markGoalExactLedger(b, observation(b, { ...b.lastMark, xorReserveCodec: '1' }))).toThrow();
    expect(() => markGoalExactLedger(b, observation(b, a.lastMark))).toThrow();
  });
  it('assesses minimum success and fee-only failure without charging either', () => {
    const a = fresh();
    const result = assessGoalExactFill(a, { ...observation(a), fill });
    expect(result.rejection).toBeUndefined();
    expect(result.state.stateSha256).toBe(a.stateSha256);
    expect(result.minimumSuccessValue).toEqual({ numerator: String((1099n * UNIT) / 100n), denominator: '1' });
    expect(result.feeOnlyFailureValue).toEqual(result.minimumSuccessValue);
    expect(a.feesPaidCodec).toBe('0');
  });
  it('rejects when only minimum success or only fee failure reaches the exact loss threshold', () => {
    const a = fresh();
    expect(
      assessGoalExactFill(a, { ...observation(a), fill: { ...fill, minimumOutputCodec: String((146n * UNIT) / 100n) } })
        .rejection
    ).toBe('goal-trade-cost');
    expect(
      assessGoalExactFill(a, {
        ...observation(a),
        fill: { ...fill, minimumOutputCodec: codec(3), feeCeilingCodec: String((55n * UNIT) / 100n) },
      }).rejection
    ).toBe('goal-trade-cost');
  });
  it('does not borrow the protected fee reserve or future output to fund a sell', () => {
    const a = fresh();
    const sell = { inputAsset: XOR, inputCodec: '1', outputAsset: KUSD, minimumOutputCodec: '1', feeCeilingCodec: '1' };
    expect(assessGoalExactFill(a, { ...observation(a), fill: sell }).rejection).toBe('balance');
    const bought = settleGoalExactLedger(a, settlement(a)).state;
    const exact = { ...sell, inputCodec: codec(2), minimumOutputCodec: codec(2), feeCeilingCodec: String(UNIT / 100n) };
    expect(assessGoalExactFill(bought, { ...observation(bought), fill: exact }).rejection).toBeUndefined();
    expect(
      assessGoalExactFill(bought, { ...observation(bought), fill: { ...exact, inputCodec: String(2n * UNIT + 1n) } })
        .rejection
    ).toBe('balance');
  });
  it('charges a successful finalized native fee once and returns current state for an old duplicate after reload/marks', () => {
    const a = fresh();
    const receipt = settlement(a);
    const once = settleGoalExactLedger(a, receipt);
    expect(once.duplicate).toBe(false);
    expect(once.state.holdings).toEqual({ kusdCodec: codec(8), xorCodec: String((299n * UNIT) / 100n) });
    expect(once.state.feesPaidCodec).toBe(String(UNIT / 100n));
    expect(once.state.trades).toBe(1);
    const later = markGoalExactLedger(
      restoreGoalExactLedger(clone(once.state)),
      observation(once.state, mark(102, START + 12000))
    );
    const duplicate = settleGoalExactLedger(later, receipt);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.state).toEqual(later);
  });
  it('charges failed finalized fees once while leaving input/output and trade count untouched', () => {
    const a = fresh();
    const receipt = settlement(a, 0, false);
    const once = settleGoalExactLedger(a, receipt).state;
    expect(once.holdings).toEqual({ kusdCodec: codec(10), xorCodec: String((99n * UNIT) / 100n) });
    expect(once.trades).toBe(0);
    expect(once.failures).toBe(1);
    expect(settleGoalExactLedger(restoreGoalExactLedger(clone(once)), receipt).state).toEqual(once);
  });
  it.each(['order', 'event', 'transaction', 'amount'] as const)(
    'rejects conflicting %s identities rather than double charging',
    (change) => {
      const a = fresh();
      const r = settlement(a);
      const once = settleGoalExactLedger(a, r).state;
      const altered = clone(r);
      if (change === 'order') Object.assign(altered, { orderId: 'different-order' });
      if (change === 'event') Object.assign(altered.receipt, { extrinsicIndex: altered.receipt.extrinsicIndex + 1 });
      if (change === 'transaction') Object.assign(altered.receipt, { extrinsicHash: hash(555) });
      if (change === 'amount') Object.assign(altered, { actualFeeCodec: '1' });
      expect(() => settleGoalExactLedger(once, altered)).toThrow();
    }
  );
  it('records an already-realized late settlement after a target without relatching the goal', () => {
    const a = fresh();
    const stopped = markGoalExactLedger(a, observation(a, mark(102, START + 12000, 200n, 211n)));
    const r = {
      ...settlement(a),
      expectedRevision: stopped.revision,
      accountingAtMs: START + 18000,
      mark: mark(103, START + 18000, 200n, 211n),
    };
    const settled = settleGoalExactLedger(stopped, r).state;
    expect(settled.outcome).toBe('target');
    expect(settled.stoppedAtMs).toBe(stopped.stoppedAtMs);
    expect(settled.holdings.kusdCodec).toBe(codec(8));
    expect(settled.attention).toContain('late-settlement');
    expect(restoreGoalExactLedger(clone(settled))).toEqual(settled);
  });
  it('records excess actual fees and explicit negative-net deficits without negative holdings or fabricated funding', () => {
    const a = fresh();
    const r = { ...settlement(a, 0, false), actualFeeCodec: codec(12) };
    const s = settleGoalExactLedger(a, r).state;
    expect(s.holdings).toEqual({ kusdCodec: codec(10), xorCodec: '0' });
    expect(s.deficit).toEqual({ kusdCodec: '0', xorCodec: codec(11) });
    expect(s.latestValue).toEqual({ numerator: String(-UNIT), denominator: '1' });
    expect(s.feesPaidCodec).toBe(codec(12));
    expect(s.outcome).toBe('loss');
    expect(s.attention).toEqual([
      'fee-ceiling-exceeded',
      'fee-budget-exceeded',
      'allocation-deficit',
      'fee-reserve-used',
    ]);
    expect(restoreGoalExactLedger(clone(s))).toEqual(s);
  });
  it('records a breached minimum and sale from the protected reserve, then blocks admission', () => {
    const a = fresh();
    const r = {
      ...settlement(a),
      fill: {
        inputAsset: XOR,
        inputCodec: String(UNIT / 100n),
        outputAsset: KUSD,
        minimumOutputCodec: String(UNIT / 100n),
        feeCeilingCodec: '1',
      },
      actualOutputCodec: '0',
      actualFeeCodec: '1',
    };
    const s = settleGoalExactLedger(a, r).state;
    expect(s.attention).toEqual(['minimum-output-breached', 'fee-reserve-used']);
    expect(assessGoalExactFill(s, { ...observation(s), fill }).rejection).toBe('attention');
    expect(restoreGoalExactLedger(clone(s))).toEqual(s);
  });
  it('continues truthful settlement after fixed expiry and keeps its original completion clock', () => {
    const a = fresh();
    const end = a.episode.endedAtMs;
    const expired = markGoalExactLedger(a, { expectedRevision: 0, accountingAtMs: end, mark: mark(200, end) });
    const r = {
      ...settlement(a, 0, false),
      expectedRevision: expired.revision,
      accountingAtMs: end + 6000,
      mark: mark(201, end + 6000),
    };
    const s = settleGoalExactLedger(expired, r).state;
    expect(s.outcome).toBe('expired');
    expect(s.stoppedAtMs).toBe(end);
    expect(s.feesPaidCodec).toBe(String(UNIT / 100n));
    expect(restoreGoalExactLedger(clone(s))).toEqual(s);
  });
  it.each(['checksum', 'holdings', 'fees', 'receipt', 'peak', 'active-target', 'policy'] as const)(
    'rejects corrupted %s snapshots even when derived corruption has a recomputed checksum',
    (change) => {
      const a = fresh();
      const original = change === 'active-target' ? a : settleGoalExactLedger(a, settlement(a)).state;
      const s = clone(original);
      if (change === 'checksum') Object.assign(s, { stateSha256: '0'.repeat(64) });
      if (change === 'holdings') Object.assign(s.holdings, { kusdCodec: '1' });
      if (change === 'fees') Object.assign(s, { feesPaidCodec: '0' });
      if (change === 'receipt') Object.assign(s.settlements[0], { actualFeeCodec: '1' });
      if (change === 'peak') Object.assign(s, { performancePeakValue: { numerator: '1', denominator: '1' } });
      if (change === 'active-target') {
        const latestValue = { numerator: codec(12), denominator: '1' };
        Object.assign(s, { latestValue, goalPeakValue: latestValue, performancePeakValue: latestValue });
      }
      if (change === 'policy') Object.assign(s.policy, { maximumDrawdownPercent: '10' });
      expect(() => restoreGoalExactLedger(change === 'checksum' ? s : rehash(s))).toThrow();
    }
  );
  it('rejects accessors, sparse receipt arrays, unknown fields and nonstring hash coercion', () => {
    const getter = vi.fn();
    const a = clone(fresh());
    Object.defineProperty(a, 'goalId', { enumerable: true, get: getter });
    expect(() => restoreGoalExactLedger(a)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const sparse = { ...fresh(), settlements: Array(1) };
    expect(() => restoreGoalExactLedger(sparse)).toThrow();
    expect(() => restoreGoalExactLedger({ ...fresh(), extra: true })).toThrow();
    expect(() => createGoalExactLedger(config, { ...mark(), blockHash: [hash(100)] as unknown as string })).toThrow();
  });
  it('does not authenticate a valid local snapshot or globally revoke an old immutable alias', () => {
    const a = fresh();
    const r = settlement(a);
    const first = settleGoalExactLedger(a, r).state;
    // These are equal pure reductions; only atomic persistence CAS decides which write may commit.
    expect(settleGoalExactLedger(a, r).state).toEqual(first);
    expect(first.previousStateSha256).toBe(a.stateSha256);
    expect(first.policy.maximumSettlements).toBe(4096);
  });
  it('fails closed at 4096 receipts without evicting old duplicate protection', () => {
    const a = fresh();
    const r = { ...settlement(a, 0, false), actualFeeCodec: '0' };
    const first = settleGoalExactLedger(a, r).state;
    const entries = Array.from({ length: GOAL_EXACT_POLICY.maximumSettlements }, (_, i) => {
      const content = {
        orderId: `order-${i}`,
        receipt: { ...r.receipt, extrinsicHash: hash(1000 + i), extrinsicIndex: i },
        fill: r.fill,
        success: false,
        actualOutputCodec: '0',
        actualFeeCodec: '0',
      };
      return { ...content, eventId: `${r.receipt.blockHash}:${i}`, revision: i + 1, digest: sha(content) };
    });
    const full = restoreGoalExactLedger(
      rehash({ ...first, settlements: entries, failures: entries.length, revision: entries.length })
    );
    expect(assessGoalExactFill(full, { ...observation(full), fill }).rejection).toBe('receipt-capacity');
    expect(settleGoalExactLedger(full, r).duplicate).toBe(true);
    expect(() =>
      settleGoalExactLedger(full, {
        ...r,
        expectedRevision: full.revision,
        orderId: 'new-order',
        receipt: { ...r.receipt, extrinsicHash: hash(9999), extrinsicIndex: 9999 },
      })
    ).toThrow();
    expect(full.settlements).toHaveLength(4096);
  }, 60_000);
  it('rejects known height/hash contradictions across old receipts, newer marks and funding', () => {
    const a = fresh();
    const first = settleGoalExactLedger(a, settlement(a)).state;
    const later = markGoalExactLedger(first, observation(first, mark(102, START + 12000)));
    const r = {
      ...settlement(later, 2),
      receipt: { blockHash: hash(999), blockNumber: 101, extrinsicHash: hash(7000), extrinsicIndex: 7 },
    };
    expect(() => settleGoalExactLedger(later, r)).toThrow();
    expect(() => settleGoalExactLedger(later, { ...r, receipt: { ...r.receipt, blockNumber: 100 } })).toThrow();
    expect(() =>
      settleGoalExactLedger(later, { ...r, receipt: { ...r.receipt, blockNumber: 102, blockHash: hash(101) } })
    ).toThrow();
    expect(() =>
      markGoalExactLedger(later, observation(later, { ...mark(103, START + 18000), blockHash: hash(101) }))
    ).toThrow();
    expect(() => createGoalExactLedger(config, { ...mark(), blockHash: GOAL_EXACT_POLICY.genesisHash })).toThrow();
  });
});

describe('private immutable ledger serialization', () => {
  it('keeps warm shared settlement subtrees byte-identical to cold copied accounting through a new fee and mark', () => {
    const opening = fresh();
    const first = settleGoalExactLedger(opening, settlement(opening)).state;
    let current = first;
    for (let i = 0; i < 3; i++) {
      current = markGoalExactLedger(current, observation(current, mark(102 + i, START + 12000 + i * 6000)));
      const { stateSha256, ...body } = current;
      expect(stateSha256).toBe(sha(body));
      expect(restoreGoalExactLedger(clone(current))).toEqual(current);
    }
    const receipt = {
      ...settlement(current, 4, false),
      actualFeeCodec: '123',
    };
    const next = settleGoalExactLedger(current, receipt).state;
    const { stateSha256, ...body } = next;
    expect(stateSha256).toBe(sha(body));
    expect(restoreGoalExactLedger(clone(next))).toEqual(next);
    expect(next.feesPaidCodec).toBe(String(UNIT / 100n + 123n));
    expect(next.holdings.xorCodec).toBe(String((299n * UNIT) / 100n - 123n));
    expect(next.failures).toBe(1);
    expect(first.feesPaidCodec).toBe(String(UNIT / 100n));
    receipt.actualFeeCodec = '999';
    expect(next.settlements[1].actualFeeCodec).toBe('123');
    expect(Object.isFrozen(next.settlements)).toBe(true);
    expect(Object.isFrozen(next.settlements[1].receipt)).toBe(true);
    expect(Object.isFrozen(next.settlements[1].fill)).toBe(true);
  });

  it('rehashes each reused external mark after mutation and retains exact target and drawdown decisions', () => {
    const opening = fresh();
    const external = mark(101, START + 6000);
    const unchanged = markGoalExactLedger(opening, observation(opening, external));
    Object.assign(external, mark(102, START + 12000, 200n, 211n));
    const target = markGoalExactLedger(unchanged, observation(unchanged, external));
    const { stateSha256, ...body } = target;
    expect(stateSha256).toBe(sha(body));
    expect(unchanged.outcome).toBe('active');
    expect(target.outcome).toBe('target');
    Object.assign(external, mark(103, START + 18000, 100n, 50n));
    const declined = markGoalExactLedger(target, observation(target, external));
    expect(declined.outcome).toBe('target');
    expect(declined.stoppedAtMs).toBe(target.stoppedAtMs);
    expect(BigInt(declined.maximumDrawdownRatio.numerator) * 20n).toBeGreaterThan(
      BigInt(declined.maximumDrawdownRatio.denominator)
    );
    expect(restoreGoalExactLedger(clone(declined))).toEqual(declined);
  });

  it('does not trust externally frozen impostors with rehashed but inconsistent accounting', () => {
    const opening = fresh();
    const warmed = settleGoalExactLedger(opening, settlement(opening)).state;
    markGoalExactLedger(warmed, observation(warmed, mark(102, START + 12000)));
    const changed = clone(warmed);
    Object.assign(changed, { feesPaidCodec: '0' });
    const impostor = Object.freeze(rehash(changed));
    expect(() => restoreGoalExactLedger(impostor)).toThrow();
    expect(() => markGoalExactLedger(impostor, observation(impostor))).toThrow();
  });

  it('copies untrusted proxy identities afresh and refuses frozen accessors without invoking them', () => {
    const opening = fresh();
    const warmed = settleGoalExactLedger(opening, settlement(opening)).state;
    const external = clone(warmed);
    let forged = false;
    const proxy = new Proxy(external, {
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        return forged && key === 'feesPaidCodec' ? { ...descriptor, value: '0' } : descriptor;
      },
    });
    expect(restoreGoalExactLedger(proxy)).toEqual(warmed);
    forged = true;
    expect(() => restoreGoalExactLedger(proxy)).toThrow();
    const getter = vi.fn(() => warmed.feesPaidCodec);
    const accessor = clone(warmed);
    Object.defineProperty(accessor, 'feesPaidCodec', { enumerable: true, get: getter });
    Object.freeze(accessor);
    expect(() => restoreGoalExactLedger(accessor)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});

describe('atomic terminal receipt batch', () => {
  const batch = () => {
    const state = fresh(),
      deadline = state.episode.endedAtMs;
    const rows = [settlement(state), settlement(state, 1)].map(
      ({ orderId, receipt, fill, success, actualOutputCodec, actualFeeCodec }) => ({
        orderId,
        receipt,
        fill,
        success,
        actualOutputCodec,
        actualFeeCodec,
      })
    );
    return {
      state,
      input: { expectedRevision: state.revision, accountingAtMs: deadline, mark: mark(200, deadline), receipts: rows },
    };
  };
  it('applies all exact effects before one terminal valuation without inventing intermediate peaks', () => {
    const { state, input } = batch();
    input.receipts[0].actualOutputCodec = codec(10);
    input.receipts[1].fill = {
      inputAsset: XOR,
      outputAsset: KUSD,
      inputCodec: codec(10),
      minimumOutputCodec: codec(2),
      feeCeilingCodec: String(UNIT / 100n),
    };
    input.receipts[1].actualOutputCodec = codec(2);
    const next = settleGoalExactTerminal(state, input);
    expect(next.holdings).toEqual({ kusdCodec: codec(10), xorCodec: String(UNIT - UNIT / 50n) });
    expect(next.performancePeakValue).toEqual(state.performancePeakValue);
    expect(next.maximumDrawdownRatio).toEqual({ numerator: '1', denominator: '550' });
    expect(next.outcome).toBe('expired');
    expect(next.accountingAtMs).toBe(state.episode.endedAtMs);
    expect(next.settlements.map((s) => s.revision)).toEqual([1, 2]);
    expect(next.revision).toBe(3);
    expect(next.previousStateSha256).toBe(state.stateSha256);
    expect(next.attention).toContain('trade-limit-exceeded');
    expect(restoreGoalExactLedger(clone(next))).toEqual(next);
  });
  it('charges a real failed transaction fee and preserves earlier successful effects', () => {
    const { state, input } = batch();
    input.receipts[1].success = false;
    input.receipts[1].actualOutputCodec = '0';
    const next = settleGoalExactTerminal(state, input);
    expect(next.holdings).toEqual({ kusdCodec: codec(8), xorCodec: String(3n * UNIT - UNIT / 50n) });
    expect(next.trades).toBe(1);
    expect(next.failures).toBe(1);
    expect(next.feesPaidCodec).toBe(String(UNIT / 50n));
    expect(restoreGoalExactLedger(clone(next))).toEqual(next);
  });
  it.each([
    'after-deadline',
    'wrong-time',
    'duplicate-order',
    'duplicate-transaction',
    'out-of-order',
    'contradictory-hash',
    'wrong-revision',
  ] as const)('rejects %s terminal batches', (kind) => {
    const { state, input } = batch();
    if (kind === 'after-deadline')
      input.receipts[1].receipt = { ...input.receipts[1].receipt, blockNumber: 201, blockHash: hash(201) };
    if (kind === 'wrong-time') input.accountingAtMs++;
    if (kind === 'duplicate-order') input.receipts[1].orderId = input.receipts[0].orderId;
    if (kind === 'duplicate-transaction')
      input.receipts[1].receipt = {
        ...input.receipts[1].receipt,
        extrinsicHash: input.receipts[0].receipt.extrinsicHash,
      };
    if (kind === 'out-of-order') input.receipts.reverse();
    if (kind === 'contradictory-hash')
      input.receipts[1].receipt = { ...input.receipts[1].receipt, blockNumber: 200, blockHash: hash(999) };
    if (kind === 'wrong-revision') input.expectedRevision++;
    expect(() => settleGoalExactTerminal(state, input)).toThrow();
    expect(state.revision).toBe(0);
  });
  it('does not duplicate an existing receipt and handles an empty terminal batch as one observation', () => {
    const { state, input } = batch();
    const empty = settleGoalExactTerminal(state, { ...input, receipts: [] });
    expect(empty.revision).toBe(1);
    const done = settleGoalExactTerminal(state, input);
    expect(() => settleGoalExactTerminal(done, { ...input, expectedRevision: done.revision })).toThrow();
    expect(settleGoalExactTerminal(done, { ...input, expectedRevision: done.revision, receipts: [] })).toEqual(done);
  });
});

describe('detached postorder restore ownership', () => {
  it('preserves canonical bytes for dense arrays and reordered null-prototype raw records', () => {
    const opening = fresh();
    const original = settleGoalExactLedger(opening, settlement(opening)).state;
    const nullRecords = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(nullRecords);
      if (!value || typeof value !== 'object') return value;
      return Object.assign(
        Object.create(null),
        Object.fromEntries(
          Object.entries(value)
            .reverse()
            .map(([key, child]) => [key, nullRecords(child)])
        )
      );
    };
    const raw = nullRecords(clone(original)) as GoalExactLedgerState;
    const restored = restoreGoalExactLedger(raw);
    const { stateSha256, ...body } = restored;
    expect(restored).toEqual(original);
    expect(stateSha256).toBe(sha(body));
    expect(canonical(restored)).toBe(canonical(original));
    expect(Object.getPrototypeOf(raw)).toBeNull();
    expect(Object.getPrototypeOf(raw.policy)).toBeNull();
    expect(Object.getPrototypeOf(raw.settlements[0].receipt)).toBeNull();
    expect(Object.getPrototypeOf(restored)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(restored.policy)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(restored.settlements)).toBe(Array.prototype);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(raw.settlements)).toBe(false);
    expect(Object.isFrozen(raw.settlements[0].receipt)).toBe(false);
  });

  it('returns fresh recursively frozen detached identities on every restore, including owned or externally frozen input', () => {
    const opening = fresh();
    const original = settleGoalExactLedger(opening, settlement(opening)).state;
    const raw = clone(original);
    const first = restoreGoalExactLedger(raw);
    const second = restoreGoalExactLedger(first);
    const third = restoreGoalExactLedger(Object.freeze(raw));
    const frozenTree = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(frozenTree);
    };
    frozenTree(first);
    frozenTree(second);
    frozenTree(third);
    expect(first).not.toBe(raw);
    expect(first).not.toBe(original);
    expect(second).not.toBe(first);
    expect(second.settlements).not.toBe(first.settlements);
    expect(second.settlements[0]).not.toBe(first.settlements[0]);
    expect(second.settlements[0].receipt).not.toBe(first.settlements[0].receipt);
    expect(third.settlements).not.toBe(raw.settlements);
    expect(third.settlements[0].fill).not.toBe(raw.settlements[0].fill);
    expect(first).toEqual(original);
    expect(second.stateSha256).toBe(original.stateSha256);
    expect(third.stateSha256).toBe(original.stateSha256);
  });

  it.each([
    'sparse',
    'extra-string',
    'extra-symbol',
    'accessor-index',
    'non-enumerable-index',
    'foreign-prototype',
    'over-cap',
  ] as const)('retains raw receipt-array rejection for %s without invoking an indexed getter', (shape) => {
    const opening = fresh();
    const raw = clone(settleGoalExactLedger(opening, settlement(opening)).state);
    const rows = [...raw.settlements];
    Object.assign(raw, { settlements: rows });
    const firstRow = rows[0];
    const getter = vi.fn(() => firstRow);
    if (shape === 'sparse') delete rows[0];
    if (shape === 'extra-string') Object.defineProperty(rows, 'extra', { value: 'forged', enumerable: true });
    if (shape === 'extra-symbol') Object.defineProperty(rows, Symbol('extra'), { value: true, enumerable: true });
    if (shape === 'accessor-index')
      Object.defineProperty(rows, '0', { get: getter, enumerable: true, configurable: true });
    if (shape === 'non-enumerable-index') Object.defineProperty(rows, '0', { enumerable: false });
    if (shape === 'foreign-prototype') Object.setPrototypeOf(rows, Object.create(Array.prototype));
    if (shape === 'over-cap') Object.assign(raw, { settlements: Array(4097).fill(rows[0]) });
    expect(() => restoreGoalExactLedger(raw)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(Object.isFrozen(rows)).toBe(false);
  });

  it.each(['__proto__', 'constructor', 'prototype'] as const)(
    'rejects an extra reserved own key %s without admitting its value or changing prototypes',
    (key) => {
      const raw = clone(fresh());
      const extra = { ledgerPolluted: true };
      Object.defineProperty(raw, key, { value: extra, enumerable: true, configurable: true, writable: true });
      expect(() => restoreGoalExactLedger(raw)).toThrow();
      expect(Object.getPrototypeOf(raw)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(extra)).toBe(Object.prototype);
      expect(Object.isFrozen(extra)).toBe(false);
      expect(Object.prototype).not.toHaveProperty('ledgerPolluted');
    }
  );

  it.each(['foreign-prototype', 'class-prototype', 'symbol-key', 'non-enumerable-data', 'getter'] as const)(
    'retains raw own-record rejection for %s without freezing or reading external accessors',
    (shape) => {
      const raw = clone(fresh());
      const getter = vi.fn(() => 'goal-1');
      if (shape === 'foreign-prototype') Object.setPrototypeOf(raw, Object.create(null));
      if (shape === 'class-prototype') Object.setPrototypeOf(raw, class ForeignRecord {}.prototype);
      if (shape === 'symbol-key') Object.defineProperty(raw, Symbol('extra'), { value: true, enumerable: true });
      if (shape === 'non-enumerable-data') Object.defineProperty(raw, 'goalId', { enumerable: false });
      if (shape === 'getter') Object.defineProperty(raw, 'goalId', { get: getter, enumerable: true });
      expect(() => restoreGoalExactLedger(raw)).toThrow();
      expect(getter).not.toHaveBeenCalled();
      expect(Object.isFrozen(raw)).toBe(false);
    }
  );

  it('never freezes raw proxy identities and rechecks their changed descriptors on the next restore', () => {
    const opening = fresh();
    const original = settleGoalExactLedger(opening, settlement(opening)).state;
    const raw = clone(original);
    const preventExtensions = vi.fn(() => {
      throw new Error('raw object must not be frozen');
    });
    const defineProperty = vi.fn(() => {
      throw new Error('raw object must not be branded');
    });
    const arrayProxy = new Proxy(raw.settlements, { preventExtensions, defineProperty });
    Object.assign(raw, { settlements: arrayProxy });
    let altered = false;
    const proxy = new Proxy(raw, {
      preventExtensions,
      defineProperty,
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        return altered && key === 'feesPaidCodec' ? { ...descriptor, value: '0' } : descriptor;
      },
    });
    expect(restoreGoalExactLedger(proxy)).toEqual(original);
    expect(preventExtensions).not.toHaveBeenCalled();
    expect(defineProperty).not.toHaveBeenCalled();
    altered = true;
    expect(() => restoreGoalExactLedger(proxy)).toThrow();
    expect(preventExtensions).not.toHaveBeenCalled();
    expect(defineProperty).not.toHaveBeenCalled();
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(raw.settlements)).toBe(false);
  });

  it('keeps external raw snapshots mutable and isolated, and rejects late mutation even with a new checksum', () => {
    const opening = fresh();
    const original = settleGoalExactLedger(opening, settlement(opening)).state;
    const raw = clone(original);
    const restored = restoreGoalExactLedger(raw);
    Object.assign(raw, { feesPaidCodec: '0' });
    Object.assign(raw.settlements[0], { actualFeeCodec: '1' });
    expect(restored).toEqual(original);
    expect(restored.settlements[0].actualFeeCodec).toBe(String(UNIT / 100n));
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(raw.settlements[0])).toBe(false);
    expect(() => restoreGoalExactLedger(raw)).toThrow();
    expect(() => restoreGoalExactLedger(rehash(raw))).toThrow();
    expect(restoreGoalExactLedger(clone(restored))).toEqual(original);
  });

  it.each(['fees', 'holdings', 'receipt-digest'] as const)(
    'rejects a deeply externally frozen rehashed semantic impostor (%s)',
    (change) => {
      const opening = fresh();
      const original = settleGoalExactLedger(opening, settlement(opening)).state;
      const raw = clone(original);
      if (change === 'fees') Object.assign(raw, { feesPaidCodec: '0' });
      if (change === 'holdings') Object.assign(raw.holdings, { xorCodec: '1' });
      if (change === 'receipt-digest') Object.assign(raw.settlements[0], { digest: '0'.repeat(64) });
      const impostor = rehash(raw);
      const freezeExternal = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        Object.values(value).forEach(freezeExternal);
        Object.freeze(value);
      };
      freezeExternal(impostor);
      expect(() => restoreGoalExactLedger(impostor)).toThrow();
      expect(() => markGoalExactLedger(impostor, observation(impostor))).toThrow();
      expect(original.feesPaidCodec).toBe(String(UNIT / 100n));
    }
  );

  it('preserves ordinary mutable caller inputs for create, mark, fill and receipt copying', () => {
    const externalConfig = { ...config };
    const externalMark = mark();
    const opening = createGoalExactLedger(externalConfig, externalMark);
    const externalReceipt = settlement(opening);
    const settled = settleGoalExactLedger(opening, externalReceipt).state;
    for (const raw of [
      externalConfig,
      externalMark,
      externalReceipt,
      externalReceipt.mark,
      externalReceipt.receipt,
      externalReceipt.fill,
    ]) {
      expect(Object.isFrozen(raw)).toBe(false);
    }
    externalConfig.goalId = 'changed-config';
    Object.assign(externalMark, { xorReserveCodec: '1' });
    Object.assign(externalReceipt, { actualFeeCodec: '1' });
    expect(opening.goalId).toBe('goal-1');
    expect(opening.lastMark.xorReserveCodec).toBe(codec(100));
    expect(settled.feesPaidCodec).toBe(String(UNIT / 100n));
    expect(restoreGoalExactLedger(clone(settled))).toEqual(settled);
  });
});

/** Copy-cache transfer keeps full raw snapshots/validation; serialization counts avoid timing assertions. */
describe('canonical strings carried through fully checked restore copies', () => {
  it('reuses private array/record serialization with byte-identical cold and warm fresh results', () => {
    const opening = fresh();
    const request = { ...settlement(opening), orderId: 'cache-carried-order' };
    const settled = settleGoalExactLedger(opening, request).state;
    const owned = restoreGoalExactLedger(settled);
    const external = clone(owned);
    const stringify = vi.spyOn(JSON, 'stringify');
    let warm: GoalExactLedgerState;
    let cold: GoalExactLedgerState;
    let warmOrderWrites: number;
    let warmReceiptWrites: number;
    let coldOrderWrites: number;
    let coldReceiptWrites: number;
    try {
      warm = restoreGoalExactLedger(owned);
      warmOrderWrites = stringify.mock.calls.filter(([value]) => value === request.orderId).length;
      warmReceiptWrites = stringify.mock.calls.filter(([value]) => value === request.receipt.extrinsicHash).length;
      stringify.mockClear();
      cold = restoreGoalExactLedger(external);
      coldOrderWrites = stringify.mock.calls.filter(([value]) => value === request.orderId).length;
      coldReceiptWrites = stringify.mock.calls.filter(([value]) => value === request.receipt.extrinsicHash).length;
    } finally {
      stringify.mockRestore();
    }
    // The receipt-content root remains freshly serialized/hashed; its order ID is written once.
    expect(warmOrderWrites!).toBe(1);
    expect(coldOrderWrites!).toBe(2);
    expect(warmReceiptWrites!).toBe(0);
    // Cold body serialization caches its newly frozen receipt before receipt-content checking.
    expect(coldReceiptWrites!).toBe(1);
    expect(warm!).toEqual(cold!);
    const { stateSha256, ...body } = warm!;
    expect(stateSha256).toBe(sha(body));
    expect(warm!).not.toBe(owned);
    expect(warm!.settlements).not.toBe(owned.settlements);
    expect(warm!.settlements[0]).not.toBe(owned.settlements[0]);
    expect(warm!.settlements[0].receipt).not.toBe(owned.settlements[0].receipt);
    expect(warm!.settlements[0].fill).not.toBe(owned.settlements[0].fill);
    expect(Object.isFrozen(external)).toBe(false);
    expect(Object.isFrozen(external.settlements[0].receipt)).toBe(false);
  });

  it('retains the same warm/cold fees, protected reserve, failure accounting and later latched drawdown', () => {
    const opening = fresh();
    let owned = restoreGoalExactLedger(settleGoalExactLedger(opening, settlement(opening)).state);
    let external = clone(owned);
    const failed = { ...settlement(owned, 2, false), actualFeeCodec: '123' };
    const warmFailed = settleGoalExactLedger(owned, failed).state;
    const coldFailed = settleGoalExactLedger(external, clone(failed)).state;
    expect(warmFailed).toEqual(coldFailed);
    expect(warmFailed.failures).toBe(1);
    expect(warmFailed.feesPaidCodec).toBe(String(UNIT / 100n + 123n));
    owned = restoreGoalExactLedger(warmFailed);
    external = clone(owned);
    for (const m of [mark(105, START + 30000, 100n, 110n), mark(106, START + 36000, 100n, 50n)]) {
      const observed = observation(owned, m);
      owned = markGoalExactLedger(owned, observed);
      const cold = markGoalExactLedger(external, clone(observed));
      expect(owned).toEqual(cold);
      const { stateSha256, ...body } = owned;
      expect(stateSha256).toBe(sha(body));
      external = clone(cold);
    }
    expect(owned.outcome).toBe('target');
    expect(BigInt(owned.maximumDrawdownRatio.numerator) * 20n).toBeGreaterThan(
      BigInt(owned.maximumDrawdownRatio.denominator)
    );
    const candidate = { ...observation(owned), fill };
    expect(assessGoalExactFill(owned, candidate)).toEqual(assessGoalExactFill(external, clone(candidate)));
    expect(assessGoalExactFill(owned, candidate).rejection).toBe('goal-complete');
  });

  it('never admits an external mutable source or proxy after copying it, and rechecks later mutations', () => {
    const opening = fresh();
    const request = { ...settlement(opening), orderId: 'mutable-cache-source-order' };
    const original = restoreGoalExactLedger(settleGoalExactLedger(opening, request).state);
    const external = clone(original);
    let altered = false;
    const proxy = new Proxy(external, {
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        return altered && key === 'feesPaidCodec' ? { ...descriptor, value: '0' } : descriptor;
      },
    });
    expect(restoreGoalExactLedger(proxy)).toEqual(original);
    const stringify = vi.spyOn(JSON, 'stringify');
    try {
      expect(restoreGoalExactLedger(proxy)).toEqual(original);
      // A previous detached result cannot authorize its mutable external source identity.
      expect(stringify.mock.calls.filter(([value]) => value === request.orderId)).toHaveLength(2);
    } finally {
      stringify.mockRestore();
    }
    expect(Object.isFrozen(external)).toBe(false);
    expect(Object.isFrozen(external.settlements[0])).toBe(false);
    altered = true;
    expect(() => restoreGoalExactLedger(proxy)).toThrow();
    Object.assign(external.settlements[0], { actualFeeCodec: '1' });
    expect(() => restoreGoalExactLedger(rehash(external))).toThrow();
    expect(restoreGoalExactLedger(clone(original))).toEqual(original);
  });

  it('rejects externally frozen rehashed accounting and frozen accessors after a warm owned copy', () => {
    const opening = fresh();
    const original = restoreGoalExactLedger(settleGoalExactLedger(opening, settlement(opening)).state);
    restoreGoalExactLedger(original);
    const changed = clone(original);
    Object.assign(changed, { feesPaidCodec: '0' });
    const impostor = rehash(changed);
    const freezeExternal = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      Object.values(value).forEach(freezeExternal);
      Object.freeze(value);
    };
    freezeExternal(impostor);
    expect(() => restoreGoalExactLedger(impostor)).toThrow();
    expect(() => markGoalExactLedger(impostor, observation(impostor))).toThrow();
    const getter = vi.fn(() => original.feesPaidCodec);
    const accessor = clone(original);
    Object.defineProperty(accessor, 'feesPaidCodec', { enumerable: true, get: getter });
    Object.freeze(accessor);
    expect(() => restoreGoalExactLedger(accessor)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(original.feesPaidCodec).toBe(String(UNIT / 100n));
  });

  it('keeps late invalid parents detached and enforces limits after visiting already cached descendants', () => {
    const opening = fresh();
    const owned = restoreGoalExactLedger(settleGoalExactLedger(opening, settlement(opening)).state);
    const overString = { ...owned, lateInvalid: 'x'.repeat(513) };
    expect(() => restoreGoalExactLedger(overString)).toThrow();
    expect(Object.isFrozen(overString)).toBe(false);
    overString.lateInvalid = 'valid primitive but an extra field';
    expect(() => restoreGoalExactLedger(overString)).toThrow();
    expect(Object.isFrozen(overString)).toBe(false);
    expect(restoreGoalExactLedger(owned)).toEqual(owned);
    const external = clone(owned);
    const unknownParent = { ...external, lateInvalid: true };
    expect(() => restoreGoalExactLedger(unknownParent)).toThrow();
    expect(Object.isFrozen(external.settlements)).toBe(false);
    expect(Object.isFrozen(external.settlements[0].receipt)).toBe(false);
    Object.assign(external, { feesPaidCodec: '0' });
    expect(() => restoreGoalExactLedger(rehash(external))).toThrow();
    expect(restoreGoalExactLedger(clone(owned))).toEqual(owned);
  });
});

/** Private projections save reflection only: every restore still makes and validates a fresh full copy. */
describe('private own-data projections in exact ledger copies', () => {
  it('reuses only exact owned projections while returning byte-equivalent detached descendants', () => {
    const opening = fresh();
    const owned = restoreGoalExactLedger(settleGoalExactLedger(opening, settlement(opening)).state);
    restoreGoalExactLedger(owned);
    const external = clone(owned);
    const selected = [
      owned,
      owned.settlements,
      owned.settlements[0],
      owned.settlements[0].receipt,
      owned.settlements[0].fill,
    ];
    const selectedExternal = [external, external.settlements, external.settlements[0], external.settlements[0].receipt];
    const descriptors = vi.spyOn(Object, 'getOwnPropertyDescriptors');
    let warm!: GoalExactLedgerState;
    let cold!: GoalExactLedgerState;
    let ownedCalls!: number;
    let externalCalls!: number[];
    try {
      warm = restoreGoalExactLedger(owned);
      restoreGoalExactLedger(owned);
      ownedCalls = descriptors.mock.calls.filter(([value]) => selected.includes(value as typeof owned)).length;
      descriptors.mockClear();
      cold = restoreGoalExactLedger(external);
      restoreGoalExactLedger(external);
      externalCalls = selectedExternal.map(
        (source) => descriptors.mock.calls.filter(([value]) => value === source).length
      );
    } finally {
      descriptors.mockRestore();
    }
    expect(ownedCalls).toBe(0);
    expect(externalCalls).toEqual([2, 2, 2, 2]);
    expect(warm).toEqual(cold);
    const { stateSha256, ...body } = warm;
    expect(stateSha256).toBe(sha(body));
    for (const result of [warm, cold]) {
      expect(result).not.toBe(owned);
      expect(result.settlements).not.toBe(owned.settlements);
      expect(result.settlements[0]).not.toBe(owned.settlements[0]);
      expect(result.settlements[0].receipt).not.toBe(owned.settlements[0].receipt);
      expect(result.settlements[0].fill).not.toBe(owned.settlements[0].fill);
      expect(result.settlements[0].receipt).not.toBe(external.settlements[0].receipt);
    }
    expect(Object.isFrozen(external)).toBe(false);
    Object.assign(external.settlements[0], { actualFeeCodec: '1' });
    expect(() => restoreGoalExactLedger(rehash(external))).toThrow();
    expect(restoreGoalExactLedger(owned)).toEqual(owned);
  });

  it('does not admit external frozen/null-prototype copies or proxy wrappers of owned identities', () => {
    const owned = restoreGoalExactLedger(fresh());
    restoreGoalExactLedger(owned);
    const external = clone(owned);
    Object.setPrototypeOf(external, null);
    const freezeExternal = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      Object.values(value).forEach(freezeExternal);
      Object.freeze(value);
    };
    freezeExternal(external);
    const ownKeys = vi.fn((target: object) => Reflect.ownKeys(target));
    const proxy = new Proxy(owned, { ownKeys });
    const descriptors = vi.spyOn(Object, 'getOwnPropertyDescriptors');
    let externalCalls!: number;
    let proxyCalls!: number;
    let results!: GoalExactLedgerState[];
    try {
      results = [
        restoreGoalExactLedger(external),
        restoreGoalExactLedger(external),
        restoreGoalExactLedger(proxy),
        restoreGoalExactLedger(proxy),
      ];
      externalCalls = descriptors.mock.calls.filter(([value]) => value === external).length;
      proxyCalls = descriptors.mock.calls.filter(([value]) => value === proxy).length;
    } finally {
      descriptors.mockRestore();
    }
    expect(externalCalls).toBe(2);
    expect(proxyCalls).toBe(2);
    expect(ownKeys).toHaveBeenCalledTimes(2);
    for (const result of results) {
      expect(result).toEqual(owned);
      expect(result).not.toBe(owned);
      expect(result.holdings).not.toBe(owned.holdings);
      expect(result.holdings).not.toBe(external.holdings);
    }
  });

  it.each(['getter', 'symbol', 'nonenumerable', 'sparse', 'extra-array-key', 'prototype', 'long-key'] as const)(
    'still rejects raw %s after warming private projections without invoking accessors or freezing the source',
    (shape) => {
      const opening = fresh();
      const owned = restoreGoalExactLedger(settleGoalExactLedger(opening, settlement(opening)).state);
      restoreGoalExactLedger(owned);
      const raw = clone(owned);
      const getter = vi.fn(() => owned.feesPaidCodec);
      if (shape === 'getter') Object.defineProperty(raw, 'feesPaidCodec', { enumerable: true, get: getter });
      if (shape === 'symbol') Object.defineProperty(raw, Symbol('extra'), { enumerable: true, value: true });
      if (shape === 'nonenumerable')
        Object.defineProperty(raw, 'feesPaidCodec', { enumerable: false, value: raw.feesPaidCodec });
      if (shape === 'sparse') delete (raw.settlements as unknown[])[0];
      if (shape === 'extra-array-key')
        Object.defineProperty(raw.settlements, 'extra', { enumerable: true, value: true });
      if (shape === 'prototype') Object.setPrototypeOf(raw.holdings, { inherited: true });
      if (shape === 'long-key') Object.defineProperty(raw, 'x'.repeat(129), { enumerable: true, value: true });
      expect(() => restoreGoalExactLedger(raw)).toThrow();
      expect(getter).not.toHaveBeenCalled();
      expect(Object.isFrozen(raw)).toBe(false);
      expect(Object.isFrozen(raw.holdings)).toBe(false);
      expect(restoreGoalExactLedger(owned)).toEqual(owned);
    }
  );

  it('visits cached repeated descendants against the aggregate node bound before reaching a later raw source', () => {
    const owned = restoreGoalExactLedger(fresh());
    restoreGoalExactLedger(owned);
    const row = Array.from({ length: 4096 }, () => owned.maximumDrawdownRatio);
    const reached = vi.fn((target: object) => Reflect.ownKeys(target));
    const probe = new Proxy({ sentinel: true }, { ownKeys: reached });
    const raw = { ...owned, tooMany: Array.from({ length: 13 }, () => row), afterBudget: probe };
    // Each ratio occurrence still contributes its own object and two string visits: >150,000 total nodes.
    expect(() => restoreGoalExactLedger(raw)).toThrow();
    expect(reached).not.toHaveBeenCalled();
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(row)).toBe(false);
    expect(restoreGoalExactLedger(owned)).toEqual(owned);
  });

  it('counts cached primitive strings against the aggregate character bound before reaching a later raw source', () => {
    const owned = restoreGoalExactLedger(fresh());
    restoreGoalExactLedger(owned);
    const characters = (value: unknown): number =>
      typeof value === 'string'
        ? value.length
        : value && typeof value === 'object'
          ? Object.values(value).reduce<number>((sum, child) => sum + characters(child), 0)
          : 0;
    const available = 4_999_999 - characters(owned);
    const count = Math.floor(available / 512);
    const rows = Array.from({ length: count }, () => [owned.maximumDrawdownRatio, 'x'.repeat(512)]);
    const groups = Array.from({ length: Math.ceil(count / 4096) }, (_, index) =>
      rows.slice(index * 4096, (index + 1) * 4096)
    );
    const reached = vi.fn((target: object) => Reflect.ownKeys(target));
    const probe = new Proxy({ sentinel: true }, { ownKeys: reached });
    const raw = { ...owned, nearBudget: groups, tail: 'x'.repeat(available % 512), afterBudget: probe };
    // Raw strings alone are one character below the bound; repeated owned ratio strings must still count.
    expect(() => restoreGoalExactLedger(raw)).toThrow();
    expect(reached).not.toHaveBeenCalled();
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(groups)).toBe(false);
    expect(restoreGoalExactLedger(owned)).toEqual(owned);
  });

  it('retains depth and per-container limits around warmed private descendants', () => {
    const owned = restoreGoalExactLedger(fresh());
    restoreGoalExactLedger(owned);
    const reached = vi.fn((target: object) => Reflect.ownKeys(target));
    let nested: object = new Proxy({ value: owned.maximumDrawdownRatio }, { ownKeys: reached });
    for (let depth = 0; depth < 16; depth++) nested = { nested };
    expect(() => restoreGoalExactLedger({ ...owned, tooDeep: nested })).toThrow();
    expect(reached).not.toHaveBeenCalled();
    expect(() =>
      restoreGoalExactLedger({ ...owned, tooWide: Array.from({ length: 4097 }, () => owned.holdings) })
    ).toThrow();
    const tooManyFields = Object.fromEntries(Array.from({ length: 41 }, (_, index) => [String(index), owned.holdings]));
    expect(() => restoreGoalExactLedger({ ...owned, tooManyFields })).toThrow();
    expect(restoreGoalExactLedger(owned)).toEqual(owned);
  });
});

/** This reaches a cached owned container before its child breaches the original depth bound. */
describe('cached exact ledger descendant depth accounting', () => {
  it('visits owned children at depth 17 instead of treating a cached container as an atomic value', () => {
    const owned = restoreGoalExactLedger(fresh());
    restoreGoalExactLedger(owned);
    let nested: object = owned.maximumDrawdownRatio;
    for (let depth = 0; depth < 15; depth++) nested = { nested };
    const reached = vi.fn((target: object) => Reflect.ownKeys(target));
    const probe = new Proxy({ sentinel: true }, { ownKeys: reached });
    const raw = { ...owned, tooDeep: nested, afterBudget: probe };
    // Root is depth 0; 15 wrappers put the owned ratio at 16 and its two strings at 17.
    expect(() => restoreGoalExactLedger(raw)).toThrow();
    expect(reached).not.toHaveBeenCalled();
    expect(Object.isFrozen(raw)).toBe(false);
    expect(restoreGoalExactLedger(owned)).toEqual(owned);
  });
});

/** Cold restore outputs are seeded from fresh children before their first downstream copy. */
describe('first-use private projections for freshly restored ledger outputs', () => {
  it('avoids first-use reflection without carrying mutable raw children into output projections', () => {
    const opening = fresh();
    const original = settleGoalExactLedger(opening, settlement(opening)).state;
    const raw = clone(original);
    const selected = (state: GoalExactLedgerState) => [
      state,
      state.policy,
      state.episode,
      state.initial,
      state.limits,
      state.holdings,
      state.deficit,
      state.openingMark,
      state.lastMark,
      state.openingValue,
      state.latestValue,
      state.maximumDrawdownRatio,
      state.attention,
      state.settlements,
      state.settlements[0],
      state.settlements[0].receipt,
      state.settlements[0].fill,
    ];
    const descriptors = vi.spyOn(Object, 'getOwnPropertyDescriptors');
    let first!: GoalExactLedgerState;
    let second!: GoalExactLedgerState;
    let third!: GoalExactLedgerState;
    let firstCalls!: number[];
    let secondCalls!: number[];
    let rawRootCalls!: number;
    try {
      first = restoreGoalExactLedger(raw);
      // There is no warm-up restore of either output. Source references would expose these later mutations.
      Object.assign(raw.holdings, { xorCodec: '1' });
      Object.assign(raw.settlements[0], { actualFeeCodec: '1' });
      second = restoreGoalExactLedger(first);
      third = restoreGoalExactLedger(second);
      firstCalls = selected(first).map((source) => descriptors.mock.calls.filter(([value]) => value === source).length);
      secondCalls = selected(second).map(
        (source) => descriptors.mock.calls.filter(([value]) => value === source).length
      );
      rawRootCalls = descriptors.mock.calls.filter(([value]) => value === raw).length;
    } finally {
      descriptors.mockRestore();
    }
    expect(firstCalls).toEqual(Array.from({ length: selected(first).length }, () => 0));
    expect(secondCalls).toEqual(Array.from({ length: selected(second).length }, () => 0));
    expect(rawRootCalls).toBe(1);
    for (const result of [first, second, third]) {
      expect(result).toEqual(original);
      expect(result).not.toBe(raw);
      expect(result.holdings).not.toBe(raw.holdings);
      expect(result.settlements).not.toBe(raw.settlements);
      expect(result.settlements[0]).not.toBe(raw.settlements[0]);
      expect(result.settlements[0].receipt).not.toBe(raw.settlements[0].receipt);
      expect(result.settlements[0].fill).not.toBe(raw.settlements[0].fill);
      const { stateSha256, ...body } = result;
      expect(stateSha256).toBe(sha(body));
    }
    expect(second).not.toBe(first);
    expect(second.holdings).not.toBe(first.holdings);
    expect(second.settlements[0].receipt).not.toBe(first.settlements[0].receipt);
    expect(third.settlements[0].fill).not.toBe(second.settlements[0].fill);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(raw.holdings)).toBe(false);
    expect(() => restoreGoalExactLedger(raw)).toThrow();
    expect(() => restoreGoalExactLedger(rehash(raw))).toThrow();
  });
});

/** A raw proxy's existing construction semantics must not produce a mismatched private output projection. */
describe('copied projection shape after raw array length changes', () => {
  it('seeds the actual fresh array shape when the source proxy shortens its reported constructor length', () => {
    const original = fresh();
    const raw = clone(original);
    const external = ['extra'];
    let lengthReads = 0;
    const proxy = new Proxy(external, {
      get(target, key, receiver) {
        if (key === 'length') return ++lengthReads <= 2 ? 1 : 0;
        return Reflect.get(target, key, receiver);
      },
    });
    Object.assign(raw, { attention: proxy });
    // The original guard sees one dense entry twice, then Array.from receives zero length.
    const first = restoreGoalExactLedger(raw);
    expect(lengthReads).toBe(3);
    expect(first).toEqual(original);
    expect(first.attention).toEqual([]);
    expect(Reflect.ownKeys(first.attention)).toEqual(['length']);
    expect(first.attention).not.toBe(proxy);
    expect(first.attention).not.toBe(external);
    const second = restoreGoalExactLedger(first);
    expect(second).toEqual(first);
    expect(second.attention).not.toBe(first.attention);
    expect(Object.isFrozen(external)).toBe(false);
    external[0] = 'changed';
    expect(restoreGoalExactLedger(second)).toEqual(original);
  });
});
