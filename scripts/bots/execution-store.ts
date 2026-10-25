/** Append-only, hash-chained development observations with a frozen schedule and explicit gaps. */
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_INPUT_CODEC,
  EXECUTION_EVIDENCE_KUSD,
  EXECUTION_EVIDENCE_XOR,
  canonicalEvidenceJson,
  hashEvidence,
  validateExecutionSnapshot,
  type ExecutionContext,
  type ExecutionReverseLot,
  type ExecutionSnapshot,
} from './execution-evidence';
import type { ExecutionProgress, ExecutionReader } from './execution-reader';
import { readExecutionSnapshot } from './execution-reader';

/** Public provenance of a prior observed acquisition, never evidence that a wallet owns the lot. */
export interface FrozenExecutionLot {
  amountCodec: string;
  frozenAt: number;
  lotId: string;
  sourceManifestHash: string;
  sourceRecordHash: string;
  sourceSlotAt: number;
  sourceReceivedAt: number;
  sourceDenominator: string;
  sourceBlockNumber: number;
  sourceBlockHash: string;
  sourceFinalizedAt: number;
}

export interface ExecutionManifest {
  schemaVersion: 1;
  purpose: 'development';
  createdAt: number;
  startAt: number;
  slots: number;
  cadenceMs: number;
  deadlineMs: 25000;
  maxStartDelayMs: 5000;
  endpoint: typeof EXECUTION_EVIDENCE_ENDPOINT;
  assetIn: typeof EXECUTION_EVIDENCE_KUSD;
  assetOut: typeof EXECUTION_EVIDENCE_XOR;
  amountInCodec: typeof EXECUTION_EVIDENCE_INPUT_CODEC;
  slippageBps: 50;
  reverseLot: 'same-block-buy-minimum' | 'fixed-frozen-lot';
  fixedReverseLot?: FrozenExecutionLot;
  /** Absent only on legacy datasets; new collections retain each quote/fee request interval. */
  quoteTiming?: 'request-intervals';
  sourcePolicy: 'DEX 0; XYKPool; AllowSelected; direct exact pair only';
  missingDataPolicy: 'Every frozen slot gets complete, error or missed; never backfill or replace';
  feeAssumptions: Record<string, string | number>;
  sourceHashes: Record<string, string>;
}
export type ExecutionOutcome =
  | { status: 'complete'; snapshot: ExecutionSnapshot }
  | { status: 'error'; code: 'timeout' | 'observation'; message: string; progress: ExecutionProgress }
  | { status: 'missed'; reason: 'start-deadline-exceeded' };
export type ExecutionRecord = ExecutionOutcome & {
  slotAt: number;
  recordedAt: number;
  previousHash: string;
  recordHash: string;
};

/** Freeze constants, schedule and source identities before opening any market connection. */
export function createExecutionManifest(
  schedule: Pick<ExecutionManifest, 'startAt' | 'slots' | 'cadenceMs'>,
  sourceHashes: Record<string, string>,
  feeAssumptions: ExecutionManifest['feeAssumptions'],
  now = Date.now(),
  fixedReverseLot?: FrozenExecutionLot
): ExecutionManifest {
  return validateExecutionManifest({
    schemaVersion: 1,
    purpose: 'development',
    createdAt: now,
    ...schedule,
    deadlineMs: 25000,
    maxStartDelayMs: 5000,
    endpoint: EXECUTION_EVIDENCE_ENDPOINT,
    assetIn: EXECUTION_EVIDENCE_KUSD,
    assetOut: EXECUTION_EVIDENCE_XOR,
    amountInCodec: EXECUTION_EVIDENCE_INPUT_CODEC,
    slippageBps: 50,
    reverseLot: fixedReverseLot ? 'fixed-frozen-lot' : 'same-block-buy-minimum',
    ...(fixedReverseLot ? { fixedReverseLot } : {}),
    quoteTiming: 'request-intervals',
    sourcePolicy: 'DEX 0; XYKPool; AllowSelected; direct exact pair only',
    missingDataPolicy: 'Every frozen slot gets complete, error or missed; never backfill or replace',
    feeAssumptions,
    sourceHashes,
  });
}

