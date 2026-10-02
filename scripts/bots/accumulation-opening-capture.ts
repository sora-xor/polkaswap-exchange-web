/** Two explicit prospective opening phases. Never acquires closes, quotes, model results or financial authority. */
import { createHash } from 'node:crypto';
import { createAccumulationCaptureStore, AccumulationCaptureStoreError } from './accumulation-capture-store';
import {
  createAccumulationBootstrapDiscoveryRequest,
  createAccumulationBootstrapRequests,
  type AccumulationBootstrapCompleted,
} from './accumulation-bootstrap-requests';
import { createAccumulationQuoteRequests } from './accumulation-quote-requests';
import { createAccumulationQuoteTransport, AccumulationQuoteRetentionError } from './accumulation-quote-transport';
import { accumulationEvidenceDigest, type AccumulationRpcReceipt } from './accumulation-evidence-bridge';
import {
  verifyAccumulationOpeningMark,
  isVerifiedAccumulationOpeningMark,
  type AccumulationOpeningMarkResult,
} from './accumulation-opening-mark';

const HOUR = 3_600_000;
const ENDPOINT = 'https://ws.mof.sora.org/' as const;
const acquired = new WeakSet<object>();
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
type Data = Record<string, unknown>;
export interface AccumulationOpeningCaptureRegistration {
  kind: 'accumulation-opening-capture-registration-v1';
  attemptName: string;
  episodeId: string;
  slotId: string;
  openingAtMs: number;
  deadlineMs: number;
  runtime: {
    metadataSha256: string;
    codeHash: string;
    specVersion: number;
    transactionVersion: number;
    denominator: string;
  };
}
export interface AccumulationOpeningCaptureOptions {
  baseDirectory: string;
  registrationBytes: Uint8Array;
  expectedRegistrationSha256: string;
  fetch: typeof globalThis.fetch;
  signal?: AbortSignal;
}
/** Acquired evidence is retrospective to the original receipt, never an assertion of current admission freshness. */
export interface AcquiredAccumulationOpeningCapture {
  readonly status: 'verified';
  readonly directory: string;
  readonly seal: Readonly<{ path: string; sha256: string; bytes: number }>;
  readonly verified: AccumulationOpeningMarkResult;
  readonly completedAtMs: number;
  readonly registrationSha256: string;
  readonly registration: Readonly<AccumulationOpeningCaptureRegistration>;
  readonly financialActions: false;
  readonly qualificationAuthority: false;
  readonly modelEvaluated: false;
  readonly contemporaneousReadyClaimed: false;
}
function check(ok: unknown, reason: string): asserts ok {
  if (!ok) throw Error(`accumulation-opening-capture:${reason}`);
}
function fields(value: unknown, keys: string[]): Data {
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'plain-fields');
  const ds = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(ds).length === keys.length && keys.every((k) => ds[k]?.enumerable && 'value' in ds[k]),
    'fields'
  );
  return Object.fromEntries(keys.map((k) => [k, ds[k].value]));
}
function integer(v: unknown): v is number {
  return Number.isSafeInteger(v) && Number(v) >= 0 && !Object.is(v, -0);
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
function registration(bytes: Uint8Array, expected: string): Readonly<AccumulationOpeningCaptureRegistration> {
  check(
    bytes.length > 0 &&
      bytes.length <= 16384 &&
      typeof expected === 'string' &&
      /^[a-f0-9]{64}$/.test(expected) &&
      sha(bytes) === expected,
    'registration-binding'
  );
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    parsed = JSON.parse(text);
  check(JSON.stringify(parsed) + '\n' === text, 'registration-encoding');
  const r = fields(parsed, ['kind', 'attemptName', 'episodeId', 'slotId', 'openingAtMs', 'deadlineMs', 'runtime']);
  check(r.kind === 'accumulation-opening-capture-registration-v1', 'registration-kind');
  check(typeof r.attemptName === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(r.attemptName), 'attempt-name');
  for (const key of ['episodeId', 'slotId'])
    check(typeof r[key] === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(r[key] as string), 'slot-identity');
  check(
    integer(r.openingAtMs) &&
      r.openingAtMs >= HOUR &&
      r.openingAtMs % HOUR === 0 &&
      integer(r.deadlineMs) &&
      r.deadlineMs === r.openingAtMs + 24 * HOUR,
    'episode-window'
  );
  const v = fields(r.runtime, ['metadataSha256', 'codeHash', 'specVersion', 'transactionVersion', 'denominator']);
  check(
    typeof v.metadataSha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(v.metadataSha256) &&
      typeof v.codeHash === 'string' &&
      /^0x[a-f0-9]{64}$/.test(v.codeHash),
    'runtime-pins'
  );
  check(
    integer(v.specVersion) &&
      v.specVersion > 0 &&
      v.specVersion <= 0xffffffff &&
      integer(v.transactionVersion) &&
      v.transactionVersion > 0 &&
      v.transactionVersion <= 0xffffffff,
    'runtime-version'
  );
  check(
    typeof v.denominator === 'string' && /^[1-9]\d{0,38}$/.test(v.denominator) && BigInt(v.denominator) < 1n << 128n,
    'denominator'
  );
  return freeze(parsed as AccumulationOpeningCaptureRegistration);
}
/** JSON copies and verifier-only results do not carry this acquisition owner's durable provenance. */
export function isAcquiredAccumulationOpeningCapture(value: unknown): value is AcquiredAccumulationOpeningCapture {
  return !!value && typeof value === 'object' && acquired.has(value);
}

/** Prepare before H−20s; callers explicitly invoke each phase once. There is no wait, retry, reset or recovery. */
export async function prepareAccumulationOpeningCapture(options: AccumulationOpeningCaptureOptions) {
  const o = fields(options, [
    'baseDirectory',
    'registrationBytes',
    'expectedRegistrationSha256',
    'fetch',
    ...(Object.hasOwn(options, 'signal') ? ['signal'] : []),
  ]);
  check(
    typeof o.baseDirectory === 'string' &&
      o.registrationBytes instanceof Uint8Array &&
      typeof o.expectedRegistrationSha256 === 'string' &&
      typeof o.fetch === 'function',
    'dependencies'
  );
  check(o.signal === undefined || o.signal instanceof AbortSignal, 'signal');
  const bytes = Uint8Array.from(o.registrationBytes),
    r = registration(bytes, o.expectedRegistrationSha256),
    pin = o.expectedRegistrationSha256;
  const signal = o.signal as AbortSignal | undefined,
    fetcher = o.fetch as typeof globalThis.fetch;
  const H = r.openingAtMs,
    before = Date.now(),
    preparedNs = process.hrtime.bigint();
  check(integer(before) && before < H - 20000 && !signal?.aborted, 'preparation-too-late-or-aborted');
  const store = await createAccumulationCaptureStore({
    baseDirectory: o.baseDirectory,
    attemptName: r.attemptName,
    registrationBytes: bytes,
    expectedRegistrationSha256: pin,
    maximumBytes: 32 * 1024 * 1024,
    maximumRecords: 64,
  });
  const preparedAtMs = Date.now(),
    preparationElapsedNs = process.hrtime.bigint() - preparedNs;
  await store.retain(
    'prepared.json',
    JSON.stringify({
      kind: 'accumulation-opening-prepared-v1',
      registrationSha256: pin,
      enteredAtMs: before,
      enteredMonotonicNs: preparedNs.toString(),
      preparedAtMs,
      preparationElapsedNs: preparationElapsedNs.toString(),
      bootstrapWindow: [H - 20000, H - 5000],
      captureWindow: [H - 3000, H],
      targetRule: 'first-finalized-discovery-in-bootstrap-window',
    }) + '\n'
  );
  const now = Date.now(),
    elapsed = process.hrtime.bigint() - preparedNs;
  if (
    !integer(now) ||
    now < before ||
    now >= H - 20000 ||
    elapsed < 0n ||
    elapsed >= BigInt(H - 20000 - before) * 1_000_000n ||
    signal?.aborted
  ) {
    await store.seal({ status: 'failed', reason: 'preparation-too-late-or-aborted' });
    throw Error('accumulation-opening-capture:preparation-too-late-or-aborted');
  }
  let state: 'prepared' | 'bootstrapping' | 'bootstrapped' | 'capturing' | 'terminal' | 'unresolved' = 'prepared';
  let context: AccumulationBootstrapCompleted | undefined;
  const discoveryRpc: AccumulationRpcReceipt[] = [],
    bootstrapRpc: AccumulationRpcReceipt[] = [];
  const fail = async (stage: string, error: unknown) => {
    if (error instanceof AccumulationCaptureStoreError || error instanceof AccumulationQuoteRetentionError) {
      state = 'unresolved';
      throw error;
    }
    state = 'terminal';
    try {
      const reason = `opening-failed-${stage}`;
      await store.retain(
        'failure.json',
        JSON.stringify({ reason, failedAtMs: Date.now(), registrationSha256: pin }) + '\n'
      );
      const seal = await store.seal({ status: 'failed', reason });
      return Object.freeze({
        status: 'failed' as const,
        directory: store.directory,
        seal,
        verified: null,
        financialActions: false as const,
        qualificationAuthority: false as const,
        modelEvaluated: false as const,
      });
    } catch (failure) {
      state = 'unresolved';
      throw failure;
    }
  };
  const phase = (name: 'bootstrap' | 'pool', start: number, end: number, inclusive: boolean) => {
    const enteredAtMs = Date.now(),
      enteredNs = process.hrtime.bigint(),
      controller = new AbortController();
    const inside = () => {
      const at = Date.now(),
        observedNs = process.hrtime.bigint(),
        elapsed = observedNs - enteredNs,
        sincePreparation = observedNs - preparedNs,
        budget = BigInt(Math.max(0, end - enteredAtMs)) * 1_000_000n,
        preparationBudget = BigInt(end - before) * 1_000_000n;
      return (
        integer(at) &&
        enteredAtMs >= start &&
        at >= enteredAtMs &&
        (inclusive ? at <= end : at < end) &&
        elapsed >= 0n &&
        sincePreparation >= 0n &&
        (inclusive ? sincePreparation <= preparationBudget : sincePreparation < preparationBudget) &&
        (inclusive ? elapsed <= budget : elapsed < budget)
      );
    };
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(abort, Math.max(1, end - Date.now() + (inclusive ? 1 : 0)));
    let dispatchNs: bigint | undefined;
    const transport = createAccumulationQuoteTransport({
      profile: name === 'bootstrap' ? 'bootstrap' : 'quote',
      fetch: (url, init) => {
        check(!controller.signal.aborted && inside(), 'phase-window');
        dispatchNs = process.hrtime.bigint();
        return fetcher(url, init);
      },
      retain: (name_, value) => store.retain(`${name}-${name_}`, value),
      maximumRequests: name === 'bootstrap' ? 16 : 1,
      maximumTotalResponseBytes: name === 'bootstrap' ? 6 * 1024 * 1024 : 65536,
      timeoutMs: name === 'bootstrap' ? 8000 : 3000,
      signal: controller.signal,
    });
    return {
      enteredAtMs,
      enteredNs,
      controller,
      transport,
      inside,
      dispatchNs: () => dispatchNs,
      stop: () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        controller.abort();
        transport.close();
      },
    };
  };
  return Object.freeze({
    directory: store.directory,
    /** Fix the first observed finalized block; later finalized heads may validate it but never replace it. */
    async bootstrap() {
      check(state === 'prepared', 'bootstrap-unavailable');
      check(Date.now() >= H - 20000, 'bootstrap-not-due');
      state = 'bootstrapping';
      const p = phase('bootstrap', H - 20000, H - 5000, false);
      let stage = 'bootstrap-window';
      try {
        check(p.inside() && !p.controller.signal.aborted, 'bootstrap-window');
        await store.retain(
          'bootstrap-phase-start.json',
          JSON.stringify({ enteredAtMs: p.enteredAtMs, enteredMonotonicNs: p.enteredNs.toString() }) + '\n'
        );
        stage = 'discovery';
        const discovery = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 1 });
        let selected = discovery.next(discoveryRpc);
        while (selected.nextRequest) {
          discoveryRpc.push((await p.transport.request(selected.nextRequest)).receipt);
          selected = discovery.next(discoveryRpc);
        }
        check(selected.completed, 'discovery-failed');
        stage = 'bootstrap';
        const planner = createAccumulationBootstrapRequests({
          target: selected.completed.target,
          finalizedSource: selected.completed.target,
          rpcIdStart: 3,
        });
        let next = planner.next(bootstrapRpc);
        while (next.nextRequest) {
          bootstrapRpc.push((await p.transport.request(next.nextRequest)).receipt);
          next = planner.next(bootstrapRpc);
        }
        check(next.completed, 'bootstrap-failed');
        context = next.completed;
        check(
          context.metadataSha256 === r.runtime.metadataSha256 &&
            context.codeHash === r.runtime.codeHash &&
            context.identity.runtimeVersion.specVersion === r.runtime.specVersion &&
            context.identity.runtimeVersion.transactionVersion === r.runtime.transactionVersion,
          'runtime-mismatch'
        );
        check(p.inside() && !p.controller.signal.aborted, 'bootstrap-window');
        await store.retain(
          'bootstrap-phase-complete.json',
          JSON.stringify({
            target: context.target,
            assessedAtMs: Date.now(),
            elapsedNs: (process.hrtime.bigint() - p.enteredNs).toString(),
            lastOriginalReceiptAtMs: bootstrapRpc.at(-1)!.completedAtMs,
          }) + '\n'
        );
        check(p.inside() && !p.controller.signal.aborted, 'bootstrap-window');
        state = 'bootstrapped';
        return Object.freeze({
          status: 'bootstrapped' as const,
          directory: store.directory,
          target: context.target,
          completedAtMs: Date.now(),
        });
      } catch (error) {
        return await fail(stage, error);
      } finally {
        p.stop();
      }
    },
    /** Receive the original pool state by H. Verification and durable completion may truthfully occur later. */
    async capture() {
      check(state === 'bootstrapped' && context, 'capture-unavailable');
      check(Date.now() >= H - 3000, 'capture-not-due');
      state = 'capturing';
      const p = phase('pool', H - 3000, H, true);
      let stage = 'pool-window';
      try {
        check(p.inside() && !p.controller.signal.aborted, 'pool-window');
        await store.retain(
          'pool-phase-start.json',
          JSON.stringify({ enteredAtMs: p.enteredAtMs, enteredMonotonicNs: p.enteredNs.toString() }) + '\n'
        );
        const producer = createAccumulationQuoteRequests({
          identity: context.identity,
          blockNumber: context.target.height,
          denominator: r.runtime.denominator,
          rpcIdStart: 1000,
        });
        stage = 'pool';
        const pool = await p.transport.request(producer.contextRequest);
        // This conservative bound ends at original response completion, not the later durable recorder ACK.
        const dispatchNs = p.dispatchNs(),
          receiptElapsedNs = BigInt(pool.raw.elapsedNs);
        const throughReceiptNs = dispatchNs === undefined ? -1n : dispatchNs - p.enteredNs + receiptElapsedNs;
        const fromPreparationThroughReceiptNs =
          dispatchNs === undefined ? -1n : dispatchNs - preparedNs + receiptElapsedNs;
        await store.retain(
          'pool-observation-clocks.json',
          JSON.stringify({
            enteredAtMs: p.enteredAtMs,
            dispatchMonotonicNs: dispatchNs?.toString() ?? null,
            originalReceiptAtMs: pool.receipt.completedAtMs,
            throughReceiptNs: throughReceiptNs.toString(),
            preparationAtMs: before,
            preparationMonotonicNs: preparedNs.toString(),
            fromPreparationThroughReceiptNs: fromPreparationThroughReceiptNs.toString(),
            returnedAtMs: Date.now(),
            anchor: 'before-owned-fetch-dispatch-not-recorder-ack',
          }) + '\n'
        );
        check(
          pool.receipt.failure === null &&
            pool.raw.responseComplete &&
            throughReceiptNs >= 0n &&
            throughReceiptNs <= BigInt(H - p.enteredAtMs) * 1_000_000n &&
            fromPreparationThroughReceiptNs >= 0n &&
            fromPreparationThroughReceiptNs <= BigInt(H - before) * 1_000_000n &&
            pool.receipt.completedAtMs > H - 5000 &&
            pool.receipt.completedAtMs <= H,
          'original-pool-arrival'
        );
        const raw = {
          kind: 'accumulation-opening-mark-evidence-v2' as const,
          discoveryRpc,
          bootstrapRpc,
          poolRpc: pool.receipt,
        };
        const trusted = {
          rawSha256: accumulationEvidenceDigest(raw),
          sourceRegistrationSha256: pin,
          endpoint: ENDPOINT,
          runtime: {
            specVersion: r.runtime.specVersion,
            transactionVersion: r.runtime.transactionVersion,
            metadataSha256: r.runtime.metadataSha256,
            codeHash: r.runtime.codeHash,
          },
          denominator: r.runtime.denominator,
        };
        const slot = { episodeId: r.episodeId, slotId: r.slotId, openingAtMs: H, deadlineMs: r.deadlineMs };
        await store.retain('opening-evidence.json', JSON.stringify(raw) + '\n');
        await store.retain('opening-trust.json', JSON.stringify({ trusted, slot }) + '\n');
        stage = 'verification';
        const verified = verifyAccumulationOpeningMark(raw, trusted, slot);
        check(isVerifiedAccumulationOpeningMark(verified), 'opening-verifier');
        await store.retain(
          'result.json',
          JSON.stringify({
            status: 'verified',
            assessedAtMs: Date.now(),
            originalReceiptAtMs: pool.receipt.completedAtMs,
            rawSha256: trusted.rawSha256,
            mark: verified.mark,
            financialActions: false,
            qualificationAuthority: false,
            modelEvaluated: false,
            contemporaneousReadyClaimed: false,
          }) + '\n'
        );
        const seal = await store.seal({ status: 'complete', reason: null });
        state = 'terminal';
        const result: AcquiredAccumulationOpeningCapture = Object.freeze({
          status: 'verified',
          directory: store.directory,
          seal,
          verified,
          completedAtMs: Date.now(),
          registrationSha256: pin,
          registration: r,
          financialActions: false,
          qualificationAuthority: false,
          modelEvaluated: false,
          contemporaneousReadyClaimed: false,
        });
        acquired.add(result);
        return result;
      } catch (error) {
        return await fail(stage, error);
      } finally {
        p.stop();
      }
    },
  });
}
