import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  hashEvidence,
  type ExecutionContext,
  type ExecutionRawQuote,
} from '../../../../scripts/bots/execution-evidence';
import type { ExecutionReader } from '../../../../scripts/bots/execution-reader';
import * as sessionModule from '../../../../scripts/bots/execution-session';
import type { ExecutionSessionOutcome } from '../../../../scripts/bots/execution-session';
import * as storeModule from '../../../../scripts/bots/execution-store';
import type { FrozenExecutionLot } from '../../../../scripts/bots/execution-store';

const rpc = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('../../../../scripts/bots/execution-rpc', () => ({
  EXECUTION_ESTIMATION_ASSUMPTIONS: { nonce: 0, signature: 'public fake' },
  openExecutionReader: rpc.connect,
}));
import {
  EXECUTION_SESSION_TIMING_POLICY,
  EXECUTION_SESSION_TRANSPORT_POLICY,
  executionSessionSourceHashes,
  openGuardedExecutionSessionReader,
  parseExecutionSessionArguments,
  runExecutionSessionCollector,
  validateExecutionSessionManifest,
  validateExecutionSessionOutcome,
  type ExecutionSessionManifest,
} from '../../../../scripts/bots/collect-execution-session';

const NOW = Date.parse('2026-09-20T00:00:00.000Z');
const HASH = `0x${'ab'.repeat(32)}`;
const directories: string[] = [];
const context: ExecutionContext = {
  endpoint: EXECUTION_EVIDENCE_ENDPOINT,
  genesisHash: EXECUTION_EVIDENCE_GENESIS,
  blockHash: HASH,
  blockNumber: 100,
  finalizedAt: NOW,
  denominator: '1',
  specVersion: 131,
  transactionVersion: 3,
  metadataHashAlgorithm: 'sha256',
  metadataHash: 'a'.repeat(64),
  metadataFormatVersion: 16,
  metadataReadMethod: 'Metadata_metadata_at_version',
  dexId: 0,
  allowedSourceTypes: ['XYKPool'],
  filterMode: 'AllowSelected',
  poolIdentity: 'exact-pool',
};

/** Complete synthetic fee/quote responses; the only RPC factory in this suite is mocked. */
function reader(): ExecutionReader {
  return {
    context: vi.fn(async () => ({ ...context })),
    quote: vi.fn(
      async (
        quoteContext: ExecutionContext,
        assetIn: string,
        assetOut: string,
        amountInCodec: string
      ): Promise<ExecutionRawQuote> => ({
        blockHash: quoteContext.blockHash,
        assetIn,
        assetOut,
        assetInDecimals: 18,
        assetOutDecimals: 18,
        amountInCodec,
        amountOutCodec: '1000000000000000000',
        amountWithoutImpactCodec: '1010000000000000000',
        route: [assetIn, assetOut],
        routeFees: [],
        rawQuoteJson: {
          amount: '1000000000000000000',
          amountWithoutImpact: '1010000000000000000',
          route: [assetIn, assetOut],
          fee: {},
        },
        fee: {
          partialFeeCodec: '3',
          baseFeeCodec: '1',
          lenFeeCodec: '1',
          adjustedWeightFeeCodec: '1',
          tipCodec: '0',
          encodedLength: 208,
          callHex: '0x01020304',
          envelopeHashAlgorithm: 'sha256',
          envelopeHash: 'e'.repeat(64),
          blockHash: quoteContext.blockHash,
          runtimeVersion: { specVersion: 131, transactionVersion: 3 },
          rawQueryInfo: { partialFee: '3' },
          rawFeeDetails: { inclusionFee: { baseFee: 1, lenFee: 1, adjustedWeightFee: 1 }, tip: 0 },
        },
      })
    ),
    assertUnchanged: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
}

function fixedLot(): FrozenExecutionLot {
  const identity = {
    sourceManifestHash: 'a'.repeat(64),
    sourceRecordHash: 'b'.repeat(64),
    sourceSlotAt: NOW - 2000,
  };
  return {
    ...identity,
    amountCodec: '9007199254740993001',
    frozenAt: NOW,
    lotId: hashEvidence(identity),
    sourceReceivedAt: NOW - 1000,
    sourceDenominator: context.denominator,
    sourceBlockNumber: context.blockNumber,
    sourceBlockHash: context.blockHash,
    sourceFinalizedAt: NOW - 2000,
  };
}

function manifest(): ExecutionSessionManifest {
  return {
    ...storeModule.createExecutionManifest(
      { startAt: NOW, slots: 1, cadenceMs: 30000 },
      {
        'scripts/bots/collect-execution-session.ts': 'a'.repeat(64),
        'scripts/bots/execution-session.ts': 'b'.repeat(64),
      },
      { nonce: 0, signature: 'public fake' },
      NOW
    ),
    transportPolicy: EXECUTION_SESSION_TRANSPORT_POLICY,
    timingPolicy: EXECUTION_SESSION_TIMING_POLICY,
  };
}

async function directory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'execution-session-cli-'));
  directories.push(path);
  return path;
}

