/** One prospective first-decision probe. No order, wallet, signing or execution interface. */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {
  isAcquiredAccumulationOpeningCapture,
  type AcquiredAccumulationOpeningCapture,
} from './accumulation-opening-capture';
import { prepareAccumulationCapture, type AccumulationCaptureOptions } from './accumulation-capture';
import { isVerifiedAccumulationDecisionPacket } from './accumulation-evidence-bridge';
import {
  openAccumulationJournalStore,
  canonicalAccumulationJournalJson as canonical,
  type AccumulationJournalHead,
} from './accumulation-journal-store';
import { AccumulationJournalSession } from './accumulation-journal-session';
import { auditAccumulationHourlyCoverage } from './accumulation-hourly-coverage';
import { runAccumulationSubprocess, type AccumulationSubprocessRequest } from './accumulation-subprocess';
import { validateAccumulationAdmissionResult } from './accumulation-admission-result';
import { assessAccumulationAdmissionCompletion } from './accumulation-completion-clock';

const MODEL = '59c55ea8eb27b9efcf6e14cff95f3a56f73f2e65d9e66c82bad7b1a5b5fff355';
const ADMISSION_SOURCES = {
  'scripts/bots/accumulation_admission_runner.py': '25de2ff4e4e9dbe6b7e57d0d444ad5d1a6f4ff16ba78b3455cd7975bc7bd3e16',
  'scripts/bots/accumulation_admission_policy.py': '899d66482c90348684faca6f557224fddf4118ef8932a36b735bd4c935a4d44d',
  'scripts/bots/accumulation_stopping_model.py': '26f2d6bc93490338da6488d081271a83bf3d24203fc26b4c2e216abbb234e7a6',
};
const JOURNAL_SOURCES = {
  ...ADMISSION_SOURCES,
  'scripts/bots/accumulation_execution_replay.py': '8afd3f7f3d18c6712933882c405d22f1ea743adf6f6873fd389d728b2a33420f',
  'scripts/bots/accumulation_journal_replay.py': 'da0b13c01aa8ba091bc67b01baa7a00babaff86c1876a80186806f121161507e',
};
const LIMITS = Object.freeze({
  timeoutMs: 30_000,
  maxInputBytes: 256 * 1024,
  maxStdoutBytes: 256 * 1024,
  maxStderrBytes: 64 * 1024,
});
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const consumedOpenings = new WeakSet<object>();
type Data = Record<string, unknown>;
/** The operator retains this complete registration before acquiring the opening, separately from this probe. */
export interface AccumulationFirstAdmissionRegistration {
  kind: 'accumulation-first-shadow-registration-v2';
  episodeId: string;
  openingAtMs: number;
  deadlineMs: number;
  openingRegistrationSha256: string;
  decisionRegistrationSha256: string;
  capitalKusdCodec: '10000000000000000000';
  feeReserveXorCodec: '1000000000000000000';
  modelSha256: typeof MODEL;
  runtime: {
    repositoryRoot: string;
    pythonExecutable: string;
    pythonSha256: string;
    journalSourceBindings: { path: string; sha256: string }[];
    admissionSourceBindings: { path: string; sha256: string }[];
  };
}
export interface AccumulationFirstAdmissionOptions {
  registrationBytes: Uint8Array;
  expectedRegistrationSha256: string;
  ownedOpeningCapture: AcquiredAccumulationOpeningCapture;
  decisionCaptureOptions: AccumulationCaptureOptions;
  journalDirectory: string;
}
function check(ok: unknown, reason: string): asserts ok {
  if (!ok) throw Error(`accumulation-first-admission:${reason}`);
}
function fields(value: unknown, names: string): Data {
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'object');
  const descriptors = Object.getOwnPropertyDescriptors(value),
    expected = names.split(' ');
  check(
    Reflect.ownKeys(descriptors).length === expected.length &&
      expected.every((k) => descriptors[k]?.enumerable && 'value' in descriptors[k]),
    'fields'
  );
  return Object.fromEntries(expected.map((k) => [k, descriptors[k].value]));
}
function same(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

/** Re-read bounded sealed files without symlinks. Large raw receipts remain in their original capture directory. */
async function inventory(capture: { directory: string; seal: { path: string; sha256: string; bytes: number } }) {
  const directory = capture.directory;
  check(path.isAbsolute(directory) && (await fs.realpath(directory)) === directory, 'capture-directory');
  const read = async (name: string, bytes: number, expected: string) => {
    check(
      /^[a-z][a-z0-9-]{0,119}\.json$/.test(name) &&
        Number.isSafeInteger(bytes) &&
        bytes > 0 &&
        bytes <= 8 * 1024 * 1024 &&
        /^[a-f0-9]{64}$/.test(expected),
      'inventory-entry'
    );
    const handle = await fs.open(path.join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await handle.stat();
      check(before.isFile() && before.size === bytes, 'inventory-size');
      const buffer = Buffer.alloc(bytes + 1);
      let offset = 0;
      while (offset < buffer.length) {
        const part = await handle.read(buffer, offset, buffer.length - offset, offset);
        if (!part.bytesRead) break;
        offset += part.bytesRead;
      }
      const after = await handle.stat();
      check(
        offset === bytes &&
          before.ino === after.ino &&
          before.size === after.size &&
          before.mtimeMs === after.mtimeMs &&
          before.ctimeMs === after.ctimeMs &&
          sha(buffer.subarray(0, offset)) === expected,
        'inventory-bytes'
      );
      return buffer.subarray(0, offset);
    } finally {
      await handle.close();
    }
  };
  check(capture.seal.path === path.join(directory, 'seal.json') && capture.seal.bytes <= 65536, 'seal-path');
  const sealBytes = await read('seal.json', capture.seal.bytes, capture.seal.sha256);
  const seal = JSON.parse(sealBytes.toString('utf8'));
  check(
    seal.kind === 'accumulation-capture-seal-v1' &&
      seal.terminal.status === 'complete' &&
      Array.isArray(seal.files) &&
      seal.files.length > 0 &&
      seal.files.length < 128,
    'complete-seal'
  );
  const names = new Set<string>();
  let total = 0;
  const clocks = new Map<string, Buffer>();
  for (const file of seal.files) {
    check(!names.has(file.name) && file.name !== 'seal.json', 'duplicate-inventory');
    names.add(file.name);
    total += file.bytes;
    check(Number.isSafeInteger(total) && total <= 64 * 1024 * 1024, 'inventory-budget');
    const bytes = await read(file.name, file.bytes, file.sha256);
    if (file.name === 'observation-clocks.json') clocks.set(file.name, bytes);
  }
  check(
    total === seal.inventoriedBytes &&
      names.size === seal.inventoriedRecords &&
      same((await fs.readdir(directory)).sort(), [...names, 'seal.json'].sort()),
    'inventory-completeness'
  );
  return { manifest: { directory, seal: capture.seal, registrationSha256: seal.registrationSha256 }, clocks };
}

/**
 * Prepare after the acquired opening and before the registered decision window.
 * Ownership proves this collector ran; independent preregistration and full 24-hour coverage remain external.
 * The private journal accepts exactly one opening and one decision; it cannot continue trading.
 */
export async function prepareAccumulationFirstAdmission(options: AccumulationFirstAdmissionOptions) {
  check(isAcquiredAccumulationOpeningCapture(options.ownedOpeningCapture), 'acquired-opening-required');
  const opening = options.ownedOpeningCapture;
  const expectedRegistrationSha256 = options.expectedRegistrationSha256,
    journalDirectory = options.journalDirectory;
  const suppliedCapture = options.decisionCaptureOptions;
  const decisionCaptureOptions: AccumulationCaptureOptions = {
    baseDirectory: suppliedCapture.baseDirectory,
    registrationBytes: Uint8Array.from(suppliedCapture.registrationBytes),
    expectedRegistrationSha256: suppliedCapture.expectedRegistrationSha256,
    fetch: suppliedCapture.fetch,
    ...(suppliedCapture.signal === undefined ? {} : { signal: suppliedCapture.signal }),
  };
  check(!consumedOpenings.has(opening), 'opening-already-consumed');
  const bytes = Buffer.from(options.registrationBytes);
  check(
    bytes.length > 0 && bytes.length <= 256 * 1024 && sha(bytes) === expectedRegistrationSha256,
    'registration-digest'
  );
  const r = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  ) as AccumulationFirstAdmissionRegistration;
  check(JSON.stringify(r) + '\n' === bytes.toString('utf8'), 'registration-encoding');
  fields(
    r,
    'kind episodeId openingAtMs deadlineMs openingRegistrationSha256 decisionRegistrationSha256 capitalKusdCodec feeReserveXorCodec modelSha256 runtime'
  );
  fields(r.runtime, 'repositoryRoot pythonExecutable pythonSha256 journalSourceBindings admissionSourceBindings');
  for (const [bindings, expected] of [
    [r.runtime.admissionSourceBindings, ADMISSION_SOURCES],
    [r.runtime.journalSourceBindings, JOURNAL_SOURCES],
  ] as const) {
    check(Array.isArray(bindings) && bindings.length === Object.keys(expected).length, 'sealed-source-count');
    const actual: Record<string, string> = {};
    for (const binding of bindings) {
      fields(binding, 'path sha256');
      check(
        typeof binding.path === 'string' &&
          Object.hasOwn(expected, binding.path) &&
          !Object.hasOwn(actual, binding.path),
        'sealed-source-path'
      );
      actual[binding.path] = binding.sha256;
    }
    check(same(actual, expected), 'sealed-source-pin');
  }
  check(
    r.kind === 'accumulation-first-shadow-registration-v2' &&
      r.modelSha256 === MODEL &&
      r.capitalKusdCodec === '10000000000000000000' &&
      r.feeReserveXorCodec === '1000000000000000000' &&
      r.episodeId === opening.verified.registeredSlot.episodeId &&
      r.openingAtMs === opening.verified.registeredSlot.openingAtMs &&
      r.deadlineMs === opening.verified.registeredSlot.deadlineMs &&
      r.openingRegistrationSha256 === opening.verified.sourceRegistrationSha256 &&
      r.decisionRegistrationSha256 === decisionCaptureOptions.expectedRegistrationSha256,
    'registration-binding'
  );
  const d = JSON.parse(Buffer.from(decisionCaptureOptions.registrationBytes).toString('utf8'));
  check(
    d.completedHourMs === r.openingAtMs &&
      d.opensAtMs >= r.openingAtMs &&
      d.closesAtMs <= r.openingAtMs + 60_000 &&
      same(d.runtime, { ...opening.verified.runtime, denominator: opening.verified.denominator }),
    'first-window-or-runtime'
  );
  check(Date.now() >= r.openingAtMs, 'opening-not-yet-due');
  consumedOpenings.add(opening);
  const openingInventory = await inventory(opening);
  check(openingInventory.manifest.registrationSha256 === r.openingRegistrationSha256, 'opening-retention-binding');
  const capture = await prepareAccumulationCapture(decisionCaptureOptions);
  const store = await openAccumulationJournalStore(
    journalDirectory,
    { episodeId: r.episodeId, bytes, sha256: expectedRegistrationSha256 },
    null
  );
  const session = AccumulationJournalSession.create(store, {
    repositoryRoot: r.runtime.repositoryRoot,
    pythonExecutable: r.runtime.pythonExecutable,
    trusted: {
      registrationSha256: expectedRegistrationSha256,
      pythonSha256: r.runtime.pythonSha256,
      sourceBindings: r.runtime.journalSourceBindings,
    },
  });
  const retain = async (purpose: string, name: string, value: unknown) =>
    store.retainEvidence(purpose, name, Buffer.from(canonical(value) + '\n'));
  let used = false;
  try {
    const reference = await retain('opening-capture', 'opening-capture', openingInventory.manifest);
    await session.transition({
      kind: 'opening',
      evidence: [reference],
      input: {
        openingAtMs: r.openingAtMs,
        capitalKusdCodec: r.capitalKusdCodec,
        feeReserveXorCodec: r.feeReserveXorCodec,
        price: opening.verified.mark.price,
        mark: opening.verified.mark,
      },
    });
  } catch (error) {
    await store.quarantine('opening-unresolved').catch(() => {});
    await store.close().catch(() => {});
    throw error;
  }
  return Object.freeze({
    directory: store.directory,
    /** Invoke once in the first registered window; an early call does not consume the observation. */
    async runOnce() {
      check(!used, 'already-attempted');
      check(Date.now() >= d.opensAtMs, 'not-due');
      used = true;
      let startedHead: AccumulationJournalHead | null = null;
      const claims = {
        financialActions: false,
        qualificationAuthority: false,
        orderAuthority: false,
        completeEpisodeVerified: false,
        profitabilityVerified: false,
      } as const;
      try {
        const captured = await capture.collect();
        if (captured.status !== 'verified' || !isVerifiedAccumulationDecisionPacket(captured.verified)) {
          const failureRef = await retain('capture-failure', 'capture-failure', {
            status: captured.status,
            directory: captured.directory,
            seal: captured.seal,
            atMs: Date.now(),
          });
          check(Date.now() < r.openingAtMs + 3_600_000, 'failed-slot-clock-unresolved');
          await session.transition({
            kind: 'decision-slot',
            evidence: [failureRef],
            input: {
              slot: 0,
              atMs: Date.now(),
              status: 'failed',
              packetSha256: captured.seal.sha256,
              reason: 'capture-failed',
            },
          });
          return { status: 'capture-failed', ...claims };
        }
        const bridge = captured.verified,
          p = bridge.packet;
        const retained = await inventory(captured);
        check(retained.manifest.registrationSha256 === r.decisionRegistrationSha256, 'decision-retention-binding');
        const clockBytes = retained.clocks.get('observation-clocks.json');
        check(clockBytes, 'capture-clock-required');
        const captureClock = JSON.parse(clockBytes.toString('utf8'));
        check(
          captureClock.anchor === 'before-original-context-dispatch' &&
            captureClock.decisionAtMs === p.decisionAtMs &&
            typeof captureClock.poolDispatchMonotonicNs === 'string' &&
            /^\d{1,25}$/.test(captureClock.poolDispatchMonotonicNs),
          'capture-clock-binding'
        );
        const fresh = () => {
          const wall = Date.now(),
            elapsed = process.hrtime.bigint() - BigInt(captureClock.poolDispatchMonotonicNs);
          return (
            wall >= p.decisionAtMs &&
            wall < r.openingAtMs + 60_000 &&
            wall - p.contextReceivedAtMs < 5000 &&
            wall - p.block.timestampMs <= 60_000 &&
            elapsed >= 0n &&
            elapsed < 5_000_000_000n
          );
        };
        const captureRef = await retain('decision-capture', 'decision-capture', retained.manifest);
        const mark = {
          blockHash: p.block.hash,
          blockNumber: p.block.height,
          observedAtMs: p.block.timestampMs,
          receivedAtMs: p.contextReceivedAtMs,
          price: p.currentPrice,
        };
        await session.transition({ kind: 'valuation', input: { atMs: p.decisionAtMs, mark }, evidence: [captureRef] });
        const initiallyFresh = fresh();
        await session.transition({
          kind: 'decision-slot',
          evidence: [captureRef],
          input: {
            slot: 0,
            atMs: p.decisionAtMs,
            status: initiallyFresh ? 'ready' : 'expired',
            packetSha256: p.packetSha256,
            reason: initiallyFresh ? null : 'expired-before-admission',
          },
        });
        if (!initiallyFresh || !fresh()) {
          await retain('expiry', 'pre-admission-expiry', { atMs: Date.now(), captureClock, modelCalled: false });
          return { status: 'expired-before-admission', ...claims };
        }
        const base = await session.inspect(bridge);
        const coverage = auditAccumulationHourlyCoverage(
          base.snapshot,
          {
            kind: 'accumulation-hourly-research-schedule-v1',
            episodeId: r.episodeId,
            registrationSha256: expectedRegistrationSha256,
            openingAtMs: r.openingAtMs,
            controlOffsetMs: 0,
            decisionWindowMs: 60_000,
            capitalKusdCodec: r.capitalKusdCodec,
            feeReserveXorCodec: r.feeReserveXorCodec,
          },
          Date.now(),
          0
        );
        await retain('due-coverage', 'first-due-coverage', coverage);
        check(coverage.structuralCoverageComplete && coverage.requiredObservationsPassed, 'due-coverage');
        if (base.replay.status !== 'eligible' || !base.replay.episode) {
          await retain('ineligible', 'ineligible-projection', { status: base.replay.status, atMs: Date.now() });
          return { status: 'ineligible', ...claims };
        }
        const episode = base.replay.episode as Data;
        const input = Buffer.from(JSON.stringify({ kind: 'accumulation-admission-request-v1', packet: p, episode }));
        const inputSha = sha(input),
          inputRef = await store.retainEvidence('admission-input', 'first-admission-input', input);
        if (!fresh()) {
          await retain('expiry', 'pre-start-expiry', { atMs: Date.now(), captureClock, modelCalled: false });
          return { status: 'expired-before-admission', ...claims };
        }
        const invocationId = 'first-admission';
        const start = await session.transition({
          kind: 'admission-start',
          evidence: [inputRef, captureRef],
          input: {
            invocationId,
            atMs: Date.now(),
            inputSha256: inputSha,
            packetSha256: p.packetSha256,
          },
        });
        startedHead = start.snapshot.head;
        check(
          startedHead.recordCount === base.snapshot.head.recordCount + 1 &&
            same(start.replay.baseJournal, {
              recordCount: base.snapshot.head.recordCount,
              headSha256: base.snapshot.head.headSha256,
              prefixSha256: base.snapshot.head.prefixSha256,
            }) &&
            (start.replay.journal as Data).reducerRevision === episode.journalRevision,
          'base-to-start-binding'
        );
        if (!fresh()) {
          await session.transition({
            kind: 'admission-failure',
            evidence: [inputRef],
            input: {
              invocationId,
              atMs: Date.now(),
              inputSha256: inputSha,
              reason: 'expired-before-invocation',
            },
          });
          return { status: 'expired-before-invocation', ...claims };
        }
        const workerRequest: AccumulationSubprocessRequest = {
          runner: 'admission',
          repositoryRoot: r.runtime.repositoryRoot,
          pythonExecutable: r.runtime.pythonExecutable,
          trusted: {
            registrationSha256: expectedRegistrationSha256,
            pythonSha256: r.runtime.pythonSha256,
            sourceBindings: r.runtime.admissionSourceBindings,
          },
          input,
          limits: LIMITS,
        };
        const receipt = await runAccumulationSubprocess(workerRequest);
        const receiptRef = await store.retainEvidence(
          'admission-transport',
          'first-admission-transport',
          Buffer.from(JSON.stringify(receipt) + '\n')
        );
        check(same((await store.snapshot()).head, startedHead), 'intervening-head');
        const result = validateAccumulationAdmissionResult(input, receipt, {
          repositoryRoot: r.runtime.repositoryRoot,
          pythonExecutable: r.runtime.pythonExecutable,
          ...workerRequest.trusted,
          modelSha256: MODEL,
          expectedInputSha256: inputSha,
          expectedEpisode: {
            episodeId: r.episodeId,
            journalPrefixSha256: base.snapshot.head.prefixSha256,
            journalRevision: Number(episode.journalRevision),
            projectionSha256: sha(canonical(episode)),
          },
          expectedPacketSha256: p.packetSha256,
          limits: LIMITS,
        });
        const completed = await session.transition({
          kind: 'admission-result',
          evidence: [inputRef, receiptRef],
          input: {
            invocationId,
            atMs: Date.now(),
            inputSha256: inputSha,
            outputSha256: result.outputSha256,
            status: result.status,
            action: result.decision?.action ?? null,
            selectedInputKusd: result.decision?.selected_input_kusd ?? null,
            reason: result.decision?.reason ?? 'incomplete-result',
          },
        });
        const completion = assessAccumulationAdmissionCompletion(result);
        const originalCaptureStillFresh = fresh();
        await retain('completion', 'first-admission-completion', {
          completion,
          originalCaptureStillFresh,
          baseHead: base.snapshot.head,
          startedHead,
          completedHead: completed.snapshot.head,
        });
        check(same((await store.snapshot()).head, completed.snapshot.head), 'completion-head-changed');
        const finalCompletion = assessAccumulationAdmissionCompletion(result);
        const finalFresh = fresh();
        // Final retained assessment has its own observation time; this probe grants no later commit capability.
        await retain('probe-result', 'first-admission-result', {
          decision: result.decision,
          completion: finalCompletion,
          originalCaptureStillFresh: finalFresh,
          checkedAtMs: Date.now(),
          ...claims,
        });
        check(same((await store.snapshot()).head, completed.snapshot.head), 'final-head-changed');
        return {
          status: 'evaluated',
          decision: result.decision,
          completion: assessAccumulationAdmissionCompletion(result),
          originalCaptureStillFresh: fresh(),
          ...claims,
        };
      } catch (error) {
        await store.quarantine(startedHead ? 'admission-unresolved' : 'first-observation-unresolved').catch(() => {});
        throw error;
      } finally {
        await store.close().catch(() => {});
      }
    },
  });
}
