// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import { createHistoricalGoalMarketReader } from '../../../../scripts/bots/historical-goal-market-reader';
import * as poolCodecs from '@/features/bot-trading/execution-codecs/pool';
import {
  verifyGoalBundleValuation,
  verifyGoalBundleOpening,
  verifyGoalBundleTerminal,
  getGoalBundleVerifiedMarketState,
  assertGoalBundleVerifiedMarketState,
  type GoalBundleValuationBinding,
} from '@/features/bot-trading/goal-bundle-market';
import { goalRawBytesSha256, goalRawEvidenceDigest } from '@/features/bot-trading/goal-raw-envelope';

vi.unmock('@polkadot/util-crypto');
const H = (byte: string) => `0x${byte.repeat(32)}`;
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
  params?: unknown[];
  keys?: string[];
  responseBody: string;
  responseSha256: string;
  [key: string]: unknown;
};
type Records = {
  schema: {
    context: Record<string, unknown>;
    evidence: { blockEvidence: Row[]; storageEvidence: Row[]; blockReads: number; markReads: number };
  };
  state: { schemaSha256: string; value: Record<string, unknown>; blockEvidence: Row[]; storageEvidence: Row[] };
  valuation: Record<string, unknown>;
};
let original: Records, binding: GoalBundleValuationBinding;

/** Use the real archive reader with invented RPC responses, then verify those original envelopes in browser code. */
beforeAll(async () => {
  const fixture = createHistoricalPoolFixture(),
    keys = poolCodecs.createHistoricalExecutionPoolCodec(fixture.identity).storageKeys();
  const hashes = new Map([
    [10, H('33')],
    [20, fixture.identity.blockHash],
    [100, H('44')],
    [110, H('55')],
  ]);
  const source = {
    finalizedSource: { hash: hashes.get(100)!, height: 100, receiptSha256: 'a'.repeat(64) },
    schemaAnchor: { hash: hashes.get(10)!, height: 10 },
  };
  const fetcher: typeof fetch = async (_url, init) => {
    const request = JSON.parse(String(init!.body)) as { id: number; method: string; params: unknown[] };
    const { method, params } = request;
    let result: unknown;
    if (method === 'chain_getBlockHash')
      result = params[0] === 0 ? fixture.identity.genesisHash : hashes.get(Number(params[0]));
    else if (method === 'chain_getFinalizedHead') result = hashes.get(110);
    else if (method === 'chain_getHeader') {
      const height = [...hashes].find(([, hash]) => hash === params[0])![0];
      result = {
        number: `0x${height.toString(16)}`,
        parentHash: `0x${(height - 1).toString(16).padStart(64, '0')}`,
        stateRoot: H('77'),
        extrinsicsRoot: H('88'),
        digest: { logs: [] },
      };
    } else if (method === 'state_getRuntimeVersion')
      result = { specName: 'sora-substrate', ...fixture.identity.runtimeVersion };
    else if (method === 'state_getStorageHash') result = H('66');
    else if (method === 'state_getMetadata') result = fixture.identity.metadataHex;
    else if (method === 'state_getStorage') result = fixture.proof.timestamp;
    else if (method === 'state_queryStorageAt')
      result = [
        {
          block: params[1],
          changes: Object.entries(keys).map(([label, key]) => [
            key,
            fixture.proof[label as keyof typeof fixture.proof],
          ]),
        },
      ];
    else throw Error('Unexpected synthetic request');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }), { status: 200 });
  };
  const market = await createHistoricalGoalMarketReader({ source, expectedDenominator: '1' }, { fetch: fetcher });
  const schema = JSON.parse(JSON.stringify({ context: market.context, evidence: market.evidence() }));
  const value = await market.readMark(20),
    evidence = market.evidence();
  const state = {
    schemaSha256: goalRawEvidenceDigest(schema),
    value,
    blockEvidence: evidence.blockEvidence.slice(10),
    storageEvidence: evidence.storageEvidence,
  };
  const profile = {
    ...fixture.identity.runtimeVersion,
    metadataSha256: market.context.schema.metadataSha256,
    codeHash: market.context.schema.codeHash,
  } as GoalBundleValuationBinding['runtimeProfiles'][number];
  const projection = {
    sourceManifestSha256: 'b'.repeat(64),
    genesisHash: fixture.identity.genesisHash,
    block: value.block,
    mark: { ...value.mark!, blockNumber: 20, denominator: '1' },
    runtimeProfile: profile,
    captureStartedAtMs: 1_000_005,
    receivedAtMs: 1_000_020,
  };
  const valuation = {
    ...projection,
    rawSha256: goalRawEvidenceDigest(state),
    timingKind: 'fixed-pinned-capture-delays-v1',
  };
  original = JSON.parse(JSON.stringify({ schema, state, valuation }));
  binding = {
    requestSha256: 'c'.repeat(64),
    sourceManifestSha256: projection.sourceManifestSha256,
    genesisHash: projection.genesisHash,
    denominator: '1',
    source,
    runtimeProfiles: [profile],
    block: value.block,
    captureStartedAtMs: projection.captureStartedAtMs,
    receivedAtMs: projection.receivedAtMs,
    timingKind: 'fixed-pinned-capture-delays-v1',
    schema: { name: 'market-schema-1.json', valueSha256: goalRawEvidenceDigest(schema) },
    state: { name: 'market-state-20.json', valueSha256: goalRawEvidenceDigest(state) },
    valuation: { name: 'valuation-1.json', valueSha256: goalRawEvidenceDigest(valuation) },
  };
});