function args(path: string, slots = 1): string[] {
  return ['--out', path, '--start', new Date(NOW).toISOString(), '--slots', String(slots), '--cadence-ms', '30000'];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  rpc.connect.mockRejectedValue(new Error('offline fixture'));
});
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  rpc.connect.mockReset();
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('exclusive-session collector identity', () => {
  it('preserves explicit schedule, resume and retained-lot parsing without protocol overrides', () => {
    expect(parseExecutionSessionArguments(args('output/new'))).toMatchObject({
      resume: false,
      startAt: NOW,
      slots: 1,
      cadenceMs: 30000,
    });
    expect(parseExecutionSessionArguments(['--out', 'output/new', '--resume'])).toMatchObject({ resume: true });
    expect(
      parseExecutionSessionArguments([...args('output/new'), '--lot-from', 'output/prior', '--lot-slot', '0'])
    ).toMatchObject({ lotSource: { directory: expect.stringContaining('/output/prior'), slot: 0 } });
    for (const extra of [['--transport', 'reuse'], ['--deadline-ms', '90000'], ['--resume'], ['--lot-slot', '0']])
      expect(() => parseExecutionSessionArguments([...args('output/new'), ...extra])).toThrow();
  });

  it('hashes existing frozen dependencies and both new implementations, deterministically', async () => {
    const hashes = await executionSessionSourceHashes();
    for (const path of [
      'package.json',
      'yarn.lock',
      'scripts/bots/collect-execution-quotes.ts',
      'scripts/bots/execution-reader.ts',
      'scripts/bots/collect-execution-session.ts',
      'scripts/bots/execution-session.ts',
    ])
      expect(hashes[path]).toBe(
        createHash('sha256')
          .update(await readFile(path))
          .digest('hex')
      );
    expect(hashes['src/lib/substrate/type-definitions/liquidityProxy.ts']).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(hashes)).toEqual(Object.keys(hashes).sort());
    expect(await executionSessionSourceHashes()).toEqual(hashes);
  });

  it('requires explicit session protocol declarations and preserves them through the base validator', () => {
    const original = manifest();
    const checked = validateExecutionSessionManifest(original);
    expect(checked).toEqual(original);
    expect(checked).not.toBe(original);
    expect(storeModule.validateExecutionManifest(checked)).toMatchObject({
      transportPolicy: EXECUTION_SESSION_TRANSPORT_POLICY,
      timingPolicy: EXECUTION_SESSION_TIMING_POLICY,
      deadlineMs: 25000,
      maxStartDelayMs: 5000,
    });
  });

  it.each([
    ['transportPolicy', undefined],
    ['transportPolicy', 'connect-each-slot'],
    ['timingPolicy', undefined],
    ['timingPolicy', 'wire-rpc-intervals'],
    ['quoteTiming', undefined],
    ['deadlineMs', 30000],
    ['maxStartDelayMs', 6000],
  ])('rejects a missing or altered policy %s=%s', (key, value) => {
    const changed = { ...manifest() } as unknown as Record<string, unknown>;
    if (value === undefined) delete changed[key];
    else changed[key] = value;
    expect(() => validateExecutionSessionManifest(changed as unknown as ExecutionSessionManifest)).toThrow();
  });

  it.each(['scripts/bots/collect-execution-session.ts', 'scripts/bots/execution-session.ts'])(
    'rejects a missing session source hash %s',
    (path) => {
      const changed = manifest();
      delete changed.sourceHashes[path];
      expect(() => validateExecutionSessionManifest(changed)).toThrow('source identity');
    }
  );
});

