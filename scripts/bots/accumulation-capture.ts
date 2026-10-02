/** One preregistered prospective observation. No model, strategy selection, wallet or transaction API. */
import { createHash } from 'node:crypto';
import { createAccumulationCaptureStore } from './accumulation-capture-store';
import { createAccumulationCloseSource, isAccumulationCloseSourceResult } from './accumulation-close-source';
import {
  createAccumulationBootstrapRequests,
  createAccumulationBootstrapDiscoveryRequest,
} from './accumulation-bootstrap-requests';
import { createAccumulationQuoteRequests } from './accumulation-quote-requests';
import { createAccumulationQuoteTransport } from './accumulation-quote-transport';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import {
  accumulationEvidenceDigest,
  verifyAccumulationDecisionPacket,
  isVerifiedAccumulationDecisionPacket,
  type AccumulationRpcReceipt,
  type AccumulationTrustedSource,
} from './accumulation-evidence-bridge';

const HOUR = 3_600_000;
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
type Data = Record<string, unknown>;

/** Expected runtime pins must be independently established before this future observation is prepared. */
export interface AccumulationCaptureRegistration {
  kind: 'accumulation-capture-registration-v1';
  attemptName: string;
  opensAtMs: number;
  closesAtMs: number;
  completedHourMs: number;
  runtime: {
    metadataSha256: string;
    codeHash: string;
    specVersion: number;
    transactionVersion: number;
    denominator: string;
  };
}
export interface AccumulationCaptureOptions {
  baseDirectory: string;
  registrationBytes: Uint8Array;
  expectedRegistrationSha256: string;
  fetch: typeof globalThis.fetch;
  signal?: AbortSignal;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`accumulation-capture:${reason}`);
}
function fields(value: unknown, names: string[]): Data {
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'plain-fields');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).length === names.length &&
      names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name]),
    'fields'
  );
  return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
}
function integer(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && !Object.is(value, -0);
}
function registration(bytes: Uint8Array, expected: string): AccumulationCaptureRegistration {
  check(bytes instanceof Uint8Array && bytes.length > 0 && bytes.length <= 16_384, 'registration-bytes');
  check(/^[a-f0-9]{64}$/.test(expected) && sha(bytes) === expected, 'registration-digest');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const parsed: unknown = JSON.parse(text);
  // Exact compact JSON plus LF rejects duplicate keys and noncanonical numeric spellings.
  check(JSON.stringify(parsed) + '\n' === text, 'registration-encoding');
  const r = fields(parsed, ['kind', 'attemptName', 'opensAtMs', 'closesAtMs', 'completedHourMs', 'runtime']);
  check(r.kind === 'accumulation-capture-registration-v1', 'registration-kind');
  check(typeof r.attemptName === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(r.attemptName), 'attempt-name');
  check(integer(r.opensAtMs) && integer(r.closesAtMs) && integer(r.completedHourMs), 'window-integer');
  check(
    r.closesAtMs > r.opensAtMs &&
      r.closesAtMs - r.opensAtMs <= 60_000 &&
      r.completedHourMs === Math.floor(r.opensAtMs / HOUR) * HOUR &&
      Math.floor((r.closesAtMs - 1) / HOUR) * HOUR === r.completedHourMs,
    'window'
  );
  const runtime = fields(r.runtime, ['metadataSha256', 'codeHash', 'specVersion', 'transactionVersion', 'denominator']);
  check(typeof runtime.metadataSha256 === 'string' && /^[a-f0-9]{64}$/.test(runtime.metadataSha256), 'metadata-pin');
  check(typeof runtime.codeHash === 'string' && /^0x[a-f0-9]{64}$/.test(runtime.codeHash), 'code-pin');
  check(
    integer(runtime.specVersion) &&
      runtime.specVersion > 0 &&
      runtime.specVersion <= 0xffffffff &&
      integer(runtime.transactionVersion) &&
      runtime.transactionVersion <= 0xffffffff,
    'runtime-version'
  );
  check(
    typeof runtime.denominator === 'string' &&
      /^[1-9][0-9]{0,38}$/.test(runtime.denominator) &&
      BigInt(runtime.denominator) < 1n << 128n,
    'denominator'
  );
  return parsed as AccumulationCaptureRegistration;
}