/** Reject changed semantics or unsafe/unbounded schedules when loading an existing manifest. */
export function validateExecutionManifest(value: ExecutionManifest): ExecutionManifest {
  const m = JSON.parse(canonicalEvidenceJson(value)) as ExecutionManifest;
  if (
    m.schemaVersion !== 1 ||
    m.purpose !== 'development' ||
    m.endpoint !== EXECUTION_EVIDENCE_ENDPOINT ||
    m.assetIn !== EXECUTION_EVIDENCE_KUSD ||
    m.assetOut !== EXECUTION_EVIDENCE_XOR ||
    m.amountInCodec !== EXECUTION_EVIDENCE_INPUT_CODEC ||
    m.slippageBps !== 50 ||
    !['same-block-buy-minimum', 'fixed-frozen-lot'].includes(m.reverseLot) ||
    ![undefined, 'request-intervals'].includes(m.quoteTiming) ||
    m.sourcePolicy !== 'DEX 0; XYKPool; AllowSelected; direct exact pair only' ||
    m.missingDataPolicy !== 'Every frozen slot gets complete, error or missed; never backfill or replace' ||
    m.deadlineMs !== 25000 ||
    m.maxStartDelayMs !== 5000 ||
    !Number.isSafeInteger(m.createdAt) ||
    m.createdAt <= 0 ||
    !Number.isSafeInteger(m.startAt) ||
    m.startAt < m.createdAt ||
    !Number.isSafeInteger(m.slots) ||
    m.slots < 1 ||
    m.slots > 1440 ||
    !Number.isSafeInteger(m.cadenceMs) ||
    m.cadenceMs < 30000 ||
    m.cadenceMs > 3600000 ||
    !Number.isSafeInteger(m.startAt + m.slots * m.cadenceMs) ||
    !m.sourceHashes ||
    Object.keys(m.sourceHashes).length < 1 ||
    Object.values(m.sourceHashes).some((x) => typeof x !== 'string' || !/^[a-f0-9]{64}$/.test(x)) ||
    !m.feeAssumptions ||
    Object.keys(m.feeAssumptions).length < 1
  )
    throw new Error('Invalid frozen execution manifest');
  const lot = m.fixedReverseLot;
  if (m.reverseLot === 'fixed-frozen-lot') {
    if (
      !lot ||
      typeof lot.amountCodec !== 'string' ||
      !/^[1-9]\d{0,77}$/.test(lot.amountCodec) ||
      BigInt(lot.amountCodec) >= 2n ** 256n ||
      !Number.isSafeInteger(lot.frozenAt) ||
      lot.frozenAt !== m.createdAt ||
      !Number.isSafeInteger(lot.sourceSlotAt) ||
      lot.sourceSlotAt <= 0 ||
      !Number.isSafeInteger(lot.sourceReceivedAt) ||
      lot.sourceReceivedAt < lot.sourceSlotAt ||
      lot.sourceReceivedAt > lot.frozenAt ||
      typeof lot.sourceManifestHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(lot.sourceManifestHash) ||
      typeof lot.sourceRecordHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(lot.sourceRecordHash) ||
      typeof lot.sourceDenominator !== 'string' ||
      !/^[1-9]\d{0,119}$/.test(lot.sourceDenominator) ||
      !Number.isSafeInteger(lot.sourceBlockNumber) ||
      lot.sourceBlockNumber <= 0 ||
      typeof lot.sourceBlockHash !== 'string' ||
      !/^0x[0-9a-f]{64}$/.test(lot.sourceBlockHash) ||
      !Number.isSafeInteger(lot.sourceFinalizedAt) ||
      lot.sourceFinalizedAt <= 0 ||
      lot.sourceReceivedAt - lot.sourceFinalizedAt > 300000 ||
      lot.sourceFinalizedAt - lot.sourceReceivedAt > 30000 ||
      lot.lotId !==
        hashEvidence({
          sourceManifestHash: lot.sourceManifestHash,
          sourceRecordHash: lot.sourceRecordHash,
          sourceSlotAt: lot.sourceSlotAt,
        }) ||
      m.quoteTiming !== 'request-intervals'
    )
      throw new Error('Invalid frozen execution lot');
  } else if (lot !== undefined) throw new Error('Unexpected frozen execution lot');
  return m;
}

/** Map immutable lot provenance to the exact amount expected by every reader and retained record. */
export function executionReverseLot(manifest: ExecutionManifest): ExecutionReverseLot {
  if (manifest.reverseLot === 'same-block-buy-minimum') return { kind: 'same-block-buy-minimum' };
  const lot = manifest.fixedReverseLot;
  if (!lot) throw new Error('Missing frozen execution lot');
  return { kind: 'fixed-frozen-lot', amountCodec: lot.amountCodec, frozenAt: lot.frozenAt, lotId: lot.lotId };
}