describe('exclusive-session runner lifecycle', () => {
  it('persists policies before connecting and retains failure instrumentation unchanged', async () => {
    const path = await directory();
    rpc.connect.mockImplementation(async () => {
      const frozen = JSON.parse(await readFile(join(path, 'manifest.json'), 'utf8'));
      expect(frozen).toMatchObject({
        transportPolicy: EXECUTION_SESSION_TRANSPORT_POLICY,
        timingPolicy: EXECUTION_SESSION_TIMING_POLICY,
      });
      throw new Error('offline fixture');
    });
    await runExecutionSessionCollector(args(path));
    const record = JSON.parse(await readFile(join(path, 'observations.jsonl'), 'utf8'));
    expect(record).toMatchObject({
      status: 'error',
      message: 'offline fixture',
      progress: { stage: 'connect', connectionId: 1, reusedConnection: false },
    });
    expect(record.progress.operations).toContainEqual(
      expect.objectContaining({ operation: 'connect', status: 'error' })
    );
    await expect(readFile(join(path, '.collector.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('retains successful reader-operation intervals alongside existing quote timing', async () => {
    const path = await directory();
    const transport = reader();
    rpc.connect.mockResolvedValue(transport);
    await runExecutionSessionCollector(args(path));
    const record = JSON.parse(await readFile(join(path, 'observations.jsonl'), 'utf8'));
    expect(record.status).toBe('complete');
    expect(record.snapshot.readerTiming).toMatchObject({ connectionId: 1, reusedConnection: false });
    expect(
      record.snapshot.readerTiming.operations.map((operation: { operation: string }) => operation.operation)
    ).toEqual(['connect', 'context', 'buy', 'sell', 'continuity']);
    expect(record.snapshot.quoteTiming.buy).toEqual({ startedAt: NOW, finishedAt: NOW });
    expect(transport.close).toHaveBeenCalledTimes(1);
  });

  it('reuses one healthy reader while collecting a fresh finalized context for each slot', async () => {
    const path = await directory();
    const transport = reader();
    vi.mocked(transport.context)
      .mockResolvedValueOnce(context)
      .mockResolvedValueOnce({
        ...context,
        blockNumber: 101,
        blockHash: `0x${'cd'.repeat(32)}`,
        finalizedAt: NOW + 30000,
      });
    rpc.connect.mockResolvedValue(transport);
    const open = storeModule.openExecutionStore;
    vi.spyOn(storeModule, 'openExecutionStore').mockImplementationOnce(async (...values) => {
      const store = await open(...values);
      return {
        get manifest() {
          return store.manifest;
        },
        get records() {
          return store.records;
        },
        async append(...values) {
          const record = await store.append(...values);
          vi.setSystemTime(NOW + 30000);
          return record;
        },
        close: () => store.close(),
      };
    });
    await runExecutionSessionCollector(args(path, 2));
    const records = (await readFile(join(path, 'observations.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records.map((record) => record.status)).toEqual(['complete', 'complete']);
    expect(records.map((record) => record.snapshot.context.blockNumber)).toEqual([100, 101]);
    expect(records.map((record) => record.snapshot.readerTiming.connectionId)).toEqual([1, 1]);
    expect(records.map((record) => record.snapshot.readerTiming.reusedConnection)).toEqual([false, true]);
    expect(rpc.connect).toHaveBeenCalledTimes(1);
    expect(transport.context).toHaveBeenCalledTimes(2);
    expect(transport.quote).toHaveBeenCalledTimes(4);
    expect(transport.assertUnchanged).toHaveBeenCalledTimes(2);
    expect(transport.close).toHaveBeenCalledTimes(1);
  });

  it('appends overdue slots once without reconnecting or trying later favorable observations', async () => {
    const path = await directory();
    rpc.connect.mockImplementation(async () => {
      vi.setSystemTime(NOW + 65001);
      throw new Error('late offline fixture');
    });
    await runExecutionSessionCollector(args(path, 3));
    const journal = (await readFile(join(path, 'observations.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(journal.map((record) => record.status)).toEqual(['error', 'missed', 'missed']);
    expect(journal.map((record) => record.slotAt)).toEqual([NOW, NOW + 30000, NOW + 60000]);
    expect(rpc.connect).toHaveBeenCalledTimes(1);
    const original = await readFile(join(path, 'observations.jsonl'), 'utf8');
    const create = vi.spyOn(sessionModule, 'createExecutionSession');
    await runExecutionSessionCollector(['--out', path, '--resume']);
    expect(create).not.toHaveBeenCalled();
    expect(await readFile(join(path, 'observations.jsonl'), 'utf8')).toBe(original);
  });

  it.each(['source', 'fee', 'transport', 'timing'])(
    'rejects changed %s identity before opening a reader',
    async (identity) => {
      const path = await directory();
      await runExecutionSessionCollector(args(path));
      const filename = join(path, 'manifest.json');
      const frozen = JSON.parse(await readFile(filename, 'utf8'));
      if (identity === 'source') frozen.sourceHashes['scripts/bots/execution-session.ts'] = 'f'.repeat(64);
      if (identity === 'fee') frozen.feeAssumptions.nonce = 1;
      if (identity === 'transport') frozen.transportPolicy = 'connect-each-slot';
      if (identity === 'timing') frozen.timingPolicy = 'wire-rpc-intervals';
      await writeFile(filename, JSON.stringify(frozen));
      await expect(runExecutionSessionCollector(['--out', path, '--resume'])).rejects.toThrow();
      expect(rpc.connect).toHaveBeenCalledTimes(1);
      await expect(readFile(join(path, '.collector.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
    }
  );

  it.each(['collection', 'append'])('closes the session and dataset lock when %s fails', async (failure) => {
    const path = await directory();
    const original = storeModule.openExecutionStore;
    const closeSession = vi.fn(async () => undefined);
    vi.spyOn(sessionModule, 'createExecutionSession').mockReturnValue({
      collect: vi.fn(async () => {
        if (failure === 'collection') throw new Error('collection fixture');
        return {
          status: 'error' as const,
          code: 'observation' as const,
          message: 'fixture',
          progress: { stage: 'connect' as const, connectionId: 1, reusedConnection: false, operations: [] },
        };
      }),
      close: closeSession,
    });
    vi.spyOn(storeModule, 'openExecutionStore').mockImplementationOnce(async (...values) => {
      const store = await original(...values);
      return {
        ...store,
        append: vi.fn(async () => {
          throw new Error('append fixture');
        }),
      };
    });
    await expect(runExecutionSessionCollector(args(path))).rejects.toThrow(`${failure} fixture`);
    expect(closeSession).toHaveBeenCalledTimes(1);
    await expect(readFile(join(path, '.collector.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('releases the dataset lock even if closing the session fails', async () => {
    const path = await directory();
    vi.spyOn(sessionModule, 'createExecutionSession').mockReturnValue({
      collect: vi.fn(async () => ({
        status: 'error' as const,
        code: 'observation' as const,
        message: 'fixture',
        progress: { stage: 'connect' as const, connectionId: 1, reusedConnection: false, operations: [] },
      })),
      close: vi.fn(async () => {
        throw new Error('close fixture');
      }),
    });
    await expect(runExecutionSessionCollector(args(path))).rejects.toThrow('close fixture');
    await expect(readFile(join(path, '.collector.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('releases the dataset lock when session construction fails', async () => {
    const path = await directory();
    vi.spyOn(sessionModule, 'createExecutionSession').mockImplementation(() => {
      throw new Error('factory fixture');
    });
    await expect(runExecutionSessionCollector(args(path))).rejects.toThrow('factory fixture');
    await expect(readFile(join(path, '.collector.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('freezes a prior lot and records incompatible context as an error instead of losing the slot', async () => {
    const path = await directory();
    const prior = await directory();
    const lot = fixedLot();
    const load = vi.spyOn(storeModule, 'loadFrozenExecutionLot').mockResolvedValue(lot);
    const transport = reader();
    vi.mocked(transport.context).mockResolvedValue({ ...context, denominator: '100' });
    rpc.connect.mockResolvedValue(transport);
    await runExecutionSessionCollector([...args(path), '--lot-from', prior, '--lot-slot', '0']);
    expect(load).toHaveBeenCalledWith(prior, 0, NOW);
    const frozen = JSON.parse(await readFile(join(path, 'manifest.json'), 'utf8'));
    expect(frozen.fixedReverseLot).toEqual(lot);
    const record = JSON.parse(await readFile(join(path, 'observations.jsonl'), 'utf8'));
    expect(record).toMatchObject({
      status: 'error',
      code: 'observation',
      message: 'Retained lot source state or denomination changed',
      progress: { stage: 'context' },
    });
    expect(transport.quote).not.toHaveBeenCalled();
    expect(transport.close).toHaveBeenCalledTimes(1);
  });

  it('rejects missing session instrumentation on resume even if the base journal hash is valid', async () => {
    const path = await directory();
    rpc.connect.mockResolvedValue(reader());
    await runExecutionSessionCollector(args(path));
    const filename = join(path, 'observations.jsonl');
    const record = JSON.parse(await readFile(filename, 'utf8'));
    delete record.snapshot.readerTiming;
    const { recordHash: _recordHash, ...body } = record;
    await writeFile(filename, JSON.stringify({ ...body, recordHash: hashEvidence(body) }) + '\n');
    await expect(runExecutionSessionCollector(['--out', path, '--resume'])).rejects.toThrow('reader timing');
    expect(rpc.connect).toHaveBeenCalledTimes(1);
    await expect(readFile(join(path, '.collector.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects malformed session instrumentation before appending an outcome', async () => {
    const path = await directory();
    const close = vi.fn(async () => undefined);
    vi.spyOn(sessionModule, 'createExecutionSession').mockReturnValue({
      collect: vi.fn(async () => ({
        status: 'error' as const,
        code: 'observation' as const,
        message: 'fixture',
        progress: { stage: 'connect' as const, connectionId: 0, reusedConnection: false, operations: [] },
      })),
      close,
    });
    await expect(runExecutionSessionCollector(args(path))).rejects.toThrow('reader timing');
    await expect(readFile(join(path, 'observations.jsonl'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('retained-lot reader context', () => {
  it('preserves the raw reader when no retained lot is configured', async () => {
    const transport = reader();
    rpc.connect.mockResolvedValue(transport);
    const signal = new AbortController().signal;
    expect(await openGuardedExecutionSessionReader(signal)).toBe(transport);
    expect(rpc.connect).toHaveBeenCalledWith(signal);
  });

  it('detaches retained-lot identity before opening and ignores later caller mutations', async () => {
    const lot = fixedLot();
    const transport = reader();
    rpc.connect.mockImplementation(async () => {
      lot.sourceDenominator = '100';
      lot.sourceBlockNumber = 10000;
      return transport;
    });
    const guarded = await openGuardedExecutionSessionReader(new AbortController().signal, lot);
    expect(await guarded.context()).toEqual(context);
    lot.sourceBlockHash = `0x${'ef'.repeat(32)}`;
    lot.sourceFinalizedAt = NOW + 10000;
    expect(await guarded.context()).toEqual(context);
  });

  it.each([
    { denominator: '100' },
    { blockNumber: 99 },
    { finalizedAt: NOW - 3000 },
    { blockHash: `0x${'ef'.repeat(32)}` },
  ])('rejects fixed-lot source context changes before quote calls: %j', async (change) => {
    const transport = reader();
    vi.mocked(transport.context).mockResolvedValue({ ...context, ...change });
    rpc.connect.mockResolvedValue(transport);
    const guarded = await openGuardedExecutionSessionReader(new AbortController().signal, fixedLot());
    await expect(guarded.context()).rejects.toThrow('Retained lot source state or denomination changed');
    expect(transport.quote).not.toHaveBeenCalled();
  });

  it('allows later compatible blocks and forwards reader operations without changing amounts', async () => {
    const transport = reader();
    const later = { ...context, blockNumber: 101, blockHash: `0x${'cd'.repeat(32)}` };
    vi.mocked(transport.context).mockResolvedValue(later);
    rpc.connect.mockResolvedValue(transport);
    const guarded = await openGuardedExecutionSessionReader(new AbortController().signal, fixedLot());
    expect(await guarded.context()).toEqual(later);
    await guarded.quote(later, 'in', 'out', '9007199254740993001');
    await guarded.assertUnchanged(later);
    await guarded.close();
    expect(transport.quote).toHaveBeenCalledWith(later, 'in', 'out', '9007199254740993001');
    expect(transport.assertUnchanged).toHaveBeenCalledWith(later);
    expect(transport.close).toHaveBeenCalledTimes(1);
  });
});

describe('session-specific retained timing validation', () => {
  type Complete = Extract<ExecutionSessionOutcome, { status: 'complete' }>;
  async function complete(): Promise<Complete> {
    const session = sessionModule.createExecutionSession(
      async () => reader(),
      () => NOW
    );
    try {
      const outcome = await session.collect(NOW, 25000);
      if (outcome.status !== 'complete') throw new Error('Expected complete fixture');
      return outcome;
    } finally {
      await session.close();
    }
  }
  const mutations: Array<[string, (outcome: Complete) => void]> = [
    [
      'missing timing',
      (outcome) => {
        delete (outcome.snapshot as Partial<Complete['snapshot']>).readerTiming;
      },
    ],
    [
      'zero connection',
      (outcome) => {
        outcome.snapshot.readerTiming.connectionId = 0;
      },
    ],
    [
      'fractional connection',
      (outcome) => {
        outcome.snapshot.readerTiming.connectionId = 1.5;
      },
    ],
    [
      'missing reused flag',
      (outcome) => {
        delete (outcome.snapshot.readerTiming as Partial<Complete['snapshot']['readerTiming']>).reusedConnection;
      },
    ],
    [
      'missing operation',
      (outcome) => {
        outcome.snapshot.readerTiming.operations.pop();
      },
    ],
    [
      'reordered operation',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[0].operation = 'buy';
      },
    ],
    [
      'pending success',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[4].status = 'pending';
      },
    ],
    [
      'error success',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[4].status = 'error';
      },
    ],
    [
      'early interval',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[0].startedAt = NOW - 1;
      },
    ],
    [
      'late interval',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[4].finishedAt = NOW + 1;
      },
    ],
    [
      'negative duration',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[0].finishedAt = NOW - 1;
      },
    ],
    [
      'missing finish',
      (outcome) => {
        delete outcome.snapshot.readerTiming.operations[2].finishedAt;
      },
    ],
    [
      'missing quote hash',
      (outcome) => {
        delete outcome.snapshot.readerTiming.operations[2].blockHash;
      },
    ],
    [
      'changed continuity hash',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[4].blockHash = `0x${'ef'.repeat(32)}`;
      },
    ],
    [
      'unexpected connect hash',
      (outcome) => {
        outcome.snapshot.readerTiming.operations[0].blockHash = HASH;
      },
    ],
  ];
  it('accepts complete method intervals and leaves base validation of missed slots unchanged', async () => {
    const outcome = await complete();
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW)).not.toThrow();
    expect(() =>
      validateExecutionSessionOutcome({ status: 'missed', reason: 'start-deadline-exceeded' }, NOW, NOW + 5001)
    ).not.toThrow();
  });
  it.each(mutations)('rejects %s', async (_label, mutate) => {
    const outcome = await complete();
    mutate(outcome);
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW)).toThrow('reader timing');
  });
  it('accepts an ordered error prefix ending in an unfinished interval without inventing a finish', () => {
    const outcome: Extract<ExecutionSessionOutcome, { status: 'error' }> = {
      status: 'error',
      code: 'timeout',
      message: 'deadline',
      progress: {
        stage: 'buy',
        connectionId: 1,
        reusedConnection: false,
        context,
        operations: [
          { operation: 'connect', startedAt: NOW, finishedAt: NOW + 1, status: 'complete' },
          { operation: 'context', startedAt: NOW + 1, finishedAt: NOW + 2, status: 'complete' },
          { operation: 'buy', startedAt: NOW + 2, status: 'pending', blockHash: HASH },
        ],
      },
    };
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW + 25000)).not.toThrow();
    outcome.progress.operations[2].finishedAt = NOW + 25000;
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW + 25000)).toThrow('reader timing');
  });
  it('rejects an error prefix with incomplete earlier work or a mismatched observed hash', () => {
    const outcome: Extract<ExecutionSessionOutcome, { status: 'error' }> = {
      status: 'error',
      code: 'observation',
      message: 'fixture',
      progress: {
        stage: 'context',
        connectionId: 2,
        reusedConnection: true,
        operations: [
          { operation: 'connect', startedAt: NOW, status: 'pending' },
          { operation: 'context', startedAt: NOW, finishedAt: NOW, status: 'error' },
        ],
      },
    };
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW)).toThrow('reader timing');
  });

  it('retains explicitly flagged clock-regression diagnostics without treating their chronology as successful evidence', () => {
    const outcome: Extract<ExecutionSessionOutcome, { status: 'error' }> = {
      status: 'error',
      code: 'observation',
      message: 'Execution session clock regressed',
      progress: {
        stage: 'connect',
        connectionId: 1,
        reusedConnection: false,
        clockRegressed: true,
        operations: [{ operation: 'connect', startedAt: NOW + 1000, status: 'pending' }],
      },
    };
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW + 500)).not.toThrow();
    delete outcome.progress.clockRegressed;
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW + 500)).toThrow('reader timing');
    outcome.progress.clockRegressed = true;
    outcome.message = 'ordinary failure';
    expect(() => validateExecutionSessionOutcome(outcome, NOW, NOW + 500)).toThrow('reader timing');
  });
});