/**
 * Durably prepare before the registered window. The caller invokes collect during that window;
 * there is no scheduler, automatic retry or recovery. The first finalized head observed after
 * the separately recorded completed close is the sole target and finalized anchor.
 */
export async function prepareAccumulationCapture(options: AccumulationCaptureOptions) {
  const o = fields(options, [
    'baseDirectory',
    'registrationBytes',
    'expectedRegistrationSha256',
    'fetch',
    ...(Object.hasOwn(options, 'signal') ? ['signal'] : []),
  ]);
  check(typeof o.baseDirectory === 'string' && typeof o.fetch === 'function', 'dependencies');
  check(o.signal === undefined || o.signal instanceof AbortSignal, 'signal');
  check(o.registrationBytes instanceof Uint8Array && typeof o.expectedRegistrationSha256 === 'string', 'registration');
  const bytes = Uint8Array.from(o.registrationBytes);
  const r = registration(bytes, o.expectedRegistrationSha256);
  const expectedSha = o.expectedRegistrationSha256;
  const signal = o.signal as AbortSignal | undefined;
  const fetcher = o.fetch as typeof globalThis.fetch;
  check(Date.now() < r.opensAtMs && !signal?.aborted, 'preparation-too-late-or-aborted');
  const store = await createAccumulationCaptureStore({
    baseDirectory: o.baseDirectory,
    attemptName: r.attemptName,
    registrationBytes: bytes,
    expectedRegistrationSha256: expectedSha,
    maximumBytes: 64 * 1024 * 1024,
    maximumRecords: 128,
  });
  await store.retain(
    'prepared.json',
    JSON.stringify({
      kind: 'accumulation-capture-prepared-v1',
      preparedAtMs: Date.now(),
      registrationSha256: expectedSha,
      targetRule: 'first-finalized-head-after-completed-close',
    }) + '\n'
  );
  if (Date.now() >= r.opensAtMs || signal?.aborted) {
    await store.seal({ status: 'failed', reason: 'preparation-too-late-or-aborted' });
    throw Error('accumulation-capture:preparation-too-late-or-aborted');
  }
  let used = false;
  return Object.freeze({
    directory: store.directory,
    /** A single attempt preserves all original failures; a later call cannot resample the same slot. */
    async collect() {
      check(!used, 'already-attempted');
      check(Date.now() >= r.opensAtMs, 'not-due');
      used = true;
      const enteredAtMs = Date.now(),
        enteredNs = process.hrtime.bigint();
      const windowBudgetNs = BigInt(Math.max(0, r.closesAtMs - enteredAtMs)) * 1_000_000n;
      const insideWindow = () => {
        const elapsed = process.hrtime.bigint() - enteredNs;
        const wall = Date.now();
        return (
          enteredAtMs >= r.opensAtMs &&
          wall >= r.opensAtMs &&
          wall < r.closesAtMs &&
          elapsed >= 0n &&
          elapsed < windowBudgetNs
        );
      };
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) controller.abort();
      const expires = setTimeout(abort, Math.max(1, r.closesAtMs - Date.now()));
      const boundedFetch: typeof globalThis.fetch = (url, init) => {
        check(!controller.signal.aborted && insideWindow(), 'window-closed');
        return fetcher(url, init);
      };
      const bootstrap = createAccumulationQuoteTransport({
        profile: 'bootstrap',
        fetch: boundedFetch,
        retain: (name, value) => store.retain(`bootstrap-${name}`, value),
        maximumRequests: 16,
        maximumTotalResponseBytes: 6 * 1024 * 1024,
        timeoutMs: 8000,
        signal: controller.signal,
      });
      const quotes = createAccumulationQuoteTransport({
        fetch: boundedFetch,
        retain: (name, value) => store.retain(`quote-${name}`, value),
        maximumRequests: 28,
        maximumTotalResponseBytes: 28 * 65536,
        timeoutMs: 4000,
        maximumInFlight: 9,
        signal: controller.signal,
      });
      let stage = 'window';
      try {
        check(insideWindow() && !controller.signal.aborted, 'window-closed');
        stage = 'completed-close';
        const close = await createAccumulationCloseSource({
          fetch: boundedFetch,
          retain: (name, value) => store.retain(`source-${name}`, value),
          timeoutMs: 8000,
          signal: controller.signal,
        }).collect({ boundaryUtcMs: r.completedHourMs });
        check(
          isAccumulationCloseSourceResult(close) &&
            close.status === 'complete' &&
            close.closeRowsJson !== null &&
            close.completedClose !== null,
          'completed-close-failed'
        );
        stage = 'target-discovery';
        const discovery = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 1 });
        const discoveryRpc: AccumulationRpcReceipt[] = [];
        let selected = discovery.next(discoveryRpc);
        while (selected.nextRequest) {
          discoveryRpc.push((await bootstrap.request(selected.nextRequest)).receipt);
          selected = discovery.next(discoveryRpc);
        }
        check(selected.completed, 'target-discovery-failed');
        const target = selected.completed.target;
        stage = 'native-bootstrap';
        const planner = createAccumulationBootstrapRequests({ target, finalizedSource: target, rpcIdStart: 3 });
        const contextRpc: AccumulationRpcReceipt[] = [];
        let planned = planner.next(contextRpc);
        while (planned.nextRequest) {
          contextRpc.push((await bootstrap.request(planned.nextRequest)).receipt);
          planned = planner.next(contextRpc);
        }
        check(planned.completed, 'native-bootstrap-failed');
        const context = planned.completed;
        check(
          sha(Buffer.from(context.identity.metadataHex.slice(2), 'hex')) === r.runtime.metadataSha256 &&
            context.identity.runtimeVersion.specVersion === r.runtime.specVersion &&
            context.identity.runtimeVersion.transactionVersion === r.runtime.transactionVersion &&
            context.codeHash === r.runtime.codeHash,
          'registered-runtime-mismatch'
        );
        stage = 'native-pool';
        const producer = createAccumulationQuoteRequests({
          identity: context.identity,
          blockNumber: target.height,
          denominator: r.runtime.denominator,
          rpcIdStart: 1000,
        });
        // Conservative real-time anchor: dispatch is earlier than original response completion.
        const poolDispatchNs = process.hrtime.bigint();
        const pool = await quotes.request(producer.contextRequest);
        check(pool.receipt.failure === null && Array.isArray(pool.result) && pool.result.length === 1, 'pool-response');
        const rawPool = fields(pool.result[0], ['block', 'changes']);
        check(
          rawPool.block === target.hash && Array.isArray(rawPool.changes) && rawPool.changes.length === 7,
          'pool-binding'
        );
        const values = new Map<string, unknown>();
        for (const change of rawPool.changes) {
          check(
            Array.isArray(change) &&
              change.length === 2 &&
              Object.values(producer.storageKeys).includes(change[0]) &&
              !values.has(change[0]),
            'pool-keys'
          );
          values.set(change[0], change[1]);
        }
        const decoded = createHistoricalExecutionPoolCodec(context.identity).decodeStorage(
          Object.fromEntries(Object.entries(producer.storageKeys).map(([name, key]) => [name, values.get(key)]))
        );
        check(
          decoded.status === 'present' && decoded.state.denominator === r.runtime.denominator,
          'pool-or-denominator'
        );
        contextRpc.push(pool.receipt);
        stage = 'nine-quotes-and-fees';
        const candidates: Array<{
          inputKusd: number;
          quoteReceivedAtMs: number;
          feeReceivedAtMs: number;
          expiresAtMs: number;
          rpc: AccumulationRpcReceipt[];
        }> = new Array(9);
        let next = 0;
        const lane = async () => {
          while (next < producer.candidates.length) {
            const index = next++;
            const candidate = producer.candidates[index];
            const quoted = await quotes.request(candidate.quoteRequest);
            const feePlan = producer.feeRequestsForQuote(candidate.inputKusd, quoted.receipt);
            const rpc: AccumulationRpcReceipt[] = [quoted.receipt];
            for (const request of feePlan.feeRequests) rpc.push((await quotes.request(request)).receipt);
            candidates[index] = {
              inputKusd: candidate.inputKusd,
              quoteReceivedAtMs: quoted.receipt.completedAtMs,
              feeReceivedAtMs: rpc[rpc.length - 1].completedAtMs,
              expiresAtMs: Math.min(pool.receipt.completedAtMs, quoted.receipt.completedAtMs) + 5000,
              rpc,
            };
          }
        };
        const lanes = await Promise.allSettled(Array.from({ length: 9 }, () => lane()));
        check(
          lanes.every((result) => result.status === 'fulfilled'),
          'quote-collection-failed'
        );
        check(insideWindow() && !controller.signal.aborted, 'window-closed');
        const decisionElapsedNs = process.hrtime.bigint() - poolDispatchNs;
        const packet = {
          block: target,
          contextReceivedAtMs: pool.receipt.completedAtMs,
          decisionAtMs: Date.now(),
          contextRpc,
          closeRowsJson: close.closeRowsJson,
          candidates,
        };
        const trusted: AccumulationTrustedSource = {
          packetSha256: accumulationEvidenceDigest(packet),
          sourceRegistrationSha256: expectedSha,
          endpoint: 'https://ws.mof.sora.org/',
          finalizedSource: target,
          metadataSha256: r.runtime.metadataSha256,
          codeHash: r.runtime.codeHash,
          runtimeVersion: { specVersion: r.runtime.specVersion, transactionVersion: r.runtime.transactionVersion },
          denominator: r.runtime.denominator,
          completedClose: close.completedClose,
        };
        stage = 'packet-verification';
        await store.retain('packet.json', JSON.stringify(packet) + '\n');
        await store.retain('trusted-acquisition.json', JSON.stringify(trusted) + '\n');
        await store.retain(
          'observation-clocks.json',
          JSON.stringify({
            poolDispatchMonotonicNs: poolDispatchNs.toString(),
            decisionElapsedNs: decisionElapsedNs.toString(),
            decisionAtMs: packet.decisionAtMs,
            anchor: 'before-original-context-dispatch',
          }) + '\n'
        );
        stage = 'decision-clock';
        check(decisionElapsedNs >= 0n && decisionElapsedNs < 5_000_000_000n, 'monotonic-context-expired');
        stage = 'packet-verification';
        const verified = verifyAccumulationDecisionPacket(packet, trusted);
        const status = isVerifiedAccumulationDecisionPacket(verified) ? ('verified' as const) : ('incomplete' as const);
        // This records capture-time verification only. Persistence does not renew the original clocks.
        await store.retain(
          'result.json',
          JSON.stringify({
            status,
            completedAtMs: Date.now(),
            packet: verified.packet,
            diagnostics: verified.diagnostics,
            financialActions: false,
            qualificationAuthority: false,
            modelEvaluated: false,
          }) + '\n'
        );
        const seal = await store.seal({ status: 'complete', reason: null });
        return Object.freeze({
          status,
          directory: store.directory,
          seal,
          verified,
          financialActions: false as const,
          qualificationAuthority: false as const,
          modelEvaluated: false as const,
        });
      } catch {
        controller.abort();
        // Error text from external responses is intentionally not promoted into the trusted terminal record.
        const reason = `capture-failed-${stage}`;
        await store.retain('failure.json', JSON.stringify({ reason, failedAtMs: Date.now() }) + '\n');
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
      } finally {
        clearTimeout(expires);
        signal?.removeEventListener('abort', abort);
        controller.abort();
        bootstrap.close();
        quotes.close();
      }
    },
  });
}
