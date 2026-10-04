// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { XOR, PSWAP, VAL } from '@/lib/substrate/sdk/assets/consts';
import { defaultStudioState, studioCandidate } from '@/features/bot-trading/quant-studio';
import {
  createStudioLabHandoff,
  encodeLabStudyHandoff,
  decodeLabStudyHandoff,
  labHandoffAssetsMatch,
  type LabStudyHandoff,
} from '@/features/bot-trading/strategy-lab-handoff';
import type { BotAsset } from '@/features/bot-trading/types';

// The shared wallet stubs use short ids; link validation requires actual SORA asset identities.
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
  VAL: { address: '0x0200040000000000000000000000000000000000000000000000000000000000', symbol: 'VAL', decimals: 18 },
  PSWAP: {
    address: '0x0200050000000000000000000000000000000000000000000000000000000000',
    symbol: 'PSWAP',
    decimals: 18,
  },
}));

const NOW = Date.UTC(2026, 9, 4, 12);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const asset = ({ address, symbol, decimals }: BotAsset): BotAsset => ({ address, symbol, decimals });
const INPUT = asset(XOR);
const OUTPUT = asset(PSWAP);
const ARCHIVE = {
  genesisHash: `0x${'7e'.repeat(32)}`,
  denominator: '100',
  startAt: Date.UTC(2026, 8, 1),
  endAt: Date.UTC(2026, 9, 3),
};

/** Produce a fresh valid payload so hostile-field cases cannot affect one another. */
function handoff(): LabStudyHandoff {
  return createStudioLabHandoff(INPUT, OUTPUT, ARCHIVE, defaultStudioState('dip'), NOW);
}

