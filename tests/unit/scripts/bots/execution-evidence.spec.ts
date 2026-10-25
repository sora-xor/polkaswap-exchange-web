import { describe, expect, it, vi } from 'vitest';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  EXECUTION_EVIDENCE_KUSD,
  EXECUTION_EVIDENCE_XOR,
  EXECUTION_EVIDENCE_INPUT_CODEC,
  canonicalEvidenceJson,
  hashEvidence,
  floorMinimum,
  normalizeExecutionQuote,
  validateExecutionReverseLot,
  validateExecutionSnapshot,
} from '../../../../scripts/bots/execution-evidence';
import type {
  ExecutionFeeEvidence,
  ExecutionRawQuote,
  ExecutionReverseLot,
  ExecutionSnapshot,
} from '../../../../scripts/bots/execution-evidence';

const blockHash = `0x${'ab'.repeat(32)}`;
const hex = (amount: string) => `0x${BigInt(amount).toString(16)}`;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Public synthetic fee/quote records only; this suite performs no network or signing operations. */
function feeFixture(): ExecutionFeeEvidence {
  return {
    partialFeeCodec: '100020612589707326',
    baseFeeCodec: '0',
    lenFeeCodec: '20800000000000',
    adjustedWeightFeeCodec: '99999812589707326',
    tipCodec: '0',
    encodedLength: 208,
    callHex: '0x01020304',
    envelopeHashAlgorithm: 'sha256',
    envelopeHash: 'e'.repeat(64),
    blockHash,
    runtimeVersion: { specVersion: 131, transactionVersion: 3 },
    rawQueryInfo: { partialFee: hex('100020612589707326'), weight: { refTime: 100, proofSize: 1 }, class: 'Normal' },
    rawFeeDetails: {
      inclusionFee: { baseFee: 0, lenFee: hex('20800000000000'), adjustedWeightFee: hex('99999812589707326') },
      tip: 0,
    },
  };
}

function quoteFixture(sell = false): ExecutionRawQuote {
  const assetIn = sell ? EXECUTION_EVIDENCE_XOR : EXECUTION_EVIDENCE_KUSD;
  const assetOut = sell ? EXECUTION_EVIDENCE_KUSD : EXECUTION_EVIDENCE_XOR;
  const amountOutCodec = sell ? '4800000000000000000' : '1000000000000000000';
  const amountWithoutImpactCodec = sell ? '4850000000000000000' : '1020000000000000000';
  const route = [assetIn, assetOut];
  return {
    blockHash,
    assetIn,
    assetOut,
    assetInDecimals: 18,
    assetOutDecimals: 18,
    amountInCodec: sell ? '995000000000000000' : EXECUTION_EVIDENCE_INPUT_CODEC,
    amountOutCodec,
    amountWithoutImpactCodec,
    route,
    routeFees: [{ assetAddress: EXECUTION_EVIDENCE_XOR, amountCodec: '6000000000000000' }],
    rawQuoteJson: {
      amount: hex(amountOutCodec),
      amountWithoutImpact: hex(amountWithoutImpactCodec),
      fee: { [EXECUTION_EVIDENCE_XOR]: hex('6000000000000000') },
      rewards: [],
      route: [...route],
    },
    fee: feeFixture(),
  };
}

function snapshotFixture(): ExecutionSnapshot {
  return {
    schemaVersion: 1,
    purpose: 'development',
    slotAt: 1999000,
    requestStartedAt: 2000000,
    requestFinishedAt: 2010000,
    context: {
      endpoint: EXECUTION_EVIDENCE_ENDPOINT,
      genesisHash: EXECUTION_EVIDENCE_GENESIS,
      blockHash,
      blockNumber: 27702199,
      finalizedAt: 2000000,
      denominator: '100000000000000000000000000000000000000',
      specVersion: 131,
      transactionVersion: 3,
      metadataFormatVersion: 16,
      metadataReadMethod: 'Metadata_metadata_at_version',
      metadataHashAlgorithm: 'sha256',
      metadataHash: 'd'.repeat(64),
      dexId: 0,
      allowedSourceTypes: ['XYKPool'],
      filterMode: 'AllowSelected',
      poolIdentity: 'public-exact-pair-pool',
    },
    buy: normalizeExecutionQuote(quoteFixture()),
    sell: normalizeExecutionQuote(quoteFixture(true)),
    reverseLot: { kind: 'same-block-buy-minimum' },
  };
}