function fixture() {
  const records: Records = JSON.parse(JSON.stringify(original)),
    expected: GoalBundleValuationBinding = JSON.parse(JSON.stringify(binding));
  const refresh = (joins = true) => {
    expected.schema.valueSha256 = goalRawEvidenceDigest(records.schema);
    if (joins) records.state.schemaSha256 = expected.schema.valueSha256;
    expected.state.valueSha256 = goalRawEvidenceDigest(records.state);
    if (joins) records.valuation.rawSha256 = expected.state.valueSha256;
    expected.valuation.valueSha256 = goalRawEvidenceDigest(records.valuation);
  };
  const envelope = (part: 'schema' | 'state' | 'valuation') =>
    new TextEncoder().encode(
      canonical({
        kind: 'goal-study-raw-evidence-v1',
        requestSha256: expected.requestSha256,
        name: expected[part].name,
        sha256: expected[part].valueSha256,
        value: records[part],
      }) + '\n'
    );
  const bytes = () => ({
    schemaBytes: envelope('schema'),
    stateBytes: envelope('state'),
    valuationBytes: envelope('valuation'),
  });
  return { records, expected, refresh, bytes, verify: () => verifyGoalBundleValuation(expected, bytes()) };
}
function response(row: Row, change: (result: Record<string, unknown>) => void) {
  const parsed = JSON.parse(row.responseBody);
  change(parsed);
  row.responseBody = JSON.stringify(parsed);
  row.responseSha256 = goalRawBytesSha256(new TextEncoder().encode(row.responseBody));
}

