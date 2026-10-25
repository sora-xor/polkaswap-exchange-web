// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  verifyCausalGapMarketShard,
  verifyCausalGapWarmup,
  verifyCausalGapQuote,
  registerCausalGapReuse,
  openCausalGapReuse,
  CAUSAL_GAP_PRIOR_REGISTRATION,
} from '../../../../scripts/bots/causal-gap-reuse';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import { createHistoricalGoalMarketReader } from '../../../../scripts/bots/historical-goal-market-reader';
import { readHistoricalExecutionQuote } from '../../../../scripts/bots/historical-execution-reader';
import { readHistoricalGoalBoundFee } from '../../../../scripts/bots/historical-goal-bound-fee-reader';
import { readGoalQualificationHistory } from '../../../../scripts/bots/goal-qualification-history-reader';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import { feeBytes, createHistoricalFeeMetadataFixture } from './fixtures/historical-goal-bound-fee-fixture';

const START = Date.parse('2026-06-30T19:00:00Z'),
  HOUR = 3600000;
const DENOMINATOR = '100000000000000000000000000000000000000';
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
type Mutable<T> = T extends object ? { -readonly [P in keyof T]: Mutable<T[P]> } : T;
const clone = <T>(value: T): Mutable<T> => JSON.parse(JSON.stringify(value));
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const le = (value: bigint | number, bytes = 8) =>
  `0x${BigInt(value)
    .toString(16)
    .padStart(bytes * 2, '0')
    .match(/../g)!
    .reverse()
    .join('')}`;
const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

/** An invented archive passed only as an explicit mock to existing readers; global fetch is never used. */
async function priorFixture() {
  const fixture = createHistoricalPoolFixture();
  const source = {
    finalizedSource: { hash: hash(110), height: 110, receiptSha256: 'a'.repeat(64) },
    schemaAnchor: { hash: hash(100), height: 100 },
  };
  const identity = { ...fixture.identity, blockHash: hash(100) };
  const feeMetadata = createHistoricalFeeMetadataFixture();
  let activeMetadata = identity.metadataHex;
  const codec = createHistoricalExecutionPoolCodec(identity),
    keys = codec.storageKeys();
  const timestamp = (height: number) => START + (height - 100) * 6000 + 3;
  const proof = (height: number) => ({
    ...fixture.proof,
    denominator: le(BigInt(DENOMINATOR), 16),
    timestamp: le(timestamp(height)),
  });
  const header = (height: number) => ({
    number: `0x${height.toString(16)}`,
    parentHash: hash(height - 1),
    stateRoot: hash(800),
    extrinsicsRoot: hash(801),
    digest: { logs: [] },
  });
  const version = { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130, apis: [] };
  const fetcher = vi.fn<typeof fetch>(async (_url, options) => {
    const call = JSON.parse(String(options?.body)) as { id: number; method: string; params: unknown[] };
    let result: unknown;
    if (call.method === 'chain_getBlockHash') result = call.params[0] === 0 ? GENESIS : hash(Number(call.params[0]));
    else if (call.method === 'chain_getFinalizedHead') result = hash(120);
    else if (call.method === 'chain_getHeader') result = header(Number(BigInt(String(call.params[0]))));
    else if (call.method === 'state_getRuntimeVersion') result = version;
    else if (call.method === 'state_getMetadata') result = activeMetadata;
    else if (call.method === 'state_getStorageHash') result = hash(900);
    else if (call.method === 'state_getStorage') {
      const height = Number(BigInt(String(call.params[1]))),
        label = Object.entries(keys).find(([, key]) => key === call.params[0])![0] as keyof ReturnType<typeof proof>;
      result = proof(height)[label];
    } else if (call.method === 'state_queryStorageAt') {
      const height = Number(BigInt(String(call.params[1]))),
        values = proof(height);
      result = [
        {
          block: call.params[1],
          changes: Object.entries(keys).map(([label, key]) => [key, values[label as keyof typeof values]]),
        },
      ];
    } else if (call.method === 'liquidityProxy_quote')
      result = {
        amount: '1000000000000000000',
        amount_without_impact: '1000000000000000000',
        fee: { [XOR]: '100' },
        route: [KUSD, XOR],
        rewards: [],
      };
    else if (call.method === 'state_call')
      result =
        call.params[0] === 'TransactionPaymentApi_query_info'
          ? `0x${Buffer.from(fixture.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '6' }).toU8a()).toString('hex')}`
          : feeBytes(1, 2, 3);
    else throw new Error(`Unexpected synthetic method ${call.method}`);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: call.id, result }), { status: 200 });
  });
  const reader = await createHistoricalGoalMarketReader(
    { source, expectedDenominator: DENOMINATOR },
    { fetch: fetcher }
  );
  const market = await reader.readMark(100),
    blockOnly = await reader.readBlock(101);
  activeMetadata = feeMetadata.identity.metadataHex;
  const request = {
    block: { hash: hash(100), height: 100 },
    finalizedSource: source.finalizedSource,
    expectedDenominator: DENOMINATOR,
    assetIn: KUSD,
    assetOut: XOR,
    amountInCodec: '2500000000000000000',
  };
  const quote = await readHistoricalExecutionQuote(request, { fetch: fetcher });
  if (quote.kind !== 'hypothetical-historical-execution-estimate') throw new Error('Expected synthetic quote');
  const fee = await readHistoricalGoalBoundFee(
    {
      identity: { ...feeMetadata.identity, blockHash: hash(100) },
      blockNumber: 100,
      request: {
        assetIn: KUSD,
        assetOut: XOR,
        amountInCodec: request.amountInCodec,
        quotedAmountOutCodec: quote.quote.amountOutCodec,
      },
      quoteEvidence: quote,
    },
    { fetch: fetcher }
  );
  return {
    source,
    context: reader.context,
    evidence: reader.evidence(),
    market,
    blockOnly,
    quote,
    fee,
    key: sha(canonical(request)),
    fetcher,
  };
}
async function warmupFixture() {
  const input = { startAtMs: START - 13 * HOUR, endAtMs: START - HOUR, genesisHash: GENESIS, denominator: DENOMINATOR };
  return readGoalQualificationHistory(input, {
    fetch: vi.fn<typeof fetch>(async (_url, options) => {
      const request = JSON.parse(String(options?.body)),
        assetId = request.variables.filter.assetId.equalTo;
      const edges = Array.from({ length: 12 }, (_, index) => {
        const open = input.startAtMs / 1000 + index * 3600;
        return {
          node: {
            id: `asset-${assetId}-HOUR-${open}`,
            assetId,
            type: 'HOUR',
            timestamp: open + 3594,
            denominator: DENOMINATOR,
            closeEvidence: {
              kind: 'finalized-hour-close',
              genesisHash: GENESIS,
              completedAt: open + 3600,
              timestamp: open + 3594,
              blockHeight: 100 + index * 600,
              nextBlockHeight: 101 + index * 600,
              blockHash: hash(100 + index * 600),
              nextBlockHash: hash(101 + index * 600),
              nextTimestamp: open + 3600,
              requestedSymbol: assetId === XOR ? 'XOR' : 'KUSD',
              symbol: assetId === XOR ? 'XOR' : 'KUSD',
              decimals: 18,
              xorPool:
                assetId === XOR
                  ? null
                  : {
                      baseAssetId: XOR,
                      targetAssetId: KUSD,
                      baseDecimals: 18,
                      targetDecimals: 18,
                      baseAssetReserves: '3000000000000000000',
                      targetAssetReserves: '2000000000000000000',
                    },
            },
          },
        };
      });
      return new Response(
        JSON.stringify({ data: { assetSnapshots: { edges, pageInfo: { hasNextPage: false, endCursor: null } } } }),
        { status: 200 }
      );
    }),
  });
}