describe('public execution evidence exact arithmetic', () => {
  it('floors 0.5% at token precision, including values beyond JavaScript integer precision', () => {
    expect(floorMinimum('201')).toBe('199');
    expect(floorMinimum('1000000000000000001')).toBe('995000000000000000');
    expect(floorMinimum('1')).toBe('0');
    expect(() => floorMinimum('1000', 49)).toThrow('Invalid execution evidence');
  });
  it.each(['0', '-1', '01', '1.5', '1e18', 'NaN', '9'.repeat(121)])(
    'rejects malformed positive amount %s',
    (amount) => {
      expect(() => floorMinimum(amount)).toThrow('Invalid execution evidence');
    }
  );
  it('retains exact raw evidence and an unreduced signed impact fraction in a detached quote', () => {
    const raw = quoteFixture();
    const normalized = normalizeExecutionQuote(raw);
    expect(normalized.minimumCodec).toBe('995000000000000000');
    expect(normalized.priceImpact).toEqual({ numerator: '2000000000000000000', denominator: '1020000000000000000' });
    expect(normalized.rawQuoteJson).toEqual(raw.rawQuoteJson);
    normalized.route[0] = 'changed';
    expect(raw.route[0]).toBe(EXECUTION_EVIDENCE_KUSD);
    raw.amountWithoutImpactCodec = '990000000000000000';
    (raw.rawQuoteJson as Record<string, unknown>).amountWithoutImpact = hex(raw.amountWithoutImpactCodec);
    expect(normalizeExecutionQuote(raw).priceImpact.numerator).toBe('-1000000000000000000');
  });
  it('does not silently substitute expected output for a minimum too small to execute', () => {
    const raw = quoteFixture();
    raw.amountOutCodec = '1';
    (raw.rawQuoteJson as Record<string, unknown>).amount = 1;
    expect(() => normalizeExecutionQuote(raw)).toThrow('Invalid execution evidence');
  });
  it('accepts both SDK raw asset encodings while retaining their original JSON', () => {
    const raw = quoteFixture();
    (raw.rawQuoteJson as Record<string, unknown>).route = raw.route.map((code) => ({ code }));
    expect(normalizeExecutionQuote(raw).rawQuoteJson).toEqual(raw.rawQuoteJson);
    (raw.rawQuoteJson as Record<string, unknown>).route = [{ code: 'other-asset' }, raw.assetOut];
    expect(() => normalizeExecutionQuote(raw)).toThrow('Invalid execution evidence');
  });
});

describe('canonical evidence hashing', () => {
  it('sorts object keys, preserves array order and hashes canonical bytes deterministically', () => {
    expect(canonicalEvidenceJson({ z: ['1', 2], a: { y: true, b: null } })).toBe(
      '{"a":{"b":null,"y":true},"z":["1",2]}'
    );
    expect(hashEvidence({ b: 2, a: 1 })).toBe(hashEvidence({ a: 1, b: 2 }));
    expect(hashEvidence({ a: 1 })).toBe('015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862');
    expect(hashEvidence(['a', 'b'])).not.toBe(hashEvidence(['b', 'a']));
  });
  it.each([undefined, NaN, Infinity, 0.1, 1n, new Date(), new Map(), () => undefined])(
    'refuses non-JSON evidence %s',
    (value) => {
      expect(() => canonicalEvidenceJson(value)).toThrow('Invalid execution evidence');
    }
  );
  it('rejects cycles, symbols, sparse arrays and accessors without invoking getters', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const getter = vi.fn(() => 'value');
    const accessor = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    const array = Object.defineProperty(['value'], '0', { enumerable: true, get: getter });
    for (const value of [cycle, { [Symbol('key')]: 1 }, new Array(2), accessor, array])
      expect(() => canonicalEvidenceJson(value)).toThrow('Invalid execution evidence');
    expect(getter).not.toHaveBeenCalled();
  });
});

