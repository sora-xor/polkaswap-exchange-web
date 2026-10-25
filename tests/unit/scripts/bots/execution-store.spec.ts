import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, appendFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  EXECUTION_EVIDENCE_KUSD as KUSD,
  EXECUTION_EVIDENCE_XOR as XOR,
  hashEvidence,
  normalizeExecutionQuote,
  type ExecutionRawQuote,
  type ExecutionContext,
} from '../../../../scripts/bots/execution-evidence';
import { readExecutionSnapshot, type ExecutionReader } from '../../../../scripts/bots/execution-reader';
import {
  createExecutionManifest,
  openExecutionStore,
  collectExecutionSlot,
  executionReverseLot,
  loadFrozenExecutionLot,
  validateExecutionManifest,
} from '../../../../scripts/bots/execution-store';

const NOW = 2_000_000;
const HASH = `0x${'ab'.repeat(32)}`;
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
function quote(sell = false): ExecutionRawQuote {
  const assetIn = sell ? XOR : KUSD;
  const assetOut = sell ? KUSD : XOR;
  return {
    blockHash: HASH,
    assetIn,
    assetOut,
    assetInDecimals: 18,
    assetOutDecimals: 18,
    amountInCodec: sell ? '995000000000000000' : '5000000000000000000',
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
      blockHash: HASH,
      runtimeVersion: { specVersion: 131, transactionVersion: 3 },
      rawQueryInfo: { partialFee: '3' },
      rawFeeDetails: { inclusionFee: { baseFee: 1, lenFee: 1, adjustedWeightFee: 1 }, tip: 0 },
    },
  };
}
function reader(): ExecutionReader {
  return {
    context: vi.fn().mockResolvedValue(context),
    quote: vi.fn().mockResolvedValueOnce(quote()).mockResolvedValueOnce(quote(true)),
    assertUnchanged: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}
const manifest = () =>
  createExecutionManifest(
    { startAt: NOW, slots: 3, cadenceMs: 60000 },
    { source: 'a'.repeat(64) },
    { nonce: 0 },
    NOW - 1000
  );
const dirs: string[] = [];
async function directory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'polkaswap-evidence-'));
  dirs.push(path);
  return path;
}
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('read-only execution observations', () => {
  it('uses the same finalized context and conservative acquired lot, then checks continuity', async () => {
    const rpc = reader();
    const result = await readExecutionSnapshot(rpc, NOW, NOW, { stage: 'connect' }, () => NOW + 100);
    expect(rpc.quote).toHaveBeenNthCalledWith(1, context, KUSD, XOR, '5000000000000000000', expect.any(Function));
    expect(rpc.quote).toHaveBeenNthCalledWith(2, context, XOR, KUSD, '995000000000000000', expect.any(Function));
    expect(rpc.assertUnchanged).toHaveBeenCalledWith(context);
    expect(result.reverseLot).toEqual({ kind: 'same-block-buy-minimum' });
  });
  it('retains a successful first direction when the reverse RPC fails', async () => {
    const rpc = reader();
    vi.mocked(rpc.quote)
      .mockReset()
      .mockResolvedValueOnce(quote())
      .mockRejectedValueOnce(new Error('reverse unavailable'));
    const outcome = await collectExecutionSlot(
      NOW,
      25000,
      async () => rpc,
      () => NOW + 100
    );
    expect(outcome).toMatchObject({
      status: 'error',
      code: 'observation',
      message: 'reverse unavailable',
      progress: { stage: 'sell', context, buy: quote() },
    });
    expect(rpc.close).toHaveBeenCalled();
  });
  it('rejects mismatched finalized fee evidence and retains it for diagnosis', async () => {
    const rpc = reader();
    const bad = quote();
    bad.fee.blockHash = `0x${'ff'.repeat(32)}`;
    vi.mocked(rpc.quote).mockReset().mockResolvedValueOnce(bad).mockResolvedValueOnce(quote(true));
    const outcome = await collectExecutionSlot(
      NOW,
      25000,
      async () => rpc,
      () => NOW + 100
    );
    expect(outcome).toMatchObject({ status: 'error', progress: { stage: 'buy', buy: bad } });
    expect(rpc.quote).toHaveBeenCalledTimes(1);
  });
  it('closes and aborts a timed-out reader and does not mutate returned partial evidence later', async () => {
    vi.useFakeTimers();
    const rpc = reader();
    let finish: (value: ExecutionRawQuote) => void = () => undefined;
    vi.mocked(rpc.quote)
      .mockReset()
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
    let signal: AbortSignal | undefined;
    const pending = collectExecutionSlot(
      NOW,
      25,
      async (s) => {
        signal = s;
        return rpc;
      },
      () => NOW + 100
    );
    await vi.advanceTimersByTimeAsync(25);
    const result = await pending;
    expect(result).toMatchObject({ status: 'error', code: 'timeout', progress: { stage: 'buy' } });
    expect(signal?.aborted).toBe(true);
    expect(rpc.close).toHaveBeenCalled();
    finish(quote());
    await Promise.resolve();
    expect(result).not.toHaveProperty('progress.buy');
  });
  it('closes an initialization that resolves only after the deadline', async () => {
    vi.useFakeTimers();
    const rpc = reader();
    let connect: (value: ExecutionReader) => void = () => undefined;
    const pending = collectExecutionSlot(
      NOW,
      25,
      () =>
        new Promise((done) => {
          connect = done;
        }),
      () => NOW
    );
    await vi.advanceTimersByTimeAsync(25);
    expect(await pending).toMatchObject({ status: 'error', code: 'timeout' });
    connect(rpc);
    await Promise.resolve();
    expect(rpc.close).toHaveBeenCalled();
    expect(rpc.context).not.toHaveBeenCalled();
  });
  it('returns a complete observation only after the pinned runtime continuity check', async () => {
    expect(
      await collectExecutionSlot(
        NOW,
        25000,
        async () => reader(),
        () => NOW
      )
    ).toMatchObject({ status: 'complete' });
    const rpc = reader();
    vi.mocked(rpc.assertUnchanged).mockRejectedValue(new Error('upgrade'));
    expect(
      await collectExecutionSlot(
        NOW,
        25000,
        async () => rpc,
        () => NOW
      )
    ).toMatchObject({ status: 'error', message: 'upgrade', progress: { stage: 'continuity' } });
  });
});

