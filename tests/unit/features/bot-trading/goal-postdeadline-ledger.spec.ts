import { describe, expect, it, vi } from 'vitest';
import { u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import {
  createGoalExactLedger,
  settleGoalExactTerminal,
  settleGoalExactPostDeadline,
  restoreGoalExactPostDeadline,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  type GoalExactMark,
  type GoalExactPostDeadlineJournal,
  type GoalExactTerminalReceipt,
} from '@/features/bot-trading/goal-exact-ledger';

vi.unmock('@polkadot/util-crypto');
const UNIT = 10n ** 18n;
const START = 1_000_000;
const codec = (units: number) => String(BigInt(units) * UNIT);
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const sha = (value: unknown) => u8aToHex(sha256AsU8a(new TextEncoder().encode(canonical(value)))).slice(2);
const rehash = (journal: GoalExactPostDeadlineJournal) => {
  const { journalSha256: _hash, ...body } = journal;
  return { ...body, journalSha256: sha(body) };
};
const mark = (blockNumber: number, timestampMs: number): GoalExactMark => ({
  blockNumber,
  blockHash: hash(blockNumber),
  timestampMs,
  denominator: '1',
  kusdReserveCodec: codec(100),
  xorReserveCodec: codec(100),
});
function receipt(index: number, overrides: Partial<GoalExactTerminalReceipt> = {}): GoalExactTerminalReceipt {
  return {
    orderId: `post-${index}`,
    receipt: {
      blockHash: hash(201 + index),
      blockNumber: 201 + index,
      extrinsicHash: hash(1000 + index),
      extrinsicIndex: index,
    },
    fill: {
      inputAsset: KUSD,
      outputAsset: XOR,
      inputCodec: codec(3),
      minimumOutputCodec: codec(3),
      feeCeilingCodec: String(UNIT / 10n),
    },
    success: true,
    actualOutputCodec: codec(3),
    actualFeeCodec: String(UNIT / 50n),
    ...overrides,
  };
}
function setup(predeadline = true) {
  const opening = createGoalExactLedger(
    {
      goalId: 'postdeadline-goal',
      startedAtMs: START,
      initialKusdCodec: codec(10),
      maxTradeKusdCodec: codec(3),
      maxTradeXorCodec: codec(3),
    },
    mark(100, START)
  );
  const pre = receipt(10, {
    orderId: 'pre-1',
    receipt: { blockNumber: 150, blockHash: hash(150), extrinsicHash: hash(8001), extrinsicIndex: 0 },
    fill: { ...receipt(0).fill, inputCodec: codec(2), minimumOutputCodec: codec(2) },
    actualOutputCodec: codec(2),
    actualFeeCodec: String(UNIT / 100n),
  });
  const terminal = settleGoalExactTerminal(opening, {
    expectedRevision: opening.revision,
    accountingAtMs: opening.episode.endedAtMs,
    mark: mark(200, opening.episode.endedAtMs),
    receipts: predeadline ? [pre] : [],
  });
  const boundary = {
    goalId: terminal.goalId,
    ledgerStateSha256: terminal.stateSha256,
    evidenceSha256: 'a'.repeat(64),
    blockHash: terminal.lastMark.blockHash,
    blockNumber: terminal.lastMark.blockNumber,
  };
  const later = [
    receipt(0),
    receipt(1, {
      fill: {
        ...receipt(1).fill,
        inputAsset: XOR,
        outputAsset: KUSD,
        inputCodec: codec(1),
        minimumOutputCodec: codec(1),
      },
      actualOutputCodec: codec(1),
      actualFeeCodec: String((3n * UNIT) / 100n),
    }),
    receipt(2, { success: false, actualOutputCodec: '0', actualFeeCodec: String(UNIT / 25n) }),
  ];
  return { opening, terminal, boundary, later, pre };
}

describe('immutable deadline result and separate actual later effects', () => {
  it('records exact bidirectional fills and failed-extrinsic fees without changing any deadline observation', () => {
    const f = setup(),
      before = canonical(f.terminal);
    const journal = settleGoalExactPostDeadline(f.terminal, f.boundary, f.later);
    expect(journal).toMatchObject({
      kind: 'goal-exact-postdeadline',
      holdings: { kusdCodec: codec(6), xorCodec: String((49n * UNIT) / 10n) },
      deficit: { kusdCodec: '0', xorCodec: '0' },
      feesPaidAfterDeadlineCodec: String((9n * UNIT) / 100n),
      tradesAfterDeadline: 2,
      failuresAfterDeadline: 1,
      attention: [],
    });
    expect(canonical(f.terminal)).toBe(before);
    expect(f.terminal.feesPaidCodec).toBe(String(UNIT / 100n));
    for (const key of [
      'lastMark',
      'accountingAtMs',
      'latestValue',
      'goalPeakValue',
      'performancePeakValue',
      'maximumDrawdownRatio',
      'outcome',
      'stoppedAtMs',
      'revision',
    ])
      expect(Object.hasOwn(journal, key)).toBe(false);
    expect(journal.settlements.every((entry) => !Object.hasOwn(entry, 'revision'))).toBe(true);
    expect(Object.isFrozen(journal.settlements[0].receipt)).toBe(true);
    expect(Object.isFrozen(journal.boundary)).toBe(true);
    expect(restoreGoalExactPostDeadline(f.terminal, f.boundary, clone(journal))).toEqual(journal);
    expect(settleGoalExactPostDeadline(f.terminal, f.boundary, f.later)).toEqual(journal);
  });

  it('retains actual overruns and deficits, then offsets signed deficits with later real output to the last base unit', () => {
    const f = setup(false);
    const failed = receipt(0, { success: false, actualOutputCodec: '0', actualFeeCodec: String((5n * UNIT) / 2n) });
    const deficit = settleGoalExactPostDeadline(f.terminal, f.boundary, [failed]);
    expect(deficit.holdings).toEqual({ kusdCodec: codec(10), xorCodec: '0' });
    expect(deficit.deficit).toEqual({ kusdCodec: '0', xorCodec: String((3n * UNIT) / 2n) });
    expect(deficit.attention).toEqual(
      expect.arrayContaining(['fee-ceiling-exceeded', 'fee-budget-exceeded', 'allocation-deficit'])
    );
    const journal = settleGoalExactPostDeadline(f.terminal, f.boundary, [
      failed,
      receipt(1, { actualOutputCodec: codec(2), actualFeeCodec: '1' }),
    ]);
    expect(journal.holdings).toEqual({ kusdCodec: codec(7), xorCodec: String(UNIT / 2n - 1n) });
    expect(journal.deficit).toEqual({ kusdCodec: '0', xorCodec: '0' });
    expect(journal.feesPaidAfterDeadlineCodec).toBe(String((5n * UNIT) / 2n + 1n));
    expect(journal.attention).toContain('minimum-output-breached');
    expect(journal.attention).toContain('allocation-deficit');
    expect(restoreGoalExactPostDeadline(f.terminal, f.boundary, clone(journal))).toEqual(journal);
  });

  it.each(['goalId', 'ledgerStateSha256', 'evidenceSha256', 'blockHash', 'blockNumber', 'extra'] as const)(
    'rejects an invalid supplied %s boundary',
    (field) => {
      const f = setup(),
        boundary = { ...f.boundary } as Record<string, unknown>;
      boundary[field] = field === 'blockNumber' ? 199 : 'invalid';
      expect(() => settleGoalExactPostDeadline(f.terminal, boundary as typeof f.boundary, f.later)).toThrow();
    }
  );

  it('rejects active/unclosed states and a zero-effect journal', () => {
    const f = setup();
    expect(() => settleGoalExactPostDeadline(f.opening, f.boundary, f.later)).toThrow();
    expect(() => settleGoalExactPostDeadline(f.terminal, f.boundary, [])).toThrow();
  });

  it.each([
    'predeadline',
    'deadline',
    'reverse-order',
    'duplicate-order',
    'duplicate-tx',
    'duplicate-event',
    'prior-order',
    'prior-tx',
    'conflicting-height',
    'conflicting-hash',
    'failed-output',
    'combined-capacity',
  ] as const)('rejects %s receipt sets rather than dropping or reordering effects', (kind) => {
    const f = setup();
    let rows = clone(f.later);
    if (kind === 'predeadline') rows[0] = { ...rows[0], receipt: { ...rows[0].receipt, blockNumber: 199 } };
    if (kind === 'deadline') rows[0] = { ...rows[0], receipt: { ...rows[0].receipt, blockNumber: 200 } };
    if (kind === 'reverse-order') rows = rows.reverse();
    if (kind === 'duplicate-order') rows[1] = { ...rows[1], orderId: rows[0].orderId };
    if (kind === 'duplicate-tx')
      rows[1] = { ...rows[1], receipt: { ...rows[1].receipt, extrinsicHash: rows[0].receipt.extrinsicHash } };
    if (kind === 'duplicate-event')
      rows[1] = { ...rows[1], receipt: { ...rows[0].receipt, extrinsicHash: rows[1].receipt.extrinsicHash } };
    if (kind === 'prior-order') rows[0] = { ...rows[0], orderId: f.pre.orderId };
    if (kind === 'prior-tx')
      rows[0] = { ...rows[0], receipt: { ...rows[0].receipt, extrinsicHash: f.pre.receipt.extrinsicHash } };
    if (kind === 'conflicting-height')
      rows[1] = { ...rows[1], receipt: { ...rows[1].receipt, blockNumber: rows[0].receipt.blockNumber } };
    if (kind === 'conflicting-hash')
      rows[1] = { ...rows[1], receipt: { ...rows[1].receipt, blockHash: rows[0].receipt.blockHash } };
    if (kind === 'failed-output') rows[0] = { ...rows[0], success: false };
    if (kind === 'combined-capacity') rows = Array.from({ length: 4096 }, () => rows[0]);
    expect(() => settleGoalExactPostDeadline(f.terminal, f.boundary, rows)).toThrow();
  });

  it('accepts distinct extrinsics in one canonical postdeadline block', () => {
    const f = setup();
    const second = { ...f.later[1], receipt: { ...f.later[1].receipt, blockNumber: 201, blockHash: hash(201) } };
    expect(settleGoalExactPostDeadline(f.terminal, f.boundary, [f.later[0], second]).tradesAfterDeadline).toBe(2);
  });

  it.each(['balance', 'fee', 'count', 'attention', 'entry-digest', 'boundary', 'missing-entry'] as const)(
    'recomputes and rejects self-rehashed %s corruption on reload',
    (kind) => {
      const f = setup(),
        journal = clone(settleGoalExactPostDeadline(f.terminal, f.boundary, f.later));
      if (kind === 'balance') Object.assign(journal.holdings, { xorCodec: '999' });
      if (kind === 'fee') Object.assign(journal, { feesPaidAfterDeadlineCodec: '0' });
      if (kind === 'count') Object.assign(journal, { tradesAfterDeadline: 0 });
      if (kind === 'attention') Object.assign(journal, { attention: ['allocation-deficit'] });
      if (kind === 'entry-digest') Object.assign(journal.settlements[0], { digest: 'b'.repeat(64) });
      if (kind === 'boundary') Object.assign(journal.boundary, { evidenceSha256: 'b'.repeat(64) });
      if (kind === 'missing-entry') Object.assign(journal, { settlements: journal.settlements.slice(1) });
      expect(() => restoreGoalExactPostDeadline(f.terminal, f.boundary, rehash(journal))).toThrow();
    }
  );

  it('rejects executable fields without invoking them', () => {
    const f = setup(),
      getter = vi.fn(() => f.boundary.blockNumber);
    expect(() =>
      settleGoalExactPostDeadline(
        f.terminal,
        {
          ...f.boundary,
          get blockNumber() {
            return getter();
          },
        },
        f.later
      )
    ).toThrow();
    const journal = settleGoalExactPostDeadline(f.terminal, f.boundary, f.later);
    expect(() =>
      restoreGoalExactPostDeadline(f.terminal, f.boundary, {
        ...journal,
        get holdings() {
          return getter();
        },
      })
    ).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});
