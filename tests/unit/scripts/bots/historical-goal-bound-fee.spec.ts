import { describe, expect, it, vi } from 'vitest';
import {
  applyHistoricalGoalBoundFee,
  prepareHistoricalGoalBoundFeeSource,
} from '../../../../scripts/bots/historical-goal-bound-fee';
import { prepareHistoricalGoalFill } from '../../../../scripts/bots/historical-goal-quote';
import { HISTORICAL_EXECUTION_KUSD as KUSD } from '../../../../scripts/bots/historical-execution-codec';
import {
  createHistoricalBoundFeeFixture as fixture,
  createHistoricalFeeMetadataFixture as metadataFixture,
  MAX,
  hash,
  hex,
  le,
  feeBytes,
  clone,
} from './fixtures/historical-goal-bound-fee-fixture';

const run = (f: ReturnType<typeof fixture>) => applyHistoricalGoalBoundFee(f.prepared, f.source, f.receipt);

describe('historical goal bounded fee receipt join', () => {
  it.each([false, true])(
    'replaces only native fee for the %s reverse route and retains immutable provenance',
    (reverse) => {
      const f = fixture(reverse);
      const before = JSON.stringify(f);
      const result = run(f);
      expect(result.kind).toBe('ready');
      if (result.kind !== 'ready' || f.prepared.kind !== 'ready' || !('feePolicy' in result))
        throw new Error('Expected ready bound result');
      expect(result.fill).toEqual({ ...f.prepared.fill, feeCodec: '11' });
      expect(result.fill.outputCodec).toBe('995000000000000000');
      expect(result.mark).toEqual(f.prepared.mark);
      expect(result.clock).toEqual(f.prepared.clock);
      expect(result.feePolicySha256).toBe(f.receipt.envelope.policySha256);
      expect(result.feeEnvelopePolicy).toBe(f.receipt.envelope.policy.id);
      expect(result.feeEvidenceDigest).toMatch(/^[0-9a-f]{64}$/);
      expect(result.feeAdequacyVerified).toBe(false);
      expect(result.observedFill).toBe(false);
      expect(result.transactionSubmitted).toBe(false);
      expect(JSON.stringify(f)).toBe(before);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.fill)).toBe(true);
      expect(Object.isFrozen(result.mark)).toBe(true);
      expect(Object.isFrozen(result.clock)).toBe(true);
      expect(Object.isFrozen(result.feePolicy.allowedSignatures)).toBe(true);
      expect(run(f)).toEqual(result);
    }
  );

  it('validates and detaches the shared fee-reader source before asynchronous use', () => {
    const f = fixture();
    const validated = prepareHistoricalGoalBoundFeeSource(f.source);
    expect(validated.bound).toEqual(f.receipt.envelope);
    expect(validated.originalFeeCodec).toBe('6');
    expect(validated.state.timestampMs).toBe(f.execution.timestampMs);
    f.source.identity.runtimeVersion.specVersion = 131;
    f.source.request.amountInCodec = '1';
    f.source.quoteEvidence.context.state.timestampMs++;
    expect(validated.identity.runtimeVersion.specVersion).toBe(130);
    expect(validated.request.amountInCodec).toBe('2500000000000000000');
    expect(validated.state.timestampMs).toBe(f.execution.timestampMs);
    for (const value of [
      validated,
      validated.identity,
      validated.identity.runtimeVersion,
      validated.request,
      validated.state,
    ])
      expect(Object.isFrozen(value)).toBe(true);
  });

  it('keeps source validation free of impact admission filters while rejecting a forged ready fill', () => {
    const f = fixture();
    f.source.quoteEvidence.quote.amountWithoutImpactCodec = '2000000000000000000';
    expect(prepareHistoricalGoalBoundFeeSource(f.source).quote.amountWithoutImpactCodec).toBe('2000000000000000000');
    expect(() => run(f)).toThrow();
  });

  it('preserves each genuine non-ready join without inspecting poisoned source or fee receipt', () => {
    const f = fixture();
    const unavailable = {
      kind: 'historical-quote-unavailable',
      request: f.quoteEvidence.request,
      context: f.quoteEvidence.context,
    };
    const quoteMissing = prepareHistoricalGoalFill(f.pending, f.plan, f.previous, f.execution, unavailable, f.pool);
    const poolMissing = prepareHistoricalGoalFill(f.pending, f.plan, f.previous, f.execution, unavailable, {
      ...f.pool,
      status: 'absent',
      accounts: null,
      reserves: null,
      marks: null,
    });
    const expensiveQuote = clone(f.quoteEvidence);
    expensiveQuote.quote.amountWithoutImpactCodec = '2000000000000000000';
    const impact = prepareHistoricalGoalFill(f.pending, f.plan, f.previous, f.execution, expensiveQuote, f.pool);
    const getter = vi.fn(() => {
      throw new Error('Must not read');
    });
    const poison = Object.defineProperty({}, 'identity', { get: getter, enumerable: true });
    for (const input of [quoteMissing, poolMissing, impact]) {
      const result = applyHistoricalGoalBoundFee(input, poison, poison);
      expect(result).toEqual(input);
      expect(result).not.toBe(input);
      expect(Object.isFrozen(result)).toBe(true);
      expect(result).not.toHaveProperty('fill');
      expect(result).not.toHaveProperty('feeEvidenceDigest');
    }
    expect(getter).not.toHaveBeenCalled();
  });

  it.each([
    'blockHash',
    'runtime',
    'metadata',
    'input',
    'direction',
    'output',
    'clock',
    'height',
    'denominator',
    'quote-kind',
    'old-envelope',
    'old-fee',
    'impact',
  ] as const)('rejects contradictory original %s evidence', (field) => {
    const f = fixture();
    f.source = clone(f.source);
    if (field === 'blockHash') f.source.identity.blockHash = hash(999);
    if (field === 'runtime') f.source.identity.runtimeVersion = { specVersion: 131, transactionVersion: 131 };
    if (field === 'metadata') f.source.identity.metadataHex = metadataFixture(51, 7).identity.metadataHex;
    if (field === 'input') f.source.request.amountInCodec = '1';
    if (field === 'direction')
      [f.source.request.assetIn, f.source.request.assetOut] = [f.source.request.assetOut, f.source.request.assetIn];
    if (field === 'output') f.source.request.quotedAmountOutCodec = '1000000000000000002'; // Same rounded minimum; still another quote.
    if (field === 'clock') f.source.quoteEvidence.context.state.timestampMs++;
    if (field === 'height') f.source.blockNumber++;
    if (field === 'denominator') f.source.quoteEvidence.context.expectedDenominator = '2';
    if (field === 'quote-kind') f.source.quoteEvidence.kind = 'historical-quote-unavailable';
    if (field === 'old-envelope') f.source.quoteEvidence.envelope.callHex += '00';
    if (field === 'impact') f.source.quoteEvidence.quote.amountWithoutImpactCodec = '2000000000000000000';
    if (field === 'old-fee') f.source.quoteEvidence.fees.details.finalFee = '7';
    expect(() => run(f)).toThrow();
  });

  it.each([
    'envelopeBytes',
    'call',
    'minimum',
    'input',
    'hash',
    'length',
    'queryData',
    'fingerprint',
    'boundPolicy',
    'runtime',
    'metadata',
    'feeAsset',
  ] as const)('rejects changed bounded receipt %s', (field) => {
    const f = fixture();
    f.receipt = clone(f.receipt);
    if (field === 'envelopeBytes') f.receipt.envelope.envelopeHex += '00';
    if (field === 'call') f.receipt.envelope.callHex += '00';
    if (field === 'minimum') f.receipt.envelope.minimumCodec = '1';
    if (field === 'input') f.receipt.envelope.amountInCodec = '1';
    if (field === 'hash') f.receipt.envelope.envelopeSha256 = 'a'.repeat(64);
    if (field === 'length') f.receipt.envelope.encodedLength++;
    if (field === 'queryData') f.receipt.envelope.feeQueryDataHex += '00';
    if (field === 'fingerprint') f.receipt.envelope.policySha256 = 'b'.repeat(64);
    if (field === 'boundPolicy') Object.assign(f.receipt.envelope.policy.nonce, { maximum: '0' });
    if (field === 'runtime') Object.assign(f.receipt.envelope.runtimeVersion, { specVersion: 131 });
    if (field === 'metadata') f.receipt.envelope.metadataSha256 = 'c'.repeat(64);
    if (field === 'feeAsset') f.receipt.feeAssetAddress = KUSD;
    expect(() => run(f)).toThrow();
  });

  it.each(['info', 'details'] as const)('binds %s runtime method, bytes and exact state hash', (key) => {
    for (const part of ['method', 'runtime-method', 'bytes', 'state', 'extra-param']) {
      const f = fixture();
      f.receipt = clone(f.receipt);
      const query = f.receipt.queries[key];
      if (part === 'method') query.method = 'other';
      if (part === 'runtime-method') query.params[0] = 'other';
      if (part === 'bytes') query.params[1] = '0x00';
      if (part === 'state') query.params[2] = hash(999);
      if (part === 'extra-param') query.params.push('extra');
      expect(() => run(f)).toThrow();
    }
  });

  it('redecodes raw SCALE totals and rejects missing, malformed, trailing, paid-tip and disagreement evidence', () => {
    for (const change of [
      (f: ReturnType<typeof fixture>) => {
        f.receipt.queries.info.resultHex = '0x00';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.queries.info.resultHex += '00';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.queries.info.resultHex = f.queryInfo('12');
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.queries.details.resultHex = '0x00';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.queries.details.resultHex += '00';
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.queries.details.resultHex = feeBytes(1, 7, 3, 1);
      },
      (f: ReturnType<typeof fixture>) => {
        f.receipt.queries.details.resultHex = hex(Buffer.concat([Buffer.from([0]), le(0)]));
      },
    ]) {
      const f = fixture();
      change(f);
      expect(() => run(f)).toThrow();
    }
    const f = fixture();
    expect(() => applyHistoricalGoalBoundFee(f.prepared, f.source, null)).toThrow();
    expect(() => applyHistoricalGoalBoundFee(f.prepared, f.source, { ...f.receipt, cachedFee: '11' })).toThrow();
  });

  it('hashes raw fee evidence and source amounts deterministically, with integer-only fee replacement', () => {
    const f = fixture();
    const first = run(f);
    f.receipt.queries.details.resultHex = feeBytes(MAX, 1, 0);
    f.receipt.queries.info.resultHex = f.queryInfo(MAX.toString());
    const second = run(f);
    if (
      first.kind !== 'ready' ||
      second.kind !== 'ready' ||
      !('feeEvidenceDigest' in first) ||
      !('feeEvidenceDigest' in second)
    )
      throw new Error('Expected ready');
    expect(second.fill.feeCodec).toBe(MAX.toString());
    expect(second.fill.outputCodec).toBe(first.fill.outputCodec);
    expect(second.feeEvidenceDigest).not.toBe(first.feeEvidenceDigest);
    const reversed = Object.fromEntries(Object.entries(f.receipt).reverse());
    expect(applyHistoricalGoalBoundFee(f.prepared, f.source, reversed)).toEqual(second);
  });

  it('rejects forged prepared outcomes/accessors and never invokes a getter or toJSON', () => {
    const f = fixture();
    const getter = vi.fn();
    for (const [input, source, receipt] of [
      [Object.defineProperty({}, 'kind', { enumerable: true, get: getter }), f.source, f.receipt],
      [{ ...f.prepared, kind: 'anything' }, f.source, f.receipt],
      [{ ...f.prepared, toJSON: getter }, f.source, f.receipt],
      [Object.create(f.prepared), f.source, f.receipt],
      [f.prepared, Object.defineProperty({ ...f.source }, 'identity', { enumerable: true, get: getter }), f.receipt],
      [f.prepared, f.source, Object.defineProperty({ ...f.receipt }, 'envelope', { enumerable: true, get: getter })],
    ])
      expect(() => applyHistoricalGoalBoundFee(input, source, receipt)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const returned = run(f);
    expect(() => applyHistoricalGoalBoundFee(returned, f.source, f.receipt)).toThrow(); // Do not apply fee conversion twice.
  });
});