/** Encode untrusted data directly, avoiding the production encoder's validation. */
function rawLink(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/** Alter one nested JSON field while preserving all other valid contract values. */
function changed(path: string[], value: unknown): unknown {
  const result = structuredClone(handoff()) as unknown as Record<string, unknown>;
  let target = result;
  for (const key of path.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[path.at(-1)!] = value;
  return result;
}

/** Both decoding and encoding must refuse a malformed public study configuration. */
function expectRejected(value: unknown): void {
  expect(decodeLabStudyHandoff(rawLink(value), NOW)).toBeNull();
  expect(() => encodeLabStudyHandoff(value as LabStudyHandoff, NOW)).toThrow();
}

describe('Strategy Studio study handoff', () => {
  it('preserves the PSWAP 48h / -15% / +10% / 3 XOR draft without execution state', () => {
    const value = handoff();
    expect(value).toEqual({
      version: 1,
      source: 'quant-studio',
      createdAt: NOW,
      rules: studioCandidate(defaultStudioState('dip')).rules,
      input: INPUT,
      output: OUTPUT,
      amount: '3',
      identity: { genesisHash: ARCHIVE.genesisHash, denominator: '100' },
      settings: {
        capital: '10',
        tradePercent: 30,
        feeBudgetXor: '2',
        slippagePercent: '0.5',
        intervalBlocks: 600,
        validation: 'holdout',
        trainPercent: 50,
        folds: 4,
        historyStartAt: ARCHIVE.startAt,
        historyEndAt: ARCHIVE.endAt,
      },
    });
    expect(value.rules.entry.conditions).toEqual([
      { kind: 'deviation', window: 48, direction: 'below', threshold: '-15' },
    ]);
    expect(value.rules.exit?.conditions).toEqual([
      { kind: 'deviation', window: 48, direction: 'above', threshold: '10' },
    ]);
    for (const key of ['account', 'portfolio', 'research', 'fees', 'provider', 'sessionExpiresAt'])
      expect(value).not.toHaveProperty(key);
  });

  it.each([1, 2, 3])('preserves the selected %s XOR order rather than the probe size', (amount) => {
    const state = defaultStudioState('dip');
    state.values.amount = amount;
    const value = createStudioLabHandoff(INPUT, asset(VAL), ARCHIVE, state, NOW);
    expect(value.output).toEqual(asset(VAL));
    expect(value.amount).toBe(String(amount));
    expect(value.settings.tradePercent).toBe(amount * 10);
    expect(decodeLabStudyHandoff(encodeLabStudyHandoff(value, NOW), NOW)).toEqual(value);
  });

  it('round-trips bounded base64url data and detaches every mutable nested field', () => {
    const input = { ...INPUT };
    const output = { ...OUTPUT };
    const archive = { ...ARCHIVE };
    const state = defaultStudioState('dip');
    const value = createStudioLabHandoff(input, output, archive, state, NOW);
    input.symbol = 'CHANGED';
    output.decimals = 6;
    archive.denominator = '1000';
    state.values.buy = 50;
    expect(value).toEqual(handoff());

    const encoded = encodeLabStudyHandoff(value, NOW);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded.length).toBeLessThanOrEqual(8192);
    const decoded = decodeLabStudyHandoff(encoded, NOW)!;
    expect(decoded).toEqual(value);
    expect(decoded).not.toBe(value);
    expect(decoded.rules).not.toBe(value.rules);
    decoded.rules.entry.conditions[0].window = 2;
    decoded.input.symbol = 'OTHER';
    decoded.settings.capital = '20';
    decoded.identity.denominator = '10';
    expect(value).toEqual(handoff());
    expect(decodeLabStudyHandoff(encoded, NOW)).toEqual(handoff());
  });

  it('keeps valid historical configuration readable without renewing its creation time', () => {
    const value = handoff();
    const later = NOW + 30 * DAY;
    const encoded = encodeLabStudyHandoff(value, later);
    expect(decodeLabStudyHandoff(encoded, later)).toEqual(value);
    expect(decodeLabStudyHandoff(encoded, later)?.createdAt).toBe(NOW);
  });

  it('accepts the denomination identity carried by the actual shipped archive', async () => {
    const raw = JSON.parse(
      await readFile(
        path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'),
        'utf8'
      )
    );
    const archive = {
      genesisHash: raw.genesisHash,
      denominator: raw.rows[0].denominator,
      startAt: raw.startAt,
      endAt: raw.endAt,
    };
    expect(archive.denominator).toBe(`1${'0'.repeat(38)}`);
    const value = createStudioLabHandoff(INPUT, OUTPUT, archive, defaultStudioState('dip'), NOW);
    expect(value.identity).toEqual({ genesisHash: archive.genesisHash, denominator: archive.denominator });
    expect(decodeLabStudyHandoff(encodeLabStudyHandoff(value, NOW), NOW)).toEqual(value);
  });

  it('validates exact decimal sizing through token codecs', () => {
    const value = handoff();
    value.amount = '12.3456';
    Object.assign(value.settings, { capital: '123.456', tradePercent: 10 });
    expect(decodeLabStudyHandoff(rawLink(value), NOW)).toEqual(value);
    expect(decodeLabStudyHandoff(encodeLabStudyHandoff(value, NOW), NOW)).toEqual(value);
    expectRejected({ ...value, amount: '12.345601' });
  });

  it.each(['none', 'holdout', 'walk-forward'] as const)('accepts the explicit %s validation mode', (validation) => {
    const value = handoff();
    value.settings.validation = validation;
    expect(decodeLabStudyHandoff(rawLink(value), NOW)?.settings.validation).toBe(validation);
  });

  it.each(['1', '2', '100'])('accepts the supported positive integer denomination %s', (denominator) => {
    const value = handoff();
    value.identity.denominator = denominator;
    expect(decodeLabStudyHandoff(rawLink(value), NOW)?.identity.denominator).toBe(denominator);
  });

  it('accepts the bounded capital, cadence and history edges', () => {
    const value = handoff();
    Object.assign(value.settings, {
      capital: '1000000000',
      tradePercent: 50,
      intervalBlocks: 432000,
      trainPercent: 80,
      folds: 5,
      slippagePercent: '10',
      historyStartAt: NOW - 10000 * HOUR,
      historyEndAt: NOW,
    });
    value.amount = '500000000';
    value.identity.denominator = `1${'0'.repeat(119)}`;
    expect(decodeLabStudyHandoff(rawLink(value), NOW)).toEqual(value);
  });
});

describe('untrusted study link validation', () => {
  it('ignores missing, repeated, malformed and oversized query values', () => {
    const encoded = rawLink(handoff());
    for (const value of [
      undefined,
      null,
      42,
      {},
      [encoded],
      [encoded, encoded],
      '',
      'javascript:alert(1)',
      `${encoded}=`,
      'a'.repeat(8193),
      Buffer.from('{', 'utf8').toString('base64url'),
      rawLink(null),
      rawLink([]),
    ]) {
      expect(decodeLabStudyHandoff(value, NOW)).toBeNull();
    }
  });

  it.each([
    [['version'], 2],
    [['source'], 'live-bot'],
    [['account'], 'public-account'],
    [['portfolio'], { holdings: { [XOR.address]: '1' } }],
    [['start'], 'live'],
    [['provider'], { token: 'fixture-token' }],
    [['fees'], { expiresAt: NOW + DAY }],
    [['research'], { returnPercent: '500' }],
    [['input', 'network'], 'mainnet'],
    [['output', 'endpoint'], 'https://example.com'],
    [['identity', 'endpoint'], 'wss://example.com'],
    [['settings', 'optimize'], false],
    [['settings', 'networkFeeXor'], '0.1'],
    [['rules', 'account'], 'public-account'],
  ] as Array<[string[], unknown]>)('rejects unsupported or execution-bearing field %s', (path, value) => {
    expectRejected(changed(path, value));
  });

  it.each([
    [['input'], null],
    [['input', 'address'], '0xmissing'],
    [['input', 'address'], VAL.address],
    [['output', 'address'], INPUT.address],
    [['output', 'address'], `0x${'ag'.repeat(32)}`],
    [['output', 'symbol'], ''],
    [['output', 'symbol'], 'x'.repeat(21)],
    [['output', 'symbol'], '<script>'],
    [['output', 'symbol'], 'PSWAP\n'],
    [['output', 'symbol'], '日本円'],
    [['output', 'decimals'], -1],
    [['output', 'decimals'], 19],
    [['output', 'decimals'], 1.5],
    [['input', 'symbol'], 'NOT-XOR'],
    [['input', 'decimals'], 6],
    [['identity'], null],
    [['identity', 'genesisHash'], '0x1234'],
    [['identity', 'denominator'], '0'],
    [['identity', 'denominator'], '01'],
    [['identity', 'denominator'], '1.0'],
    [['identity', 'denominator'], `1${'0'.repeat(120)}`],
  ] as Array<[string[], unknown]>)('rejects invalid asset or chain metadata %s', (path, value) => {
    expectRejected(changed(path, value));
  });

  it.each([
    [['createdAt'], NOW + 1],
    [['createdAt'], -1],
    [['createdAt'], NOW + 0.5],
    [['createdAt'], '2026-10-04'],
    [['settings', 'historyStartAt'], ARCHIVE.startAt + 1],
    [['settings', 'historyEndAt'], ARCHIVE.endAt + 1],
    [['settings', 'historyStartAt'], ARCHIVE.endAt],
    [['settings', 'historyStartAt'], -HOUR],
    [['settings', 'historyStartAt'], NOW - 10001 * HOUR],
    [['settings', 'historyEndAt'], NOW + HOUR],
  ] as Array<[string[], unknown]>)('rejects future or invalid historical dates %s', (path, value) => {
    const payload = changed(path, value);
    if (path[1] === 'historyStartAt' && value === NOW - 10001 * HOUR)
      (payload as LabStudyHandoff).settings.historyEndAt = NOW;
    expectRejected(payload);
  });

  it.each([
    [['amount'], '0'],
    [['amount'], '2'],
    [['amount'], 3],
    [['amount'], '-3'],
    [['amount'], '3e0'],
    [['settings', 'capital'], '0'],
    [['settings', 'capital'], '1000000000.000000000000000001'],
    [['settings', 'capital'], '10e0'],
    [['settings', 'capital'], 10],
    [['settings', 'tradePercent'], 0],
    [['settings', 'tradePercent'], 51],
    [['settings', 'tradePercent'], 30.5],
    [['settings', 'feeBudgetXor'], '0'],
    [['settings', 'feeBudgetXor'], '10'],
    [['settings', 'feeBudgetXor'], '-2'],
    [['settings', 'slippagePercent'], '0'],
    [['settings', 'slippagePercent'], '0.009'],
    [['settings', 'slippagePercent'], '10.01'],
    [['settings', 'intervalBlocks'], 599],
    [['settings', 'intervalBlocks'], 432001],
    [['settings', 'intervalBlocks'], 600.5],
    [['settings', 'validation'], 'random'],
    [['settings', 'trainPercent'], 49],
    [['settings', 'trainPercent'], 81],
    [['settings', 'trainPercent'], 50.5],
    [['settings', 'folds'], 1],
    [['settings', 'folds'], 6],
    [['settings', 'folds'], 4.5],
  ] as Array<[string[], unknown]>)('rejects inconsistent or out-of-bounds research controls %s', (path, value) => {
    expectRejected(changed(path, value));
  });

  it('rejects incomplete objects and malformed public rules', () => {
    const incomplete = handoff();
    delete (incomplete as Partial<LabStudyHandoff>).amount;
    expectRejected(incomplete);
    expectRejected(changed(['rules', 'version'], 2));
    expectRejected(changed(['rules', 'entry', 'conditions'], []));
    expectRejected(changed(['rules', 'entry', 'conditions'], [{ kind: 'eval', code: 'fixture' }]));
  });

  it('rejects a percentage order that would silently round down a fractional base unit', () => {
    const value = handoff();
    Object.assign(value.settings, {
      capital: '0.000000000000000003',
      feeBudgetXor: '0.000000000000000001',
      tradePercent: 50,
    });
    value.amount = '0.000000000000000001';
    expectRejected(value);
  });
});

describe('handoff asset availability', () => {
  it('requires both exact address, symbol and decimal records instead of substituting a default market', () => {
    const value = handoff();
    expect(labHandoffAssetsMatch(value, [INPUT, OUTPUT, asset(VAL)])).toBe(true);
    expect(labHandoffAssetsMatch(value, [])).toBe(false);
    expect(labHandoffAssetsMatch(value, [INPUT])).toBe(false);
    expect(labHandoffAssetsMatch(value, [INPUT, asset(VAL)])).toBe(false);
    expect(labHandoffAssetsMatch(value, [INPUT, { ...OUTPUT, address: VAL.address }])).toBe(false);
    expect(labHandoffAssetsMatch(value, [INPUT, { ...OUTPUT, decimals: 6 }])).toBe(false);
    expect(labHandoffAssetsMatch(value, [{ ...INPUT, decimals: 6 }, OUTPUT])).toBe(false);
    expect(labHandoffAssetsMatch(value, [INPUT, { ...OUTPUT, symbol: 'OTHER' }])).toBe(false);
    expect(value).toEqual(handoff());
  });
});