describe('immutable legacy schema decoder reuse', () => {
  it('reuses only the exact schema anchor and still constructs a block-bound codec on every mark', () => {
    const f = fixture(),
      bytes = f.bytes(),
      codec = vi.spyOn(poolCodecs, 'createHistoricalExecutionPoolCodec');
    try {
      const first = verifyGoalBundleValuation(f.expected, bytes);
      expect(codec).toHaveBeenCalledTimes(2);
      expect(codec.mock.calls.map(([identity]) => (identity as { blockHash: string }).blockHash)).toEqual([
        f.expected.source.schemaAnchor.hash,
        f.expected.block.hash,
      ]);
      const second = verifyGoalBundleValuation(f.expected, bytes);
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(codec).toHaveBeenCalledTimes(3);
      expect(codec).toHaveBeenLastCalledWith({
        genesisHash: f.expected.genesisHash,
        metadataHex: getGoalBundleVerifiedMarketState(first).sourceMetadataHex,
        runtimeVersion: { specVersion: 130, transactionVersion: 130 },
        blockHash: f.expected.block.hash,
      });
      expect(() => getGoalBundleVerifiedMarketState({ ...second })).toThrow('unverified-market-state');
      verifyGoalBundleValuation(f.expected, { ...bytes, schemaBytes: new Uint8Array(bytes.schemaBytes) });
      expect(codec).toHaveBeenCalledTimes(5);
    } finally {
      codec.mockRestore();
    }
  });

  it('rehashes a reused mutable schema buffer and cannot retain a valid result across tampering', () => {
    const f = fixture(),
      bytes = f.bytes(),
      originalBytes = new Uint8Array(bytes.schemaBytes);
    const originalMark = verifyGoalBundleValuation(f.expected, bytes);
    bytes.schemaBytes[0] = 32;
    expect(() => verifyGoalBundleValuation(f.expected, bytes)).toThrow();
    bytes.schemaBytes.set(originalBytes);
    expect(verifyGoalBundleValuation(f.expected, bytes)).toEqual(originalMark);
  });

  it('rechecks a repinned schema context in the same buffer and recovers only from restored valid bytes', () => {
    const f = fixture(),
      bytes = f.bytes(),
      originalBytes = new Uint8Array(bytes.schemaBytes),
      originalExpected = structuredClone(f.expected);
    const originalMark = verifyGoalBundleValuation(f.expected, bytes);
    f.records.schema.context.expectedDenominator = '2';
    f.refresh();
    const modified = f.bytes();
    expect(modified.schemaBytes.length).toBe(bytes.schemaBytes.length);
    bytes.schemaBytes.set(modified.schemaBytes);
    expect(() => verifyGoalBundleValuation(f.expected, { ...modified, schemaBytes: bytes.schemaBytes })).toThrow(
      'context'
    );
    bytes.schemaBytes.set(originalBytes);
    expect(verifyGoalBundleValuation(originalExpected, bytes)).toEqual(originalMark);
  });

  it.each(['request', 'schema-name', 'schema-digest', 'genesis', 'anchor', 'runtime', 'code', 'denominator'])(
    'does not transfer cached schema decoders across a changed trusted %s binding',
    (kind) => {
      const f = fixture(),
        bytes = f.bytes();
      verifyGoalBundleValuation(f.expected, bytes);
      if (kind === 'request') f.expected.requestSha256 = 'd'.repeat(64);
      if (kind === 'schema-name') f.expected.schema.name = 'market-schema-2.json';
      if (kind === 'schema-digest') f.expected.schema.valueSha256 = 'd'.repeat(64);
      if (kind === 'genesis') f.expected.genesisHash = H('ee');
      if (kind === 'anchor') f.expected.source.schemaAnchor.hash = H('ee');
      if (kind === 'runtime')
        f.expected.runtimeProfiles = [{ ...f.expected.runtimeProfiles[0], specVersion: 131, transactionVersion: 131 }];
      if (kind === 'code') f.expected.runtimeProfiles = [{ ...f.expected.runtimeProfiles[0], codeHash: H('ee') }];
      if (kind === 'denominator') f.expected.denominator = '2';
      expect(() => verifyGoalBundleValuation(f.expected, bytes)).toThrow();
    }
  );

  it.each(['runtime-code', 'block', 'timestamp', 'denominator', 'storage-keys', 'projection', 'response-hash'])(
    'checks current %s evidence after priming the immutable schema decoders',
    (kind) => {
      const f = fixture(),
        bytes = f.bytes();
      verifyGoalBundleValuation(f.expected, bytes);
      if (kind === 'runtime-code')
        response(f.records.state.blockEvidence[2], (p) => {
          p.result = H('ee');
        });
      if (kind === 'block')
        response(f.records.state.blockEvidence[0], (p) => {
          p.result = H('ee');
        });
      if (kind === 'timestamp')
        response(f.records.state.blockEvidence[3], (p) => {
          p.result = '0x0100000000000000';
        });
      if (kind === 'denominator')
        response(f.records.state.storageEvidence[0], (p) => {
          const result = (p.result as { changes: [string, string | null][] }[])[0];
          result.changes[1][1] = '0x02000000000000000000000000000000';
        });
      if (kind === 'storage-keys') f.records.state.storageEvidence[0].keys!.reverse();
      if (kind === 'projection') (f.records.state.value.mark as Record<string, unknown>).xorReserveCodec = '999';
      if (kind === 'response-hash') f.records.state.blockEvidence[0].responseSha256 = '0'.repeat(64);
      f.refresh();
      const modified = f.bytes();
      expect(modified.schemaBytes).toEqual(bytes.schemaBytes);
      expect(() => verifyGoalBundleValuation(f.expected, { ...modified, schemaBytes: bytes.schemaBytes })).toThrow();
    }
  );
});