describe('same-finalized-runtime execution snapshot validation', () => {
  it('preserves legacy observations without timing and detaches new request intervals', () => {
    const snapshot = snapshotFixture();
    expect(validateExecutionSnapshot(snapshot)).not.toHaveProperty('quoteTiming');
    snapshot.quoteTiming = {
      buy: { startedAt: snapshot.requestStartedAt, finishedAt: 2004000 },
      sell: { startedAt: 2004000, finishedAt: snapshot.requestFinishedAt },
    };
    const result = validateExecutionSnapshot(snapshot);
    expect(result.quoteTiming).toEqual(snapshot.quoteTiming);
    result.quoteTiming!.buy.finishedAt++;
    expect(snapshot.quoteTiming.buy.finishedAt).toBe(2004000);
  });
  it.each([
    ['missing buy interval', { sell: { startedAt: 2004000, finishedAt: 2005000 } }],
    ['missing sell interval', { buy: { startedAt: 2000000, finishedAt: 2004000 } }],
    ['null intervals', null],
    ['array intervals', []],
    [
      'before request',
      { buy: { startedAt: 1999999, finishedAt: 2004000 }, sell: { startedAt: 2004000, finishedAt: 2005000 } },
    ],
    [
      'after request',
      { buy: { startedAt: 2000000, finishedAt: 2004000 }, sell: { startedAt: 2004000, finishedAt: 2010001 } },
    ],
    [
      'overlap',
      { buy: { startedAt: 2000000, finishedAt: 2004001 }, sell: { startedAt: 2004000, finishedAt: 2005000 } },
    ],
    [
      'reversed buy',
      { buy: { startedAt: 2003000, finishedAt: 2002000 }, sell: { startedAt: 2004000, finishedAt: 2005000 } },
    ],
    [
      'reversed sell',
      { buy: { startedAt: 2000000, finishedAt: 2003000 }, sell: { startedAt: 2005000, finishedAt: 2004000 } },
    ],
    [
      'unsafe time',
      {
        buy: { startedAt: 2000000, finishedAt: 2004000 },
        sell: { startedAt: 2004000, finishedAt: Number.MAX_SAFE_INTEGER + 1 },
      },
    ],
    [
      'fractional time',
      { buy: { startedAt: 2000000.1, finishedAt: 2004000 }, sell: { startedAt: 2004000, finishedAt: 2005000 } },
    ],
    [
      'string time',
      { buy: { startedAt: '2000000', finishedAt: 2004000 }, sell: { startedAt: 2004000, finishedAt: 2005000 } },
    ],
  ])('rejects malformed quote timing: %s', (_name, timing) => {
    const snapshot = snapshotFixture();
    snapshot.quoteTiming = timing as ExecutionSnapshot['quoteTiming'];
    expect(() => validateExecutionSnapshot(snapshot)).toThrow('Invalid execution evidence');
  });
  it('accepts zero-duration request measurements without inventing a latency floor', () => {
    const snapshot = snapshotFixture();
    snapshot.quoteTiming = {
      buy: { startedAt: 2001000, finishedAt: 2001000 },
      sell: { startedAt: 2001000, finishedAt: 2001000 },
    };
    expect(validateExecutionSnapshot(snapshot).quoteTiming).toEqual(snapshot.quoteTiming);
  });
  it.each([14, 15, 16])('accepts explicitly bound supported metadata format %i', (version) => {
    const snapshot = snapshotFixture();
    snapshot.context.metadataFormatVersion = version;
    expect(validateExecutionSnapshot(snapshot).context.metadataFormatVersion).toBe(version);
  });
  it.each([0, 13, 17, -1, 15.5, '16', null, undefined])('rejects unsupported metadata format %s', (version) => {
    const snapshot = snapshotFixture();
    if (version === undefined) Reflect.deleteProperty(snapshot.context, 'metadataFormatVersion');
    else snapshot.context.metadataFormatVersion = version as number;
    expect(() => validateExecutionSnapshot(snapshot)).toThrow('Invalid execution evidence');
  });
  it.each(['state_getMetadata', '', null, undefined])('rejects unbound metadata read method %s', (method) => {
    const snapshot = snapshotFixture();
    if (method === undefined) Reflect.deleteProperty(snapshot.context, 'metadataReadMethod');
    else snapshot.context.metadataReadMethod = method as 'Metadata_metadata_at_version';
    expect(() => validateExecutionSnapshot(snapshot)).toThrow('Invalid execution evidence');
  });
  it('accepts a complete exact-pair development sample and returns a detached copy', () => {
    const snapshot = snapshotFixture();
    const validated = validateExecutionSnapshot(snapshot);
    expect(validated).toEqual(snapshot);
    validated.buy.fee.runtimeVersion.specVersion = 999;
    expect(snapshot.buy.fee.runtimeVersion.specVersion).toBe(131);
  });
  it('accepts an explicitly frozen reverse lot without recomputing it from the new buy quote', () => {
    const snapshot = snapshotFixture();
    snapshot.reverseLot = {
      kind: 'fixed-frozen-lot',
      lotId: 'declared-lot-1',
      frozenAt: 1900000,
      amountCodec: '800000000000000000',
    };
    snapshot.sell.amountInCodec = snapshot.reverseLot.amountCodec;
    expect(() => validateExecutionSnapshot(snapshot)).not.toThrow();
    snapshot.sell.amountInCodec = snapshot.buy.minimumCodec;
    expect(() => validateExecutionSnapshot(snapshot)).toThrow('Invalid execution evidence');
  });
  it.each([
    [
      'purpose',
      (s: ExecutionSnapshot) => {
        s.purpose = 'acceptance' as 'development';
      },
    ],
    [
      'endpoint',
      (s: ExecutionSnapshot) => {
        s.context.endpoint = 'wss://example.invalid';
      },
    ],
    [
      'genesis',
      (s: ExecutionSnapshot) => {
        s.context.genesisHash = `0x${'cd'.repeat(32)}`;
      },
    ],
    [
      'dex',
      (s: ExecutionSnapshot) => {
        s.context.dexId = 1 as 0;
      },
    ],
    [
      'source',
      (s: ExecutionSnapshot) => {
        s.context.allowedSourceTypes = ['XSTPool' as 'XYKPool'];
      },
    ],
    [
      'filter',
      (s: ExecutionSnapshot) => {
        s.context.filterMode = 'Disabled' as 'AllowSelected';
      },
    ],
    [
      'pool identity',
      (s: ExecutionSnapshot) => {
        s.context.poolIdentity = '';
      },
    ],
    [
      'quote hash',
      (s: ExecutionSnapshot) => {
        s.sell.blockHash = `0x${'cd'.repeat(32)}`;
      },
    ],
    [
      'fee hash',
      (s: ExecutionSnapshot) => {
        s.sell.fee.blockHash = `0x${'cd'.repeat(32)}`;
      },
    ],
    [
      'spec version',
      (s: ExecutionSnapshot) => {
        s.buy.fee.runtimeVersion.specVersion++;
      },
    ],
    [
      'transaction version',
      (s: ExecutionSnapshot) => {
        s.sell.fee.runtimeVersion.transactionVersion++;
      },
    ],
    [
      'notional',
      (s: ExecutionSnapshot) => {
        s.buy.amountInCodec = '10000000000000000000';
      },
    ],
    [
      'minimum lot',
      (s: ExecutionSnapshot) => {
        s.sell.amountInCodec = s.buy.amountOutCodec;
      },
    ],
    [
      'minimum output',
      (s: ExecutionSnapshot) => {
        s.buy.minimumCodec = s.buy.amountOutCodec;
      },
    ],
    [
      'slippage',
      (s: ExecutionSnapshot) => {
        s.buy.slippageBps = 100 as 50;
      },
    ],
    [
      'impact',
      (s: ExecutionSnapshot) => {
        s.buy.priceImpact.numerator = '0';
      },
    ],
    [
      'decimals',
      (s: ExecutionSnapshot) => {
        s.buy.assetInDecimals = 6 as 18;
      },
    ],
    [
      'route',
      (s: ExecutionSnapshot) => {
        s.buy.route.reverse();
      },
    ],
    [
      'fee asset',
      (s: ExecutionSnapshot) => {
        s.buy.routeFees[0].assetAddress = EXECUTION_EVIDENCE_KUSD;
      },
    ],
    [
      'zero denominator',
      (s: ExecutionSnapshot) => {
        s.context.denominator = '0';
      },
    ],
    [
      'metadata hash',
      (s: ExecutionSnapshot) => {
        s.context.metadataHash = 'missing';
      },
    ],
    [
      'malformed amount',
      (s: ExecutionSnapshot) => {
        s.buy.amountOutCodec = '1e18';
      },
    ],
  ] as const)('rejects mismatched %s', (_name, mutate) => {
    const snapshot = snapshotFixture();
    mutate(snapshot);
    expect(() => validateExecutionSnapshot(snapshot)).toThrow('Invalid execution evidence');
  });
  it.each([
    [
      'raw quote amount',
      (s: ExecutionSnapshot) => {
        (s.buy.rawQuoteJson as Record<string, unknown>).amount = '1';
      },
    ],
    [
      'raw impact-free amount',
      (s: ExecutionSnapshot) => {
        delete (s.buy.rawQuoteJson as Record<string, unknown>).amountWithoutImpact;
      },
    ],
    [
      'raw quote fee',
      (s: ExecutionSnapshot) => {
        (s.buy.rawQuoteJson as Record<string, unknown>).fee = {};
      },
    ],
    [
      'raw route',
      (s: ExecutionSnapshot) => {
        (s.buy.rawQuoteJson as Record<string, unknown>).route = [];
      },
    ],
    [
      'partial fee',
      (s: ExecutionSnapshot) => {
        s.buy.fee.partialFeeCodec = '1';
      },
    ],
    [
      'raw partial fee',
      (s: ExecutionSnapshot) => {
        (s.buy.fee.rawQueryInfo as Record<string, unknown>).partialFee = '1';
      },
    ],
    [
      'raw fee details',
      (s: ExecutionSnapshot) => {
        s.buy.fee.rawFeeDetails = { inclusionFee: null, tip: 0 };
      },
    ],
    [
      'raw tip',
      (s: ExecutionSnapshot) => {
        (s.buy.fee.rawFeeDetails as Record<string, unknown>).tip = 1;
      },
    ],
    [
      'call encoding',
      (s: ExecutionSnapshot) => {
        s.buy.fee.callHex = '0xxyz';
      },
    ],
    [
      'encoded length',
      (s: ExecutionSnapshot) => {
        s.buy.fee.encodedLength = 4;
      },
    ],
    [
      'envelope hash',
      (s: ExecutionSnapshot) => {
        s.buy.fee.envelopeHash = '';
      },
    ],
  ] as const)('requires retained raw derivations and valid %s', (_name, mutate) => {
    const snapshot = snapshotFixture();
    mutate(snapshot);
    expect(() => validateExecutionSnapshot(snapshot)).toThrow('Invalid execution evidence');
  });
  it('enforces inclusive timeout/staleness/skew bounds and exact temporal order', () => {
    const boundary = snapshotFixture();
    boundary.requestFinishedAt = boundary.requestStartedAt + 25000;
    boundary.context.finalizedAt = boundary.requestFinishedAt - 300000;
    expect(() => validateExecutionSnapshot(boundary)).not.toThrow();
    for (const patch of [
      { requestFinishedAt: boundary.requestStartedAt + 25001 },
      { requestStartedAt: boundary.slotAt - 1 },
      { requestFinishedAt: boundary.requestStartedAt - 1 },
      { slotAt: 0 },
    ])
      expect(() => validateExecutionSnapshot({ ...boundary, ...patch })).toThrow('Invalid execution evidence');
    const stale = clone(boundary);
    stale.context.finalizedAt--;
    expect(() => validateExecutionSnapshot(stale)).toThrow('Invalid execution evidence');
    boundary.context.finalizedAt = boundary.requestFinishedAt + 30000;
    expect(() => validateExecutionSnapshot(boundary)).not.toThrow();
    boundary.context.finalizedAt++;
    expect(() => validateExecutionSnapshot(boundary)).toThrow('Invalid execution evidence');
  });
  it('rejects a reverse lot frozen after its sampling slot', () => {
    const snapshot = snapshotFixture();
    snapshot.reverseLot = {
      kind: 'fixed-frozen-lot',
      lotId: 'future-lot',
      frozenAt: snapshot.slotAt + 1,
      amountCodec: snapshot.sell.amountInCodec,
    };
    expect(() => validateExecutionSnapshot(snapshot)).toThrow('Invalid execution evidence');
  });
});

