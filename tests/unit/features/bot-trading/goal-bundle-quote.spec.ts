// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readHistoricalExecutionQuote } from '../../../../scripts/bots/historical-execution-reader';
import { readHistoricalGoalBoundFee } from '../../../../scripts/bots/historical-goal-bound-fee-reader';
import { prepareHistoricalGoalBoundFeeSource } from '../../../../scripts/bots/historical-goal-bound-fee';
import {
  createHistoricalFeeMetadataFixture,
  feeBytes,
  hex,
} from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';
import {
  createHistoricalExecutionCodec,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { verifyGoalBundleQuote, type GoalBundleQuoteBinding } from '@/features/bot-trading/goal-bundle-quote';
import { goalRawBytesSha256, goalRawEvidenceDigest } from '@/features/bot-trading/goal-raw-envelope';
import { isExactInputQuoteWithinImpactLimit } from '@/features/bot-trading/quote-impact';

vi.unmock('@polkadot/util-crypto');
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
type Row = {
  id: number;
  method: string;
  params: unknown[];
  responseBody: string;
  responseSha256: string;
  [key: string]: unknown;
};
type Records = {
  quote: Record<string, unknown> & { rpcEvidence: Row[] };
  fee: Record<string, unknown> & { rpcEvidence: Row[] };
  context: Record<string, unknown>;
};
type Oracle = { records: Records; binding: GoalBundleQuoteBinding };
const oracles = new Map<string, Oracle>();

/** Both original readers process invented pinned responses with real SCALE metadata/codecs. */
async function oracle(reverse = false, highImpact = false, version: 130 | 131 = 130): Promise<Oracle> {
  const fixture = createHistoricalFeeMetadataFixture();
  fixture.identity.runtimeVersion = { specVersion: version, transactionVersion: version };
  const codec = createHistoricalExecutionCodec(fixture.identity),
    keys = codec.storageKeys();
  const block = { hash: fixture.identity.blockHash, height: 20, parentHash: hash(19), timestampMs: 1_000_000 };
  const finalizedSource = { hash: hash(90), height: 90, receiptSha256: 'a'.repeat(64) };
  const pending = {
    assetIn: reverse ? XOR : KUSD,
    assetOut: reverse ? KUSD : XOR,
    amountInCodec: '2500000000000000000',
    expectedDenominator: '1',
  };
  const quoteOutput = '2000000000000000000',
    withoutImpact = highImpact ? '4000000000000000000' : quoteOutput;
  const info = (fee: number) =>
    hex(
      fixture.registry
        .createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: String(fee) })
        .toU8a()
    );
  const fetcher: typeof fetch = async (_url, init) => {
    const { id, method, params } = JSON.parse(String(init!.body)) as { id: number; method: string; params: unknown[] };
    let result: unknown;
    if (method === 'chain_getBlockHash')
      result = params[0] === 0 ? fixture.identity.genesisHash : params[0] === 20 ? block.hash : finalizedSource.hash;
    else if (method === 'chain_getFinalizedHead') result = hash(100);
    else if (method === 'chain_getHeader') {
      const height = params[0] === block.hash ? 20 : params[0] === block.parentHash ? 19 : 100;
      result = {
        number: `0x${height.toString(16)}`,
        parentHash: hash(height - 1),
        stateRoot: hash(700),
        extrinsicsRoot: hash(800),
        digest: { logs: [] },
      };
    } else if (method === 'state_getRuntimeVersion')
      result = { specName: 'sora-substrate', ...fixture.identity.runtimeVersion, apis: [['0x1234567812345678', 1]] };
    else if (method === 'state_getMetadata') result = fixture.identity.metadataHex;
    else if (method === 'state_getStorage') {
      const label = Object.keys(keys).find(
        (key) => keys[key as keyof typeof keys] === params[0]
      ) as keyof typeof fixture.proof;
      result = fixture.proof[label];
    } else if (method === 'liquidityProxy_quote')
      result = {
        amount: quoteOutput,
        amount_without_impact: withoutImpact,
        route: [pending.assetIn, pending.assetOut],
        fee: { [XOR]: '100' },
      };
    else if (method === 'state_call')
      result = params[0] === 'TransactionPaymentApi_query_info' ? info(7) : feeBytes(1, 3, 3);
    else throw Error('Unexpected synthetic RPC');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }));
  };
  const original = await readHistoricalExecutionQuote(
    { block: { hash: block.hash, height: block.height }, finalizedSource, ...pending },
    { fetch: fetcher }
  );
  if (original.kind !== 'hypothetical-historical-execution-estimate') throw Error('synthetic quote unavailable');
  const source = {
    identity: fixture.identity,
    blockNumber: block.height,
    request: {
      assetIn: pending.assetIn,
      assetOut: pending.assetOut,
      amountInCodec: pending.amountInCodec,
      quotedAmountOutCodec: original.quote.amountOutCodec,
    },
    quoteEvidence: original,
  };
  const prepared = prepareHistoricalGoalBoundFeeSource(source);
  const fee = await readHistoricalGoalBoundFee(source, {
    fetch: async (_url, init) => {
      const { id } = JSON.parse(String(init!.body));
      return new Response(JSON.stringify({ jsonrpc: '2.0', id, result: id === 1 ? info(11) : feeBytes(1, 7, 3) }));
    },
  });
  const valuation = {
    sourceManifestSha256: 'b'.repeat(64),
    genesisHash: fixture.identity.genesisHash,
    block,
    mark: {
      blockHash: block.hash,
      blockNumber: block.height,
      timestampMs: block.timestampMs,
      denominator: '1',
      kusdReserveCodec: '900000000000000000000',
      xorReserveCodec: '800000000000000000000',
    },
    runtimeProfile: {
      specVersion: version,
      transactionVersion: version,
      metadataSha256: codec.binding.metadataSha256,
      codeHash: hash(600),
    },
    captureStartedAtMs: 1_000_002,
    receivedAtMs: 1_000_005,
    evidenceSha256: 'd'.repeat(64),
  };
  const decisionAtMs = valuation.receivedAtMs,
    quoteAndFeeReadMs = 20;
  const quoteSha = goalRawEvidenceDigest(original),
    feeSha = goalRawEvidenceDigest(fee);
  const context = {
    context: { ...valuation, captureStartedAtMs: decisionAtMs, receivedAtMs: decisionAtMs },
    pending,
    valuationEvidenceSha256: valuation.evidenceSha256,
    quoteEvidenceSha256: quoteSha,
    feeEvidenceSha256: feeSha,
    receivedAtMs: decisionAtMs + quoteAndFeeReadMs,
    timingKind: 'fixed-pinned-capture-delays-v1',
  };
  return JSON.parse(
    JSON.stringify({
      records: { quote: original, fee, context },
      binding: {
        requestSha256: 'c'.repeat(64),
        checkId: 1,
        finalizedSource,
        valuation,
        pending,
        decisionAtMs,
        quoteAndFeeReadMs,
        cutoffAtMs: 1_050_000,
        timingKind: 'fixed-pinned-capture-delays-v1',
        feePolicyId: prepared.bound.policy.id,
        feePolicySha256: prepared.bound.policySha256,
        quote: { name: 'quote-1.json', valueSha256: quoteSha },
        fee: { name: 'fee-1.json', valueSha256: feeSha },
        context: { name: 'quote-context-1.json', valueSha256: goalRawEvidenceDigest(context) },
      },
    })
  );
}
beforeAll(async () => {
  for (const [key, reverse, highImpact, version] of [
    ['forward', false, false, 130],
    ['reverse', true, false, 130],
    ['impact', false, true, 130],
    ['131', false, false, 131],
  ] as const)
    oracles.set(key, await oracle(reverse, highImpact, version));
});

