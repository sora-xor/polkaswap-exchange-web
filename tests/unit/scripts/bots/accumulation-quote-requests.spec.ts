// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAccumulationQuoteRequests,
  isAccumulationQuoteRequestDescriptor,
  type AccumulationQuoteRequestDescriptor,
} from '../../../../scripts/bots/accumulation-quote-requests';
import { createHistoricalGoalFeeCodec } from '../../../../scripts/bots/historical-goal-fee-codec';
import {
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import type { AccumulationRpcReceipt } from '../../../../scripts/bots/accumulation-evidence-bridge';
import { createAccumulationEvidenceFixture } from './fixtures/accumulation-evidence-fixture';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const UNIT = 10n ** 18n;
function fixture() {
  const synthetic = createAccumulationEvidenceFixture(1_800_000_000_000);
  const input = {
    identity: synthetic.identity,
    blockNumber: 100,
    denominator: '100000000000000000000000000000000000000',
    rpcIdStart: 100,
  };
  return { input, producer: createAccumulationQuoteRequests(input) };
}
function rawQuote(amount = UNIT.toString()) {
  const fee: Record<string, string> = { [XOR]: '10' };
  return { amount, amount_without_impact: amount, fee, route: [KUSD, XOR], rewards: [] };
}
function receipt(request: AccumulationQuoteRequestDescriptor, result: unknown = rawQuote()): AccumulationRpcReceipt {
  const responseBody = JSON.stringify({ jsonrpc: '2.0', id: request.id, result });
  return {
    endpoint: request.endpoint,
    requestBody: request.requestBody,
    responseBody,
    responseSha256: sha(responseBody),
    requestedAtMs: 1000,
    completedAtMs: 1100,
    httpStatus: 200,
    failure: null,
  };
}
function rewrite(r: AccumulationRpcReceipt, value: string) {
  r.responseBody = value;
  r.responseSha256 = sha(value);
}
afterEach(() => vi.unstubAllGlobals());

describe('pure accumulation request producer', () => {
  it('constructs the original seven-key call and nine exact KUSD lots without transport', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw Error('network forbidden');
      })
    );
    const { producer } = fixture();
    expect(producer.contextRequest.params).toEqual([Object.values(producer.storageKeys), producer.binding.blockHash]);
    expect(producer.contextRequest.method).toBe('state_queryStorageAt');
    expect(Object.keys(producer.storageKeys)).toEqual([
      'timestamp',
      'denominator',
      'kusd',
      'xor',
      'dex0',
      'properties',
      'reserves',
    ]);
    expect(new Set(Object.values(producer.storageKeys)).size).toBe(7);
    expect(producer.candidates.map((c) => c.inputKusd)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(producer.candidates.map((c) => c.amountInCodec)).toEqual(
      Array.from({ length: 9 }, (_, i) => String(BigInt(i + 1) * UNIT))
    );
    for (const candidate of producer.candidates) {
      expect(JSON.parse(candidate.quoteRequest.requestBody)).toEqual({
        jsonrpc: '2.0',
        id: 100 + 1 + (candidate.inputKusd - 1) * 3,
        method: 'liquidityProxy_quote',
        params: [
          0,
          KUSD,
          XOR,
          candidate.amountInCodec,
          'WithDesiredInput',
          ['XYKPool'],
          'AllowSelected',
          producer.binding.blockHash,
        ],
      });
      expect(candidate.quoteRequest.requestSha256).toBe(sha(candidate.quoteRequest.requestBody));
      expect(candidate.quoteRequest.endpoint).toBe('https://ws.mof.sora.org/');
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('derives both original-output-bound fee calls through the actual conservative envelope codec', () => {
    const { input, producer } = fixture(),
      candidate = producer.candidates[8];
    const out = '1234567890123456789';
    const r = receipt(candidate.quoteRequest, rawQuote(out));
    const result = producer.feeRequestsForQuote(9, r);
    const expected = createHistoricalGoalFeeCodec(input.identity).buildBoundSwapEnvelope(
      { assetIn: KUSD, assetOut: XOR, amountInCodec: String(9n * UNIT), quotedAmountOutCodec: out },
      { blockNumber: 100 }
    );
    expect(result.status).toBe('ready');
    expect(result.envelope).toEqual(expected);
    expect(result.quote?.minimumOutputCodec).toBe(String((BigInt(out) * 9950n) / 10000n));
    expect(result.feeRequests.map((d) => d.params)).toEqual([
      ['TransactionPaymentApi_query_info', expected.feeQueryDataHex, input.identity.blockHash],
      ['TransactionPaymentApi_query_fee_details', expected.feeQueryDataHex, input.identity.blockHash],
    ]);
    expect(result.feeRequests.map((d) => d.id)).toEqual([126, 127]);
    expect(result.sourceAcquisitionVerified).toBe(false);
    expect(result.transactionSubmitted).toBe(false);
    expect(result.envelope?.estimation.signature).toBe('fake-placeholder-only');
  });
  it('retains over-impact quotes and still constructs their fees rather than hiding rejected candidates', () => {
    const { producer } = fixture(),
      q = rawQuote();
    q.amount_without_impact = String(2n * UNIT);
    const result = producer.feeRequestsForQuote(1, receipt(producer.candidates[0].quoteRequest, q));
    expect(result.status).toBe('ready');
    expect(result.feeRequests).toHaveLength(2);
    expect(result.quote?.amountWithoutImpactCodec).toBe(String(2n * UNIT));
  });
  it('retains a null route as unavailable without producing any fee request', () => {
    const { producer } = fixture(),
      r = receipt(producer.candidates[0].quoteRequest, null);
    const result = producer.feeRequestsForQuote(1, r);
    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'quote-unavailable',
      quote: null,
      envelope: null,
      feeRequests: [],
      quoteReceipt: r,
    });
  });
  it.each(['transport', 'http', 'rpc', 'digest', 'id', 'request', 'endpoint', 'clock'] as const)(
    'retains %s failure without fee requests',
    (kind) => {
      const { producer } = fixture(),
        r = receipt(producer.candidates[0].quoteRequest);
      if (kind === 'transport') {
        r.failure = 'bounded-timeout';
        r.responseBody = null;
        r.responseSha256 = null;
        r.httpStatus = null;
      }
      if (kind === 'http') r.httpStatus = 503;
      if (kind === 'rpc')
        rewrite(r, JSON.stringify({ jsonrpc: '2.0', id: 101, error: { code: -1, message: 'synthetic unavailable' } }));
      if (kind === 'digest') r.responseSha256 = '0'.repeat(64);
      if (kind === 'id') rewrite(r, JSON.stringify({ jsonrpc: '2.0', id: 102, result: rawQuote() }));
      if (kind === 'request') r.requestBody = producer.candidates[1].quoteRequest.requestBody;
      if (kind === 'endpoint') r.endpoint = 'https://example.invalid/';
      if (kind === 'clock') r.completedAtMs = 31001;
      const result = producer.feeRequestsForQuote(1, r);
      expect(result.status).toBe('failed');
      expect(result.quoteReceipt).toEqual(r);
      expect(result.feeRequests).toEqual([]);
      expect(result.envelope).toBeNull();
    }
  );
  it.each([
    'zero',
    'leading-zero',
    'fraction',
    'overflow',
    'zero-minimum',
    'reverse-impact',
    'wrong-route',
    'wrong-fee',
  ] as const)('rejects %s quote amounts or route', (kind) => {
    const { producer } = fixture(),
      q = rawQuote();
    if (kind === 'zero') q.amount = '0';
    if (kind === 'leading-zero') q.amount = '01';
    if (kind === 'fraction') q.amount = '1.5';
    if (kind === 'overflow') q.amount = String(1n << 128n);
    if (kind === 'zero-minimum') q.amount = '1';
    if (kind === 'reverse-impact') q.amount_without_impact = '1';
    if (kind === 'wrong-route') q.route = [XOR, KUSD];
    if (kind === 'wrong-fee') q.fee = { [KUSD]: '10' };
    const result = producer.feeRequestsForQuote(1, receipt(producer.candidates[0].quoteRequest, q));
    expect(result.status).toBe('failed');
    expect(result.feeRequests).toEqual([]);
  });
  it('rejects duplicate decoded JSON keys, unsafe numbers, trailing data and response overflow', () => {
    const { producer } = fixture(),
      r = receipt(producer.candidates[0].quoteRequest);
    for (const body of [
      '{"jsonrpc":"2.0","id":101,"result":null,"re\\u0073ult":null}',
      '{"jsonrpc":"2.0","id":101,"result":{"amount":9007199254740993}}',
      `${r.responseBody} false`,
      ' '.repeat(2 * 1024 * 1024 + 1),
    ]) {
      rewrite(r, body);
      expect(producer.feeRequestsForQuote(1, r).status).toBe('failed');
    }
  });
  it('deeply detaches inputs and retains exact quote bytes; cloned descriptors lose ownership', () => {
    const { input, producer } = fixture(),
      candidate = producer.candidates[0],
      r = receipt(candidate.quoteRequest);
    const result = producer.feeRequestsForQuote(1, r),
      original = r.responseBody;
    input.identity.blockHash = `0x${'9'.repeat(64)}`;
    input.identity.runtimeVersion.specVersion = 1;
    r.responseBody = null;
    expect(result.quoteReceipt.responseBody).toBe(original);
    expect(producer.binding.blockHash).not.toBe(input.identity.blockHash);
    expect(producer.binding.runtimeVersion.specVersion).not.toBe(1);
    for (const d of [producer.contextRequest, candidate.quoteRequest, ...result.feeRequests]) {
      expect(isAccumulationQuoteRequestDescriptor(d)).toBe(true);
      expect(isAccumulationQuoteRequestDescriptor(clone(d))).toBe(false);
      expect(Object.isFrozen(d)).toBe(true);
      expect(Object.isFrozen(d.params)).toBe(true);
    }
    expect(Object.isFrozen(candidate.quoteRequest.params[5])).toBe(true);
    expect(Object.isFrozen(result.quoteReceipt)).toBe(true);
    expect(Object.isFrozen(result.envelope?.estimation)).toBe(true);
  });
  it('rejects accessors without executing them and invalid candidate indices', () => {
    const { input, producer } = fixture(),
      getter = vi.fn(() => '1');
    Object.defineProperty(input, 'denominator', { get: getter, enumerable: true });
    expect(() => createAccumulationQuoteRequests(input)).toThrow(/accessor/);
    expect(getter).not.toHaveBeenCalled();
    const r = receipt(producer.candidates[0].quoteRequest);
    for (const i of [0, 10, 1.5, NaN]) expect(() => producer.feeRequestsForQuote(i, r)).toThrow(/integer/);
  });
  it('validates denomination and exact bounded integer IDs/heights without rescaling lots', () => {
    const { input } = fixture();
    for (const denominator of ['0', '01', '1.5', String(1n << 128n)])
      expect(() => createAccumulationQuoteRequests({ ...input, denominator })).toThrow(/amount/);
    for (const rpcIdStart of [0, 1.5, Number.MAX_SAFE_INTEGER - 26])
      expect(() => createAccumulationQuoteRequests({ ...input, rpcIdStart })).toThrow(/integer/);
    for (const blockNumber of [0, 1.5, 0x100000000])
      expect(() => createAccumulationQuoteRequests({ ...input, blockNumber })).toThrow(/integer/);
    const minimal = createAccumulationQuoteRequests({
      ...input,
      denominator: '1',
      rpcIdStart: Number.MAX_SAFE_INTEGER - 27,
    });
    expect(minimal.candidates[0].amountInCodec).toBe(UNIT.toString());
    expect(minimal.binding.denominator).toBe('1');
  });
});