describe('original browser market valuation verification', () => {
  it('owns original source bytes only for the actual verified mark, without changing its fields', () => {
    const f = fixture();
    const mark = f.verify();
    const state = getGoalBundleVerifiedMarketState(mark);
    expect(() => assertGoalBundleVerifiedMarketState(state)).not.toThrow();
    expect(state).toMatchObject({
      sourceBlock: mark.block,
      sourceMark: mark.mark,
      finalizedSource: f.expected.source.finalizedSource,
      genesisHash: mark.genesisHash,
      denominator: mark.mark.denominator,
      runtimeProfile: mark.runtimeProfile,
      sourceRawSha256: f.expected.state.valueSha256,
      requestSha256: f.expected.requestSha256,
      sourceManifestSha256: f.expected.sourceManifestSha256,
    });
    expect(state.sourceMetadataHex).toBe(createHistoricalPoolFixture().identity.metadataHex);
    expect(state.sourcePropertiesHex).toBe(createHistoricalPoolFixture().proof.properties);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.sourceMark)).toBe(true);
    expect(Object.isFrozen(state.finalizedSource)).toBe(true);
    expect(() => getGoalBundleVerifiedMarketState({ ...mark })).toThrow('unverified-market-state');
    expect(() => assertGoalBundleVerifiedMarketState({ ...state })).toThrow('unverified-market-state');
    expect(() => assertGoalBundleVerifiedMarketState(JSON.parse(JSON.stringify(state)))).toThrow(
      'unverified-market-state'
    );
    expect(() => getGoalBundleVerifiedMarketState(undefined)).toThrow('unverified-market-state');
  });

  it('verifies opening evidence explicitly while preserving strict valuation names', () => {
    const f = fixture();
    f.expected.valuation.name = 'opening.json';
    expect(verifyGoalBundleOpening(f.expected, f.bytes()).evidenceSha256).toBe(f.expected.valuation.valueSha256);
    expect(() => f.verify()).toThrow('names');
  });

  it('uses the original deadline for terminal age while preserving later receipt time', () => {
    const f = fixture();
    f.expected.valuation.name = 'terminal.json';
    f.expected.captureStartedAtMs = f.expected.block.timestampMs + 61000;
    f.expected.receivedAtMs = f.expected.block.timestampMs + 62000;
    Object.assign(f.records.valuation, {
      captureStartedAtMs: f.expected.captureStartedAtMs,
      receivedAtMs: f.expected.receivedAtMs,
    });
    f.refresh();
    const result = verifyGoalBundleTerminal(f.expected, f.bytes(), f.expected.block.timestampMs + 60000);
    expect(result.receivedAtMs).toBe(f.expected.receivedAtMs);
    expect(() => verifyGoalBundleTerminal(f.expected, f.bytes(), f.expected.block.timestampMs + 60001)).toThrow(
      'modeled-time'
    );
    expect(() => verifyGoalBundleTerminal(f.expected, f.bytes(), f.expected.block.timestampMs - 1)).toThrow(
      'modeled-time'
    );
    expect(() => f.verify()).toThrow('modeled-time');
  });

  it('reconstructs exact real-codec projections with the original canonical digest and no new acquisition', () => {
    const f = fixture(),
      fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw Error('network forbidden');
      });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw Error('fresh clock forbidden');
    });
    try {
      const result = f.verify();
      const { rawSha256: _raw, timingKind: _timing, ...projection } = original.valuation;
      expect(result).toEqual({ ...projection, evidenceSha256: binding.valuation.valueSha256 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.block)).toBe(true);
      expect(Object.isFrozen(result.mark)).toBe(true);
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      fetcher.mockRestore();
      now.mockRestore();
    }
  });

  it('reuses a pinned raw state for another causally timed valuation without rewriting raw timestamps', () => {
    const f = fixture();
    f.expected.valuation.name = 'valuation-2.json';
    f.expected.captureStartedAtMs += 1000;
    f.expected.receivedAtMs += 1000;
    Object.assign(f.records.valuation, {
      captureStartedAtMs: f.expected.captureStartedAtMs,
      receivedAtMs: f.expected.receivedAtMs,
    });
    f.refresh();
    expect(f.expected.state.valueSha256).toBe(binding.state.valueSha256);
    expect(f.verify().evidenceSha256).not.toBe(binding.valuation.valueSha256);
  });

  it.each([
    [
      'schema projection',
      (f: ReturnType<typeof fixture>) => {
        f.records.schema.context.observedFill = true;
      },
    ],
    [
      'raw normalized pool',
      (f: ReturnType<typeof fixture>) => {
        (f.records.state.value.poolEvidence as Record<string, unknown>).status = 'absent';
      },
    ],
    [
      'raw normalized mark',
      (f: ReturnType<typeof fixture>) => {
        (f.records.state.value.mark as Record<string, unknown>).xorReserveCodec = '999';
      },
    ],
    [
      'valuation projection',
      (f: ReturnType<typeof fixture>) => {
        (f.records.valuation.mark as Record<string, unknown>).denominator = '2';
      },
    ],
    [
      'request id',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockEvidence[0].id++;
      },
    ],
    [
      'request method',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockEvidence[0].method = 'chain_getFinalizedHead';
      },
    ],
    [
      'request params',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockEvidence[0].params = [21];
      },
    ],
    [
      'HTTP status',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockEvidence[0].httpStatus = 502;
      },
    ],
    [
      'response digest',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockEvidence[0].responseSha256 = '0'.repeat(64);
      },
    ],
    [
      'response id',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.state.blockEvidence[0], (p) => {
          p.id = 100;
        });
      },
    ],
    [
      'RPC error',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.state.blockEvidence[0], (p) => {
          p.error = {};
        });
      },
    ],
    [
      'finalized observation',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.schema.evidence.blockEvidence[2], (p) => {
          (p.result as Record<string, unknown>).number = '0x50';
        });
      },
    ],
    [
      'source canonical hash',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.schema.evidence.blockEvidence[3], (p) => {
          p.result = H('ee');
        });
      },
    ],
    [
      'schema canonical hash',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.schema.evidence.blockEvidence[5], (p) => {
          p.result = H('ee');
        });
      },
    ],
    [
      'runtime',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.schema.evidence.blockEvidence[7], (p) => {
          (p.result as Record<string, unknown>).transactionVersion = 131;
        });
      },
    ],
    [
      'runtime code',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.state.blockEvidence[2], (p) => {
          p.result = H('ee');
        });
      },
    ],
    [
      'SCALE trailing metadata',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.schema.evidence.blockEvidence[9], (p) => {
          p.result += '00';
        });
      },
    ],
    [
      'block header',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.state.blockEvidence[1], (p) => {
          (p.result as Record<string, unknown>).number = '0x15';
        });
      },
    ],
    [
      'block timestamp',
      (f: ReturnType<typeof fixture>) => {
        response(f.records.state.blockEvidence[3], (p) => {
          p.result = '0x0100000000000000';
        });
      },
    ],
    [
      'batch id bounds',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.storageEvidence[0].id = 65;
      },
    ],
    [
      'batch key order',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.storageEvidence[0].keys!.reverse();
      },
    ],
    [
      'batch block request',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.storageEvidence[0].blockHash = H('ee');
      },
    ],
    [
      'invalid acquisition time',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.storageEvidence[0].requestedAt = 'yesterday';
      },
    ],
    [
      'extra raw request',
      (f: ReturnType<typeof fixture>) => {
        f.records.state.blockEvidence.push(f.records.state.blockEvidence[0]);
      },
    ],
    [
      'claimed schema reads',
      (f: ReturnType<typeof fixture>) => {
        f.records.schema.evidence.markReads = 1;
      },
    ],
  ])('rejects %s even after every enclosing digest is recomputed', (_label, change) => {
    const f = fixture();
    change(f);
    f.refresh();
    expect(() => f.verify()).toThrow();
  });

  it.each([
    'duplicate-key',
    'missing-key',
    'wrong-block',
    'different-denominator',
    'different-timestamp',
    'zero-pool',
    'null-pool',
  ])('rejects raw seven-key corruption: %s', (kind) => {
    const f = fixture();
    response(f.records.state.storageEvidence[0], (parsed) => {
      const result = (parsed.result as { block: string; changes: [string, string | null][] }[])[0];
      if (kind === 'duplicate-key') result.changes[6] = result.changes[0];
      if (kind === 'missing-key') result.changes.pop();
      if (kind === 'wrong-block') result.block = H('ee');
      if (kind === 'different-denominator') result.changes[1][1] = '0x02000000000000000000000000000000';
      if (kind === 'different-timestamp') result.changes[0][1] = '0x0100000000000000';
      if (kind === 'zero-pool') result.changes[6][1] = `0x${'00'.repeat(32)}`;
      if (kind === 'null-pool') {
        result.changes[5][1] = null;
        result.changes[6][1] = null;
      }
    });
    f.refresh();
    expect(() => f.verify()).toThrow();
  });

  it.each(['schema', 'state'])('rejects a broken %s value-digest join', (part) => {
    const f = fixture();
    if (part === 'schema') f.records.state.schemaSha256 = '0'.repeat(64);
    else f.records.valuation.rawSha256 = '0'.repeat(64);
    f.refresh(false);
    expect(() => f.verify()).toThrow();
  });

  it.each(['profile', 'stale', 'before-block', 'reversed-time', 'wrong-genesis', 'wrong-name', 'after-finality'])(
    'rejects incorrect trusted binding: %s',
    (kind) => {
      const f = fixture();
      if (kind === 'profile') f.expected.runtimeProfiles = [{ ...f.expected.runtimeProfiles[0], codeHash: H('ee') }];
      if (kind === 'stale') f.expected.receivedAtMs = f.expected.block.timestampMs + 60001;
      if (kind === 'before-block') f.expected.captureStartedAtMs = f.expected.block.timestampMs - 1;
      if (kind === 'reversed-time') f.expected.receivedAtMs = f.expected.captureStartedAtMs - 1;
      if (kind === 'wrong-genesis') f.expected.genesisHash = H('ee');
      if (kind === 'wrong-name') f.expected.valuation.name = 'opening.json';
      if (kind === 'after-finality') f.expected.source.finalizedSource.height = 19;
      expect(() => f.verify()).toThrow();
    }
  );

  it('rejects getters in a binding without evaluating them', () => {
    const f = fixture(),
      getter = vi.fn(() => binding.block);
    Object.defineProperty(f.expected, 'block', { enumerable: true, get: getter });
    expect(() => f.verify()).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('detects timestamp tampering under the originally pinned value hash', () => {
    const f = fixture();
    f.records.state.storageEvidence[0].requestedAt = '2026-01-01T00:00:00.000Z';
    expect(() => f.verify()).toThrow('value-hash');
  });

  it('rejects inconsistent repeated header identities in the original schema calls', () => {
    const f = fixture();
    response(f.records.schema.evidence.blockEvidence[1], (p) => {
      p.result = H('44');
    });
    f.records.schema.evidence.blockEvidence[2].params = [H('44')];
    response(f.records.schema.evidence.blockEvidence[2], (p) => {
      const header = p.result as Record<string, unknown>;
      header.number = '0x64';
      header.parentHash = `0x${(99).toString(16).padStart(64, '0')}`;
      header.stateRoot = H('ee');
    });
    f.refresh();
    expect(() => f.verify()).toThrow('header-identity');
  });

  it('checks parent linkage when the selected state is adjacent to the schema anchor', () => {
    const f = fixture();
    f.expected.source.schemaAnchor.height = 19;
    f.records.schema.evidence.blockEvidence[5].params = [19];
    response(f.records.schema.evidence.blockEvidence[6], (p) => {
      (p.result as Record<string, unknown>).number = '0x13';
    });
    f.records.schema.context.schemaAnchor = f.expected.source.schemaAnchor;
    f.refresh();
    expect(() => f.verify()).toThrow('header-link');
  });

  it('rejects a response beyond the original per-request byte limit', () => {
    const f = fixture(),
      row = f.records.state.blockEvidence[0];
    row.responseBody += ' '.repeat(2 * 1024 * 1024);
    row.responseSha256 = goalRawBytesSha256(new TextEncoder().encode(row.responseBody));
    f.refresh();
    expect(() => f.verify()).toThrow('response-hash');
  });

  it('accepts the final bounded shard slot without inventing missing prior records', () => {
    const f = fixture();
    f.records.state.storageEvidence[0].id = 64;
    response(f.records.state.storageEvidence[0], (p) => {
      p.id = 64;
    });
    f.records.state.blockEvidence.forEach((row, index) => {
      row.id = 263 + index;
      response(row, (p) => {
        p.id = row.id;
      });
    });
    f.refresh();
    expect(f.verify().block).toEqual(binding.block);
  });
});