describe('receipt-only causal gap reuse', () => {
  it('reconstructs canonical blocks, native milliseconds, pools, exact quote and bounded fee without any transport', async () => {
    const data = await priorFixture(),
      fetcher = vi.fn(() => {
        throw Error('no network');
      });
    vi.stubGlobal('fetch', fetcher);
    const verified = verifyCausalGapMarketShard(
      data.source,
      data.context,
      [...data.evidence.blockEvidence],
      [...data.evidence.storageEvidence]
    );
    expect(verified.markets.get(100)?.value).toEqual(data.market);
    expect(verified.blocks.get(101)?.block).toEqual(data.blockOnly);
    expect(verified.blocks.get(100)!.block.timestampMs % 1000).toBe(3);
    const quote = verifyCausalGapQuote(data.key, data.quote, data.fee, data.source.finalizedSource);
    expect(quote.quote).toEqual(data.quote);
    expect(quote.fee).toEqual(data.fee);
    expect(quote.quote.rpcEvidence[0].requestedAt).toBe(data.quote.rpcEvidence[0].requestedAt);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('redecodes the two original exact warmup pages and rejects forged projection or changed scope', async () => {
    const original = await warmupFixture();
    vi.stubGlobal('fetch', () => {
      throw Error('no network');
    });
    expect(verifyCausalGapWarmup(original)).toEqual(original);
    const changed = clone(original);
    changed.history.history.candles[0].close = '999';
    expect(() => verifyCausalGapWarmup(changed)).toThrow('warmup-projection');
    const wrong = clone(original);
    const request = JSON.parse(wrong.rpcEvidence[0].requestBody);
    request.variables.filter.timestamp.lessThan += 3600;
    Object.assign(wrong.rpcEvidence[0], { requestBody: JSON.stringify(request) });
    expect(() => verifyCausalGapWarmup(wrong)).toThrow('warmup-scope');
  });

  it('rejects modified response bytes, rehashed wrong RPC identity, missing block proof and altered projection', async () => {
    const data = await priorFixture();
    for (const kind of ['bytes', 'id', 'params', 'missing'] as const) {
      const receipts = clone(data.evidence.blockEvidence) as Array<Record<string, unknown>>;
      if (kind === 'bytes') receipts[0].responseBody += ' ';
      if (kind === 'id') {
        const body = JSON.parse(String(receipts[0].responseBody));
        body.id = 2;
        receipts[0].responseBody = JSON.stringify(body);
        receipts[0].responseSha256 = sha(String(receipts[0].responseBody));
      }
      if (kind === 'params') receipts[10].params = [999];
      if (kind === 'missing') receipts.pop();
      expect(() =>
        verifyCausalGapMarketShard(data.source, data.context, receipts, [...data.evidence.storageEvidence])
      ).toThrow();
    }
    const context = clone(data.context);
    Object.assign(context, { finalizedObservation: { ...context.finalizedObservation, height: 121 } });
    expect(() =>
      verifyCausalGapMarketShard(
        data.source,
        context,
        [...data.evidence.blockEvidence],
        [...data.evidence.storageEvidence]
      )
    ).toThrow('shard-context');
  });

  it('rejects wrong cached input identity, forged quote/envelope and mismatched bounded-fee bytes', async () => {
    const data = await priorFixture();
    expect(() => verifyCausalGapQuote('f'.repeat(64), data.quote, data.fee, data.source.finalizedSource)).toThrow(
      'quote-key'
    );
    expect(() => verifyCausalGapQuote(data.key, data.quote, undefined, data.source.finalizedSource)).toThrow(
      'cached-bound-fee-coverage'
    );
    const quote = clone(data.quote);
    quote.envelope.minimumCodec = '1';
    expect(() => verifyCausalGapQuote(data.key, quote, data.fee, data.source.finalizedSource)).toThrow(
      'quote-projection'
    );
    const fee = clone(data.fee);
    Object.assign(fee.receipt, { envelope: { ...fee.receipt.envelope, minimumCodec: '1' } });
    expect(() => verifyCausalGapQuote(data.key, data.quote, fee, data.source.finalizedSource)).toThrow(
      'bound-fee-projection'
    );
    const wrong = clone(data.fee);
    Object.assign(wrong.rpcEvidence[0], { params: ['TransactionPaymentApi_query_info', '0x00', hash(100)] });
    expect(() => verifyCausalGapQuote(data.key, data.quote, wrong, data.source.finalizedSource)).toThrow('rpc-request');
  });

  it('retains a native excessive-impact quote without requiring an unrequested bound fee', async () => {
    const data = await priorFixture(),
      quote = clone(data.quote);
    quote.quote.amountWithoutImpactCodec = '2000000000000000000';
    (quote.quote.raw as { amount_without_impact: string }).amount_without_impact = quote.quote.amountWithoutImpactCodec;
    const receipt = quote.rpcEvidence.find((row) => row.method === 'liquidityProxy_quote')!;
    const body = JSON.parse(receipt.responseBody!);
    body.result.amount_without_impact = quote.quote.amountWithoutImpactCodec;
    receipt.responseBody = JSON.stringify(body);
    receipt.responseSha256 = sha(receipt.responseBody);
    expect(verifyCausalGapQuote(data.key, quote, undefined, data.source.finalizedSource).fee).toBeUndefined();
    expect(() => verifyCausalGapQuote(data.key, quote, data.fee, data.source.finalizedSource)).toThrow(
      'cached-bound-fee-coverage'
    );
  });

  it('pins the actual prior registration without an override and rejects manifest substitution and symlinks', async () => {
    const directory = await mkdtemp(join(await realpath(tmpdir()), 'causal-gap-reuse-'));
    directories.push(directory);
    await writeFile(
      join(directory, 'registration.json'),
      JSON.stringify({
        body: { kind: 'causal-goal-calibration-registration-v1' },
        sha256: CAUSAL_GAP_PRIOR_REGISTRATION,
      })
    );
    await expect(registerCausalGapReuse(directory)).rejects.toThrow('prior-registration');
    await expect(
      openCausalGapReuse(directory, {
        kind: 'causal-gap-reuse-manifest-v1',
        priorRegistrationSha256: CAUSAL_GAP_PRIOR_REGISTRATION,
        files: [],
        sha256: '0'.repeat(64),
      })
    ).rejects.toThrow('manifest-digest');
    await symlink(join(directory, 'registration.json'), join(directory, 'linked.json'));
    await expect(registerCausalGapReuse(directory)).rejects.toThrow('file-symlink');
  });
});