describe('declared reverse lot validation before RPC', () => {
  const lot: ExecutionReverseLot = {
    kind: 'fixed-frozen-lot',
    amountCodec: '9007199254740993001',
    frozenAt: 1000,
    lotId: 'original-partial-buy',
  };
  it('keeps a positive exact codec and immutable declaration independent from later caller edits', () => {
    const original = clone(lot);
    const copied = validateExecutionReverseLot(original, 1000);
    expect(copied).toEqual(original);
    if (original.kind === 'fixed-frozen-lot') original.amountCodec = '1';
    expect(copied).toEqual(lot);
    expect(validateExecutionReverseLot({ kind: 'same-block-buy-minimum' }, 1000)).toEqual({
      kind: 'same-block-buy-minimum',
    });
  });
  it.each([
    { ...lot, amountCodec: '0' },
    { ...lot, amountCodec: '1e18' },
    { ...lot, amountCodec: '-1' },
    { ...lot, frozenAt: 1001 },
    { ...lot, frozenAt: 1.5 },
    { ...lot, frozenAt: 0 },
    { ...lot, frozenAt: Number.MAX_SAFE_INTEGER + 1 },
    { ...lot, lotId: '' },
    { ...lot, lotId: ' ' },
    { ...lot, lotId: 'x'.repeat(257) },
    { kind: 'unknown' },
    null,
  ])('rejects an invalid declaration %j', (value) => {
    expect(() => validateExecutionReverseLot(value as ExecutionReverseLot, 1000)).toThrow('Invalid execution evidence');
  });
});