/** A fixed observed codec lot is comparable only in the same denomination and a non-regressing finalized state. */
function assertFrozenLotContext(lot: FrozenExecutionLot | undefined, context: ExecutionContext): void {
  if (!lot) return;
  if (
    context.denominator !== lot.sourceDenominator ||
    context.blockNumber < lot.sourceBlockNumber ||
    context.finalizedAt < lot.sourceFinalizedAt ||
    (context.blockNumber === lot.sourceBlockNumber && context.blockHash !== lot.sourceBlockHash)
  )
    throw new Error('Retained lot source state or denomination changed');
}

export interface ExecutionStore {
  manifest: ExecutionManifest;
  records: readonly ExecutionRecord[];
  append(slotAt: number, outcome: ExecutionOutcome, recordedAt?: number): Promise<ExecutionRecord>;
  close(): Promise<void>;
}

function validateRecord(
  record: ExecutionRecord,
  manifest: ExecutionManifest,
  index: number,
  previousHash: string
): void {
  const { recordHash, ...body } = record;
  if (
    index >= manifest.slots ||
    record.slotAt !== manifest.startAt + index * manifest.cadenceMs ||
    !Number.isSafeInteger(record.recordedAt) ||
    record.recordedAt < record.slotAt ||
    record.previousHash !== previousHash ||
    recordHash !== hashEvidence(body)
  )
    throw new Error('Execution record chain invalid');
  if (record.status === 'complete') {
    const s = validateExecutionSnapshot(record.snapshot);
    assertFrozenLotContext(manifest.fixedReverseLot, s.context);
    if (
      s.slotAt !== record.slotAt ||
      s.requestStartedAt > record.slotAt + manifest.maxStartDelayMs ||
      s.requestFinishedAt > record.recordedAt ||
      canonicalEvidenceJson(s.reverseLot) !== canonicalEvidenceJson(executionReverseLot(manifest)) ||
      (manifest.quoteTiming === 'request-intervals' && !s.quoteTiming)
    )
      throw new Error('Snapshot outside frozen slot');
  } else if (record.status === 'error') {
    if (
      !['timeout', 'observation'].includes(record.code) ||
      typeof record.message !== 'string' ||
      record.message.length > 1024 ||
      !record.progress ||
      !['connect', 'context', 'buy', 'sell', 'continuity', 'validate'].includes(record.progress.stage)
    ) {
      throw new Error('Invalid error record');
    }
  } else if (
    record.status !== 'missed' ||
    record.reason !== 'start-deadline-exceeded' ||
    record.recordedAt <= record.slotAt + manifest.maxStartDelayMs
  )
    throw new Error('Invalid missing-slot record');
}

/** Validate a complete or partial frozen journal without I/O; no gap or retained outcome is replaced. */
export function validateExecutionJournal(manifest: ExecutionManifest, records: readonly ExecutionRecord[]): void {
  manifest = validateExecutionManifest(manifest);
  if (!Array.isArray(records) || records.length > manifest.slots) throw new Error('Invalid execution journal size');
  let previousHash = hashEvidence(manifest);
  records.forEach((record, index) => {
    validateRecord(record, manifest, index, previousHash);
    previousHash = record.recordHash;
  });
}