function fixture(key = 'forward') {
  const { records, binding: expected }: Oracle = JSON.parse(JSON.stringify(oracles.get(key)));
  const refresh = (joins = true) => {
    expected.quote.valueSha256 = goalRawEvidenceDigest(records.quote);
    expected.fee.valueSha256 = goalRawEvidenceDigest(records.fee);
    if (joins) {
      records.context.quoteEvidenceSha256 = expected.quote.valueSha256;
      records.context.feeEvidenceSha256 = expected.fee.valueSha256;
    }
    expected.context.valueSha256 = goalRawEvidenceDigest(records.context);
  };
  const envelope = (part: 'quote' | 'fee' | 'context') =>
    new TextEncoder().encode(
      canonical({
        kind: 'goal-study-raw-evidence-v1',
        requestSha256: expected.requestSha256,
        name: expected[part].name,
        sha256: expected[part].valueSha256,
        value: records[part],
      }) + '\n'
    );
  const bytes = () => ({ quoteBytes: envelope('quote'), feeBytes: envelope('fee'), contextBytes: envelope('context') });
  return { records, expected, refresh, bytes, verify: () => verifyGoalBundleQuote(expected, bytes()) };
}
function set(value: unknown, path: readonly (number | string)[], replacement: unknown): void {
  let target = value as Record<string, unknown>;
  for (const key of path.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[path[path.length - 1]] = replacement;
}
function response(row: Row, path: readonly (number | string)[], replacement: unknown): void {
  const body = JSON.parse(row.responseBody);
  set(body, path, replacement);
  row.responseBody = JSON.stringify(body);
  row.responseSha256 = goalRawBytesSha256(new TextEncoder().encode(row.responseBody));
  if (Object.hasOwn(row, 'responseBytes')) {
    row.responseBytes = new TextEncoder().encode(row.responseBody).length;
    row.retainedBytes = row.responseBytes;
  }
}

describe('original browser quote and fee verification', () => {
  it.each(['forward', 'reverse', '131'])(
    'reconstructs the exact %s route and conservative fee without acquisition',
    (key) => {
      const f = fixture(key),
        network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
          throw Error('network forbidden');
        });
      try {
        const result = f.verify();
        expect(result).toEqual({
          context: {
            ...f.expected.valuation,
            captureStartedAtMs: f.expected.decisionAtMs,
            receivedAtMs: f.expected.decisionAtMs,
            evidenceSha256: f.expected.context.valueSha256,
          },
          pending: f.expected.pending,
          receivedAtMs: 1_000_025,
          quotedOutputCodec: '2000000000000000000',
          withoutImpactCodec: '2000000000000000000',
          minimumOutputCodec: '1990000000000000000',
          feeCodec: '11',
          queryInfoFeeCodec: '11',
          queryDetailsFeeCodec: '11',
          feeAsset: XOR,
          feePolicyId: f.expected.feePolicyId,
          feePolicySha256: f.expected.feePolicySha256,
          quoteEvidenceSha256: f.expected.quote.valueSha256,
          feeEvidenceSha256: f.expected.fee.valueSha256,
          dexId: 0,
          liquiditySource: 'XYKPool',
          filter: 'AllowSelected',
          slippageBasisPoints: 50,
          observedFill: false,
          transactionSubmitted: false,
          feeAdequacyVerified: false,
        });
        expect(Object.isFrozen(result.context.mark)).toBe(true);
        expect(Object.isFrozen(result.pending)).toBe(true);
        expect(network).not.toHaveBeenCalled();
      } finally {
        network.mockRestore();
      }
    }
  );

  it('preserves valid high-impact observations for the existing evaluator to reject economically', () => {
    const result = fixture('impact').verify();
    expect(result.withoutImpactCodec).toBe('4000000000000000000');
    expect(isExactInputQuoteWithinImpactLimit(result.quotedOutputCodec, result.withoutImpactCodec, '1')).toBe(false);
  });

  it.each([
    ['resized request', ['request', 'amountInCodec'], '1'],
    ['reversed request', ['request', 'assetIn'], XOR],
    ['wrong parent projection', ['context', 'parentHash'], hash(777)],
    ['wrong state projection', ['context', 'state', 'denominator'], '2'],
    ['wrong normalized output', ['quote', 'amountOutCodec'], '3'],
    ['wrong route projection', ['quote', 'route'], [XOR, KUSD]],
    ['wrong slippage projection', ['quote', 'slippageBps'], 100],
    ['wrong minimum', ['envelope', 'minimumCodec'], '1'],
    ['wrong envelope', ['envelope', 'envelopeHex'], '0x00'],
    ['wrong fee projection', ['fees', 'info', 'partialFeeCodec'], '8'],
    ['invented fill', ['observedFill'], true],
  ] as const)('rejects %s even with recomputed enclosing digests', (_label, path, replacement) => {
    const f = fixture();
    set(f.records.quote, path, replacement);
    f.refresh();
    expect(() => f.verify()).toThrow();
  });

  it.each([
    ['bounded fee amount', ['info', 'partialFeeCodec'], '12'],
    ['bounded details', ['details', 'finalFee'], '12'],
    ['bounded policy', ['receipt', 'envelope', 'policy', 'id'], 'changed'],
    ['bounded nonce', ['receipt', 'envelope', 'estimation', 'nonce'], '0'],
    ['bounded era', ['receipt', 'envelope', 'estimation', 'eraPeriod'], 128],
    ['bounded length', ['receipt', 'envelope', 'encodedLength'], 1],
    ['bounded original join', ['sourceBinding', 'originalEnvelopeSha256'], '0'.repeat(64)],
    ['bounded source amount', ['sourceBinding', 'request', 'amountInCodec'], '1'],
    ['bounded fee asset', ['receipt', 'feeAssetAddress'], KUSD],
    ['bounded query result', ['receipt', 'queries', 'info', 'resultHex'], '0x00'],
  ] as const)('rejects %s even with recomputed enclosing digests', (_label, path, replacement) => {
    const f = fixture();
    set(f.records.fee, path, replacement);
    f.refresh();
    expect(() => f.verify()).toThrow();
  });

  it.each([
    ['genesis', 0, ['result'], hash(1)],
    ['canonical block', 4, ['result'], hash(21)],
    ['selected header', 5, ['result', 'number'], '0x15'],
    ['parent height', 6, ['result', 'number'], '0x12'],
    ['runtime upgrade', 8, ['result', 'apis'], [['0x1234567812345678', 2]]],
    ['metadata upgrade', 10, ['result'], '0x0102'],
    ['timestamp storage', 11, ['result'], '0x0100000000000000'],
    ['denominator storage', 12, ['result'], '0x02000000000000000000000000000000'],
    ['wrong raw route', 16, ['result', 'route'], [XOR, KUSD]],
    ['output above baseline', 16, ['result', 'amount_without_impact'], '1'],
    ['pool fee wrong asset', 16, ['result', 'fee'], { [KUSD]: '1' }],
    ['zero output', 16, ['result', 'amount'], '0'],
    ['quote unavailable', 16, ['result'], null],
    ['fee mismatch', 18, ['result'], feeBytes(1, 4, 3)],
    ['RPC id', 16, ['id'], 99],
    ['RPC error', 16, ['error'], { code: 1 }],
  ] as const)('rejects corrupted %s raw response', (_label, index, path, replacement) => {
    const f = fixture();
    response(f.records.quote.rpcEvidence[index], path, replacement);
    f.refresh();
    expect(() => f.verify()).toThrow();
  });

  it.each([
    'exact-input',
    'route-filter',
    'fee-envelope',
    'fee-block',
    'fee-incomplete',
    'fee-bytes',
    'fee-params',
    'fee-mismatch',
    'fee-extra-response',
    'extra-call',
    'body-hash',
    'http',
    'fee-limit',
  ])('rejects raw request/receipt corruption: %s', (kind) => {
    const f = fixture();
    if (kind === 'exact-input') f.records.quote.rpcEvidence[16].params[3] = '1';
    if (kind === 'route-filter') f.records.quote.rpcEvidence[16].params[6] = 'Disabled';
    if (kind === 'fee-envelope') f.records.quote.rpcEvidence[17].params[1] = '0x00';
    if (kind === 'fee-block') f.records.fee.rpcEvidence[0].params[2] = hash(21);
    if (kind === 'fee-incomplete') f.records.fee.rpcEvidence[0].responseComplete = false;
    if (kind === 'fee-bytes') f.records.fee.rpcEvidence[0].retainedBytes = 1;
    if (kind === 'fee-params') f.records.fee.rpcEvidence[0].params[1] = f.records.quote.rpcEvidence[17].params[1];
    if (kind === 'fee-mismatch') response(f.records.fee.rpcEvidence[1], ['result'], feeBytes(1, 8, 3));
    if (kind === 'fee-extra-response') response(f.records.fee.rpcEvidence[0], ['extra'], true);
    if (kind === 'extra-call') f.records.quote.rpcEvidence.push(f.records.quote.rpcEvidence[0]);
    if (kind === 'body-hash') f.records.fee.rpcEvidence[0].responseSha256 = '0'.repeat(64);
    if (kind === 'http') f.records.quote.rpcEvidence[0].httpStatus = 502;
    if (kind === 'fee-limit') {
      f.records.fee.rpcEvidence[0].responseBody += ' '.repeat(65536);
      response(f.records.fee.rpcEvidence[0], ['padding'], 'x'.repeat(65536));
    }
    f.refresh();
    expect(() => f.verify()).toThrow();
  });

  it.each(['quote', 'fee', 'valuation', 'context-time', 'pending'])(
    'rejects broken original context %s joins',
    (kind) => {
      const f = fixture();
      if (kind === 'quote') f.records.context.quoteEvidenceSha256 = '0'.repeat(64);
      if (kind === 'fee') f.records.context.feeEvidenceSha256 = '0'.repeat(64);
      if (kind === 'valuation') f.records.context.valuationEvidenceSha256 = '0'.repeat(64);
      if (kind === 'context-time')
        set(f.records.context, ['context', 'captureStartedAtMs'], f.expected.valuation.captureStartedAtMs);
      if (kind === 'pending') set(f.records.context, ['pending', 'amountInCodec'], '1');
      f.refresh(false);
      expect(() => f.verify()).toThrow('context-join');
    }
  );

  it.each(['policy', 'cutoff', 'decision', 'stale', 'input', 'denominator', 'metadata', 'code-binding', 'name'])(
    'rejects changed trusted binding: %s',
    (kind) => {
      const f = fixture();
      if (kind === 'policy') f.expected.feePolicySha256 = '0'.repeat(64);
      if (kind === 'cutoff') f.expected.cutoffAtMs = 1_000_024;
      if (kind === 'decision') f.expected.decisionAtMs--;
      if (kind === 'stale') {
        f.expected.quoteAndFeeReadMs = 60000;
        f.expected.cutoffAtMs += 60000;
      }
      if (kind === 'input') f.expected.pending = { ...f.expected.pending, amountInCodec: '1' };
      if (kind === 'denominator') f.expected.pending = { ...f.expected.pending, expectedDenominator: '2' };
      if (kind === 'metadata') f.expected.valuation.runtimeProfile.metadataSha256 = '0'.repeat(64);
      if (kind === 'code-binding') f.expected.valuation.runtimeProfile.codeHash = hash(99);
      if (kind === 'name') f.expected.quote.name = 'quote-2.json';
      expect(() => f.verify()).toThrow();
    }
  );

  it('rejects unpinned acquisition timestamp changes without rewriting their original hashes', () => {
    const f = fixture();
    f.records.fee.rpcEvidence[0].requestedAt = '2026-01-01T00:00:00.000Z';
    expect(() => f.verify()).toThrow('value-hash');
  });

  it('rejects getters without running caller code', () => {
    const f = fixture(),
      getter = vi.fn();
    Object.defineProperty(f.expected, 'valuation', { enumerable: true, get: getter });
    expect(() => f.verify()).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});