describe('frozen execution journal', () => {
  it('freezes the exact prior acquisition with verified lineage and rejects unavailable source slots', async () => {
    const path = await directory();
    const m = manifest();
    const store = await openExecutionStore(path, m);
    const snapshot = await readExecutionSnapshot(reader(), NOW, NOW, { stage: 'connect' }, () => NOW + 100);
    const record = await store.append(NOW, { status: 'complete', snapshot }, NOW + 101);
    await store.close();
    const before = await readFile(join(path, 'observations.jsonl'), 'utf8');
    const lot = await loadFrozenExecutionLot(path, 0, NOW + 1000);
    expect(lot).toMatchObject({
      amountCodec: snapshot.buy.minimumCodec,
      frozenAt: NOW + 1000,
      sourceManifestHash: hashEvidence(m),
      sourceRecordHash: record.recordHash,
      sourceSlotAt: NOW,
      sourceReceivedAt: NOW + 100,
      sourceDenominator: '1',
      sourceBlockNumber: 100,
      sourceBlockHash: HASH,
      sourceFinalizedAt: NOW,
    });
    expect(lot.lotId).toBe(
      hashEvidence({
        sourceManifestHash: hashEvidence(m),
        sourceRecordHash: record.recordHash,
        sourceSlotAt: NOW,
      })
    );
    expect(await readFile(join(path, 'observations.jsonl'), 'utf8')).toBe(before);
    await expect(loadFrozenExecutionLot(path, 1, NOW + 1000)).rejects.toThrow('complete prior observation');
    await expect(loadFrozenExecutionLot(path, 0, NOW + 100)).rejects.toThrow('complete prior observation');
    await expect(loadFrozenExecutionLot(path, -1, NOW + 1000)).rejects.toThrow('Invalid lot source selection');
    await writeFile(join(path, 'observations.jsonl'), before.replace(record.recordHash, 'e'.repeat(64)));
    await expect(loadFrozenExecutionLot(path, 0, NOW + 1000)).rejects.toThrow('chain invalid');
  });
  it('binds the retained amount and each quote interval to the frozen manifest, allowing legacy timing only explicitly', async () => {
    const source = await directory();
    const sourceStore = await openExecutionStore(source, manifest());
    const sourceSnapshot = await readExecutionSnapshot(reader(), NOW, NOW, { stage: 'connect' }, () => NOW + 100);
    await sourceStore.append(NOW, { status: 'complete', snapshot: sourceSnapshot }, NOW + 101);
    await sourceStore.close();
    const lot = await loadFrozenExecutionLot(source, 0, NOW + 1000);
    const m = createExecutionManifest(
      { startAt: NOW + 60000, slots: 1, cadenceMs: 30000 },
      { source: 'a'.repeat(64) },
      { nonce: 0 },
      NOW + 1000,
      lot
    );
    const frozen = executionReverseLot(m);
    expect(frozen).toEqual({
      kind: 'fixed-frozen-lot',
      amountCodec: lot.amountCodec,
      frozenAt: lot.frozenAt,
      lotId: lot.lotId,
    });
    const path = await directory();
    const store = await openExecutionStore(path, m);
    const snapshot = await readExecutionSnapshot(
      reader(),
      NOW + 60000,
      NOW + 60000,
      { stage: 'connect' },
      () => NOW + 60100,
      frozen
    );
    const changedLot = structuredClone(snapshot);
    changedLot.reverseLot = { ...frozen, lotId: 'changed' } as typeof frozen;
    await expect(store.append(m.startAt, { status: 'complete', snapshot: changedLot }, NOW + 60200)).rejects.toThrow(
      'outside frozen slot'
    );
    const missingTiming = structuredClone(snapshot);
    delete missingTiming.quoteTiming;
    await expect(store.append(m.startAt, { status: 'complete', snapshot: missingTiming }, NOW + 60200)).rejects.toThrow(
      'outside frozen slot'
    );
    for (const patch of [{ denominator: '2' }, { blockNumber: 99 }, { finalizedAt: NOW - 1 }]) {
      const changedContext = structuredClone(snapshot);
      Object.assign(changedContext.context, patch);
      await expect(
        store.append(m.startAt, { status: 'complete', snapshot: changedContext }, NOW + 60200)
      ).rejects.toThrow('Retained lot source state or denomination changed');
    }
    const forked = structuredClone(snapshot);
    forked.context.blockHash = `0x${'ff'.repeat(32)}`;
    for (const q of [forked.buy, forked.sell]) {
      q.blockHash = forked.context.blockHash;
      q.fee.blockHash = forked.context.blockHash;
    }
    await expect(store.append(m.startAt, { status: 'complete', snapshot: forked }, NOW + 60200)).rejects.toThrow(
      'Retained lot source state or denomination changed'
    );
    await store.append(m.startAt, { status: 'complete', snapshot }, NOW + 60200);
    await store.close();
    const legacy = manifest();
    delete legacy.quoteTiming;
    const legacyStore = await openExecutionStore(await directory(), legacy);
    delete sourceSnapshot.quoteTiming;
    await legacyStore.append(NOW, { status: 'complete', snapshot: sourceSnapshot }, NOW + 101);
    await legacyStore.close();
    for (const patch of [
      { amountCodec: '0' },
      { amountCodec: '1.5' },
      { amountCodec: 1 },
      { frozenAt: NOW + 999 },
      { sourceReceivedAt: NOW + 1001 },
      { sourceSlotAt: NOW + 2000 },
      { sourceManifestHash: 'bad' },
      { sourceRecordHash: 'bad' },
      { sourceManifestHash: ['a'.repeat(64)] },
      { sourceRecordHash: ['a'.repeat(64)] },
      { sourceDenominator: '0' },
      { sourceDenominator: 1 },
      { sourceBlockNumber: 0 },
      { sourceBlockHash: 'bad' },
      { sourceFinalizedAt: 0 },
      { lotId: 'changed' },
    ]) {
      expect(() => validateExecutionManifest({ ...m, fixedReverseLot: { ...lot, ...patch } } as typeof m)).toThrow();
    }
    expect(() => validateExecutionManifest({ ...m, quoteTiming: undefined })).toThrow();
    expect(() => validateExecutionManifest({ ...m, reverseLot: 'same-block-buy-minimum' })).toThrow();
    const rpc = reader();
    vi.mocked(rpc.context).mockResolvedValue({ ...context, denominator: '2' });
    const outcome = await collectExecutionSlot(
      m.startAt,
      25000,
      async () => rpc,
      () => NOW + 60100,
      frozen,
      lot
    );
    expect(outcome).toMatchObject({ status: 'error', progress: { stage: 'validate', context: { denominator: '2' } } });
    const failedStore = await openExecutionStore(await directory(), m);
    await failedStore.append(m.startAt, outcome, NOW + 60200);
    expect(failedStore.records).toHaveLength(1);
    await failedStore.close();
  });
  it('passes the frozen lot to the bounded reader without replacing it with the new buy minimum', async () => {
    const rpc = reader();
    const raw = quote(true);
    raw.amountInCodec = '777';
    vi.mocked(rpc.quote).mockReset().mockResolvedValueOnce(quote()).mockResolvedValueOnce(raw);
    const lot = {
      kind: 'fixed-frozen-lot' as const,
      amountCodec: '777',
      frozenAt: NOW - 1000,
      lotId: 'prior-observation',
    };
    const result = await collectExecutionSlot(
      NOW,
      25000,
      async () => rpc,
      () => NOW + 100,
      lot
    );
    expect(result).toMatchObject({ status: 'complete', snapshot: { reverseLot: lot, sell: { amountInCodec: '777' } } });
    expect(rpc.quote).toHaveBeenNthCalledWith(2, context, XOR, KUSD, '777', expect.any(Function));
  });
  it('poisons the writer after an I/O failure rather than risking a duplicate retry', async () => {
    const path = await directory();
    const store = await openExecutionStore(path, manifest());
    const journal = join(path, 'observations.jsonl');
    await mkdir(journal);
    await expect(
      store.append(NOW, { status: 'missed', reason: 'start-deadline-exceeded' }, NOW + 6000)
    ).rejects.toMatchObject({ code: 'EISDIR' });
    await rm(journal, { recursive: true });
    await expect(
      store.append(NOW, { status: 'missed', reason: 'start-deadline-exceeded' }, NOW + 6000)
    ).rejects.toThrow('write failed');
    await store.close();
  });
  it('fsyncs complete/error/missed records, chains to the manifest, and resumes without replacing slots', async () => {
    const path = await directory();
    const m = manifest();
    const store = await openExecutionStore(path, m);
    const snapshot = await readExecutionSnapshot(reader(), NOW, NOW, { stage: 'connect' }, () => NOW + 100);
    const first = await store.append(NOW, { status: 'complete', snapshot }, NOW + 101);
    expect(first.previousHash).toBe(hashEvidence(m));
    await store.append(
      NOW + 60000,
      { status: 'error', code: 'observation', message: 'offline', progress: { stage: 'connect' } },
      NOW + 60001
    );
    await store.close();
    const before = await readFile(join(path, 'observations.jsonl'), 'utf8');
    const resumed = await openExecutionStore(path, m);
    expect(resumed.records).toHaveLength(2);
    await expect(
      resumed.append(NOW, { status: 'missed', reason: 'start-deadline-exceeded' }, NOW + 150000)
    ).rejects.toThrow();
    await resumed.append(NOW + 120000, { status: 'missed', reason: 'start-deadline-exceeded' }, NOW + 150000);
    expect(await readFile(join(path, 'observations.jsonl'), 'utf8')).toMatch(
      new RegExp(`^${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    );
    await resumed.close();
    await resumed.close();
    await expect(resumed.append(NOW, { status: 'missed', reason: 'start-deadline-exceeded' })).rejects.toThrow(
      'closed'
    );
  });
  it('refuses concurrent writers and changed manifests', async () => {
    const path = await directory();
    const m = manifest();
    const first = await openExecutionStore(path, m);
    await expect(openExecutionStore(path, m)).rejects.toMatchObject({ code: 'EEXIST' });
    await first.close();
    await expect(openExecutionStore(path, { ...m, cadenceMs: 90000 })).rejects.toThrow('differs');
    const resumed = await openExecutionStore(path, m);
    await resumed.close();
  });
  it('rejects corrupted chains and preserves an incomplete tail unchanged', async () => {
    const path = await directory();
    const m = manifest();
    const store = await openExecutionStore(path, m);
    await store.append(NOW, { status: 'missed', reason: 'start-deadline-exceeded' }, NOW + 6000);
    await store.close();
    const file = join(path, 'observations.jsonl');
    const original = await readFile(file, 'utf8');
    await writeFile(file, original.replace('start-deadline-exceeded', 'made-up-reason'));
    await expect(openExecutionStore(path, m)).rejects.toThrow('chain invalid');
    await writeFile(file, original);
    await appendFile(file, '{');
    await expect(openExecutionStore(path, m)).rejects.toThrow('Incomplete journal tail');
    expect(await readFile(file, 'utf8')).toBe(original + '{');
  });
  it('rejects complete records outside the slot and rejects a changed reverse-lot identity', async () => {
    const path = await directory();
    const store = await openExecutionStore(path, manifest());
    store.manifest.startAt = NOW + 9999;
    expect(store.manifest.startAt).toBe(NOW);
    const snapshot = await readExecutionSnapshot(reader(), NOW, NOW + 6000, { stage: 'connect' }, () => NOW + 7000);
    await expect(store.append(NOW, { status: 'complete', snapshot }, NOW + 7000)).rejects.toThrow(
      'outside frozen slot'
    );
    snapshot.requestStartedAt = NOW;
    snapshot.reverseLot = {
      kind: 'fixed-frozen-lot',
      amountCodec: snapshot.buy.minimumCodec,
      frozenAt: NOW,
      lotId: 'different',
    };
    await expect(store.append(NOW, { status: 'complete', snapshot }, NOW + 7000)).rejects.toThrow(
      'outside frozen slot'
    );
    expect(store.records).toHaveLength(0);
    await store.close();
  });
  it('returns detached record copies', async () => {
    const path = await directory();
    const store = await openExecutionStore(path, manifest());
    const record = await store.append(NOW, { status: 'missed', reason: 'start-deadline-exceeded' }, NOW + 6000);
    record.recordHash = 'changed';
    const records = store.records;
    records[0].recordHash = 'also changed';
    expect(store.records[0].recordHash).not.toBe('changed');
    expect(store.records[0].recordHash).not.toBe('also changed');
    await store.close();
  });
  it.each([{ slots: 0 }, { slots: 1441 }, { cadenceMs: 29999 }, { cadenceMs: 3600001 }, { startAt: NOW - 2000 }])(
    'rejects unsafe schedule %j',
    (change) => {
      expect(() =>
        createExecutionManifest(
          { startAt: NOW, slots: 3, cadenceMs: 60000, ...change },
          { source: 'a'.repeat(64) },
          { nonce: 0 },
          NOW - 1000
        )
      ).toThrow();
    }
  );
});
