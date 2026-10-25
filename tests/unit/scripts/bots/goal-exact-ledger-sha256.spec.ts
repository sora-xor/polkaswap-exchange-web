/** Real SHA engines run in the existing Node project; the original jsdom ledger suite is unchanged. */
import { describe, expect, it, vi } from 'vitest';
import { u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import {
  createGoalExactLedger,
  restoreGoalExactLedger,
  markGoalExactLedger,
  settleGoalExactLedger,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
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
describe('installed JavaScript SHA256 ledger bytes', () => {
  it('matches initialized default SHA256 and independent Node crypto for small, Unicode and ledger vectors', async () => {
    const { cryptoWaitReady } = await import('@polkadot/util-crypto');
    const { createHash } = await import('node:crypto');
    expect(await cryptoWaitReady()).toBe(true);
    const opening = fresh();
    const settled = settleGoalExactLedger(opening, settlement(opening)).state;
    const { stateSha256: _hash, ...body } = settled;
    const vectors = ['', 'abc', '日本語 é 🧪 KUSD/XOR', canonical(body)];
    for (const vector of vectors) {
      const bytes = new TextEncoder().encode(vector);
      const independent = createHash('sha256').update(bytes).digest('hex');
      const onlyJs = u8aToHex(sha256AsU8a(bytes, true)).slice(2);
      const defaultEngine = u8aToHex(sha256AsU8a(bytes)).slice(2);
      expect(onlyJs).toBe(independent);
      expect(defaultEngine).toBe(independent);
    }
  });

  it('retains canonical state hashes and lineage under full restore, and rejects a rehashed semantic impostor', async () => {
    const { createHash } = await import('node:crypto');
    const opening = fresh();
    const settled = settleGoalExactLedger(opening, settlement(opening)).state;
    const marked = markGoalExactLedger(settled, observation(settled, mark(102, START + 12000)));
    for (const state of [opening, settled, marked]) {
      const { stateSha256, ...body } = state;
      const independent = createHash('sha256')
        .update(new TextEncoder().encode(canonical(body)))
        .digest('hex');
      expect(stateSha256).toBe(independent);
      expect(restoreGoalExactLedger(clone(state))).toEqual(state);
    }
    expect(settled.previousStateSha256).toBe(opening.stateSha256);
    expect(marked.previousStateSha256).toBe(settled.stateSha256);
    const changed = clone(marked);
    Object.assign(changed, { feesPaidCodec: '0' });
    const { stateSha256: _hash, ...body } = changed;
    const impostor = {
      ...body,
      stateSha256: createHash('sha256')
        .update(new TextEncoder().encode(canonical(body)))
        .digest('hex'),
    };
    expect(() => restoreGoalExactLedger(impostor)).toThrow();
  });
});