/** Exclusively lock one dataset, validate all retained records, and fsync each new append. No overwrite or repair. */
export async function openExecutionStore(directory: string, manifest: ExecutionManifest): Promise<ExecutionStore> {
  manifest = validateExecutionManifest(manifest);
  await mkdir(directory, { recursive: true });
  const lockPath = join(directory, '.collector.lock');
  const lock = await open(lockPath, 'wx', 0o600);
  let closed = false;
  try {
    await lock.writeFile(`${process.pid}\n`);
    const manifestPath = join(directory, 'manifest.json');
    const serialized = canonicalEvidenceJson(manifest) + '\n';
    try {
      const file = await open(manifestPath, 'wx', 0o600);
      try {
        await file.writeFile(serialized);
        await file.sync();
      } finally {
        await file.close();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if ((await readFile(manifestPath, 'utf8')) !== serialized) throw new Error('Existing frozen manifest differs');
    }
    const journalPath = join(directory, 'observations.jsonl');
    let journal = '';
    try {
      journal = await readFile(journalPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (journal && !journal.endsWith('\n'))
      throw new Error('Incomplete journal tail; preserve and investigate, never truncate');
    const records = journal
      ? journal
          .slice(0, -1)
          .split('\n')
          .map((line) => JSON.parse(line) as ExecutionRecord)
      : [];
    validateExecutionJournal(manifest, records);
    let previousHash = records.at(-1)?.recordHash ?? hashEvidence(manifest);
    let appending = false;
    let writeFailed = false;
    return {
      get manifest() {
        return JSON.parse(canonicalEvidenceJson(manifest)) as ExecutionManifest;
      },
      get records() {
        return JSON.parse(canonicalEvidenceJson(records)) as ExecutionRecord[];
      },
      async append(slotAt, outcome, recordedAt = Date.now()) {
        if (closed || appending || writeFailed)
          throw new Error('Store closed, write failed or append already in progress');
        appending = true;
        try {
          const body = JSON.parse(canonicalEvidenceJson({ ...outcome, slotAt, recordedAt, previousHash })) as Omit<
            ExecutionRecord,
            'recordHash'
          >;
          const record = { ...body, recordHash: hashEvidence(body) } as ExecutionRecord;
          validateRecord(record, manifest, records.length, previousHash);
          try {
            const file = await open(journalPath, 'a', 0o600);
            try {
              await file.writeFile(canonicalEvidenceJson(record) + '\n');
              await file.sync();
            } finally {
              await file.close();
            }
          } catch (error) {
            writeFailed = true;
            throw error;
          }
          records.push(record);
          previousHash = record.recordHash;
          return JSON.parse(canonicalEvidenceJson(record)) as ExecutionRecord;
        } finally {
          appending = false;
        }
      },
      async close() {
        if (appending) throw new Error('Cannot close during append');
        if (!closed) {
          closed = true;
          await lock.close();
          await unlink(lockPath);
        }
      },
    };
  } catch (error) {
    await lock.close();
    await unlink(lockPath);
    throw error;
  }
}

/** Freeze a previously observed acquisition minimum after validating its entire existing journal. */
export async function loadFrozenExecutionLot(
  directory: string,
  slot: number,
  now: number
): Promise<FrozenExecutionLot> {
  if (!Number.isSafeInteger(slot) || slot < 0 || !Number.isSafeInteger(now) || now <= 0)
    throw new Error('Invalid lot source selection');
  const manifest = validateExecutionManifest(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')));
  const store = await openExecutionStore(directory, manifest);
  try {
    const record = store.records[slot];
    if (!record || record.status !== 'complete' || record.snapshot.requestFinishedAt > now || record.recordedAt > now)
      throw new Error('Selected lot must be a complete prior observation');
    const identity = {
      sourceManifestHash: hashEvidence(manifest),
      sourceRecordHash: record.recordHash,
      sourceSlotAt: record.slotAt,
    };
    return {
      amountCodec: record.snapshot.buy.minimumCodec,
      frozenAt: now,
      lotId: hashEvidence(identity),
      ...identity,
      sourceReceivedAt: record.snapshot.requestFinishedAt,
      sourceDenominator: record.snapshot.context.denominator,
      sourceBlockNumber: record.snapshot.context.blockNumber,
      sourceBlockHash: record.snapshot.context.blockHash,
      sourceFinalizedAt: record.snapshot.context.finalizedAt,
    };
  } finally {
    await store.close();
  }
}

/** Run one bounded attempt; abort the public transport and retain partial observations on timeout. */
export async function collectExecutionSlot(
  slotAt: number,
  deadlineMs: number,
  factory: (signal: AbortSignal) => Promise<ExecutionReader>,
  now: () => number = Date.now,
  reverseLot: ExecutionReverseLot = { kind: 'same-block-buy-minimum' },
  fixedLot?: FrozenExecutionLot
): Promise<ExecutionOutcome> {
  const controller = new AbortController();
  const progress: ExecutionProgress = { stage: 'connect' };
  const startedAt = now();
  let reader: ExecutionReader | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const attempt = (async () => {
    reader = await factory(controller.signal);
    if (controller.signal.aborted) {
      await reader.close();
      throw new Error('Execution observation aborted');
    }
    const snapshot = await readExecutionSnapshot(reader, slotAt, startedAt, progress, now, reverseLot);
    assertFrozenLotContext(fixedLot, snapshot.context);
    return snapshot;
  })();
  try {
    const snapshot = await Promise.race([
      attempt,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error('Observation deadline exceeded'));
        }, deadlineMs);
      }),
    ]);
    return { status: 'complete', snapshot };
  } catch (error) {
    return {
      status: 'error',
      code: timedOut ? 'timeout' : 'observation',
      message: String(error instanceof Error ? error.message : error).slice(0, 1024),
      progress: JSON.parse(canonicalEvidenceJson(progress)) as ExecutionProgress,
    };
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
    // Transport disconnect is also triggered synchronously by abort; cleanup must not delay the next frozen slot.
    void reader?.close().catch(() => undefined);
  }
}
