// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CAUSAL_GAP_INTERRUPTED_REGISTRATION,
  CONSERVATIVE_CONTINUATION_DEBIT,
  verifyCausalGapContinuationShard,
  verifyCausalGapContinuationPrefix,
  verifyCausalGapContinuationBlockLinks,
  mergeCausalGapContinuationHit,
  registerCausalGapContinuationReuse,
  openCausalGapContinuationReuse,
} from '../../../../scripts/bots/causal-gap-continuation-reuse';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import { createHistoricalGoalMarketReader } from '../../../../scripts/bots/historical-goal-market-reader';
import { HISTORICAL_EXECUTION_GENESIS as GENESIS } from '../../../../scripts/bots/historical-execution-codec';

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

/** Invented archive, explicitly injected into existing readers. The verifier never receives a transport. */
async function shardFixture(count = 2) {
  const fixture = createHistoricalPoolFixture();
  const source = {
    finalizedSource: { hash: hash(200), height: 200, receiptSha256: 'a'.repeat(64) },
    schemaAnchor: { hash: hash(100), height: 100 },
  };
  const identity = { ...fixture.identity, blockHash: hash(100) },
    keys = createHistoricalExecutionPoolCodec(identity).storageKeys();
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
  const fetcher = vi.fn<typeof fetch>(async (_url, options) => {
    const call = JSON.parse(String(options?.body)) as { id: number; method: string; params: unknown[] };
    let result: unknown;
    if (call.method === 'chain_getBlockHash') result = call.params[0] === 0 ? GENESIS : hash(Number(call.params[0]));
    else if (call.method === 'chain_getFinalizedHead') result = hash(220);
    else if (call.method === 'chain_getHeader') result = header(Number(BigInt(String(call.params[0]))));
    else if (call.method === 'state_getRuntimeVersion')
      result = { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130 };
    else if (call.method === 'state_getMetadata') result = identity.metadataHex;
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
    } else throw new Error(`Unexpected synthetic request ${call.method}`);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: call.id, result }), { status: 200 });
  });
  const reader = await createHistoricalGoalMarketReader(
    { source, expectedDenominator: DENOMINATOR },
    { fetch: fetcher }
  );
  for (let index = 0; index < count; index++) await reader.readMark(100 + index);
  await reader.readBlock(100 + count);
  return { source, context: reader.context, evidence: reader.evidence(), finalBlock: 100 + count };
}

function prefixFixture() {
  const candidates = ['momentum-breakout', 'rebound-from-discount', 'trend-pullback-accumulation'];
  const results = Array.from({ length: 12 }, (_, ordinal) =>
    candidates.map((candidate) => ({
      protocol: 'causal-goal-calibration-gap-v1',
      candidate,
      status: 'complete',
      diagnostics: [],
      signalsConsumed: 24,
      hourlyEquity: Array.from({ length: 25 }, (_, hour) => ({
        accountingAtMs: START + ordinal * 24 * HOUR + hour * HOUR,
      })),
      controlEquity: Array.from({ length: 25 }, () => ({})),
      observedFill: false,
      transactionSubmitted: false,
      qualificationAuthority: false,
    }))
  );
  return { results, gate: { ordinal: 0, candidates, resultsSha256: sha(canonical(results[0])) } };
}