/** Warm schema ownership never replaces raw proof decoding or source-envelope authentication. */
describe('prepared pool decoder market evidence', () => {
  it('decodes changed valid raw reserves after priming and still rejects inconsistent projections', () => {
    const f = fixture(),
      bytes = f.bytes();
    const first = verifyGoalBundleValuation(f.expected, bytes);
    response(f.records.state.storageEvidence[0], (p) => {
      const result = (p.result as { changes: [string, string | null][] }[])[0];
      result.changes[6][1] = `0x07${'00'.repeat(15)}05${'00'.repeat(15)}`;
    });
    const pool = f.records.state.value.poolEvidence as Record<string, unknown>;
    Object.assign(pool, {
      reserves: { xorCodec: '7', kusdCodec: '5' },
      marks: {
        xorPerKusd: { numeratorCodec: '7', denominatorCodec: '5' },
        kusdPerXor: { numeratorCodec: '5', denominatorCodec: '7' },
      },
    });
    Object.assign(f.records.state.value.mark as Record<string, unknown>, {
      xorReserveCodec: '7',
      kusdReserveCodec: '5',
    });
    Object.assign(f.records.valuation.mark as Record<string, unknown>, { xorReserveCodec: '7', kusdReserveCodec: '5' });
    f.refresh();
    const changed = f.bytes();
    expect(changed.schemaBytes).toEqual(bytes.schemaBytes);
    const second = verifyGoalBundleValuation(f.expected, { ...changed, schemaBytes: bytes.schemaBytes });
    expect(second.mark.xorReserveCodec).toBe('7');
    expect(second.mark.kusdReserveCodec).toBe('5');
    expect(first.mark.xorReserveCodec).toBe('3000000000000000000');
    expect(second).not.toBe(first);
    expect(getGoalBundleVerifiedMarketState(second).sourceRawSha256).toBe(f.expected.state.valueSha256);
    expect(() => getGoalBundleVerifiedMarketState({ ...second })).toThrow('unverified-market-state');
    response(f.records.state.storageEvidence[0], (p) => {
      const result = (p.result as { changes: [string, string | null][] }[])[0];
      result.changes[6][1] = `0x09${'00'.repeat(15)}05${'00'.repeat(15)}`;
    });
    f.refresh();
    expect(() => verifyGoalBundleValuation(f.expected, { ...f.bytes(), schemaBytes: bytes.schemaBytes })).toThrow(
      'state-projection'
    );
    expect(second.mark.xorReserveCodec).toBe('7');
    expect(first.mark.xorReserveCodec).toBe('3000000000000000000');
  });

  it('rehashes changed raw metadata in the primed schema buffer even when envelope joins are resealed', () => {
    const f = fixture(),
      bytes = f.bytes();
    const first = verifyGoalBundleValuation(f.expected, bytes);
    const savedBytes = new Uint8Array(bytes.schemaBytes),
      savedExpected = structuredClone(f.expected);
    response(f.records.schema.evidence.blockEvidence[9], (p) => {
      const metadata = p.result as string;
      const lastByte = (Number.parseInt(metadata.slice(-2), 16) ^ 1).toString(16).padStart(2, '0');
      p.result = metadata.slice(0, -2) + lastByte;
    });
    f.refresh();
    const changed = f.bytes();
    expect(changed.schemaBytes.length).toBe(bytes.schemaBytes.length);
    bytes.schemaBytes.set(changed.schemaBytes);
    expect(() => verifyGoalBundleValuation(f.expected, { ...changed, schemaBytes: bytes.schemaBytes })).toThrow();
    bytes.schemaBytes.set(savedBytes);
    expect(verifyGoalBundleValuation(savedExpected, bytes)).toEqual(first);
  });
});
