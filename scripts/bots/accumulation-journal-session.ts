/** Compose durable storage with the isolated exact replay worker.
 * This verifies local reconstruction only; native source/coverage authentication
 * remains a separate prerequisite. It never runs the policy or places an order.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  AccumulationJournalStore,
  canonicalAccumulationJournalJson as canonical,
  type AccumulationEvidenceReference,
  type AccumulationJournalHead,
  type AccumulationJournalSnapshot,
} from './accumulation-journal-store';
import {
  runAccumulationSubprocess,
  type AccumulationSubprocessRequest,
  type AccumulationSubprocessReceipt,
} from './accumulation-subprocess';
import { isVerifiedAccumulationDecisionPacket, type AccumulationBridgeResult } from './accumulation-evidence-bridge';

export interface AccumulationJournalRuntime {
  repositoryRoot: string;
  pythonExecutable: string;
  /** Pins come from trusted registration, never from the journal/worker being checked. */
  trusted: AccumulationSubprocessRequest['trusted'];
}
export interface AccumulationJournalEvent {
  kind: string;
  input: Record<string, unknown>;
  evidence: AccumulationEvidenceReference[];
}
type Worker = (request: AccumulationSubprocessRequest) => Promise<AccumulationSubprocessReceipt>;
type Data = Record<string, unknown>;
export interface AccumulationJournalOperation {
  snapshot: AccumulationJournalSnapshot;
  replay: Data;
  transport: AccumulationSubprocessReceipt;
  retainedInvocation: AccumulationEvidenceReference[];
  evidenceAuthentication: 'registered-journal-reconstruction-only';
  financialActions: false;
  qualificationAuthority: false;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`accumulation-session:${reason}`);
}
function sha(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
function object(value: unknown): Data {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'object');
  return value as Data;
}
function headProjection(head: AccumulationJournalHead): Data {
  return { recordCount: head.recordCount, headSha256: head.headSha256, prefixSha256: head.prefixSha256 };
}
function equal(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

/** Session authority is limited to reconstructing an independently registered local journal. */
export class AccumulationJournalSession {
  private busy = false;
  private failed = false;
  private readonly runtime: AccumulationJournalRuntime;
  private constructor(
    private readonly store: AccumulationJournalStore,
    runtime: AccumulationJournalRuntime,
    private readonly worker: Worker
  ) {
    check(store instanceof AccumulationJournalStore, 'owned-store-required');
    this.runtime = JSON.parse(canonical(runtime)) as AccumulationJournalRuntime;
  }

  /** Production composition always uses the real fixed-path bounded subprocess helper. */
  static create(store: AccumulationJournalStore, runtime: AccumulationJournalRuntime): AccumulationJournalSession {
    return new AccumulationJournalSession(store, runtime, runAccumulationSubprocess);
  }
  /** Explicit test boundary for malformed/stale child receipts; never selected by serialized input. */
  static forTesting(
    store: AccumulationJournalStore,
    runtime: AccumulationJournalRuntime,
    worker: Worker
  ): AccumulationJournalSession {
    return new AccumulationJournalSession(store, runtime, worker);
  }

  private async invoke(
    before: AccumulationJournalSnapshot,
    event: AccumulationJournalEvent | null,
    packet: AccumulationBridgeResult['packet'] | null
  ) {
    check(this.runtime.trusted.registrationSha256 === before.head.registrationSha256, 'runtime-registration');
    const request = {
      kind: 'accumulation-journal-replay-request-v1',
      operation: event ? 'transition' : 'replay',
      episodeId: before.head.episodeId,
      registrationSha256: before.head.registrationSha256,
      journalJsonl: before.journalJsonl,
      expectedRecordCount: before.head.recordCount,
      expectedHeadSha256: before.head.headSha256,
      packet,
      ...(event ? { nextEvent: event } : {}),
    };
    const input = Buffer.from(JSON.stringify(request));
    check(input.length <= 2 * 1024 * 1024, 'input-bound');
    const id = `replay-${before.head.recordCount}-${randomUUID()}`;
    const inputRef = await this.store.retainEvidence('journal-worker-request', `${id}-request`, input);
    const receipt = await this.worker({
      ...this.runtime,
      runner: 'journal',
      input,
      limits: {
        timeoutMs: 30000,
        maxInputBytes: 2 * 1024 * 1024,
        maxStdoutBytes: 256 * 1024,
        maxStderrBytes: 64 * 1024,
      },
    });
    const transportBytes = Buffer.from(JSON.stringify(receipt));
    check(transportBytes.length <= 2 * 1024 * 1024, 'transport-bound');
    const transportRef = await this.store.retainEvidence('journal-worker-transport', `${id}-transport`, transportBytes);
    check(
      receipt.outcome === 'completed' &&
        receipt.closeObserved &&
        !receipt.outcomeUnknown &&
        !receipt.terminationUnconfirmed &&
        receipt.input.sha256 === sha(input) &&
        receipt.input.writeCompleted &&
        receipt.before.length === 6 &&
        receipt.after.length === 6 &&
        [...receipt.before, ...receipt.after].every((binding) => binding.status === 'match') &&
        receipt.errors.length === 0 &&
        !receipt.stdout.truncated &&
        !receipt.stderr.truncated &&
        receipt.stderr.observedBytes === 0,
      'worker-not-complete'
    );
    const raw = Buffer.from(receipt.stdout.retainedBase64, 'base64');
    check(
      raw.length === receipt.stdout.retainedBytes &&
        raw.length === receipt.stdout.observedBytes &&
        sha(raw) === receipt.stdout.retainedSha256 &&
        sha(raw) === receipt.stdout.observedSha256,
      'output-byte-binding'
    );
    const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    const replay = object(JSON.parse(text));
    check(
      canonical(replay) + '\n' === text &&
        replay.kind === 'accumulation-journal-replay-result-v1' &&
        replay.inputSha256 === sha(input) &&
        equal(replay.baseJournal, headProjection(before.head)) &&
        replay.financialActions === false &&
        replay.qualificationAuthority === false &&
        replay.policyCalled === false &&
        replay.scheduleCompletenessVerified === false &&
        replay.evidenceAuthentication === 'trusted-parent-source-and-head-required',
      'worker-result-binding'
    );
    const dependencyPins = Object.fromEntries(
      this.runtime.trusted.sourceBindings
        .filter((binding) => binding.path !== 'scripts/bots/accumulation_journal_replay.py')
        .map((binding) => [binding.path.split('/').at(-1), binding.sha256])
    );
    check(
      equal(replay.sourceSha256, dependencyPins) &&
        typeof replay.status === 'string' &&
        ['eligible', 'ineligible', 'incomplete'].includes(replay.status) &&
        (replay.status === 'eligible') === (replay.episode !== null) &&
        typeof replay.stateSha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(replay.stateSha256),
      'worker-source-or-state'
    );
    const after = await this.store.snapshot();
    check(equal(after.head, before.head), 'intervening-journal-change');
    return { replay, transport: receipt, retainedInvocation: [inputRef, transportRef] };
  }
  private start(): void {
    check(!this.failed && !this.busy, 'session-unavailable');
    this.busy = true;
  }
  private output(
    snapshot: AccumulationJournalSnapshot,
    result: Awaited<ReturnType<AccumulationJournalSession['invoke']>>
  ): AccumulationJournalOperation {
    return {
      snapshot,
      ...result,
      evidenceAuthentication: 'registered-journal-reconstruction-only',
      financialActions: false,
      qualificationAuthority: false,
    };
  }

  /** Reproduce a complete prefix and durably append the exact proposed transition.
   * Rejected reducer transitions are retained too, including any returned stop/peak.
   */
  async transition(supplied: AccumulationJournalEvent): Promise<AccumulationJournalOperation> {
    this.start();
    try {
      const event = JSON.parse(canonical(supplied)) as AccumulationJournalEvent;
      const before = await this.store.snapshot();
      const result = await this.invoke(before, event, null);
      const proposal = object(result.replay.proposal);
      check(typeof proposal.recordJsonl === 'string', 'missing-proposal');
      const line = proposal.recordJsonl;
      const record = object(JSON.parse(line));
      const recordResult = object(record.result);
      check(
        equal(Object.keys(recordResult).sort(), ['details', 'reason', 'stateSha256', 'status']) &&
          typeof recordResult.status === 'string' &&
          ['applied', 'recorded', 'rejected'].includes(recordResult.status) &&
          recordResult.stateSha256 === result.replay.stateSha256,
        'record-result-consistency'
      );
      check(
        canonical(record) + '\n' === line &&
          record.kind === event.kind &&
          equal(record.input, event.input) &&
          equal(record.evidence, event.evidence) &&
          record.episodeId === before.head.episodeId &&
          record.registrationSha256 === before.head.registrationSha256 &&
          record.sequence === before.head.recordCount + 1 &&
          record.previousRecordSha256 === before.head.headSha256 &&
          proposal.headSha256 === sha(line) &&
          proposal.recordCount === before.head.recordCount + 1 &&
          proposal.prefixSha256 === sha(before.journalJsonl + line),
        'proposal-binding'
      );
      const projectedHead = {
        recordCount: proposal.recordCount,
        headSha256: proposal.headSha256,
        prefixSha256: proposal.prefixSha256,
      };
      const workerHead = object(result.replay.journal);
      check(
        equal(projectedHead, {
          recordCount: workerHead.recordCount,
          headSha256: workerHead.headSha256,
          prefixSha256: workerHead.prefixSha256,
        }),
        'proposed-head-binding'
      );
      await this.store.retainEvidence(
        'journal-append-proof',
        `append-${before.head.recordCount + 1}-${randomUUID()}`,
        Buffer.from(
          JSON.stringify({ base: before.head, proposal: projectedHead, invocation: result.retainedInvocation })
        )
      );
      const snapshot = await this.store.append(before.head, line);
      check(equal(headProjection(snapshot.head), projectedHead), 'persisted-head-binding');
      return this.output(snapshot, result);
    } catch (error) {
      this.failed = true;
      await this.store.quarantine('transition-unresolved').catch(() => {});
      throw error;
    } finally {
      this.busy = false;
    }
  }

  /** Inspect reconstructed accounting. An actual bridge-owned packet adds the full mark join.
   * An eligible math projection is diagnostic only: source and schedule verification
   * are explicitly absent, so this method never invokes the admission policy.
   */
  async inspect(bridge?: AccumulationBridgeResult): Promise<AccumulationJournalOperation> {
    if (bridge) check(isVerifiedAccumulationDecisionPacket(bridge), 'bridge-ownership-required');
    this.start();
    try {
      const before = await this.store.snapshot();
      const result = await this.invoke(before, null, bridge?.packet ?? null);
      check(result.replay.proposal === null, 'unexpected-inspection-proposal');
      const workerHead = object(result.replay.journal);
      check(
        equal(headProjection(before.head), {
          recordCount: workerHead.recordCount,
          headSha256: workerHead.headSha256,
          prefixSha256: workerHead.prefixSha256,
        }),
        'inspection-prefix'
      );
      if (result.replay.episode !== null) {
        const episode = object(result.replay.episode);
        check(
          bridge &&
            episode.episodeId === before.head.episodeId &&
            episode.journalPrefixSha256 === before.head.prefixSha256 &&
            episode.journalRevision === workerHead.reducerRevision,
          'episode-prefix'
        );
      }
      return this.output(before, result);
    } catch (error) {
      this.failed = true;
      await this.store.quarantine('inspection-unresolved').catch(() => {});
      throw error;
    } finally {
      this.busy = false;
    }
  }
}