describe('interrupted gap immutable continuation reuse', () => {
  it('salvages42complete original marks plus a complete block-only state without transport or invented timestamps', async () => {
    const fixture = await shardFixture(42),
      network = vi.fn(() => {
        throw new Error('no network');
      });
    vi.stubGlobal('fetch', network);
    const result = verifyCausalGapContinuationShard(
      fixture.source,
      fixture.context,
      [...fixture.evidence.blockEvidence],
      [...fixture.evidence.storageEvidence],
      true
    );
    expect(result.markets.size).toBe(42);
    expect(result.blocks.size).toBe(43);
    expect(result.blocks.get(142)?.block.timestampMs).toBe(START + 42 * 6000 + 3);
    expect(result.quarantinedBlockIndexes).toEqual([]);
    expect(result.quarantinedStorageIndexes).toEqual([]);
    expect(network).not.toHaveBeenCalled();
    expect(CONSERVATIVE_CONTINUATION_DEBIT).toEqual({
      warmupRequests: 0,
      marketShards: 7,
      quotes: 5,
      boundFees: 5,
      rpcRequests: 2482,
    });
  });

  it('quarantines only an explicitly incomplete final canonical group and preserves its complete prefix', async () => {
    const fixture = await shardFixture(),
      blockReceipts = clone(fixture.evidence.blockEvidence).slice(0, -2);
    const accepted = verifyCausalGapContinuationShard(
      fixture.source,
      fixture.context,
      blockReceipts,
      [...fixture.evidence.storageEvidence],
      true
    );
    expect(accepted.blocks.size).toBe(2);
    expect(accepted.markets.size).toBe(2);
    expect(accepted.quarantinedBlockIndexes).toEqual([18, 19]);
    expect(() =>
      verifyCausalGapContinuationShard(
        fixture.source,
        fixture.context,
        blockReceipts,
        [...fixture.evidence.storageEvidence],
        false
      )
    ).toThrow('nonterminal-block-tail');
    const pending = clone(blockReceipts.at(-1)!);
    for (const field of ['responseBody', 'responseSha256', 'httpStatus', 'completedAt'] as const) delete pending[field];
    blockReceipts[blockReceipts.length - 1] = pending;
    expect(
      verifyCausalGapContinuationShard(
        fixture.source,
        fixture.context,
        blockReceipts,
        [...fixture.evidence.storageEvidence],
        true
      ).quarantinedBlockIndexes
    ).toEqual([18, 19]);
  });

  it('rejects contradictory complete tail evidence instead of laundering it as interruption', async () => {
    const fixture = await shardFixture();
    for (const kind of ['digest', 'request', 'runtime', 'header', 'canonical'] as const) {
      const blocks = clone(fixture.evidence.blockEvidence).slice(0, -1),
        last = blocks.at(-1)!;
      if (kind === 'digest') last.responseBody += ' ';
      if (kind === 'request') last.params[1] = hash(199);
      if (kind === 'runtime') {
        const body = JSON.parse(last.responseBody!);
        body.result = hash(901);
        last.responseBody = JSON.stringify(body);
        last.responseSha256 = sha(last.responseBody);
      }
      if (kind === 'header') {
        const receipt = blocks.at(-2)!,
          body = JSON.parse(receipt.responseBody!);
        body.result.number = '0xffff';
        receipt.responseBody = JSON.stringify(body);
        receipt.responseSha256 = sha(receipt.responseBody);
      }
      if (kind === 'canonical') {
        blocks.splice(19);
        blocks[18].params = [100];
      }
      expect(() =>
        verifyCausalGapContinuationShard(
          fixture.source,
          fixture.context,
          blocks,
          [...fixture.evidence.storageEvidence],
          true
        )
      ).toThrow();
    }
  });

  it('quarantines absent trailing storage only and never accepts a complete wrong-state storage reply', async () => {
    const fixture = await shardFixture(),
      storage = clone(fixture.evidence.storageEvidence);
    const pending = storage.at(-1)!;
    for (const field of ['responseBody', 'responseSha256', 'httpStatus', 'completedAt'] as const) delete pending[field];
    const result = verifyCausalGapContinuationShard(
      fixture.source,
      fixture.context,
      [...fixture.evidence.blockEvidence],
      storage,
      true
    );
    expect(result.markets.size).toBe(1);
    expect(result.quarantinedStorageIndexes).toEqual([1]);
    const wrong = clone(fixture.evidence.storageEvidence),
      body = JSON.parse(wrong[1].responseBody!);
    body.result[0].block = hash(199);
    wrong[1].responseBody = JSON.stringify(body);
    wrong[1].responseSha256 = sha(wrong[1].responseBody);
    expect(() =>
      verifyCausalGapContinuationShard(
        fixture.source,
        fixture.context,
        [...fixture.evidence.blockEvidence],
        wrong,
        true
      )
    ).toThrow('storage-set');
  });

  it('merges identical provenance but rejects exact native-time, ancestry, quote and fee conflicts', () => {
    const value = { hash: hash(100), parentHash: hash(99), height: 100, timestampMs: START + 12003 };
    expect(
      mergeCausalGapContinuationHit(
        { value, files: ['reuse/prior/raw/a.json'] },
        { value: { ...value }, files: ['raw/b.json'] }
      )
    ).toEqual({ value, files: ['raw/b.json', 'reuse/prior/raw/a.json'] });
    for (const changed of [
      { ...value, timestampMs: START + 12000 },
      { ...value, parentHash: hash(98) },
      { ...value, hash: hash(101) },
    ])
      expect(() =>
        mergeCausalGapContinuationHit({ value, files: ['old'] }, { value: changed, files: ['new'] })
      ).toThrow('layered-identity-conflict');
    expect(() =>
      mergeCausalGapContinuationHit(
        { value: { quote: '7', fee: '1' }, files: ['old'] },
        { value: { quote: '8', fee: '1' }, files: ['new'] }
      )
    ).toThrow('layered-identity-conflict');
    expect(() =>
      mergeCausalGapContinuationHit(
        { value: { quote: '7', fee: '1' }, files: ['old'] },
        { value: { quote: '7', fee: '0' }, files: ['new'] }
      )
    ).toThrow('layered-identity-conflict');
  });

  it('checks old-layer successors and repeated hashes against new predecessors at exact native timestamps', () => {
    const previous = { height: 100, hash: hash(100), parentHash: hash(99), timestampMs: START + 12003 };
    const next = { height: 101, hash: hash(101), parentHash: hash(100), timestampMs: START + 18000 };
    expect(() => verifyCausalGapContinuationBlockLinks([next, previous, { ...next }])).not.toThrow();
    expect(() => verifyCausalGapContinuationBlockLinks([next, { ...previous, hash: hash(999) }])).toThrow(
      'cross-layer-ancestry'
    );
    expect(() =>
      verifyCausalGapContinuationBlockLinks([next, previous, { ...previous, timestampMs: START + 12000 }])
    ).toThrow('cross-layer-height');
    expect(() => verifyCausalGapContinuationBlockLinks([next, { ...previous, hash: next.hash }])).toThrow(
      'cross-layer-hash'
    );
  });

  it('requires all36prefix results, unchanged dates/identity and original first-episode digest', () => {
    const data = prefixFixture();
    expect(verifyCausalGapContinuationPrefix(data.results, data.gate)).toEqual(data.results);
    expect(() => verifyCausalGapContinuationPrefix(data.results.slice(1), data.gate)).toThrow('prefix-episode-count');
    const changed = clone(data.results);
    changed[11][2].hourlyEquity[0].accountingAtMs += HOUR;
    expect(() => verifyCausalGapContinuationPrefix(changed, data.gate)).toThrow('prefix-dates');
    const bad = clone(data.results);
    bad[0][0].status = 'incomplete';
    expect(() => verifyCausalGapContinuationPrefix(bad, data.gate)).toThrow('prefix-result');
    expect(() =>
      verifyCausalGapContinuationPrefix(data.results, { ...data.gate, resultsSha256: '0'.repeat(64) })
    ).toThrow('prefix-first-gate');
  });

  it('pins the interrupted registration without an override and rejects substituted manifests and symlinks', async () => {
    const directory = await mkdtemp(join(await realpath(tmpdir()), 'causal-gap-continuation-reuse-'));
    directories.push(directory);
    await writeFile(
      join(directory, 'registration.json'),
      JSON.stringify({
        body: { kind: 'causal-gap-calibration-registration-v1' },
        sha256: CAUSAL_GAP_INTERRUPTED_REGISTRATION,
      })
    );
    await expect(registerCausalGapContinuationReuse(directory)).rejects.toThrow('parent-registration');
    await expect(
      openCausalGapContinuationReuse(directory, {
        kind: 'causal-gap-continuation-reuse-manifest-v1',
        parentRegistrationSha256: CAUSAL_GAP_INTERRUPTED_REGISTRATION,
        files: [],
        sha256: '0'.repeat(64),
      })
    ).rejects.toThrow('manifest-digest');
    await symlink(join(directory, 'registration.json'), join(directory, 'linked.json'));
    await expect(registerCausalGapContinuationReuse(directory)).rejects.toThrow('file-symlink');
  });
});
