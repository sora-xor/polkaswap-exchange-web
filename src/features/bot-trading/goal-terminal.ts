/** Read-only canonical deadline valuation. It cannot sign, submit, release funds, or resolve an uncertain order. */
import { u8aToHex, stringToU8a } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import { createHistoricalExecutionPoolCodec } from './execution-codecs/pool';
import { createHistoricalExecutionCodec } from './execution-codecs/execution';
import { GOAL_EXACT_POLICY, settleGoalExactTerminal, restoreGoalExactLedger } from './goal-exact-ledger';
import type { GoalExactLedgerState, GoalExactMark, GoalExactTerminalReceipt } from './goal-exact-ledger';
import type { ExecutionStateDependencies, ExecutionRpcMethod } from './execution-state';

export const GOAL_TERMINAL_POLICY = Object.freeze({
  id: 'canonical-original-deadline-v1',
  timeoutMs: 30000,
  maximumRpcCalls: 256,
  maximumResponseCharacters: 4300000,
  maximumTotalResponseCharacters: 128 * 1024 * 1024,
  maximumBlockReads: 35,
} as const);
export interface GoalTerminalRequest {
  goalId: string;
  deadlineAtMs: number;
  /** Last accounted block, never a caller-selected terminal answer. */
  minimumBlockNumber: number;
  minimumBlockHash: string;
  minimumTimestampMs: number;
  expectedDenominator: string;
}
export interface GoalTerminalBlock {
  hash: string;
  height: number;
  parentHash: string;
  timestampMs: number;
}
export interface GoalTerminalEvidence {
  readonly kind: 'canonical-original-deadline-evidence';
  readonly policy: typeof GOAL_TERMINAL_POLICY;
  readonly request: Readonly<GoalTerminalRequest>;
  readonly genesisHash: string;
  readonly finalized: Readonly<{ hash: string; height: number }>;
  readonly block: Readonly<GoalTerminalBlock>;
  readonly successor: Readonly<GoalTerminalBlock>;
  readonly mark: GoalExactMark;
  readonly runtimeProfile: Readonly<{
    specVersion: number;
    transactionVersion: number;
    metadataSha256: string;
    codeHash: string;
  }>;
  readonly checkedAtMs: number;
  readonly receivedAtMs: number;
  readonly rpcCalls: number;
  readonly rpcEvidenceSha256: string;
  readonly evidenceSha256: string;
}
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const labels = ['timestamp', 'denominator', 'kusd', 'xor', 'dex0', 'properties', 'reserves'] as const;
const owned = new WeakMap<object, () => void>();
export class GoalTerminalError extends Error {
  constructor(
    readonly reason:
      | 'invalid'
      | 'unavailable'
      | 'context-changed'
      | 'timeout'
      | 'aborted'
      | 'not-finalized'
      | 'unowned'
      | 'accounting'
  ) {
    super(`Goal terminal ${reason}`);
    this.name = 'GoalTerminalError';
  }
}
const fail = (reason: GoalTerminalError['reason'] = 'invalid'): never => {
  throw new GoalTerminalError(reason);
};
function check(v: unknown, reason?: GoalTerminalError['reason']): asserts v {
  if (!v) fail(reason);
}
const integer = (v: unknown, maximum = Number.MAX_SAFE_INTEGER): number => {
  check(Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= maximum);
  return v as number;
};
const hash = (v: unknown): string => {
  check(typeof v === 'string' && HASH.test(v));
  return v;
};
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const digest = (v: unknown) => u8aToHex(sha256AsU8a(stringToU8a(canonical(v)))).slice(2);
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
/** Bound and copy own JSON data without invoking supplied accessors. */
function snapshot<T>(v: T): T {
  let nodes = 0,
    characters = 0;
  const copy = (value: unknown, depth: number): unknown => {
    check(++nodes <= 4096 && depth <= 16);
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      integer(value);
      return value;
    }
    if (typeof value === 'string') {
      characters += value.length;
      check(characters <= GOAL_TERMINAL_POLICY.maximumResponseCharacters);
      return value;
    }
    check(value && typeof value === 'object');
    const d = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(d);
    if (Array.isArray(value)) {
      check(
        Object.getPrototypeOf(value) === Array.prototype && value.length <= 256 && keys.length === value.length + 1
      );
      return Array.from({ length: value.length }, (_, i) => {
        check(d[i]?.enumerable && 'value' in d[i]);
        return copy(d[i].value, depth + 1);
      });
    }
    check([Object.prototype, null].includes(Object.getPrototypeOf(value)) && keys.length <= 128);
    return Object.fromEntries(
      keys.map((key) => {
        check(typeof key === 'string' && d[key].enumerable && 'value' in d[key]);
        return [key, copy(d[key].value, depth + 1)];
      })
    );
  };
  return copy(v, 0) as T;
}
function fields(v: unknown, keys: readonly string[]) {
  check(v && typeof v === 'object' && !Array.isArray(v));
  check(Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k)));
}
function requestCopy(raw: GoalTerminalRequest): Readonly<GoalTerminalRequest> {
  const r = snapshot(raw);
  fields(r, [
    'goalId',
    'deadlineAtMs',
    'minimumBlockNumber',
    'minimumBlockHash',
    'minimumTimestampMs',
    'expectedDenominator',
  ]);
  check(typeof r.goalId === 'string' && r.goalId.length > 0 && r.goalId.length <= 128);
  integer(r.deadlineAtMs);
  check(integer(r.minimumBlockNumber, 0xffffffff) > 0);
  hash(r.minimumBlockHash);
  check(integer(r.minimumTimestampMs) <= r.deadlineAtMs);
  check(
    typeof r.expectedDenominator === 'string' &&
      /^[1-9]\d{0,38}$/.test(r.expectedDenominator) &&
      BigInt(r.expectedDenominator) < 1n << 128n
  );
  return freeze(r);
}
/** Exact terminal data is inspectable after serialization; only the original owned object authorizes a write. */
export function readGoalTerminalEvidence(raw: unknown): GoalTerminalEvidence {
  const e = snapshot(raw) as GoalTerminalEvidence;
  fields(e, [
    'kind',
    'policy',
    'request',
    'genesisHash',
    'finalized',
    'block',
    'successor',
    'mark',
    'runtimeProfile',
    'checkedAtMs',
    'receivedAtMs',
    'rpcCalls',
    'rpcEvidenceSha256',
    'evidenceSha256',
  ]);
  const r = requestCopy(e.request);
  check(
    e.kind === 'canonical-original-deadline-evidence' &&
      canonical(e.policy) === canonical(GOAL_TERMINAL_POLICY) &&
      e.genesisHash === GOAL_EXACT_POLICY.genesisHash
  );
  for (const b of [e.block, e.successor]) {
    fields(b, ['hash', 'height', 'parentHash', 'timestampMs']);
    hash(b.hash);
    hash(b.parentHash);
    check(b.hash !== b.parentHash && integer(b.height, 0xffffffff) > 0);
    integer(b.timestampMs);
  }
  fields(e.finalized, ['hash', 'height']);
  hash(e.finalized.hash);
  integer(e.finalized.height, 0xffffffff);
  check(
    e.finalized.height >= e.successor.height &&
      (e.finalized.height !== e.successor.height || e.finalized.hash === e.successor.hash)
  );
  check(
    e.block.height >= r.minimumBlockNumber &&
      e.block.timestampMs <= r.deadlineAtMs &&
      r.deadlineAtMs - e.block.timestampMs <= GOAL_EXACT_POLICY.maximumMarkAgeMs &&
      e.successor.height === e.block.height + 1 &&
      e.successor.parentHash === e.block.hash &&
      e.successor.hash !== e.block.hash &&
      e.successor.timestampMs > r.deadlineAtMs
  );
  fields(e.mark, ['blockHash', 'blockNumber', 'timestampMs', 'denominator', 'kusdReserveCodec', 'xorReserveCodec']);
  check(
    e.mark.blockHash === e.block.hash &&
      e.mark.blockNumber === e.block.height &&
      e.mark.timestampMs === e.block.timestampMs &&
      e.mark.denominator === r.expectedDenominator
  );
  for (const amount of [e.mark.kusdReserveCodec, e.mark.xorReserveCodec])
    check(typeof amount === 'string' && /^[1-9]\d{0,38}$/.test(amount) && BigInt(amount) < 1n << 128n);
  fields(e.runtimeProfile, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
  check(
    [130, 131].includes(e.runtimeProfile.specVersion) &&
      e.runtimeProfile.transactionVersion === e.runtimeProfile.specVersion &&
      SHA.test(e.runtimeProfile.metadataSha256)
  );
  hash(e.runtimeProfile.codeHash);
  integer(e.checkedAtMs);
  integer(e.receivedAtMs);
  integer(e.rpcCalls, GOAL_TERMINAL_POLICY.maximumRpcCalls);
  check(
    e.checkedAtMs >= r.deadlineAtMs &&
      e.receivedAtMs >= e.checkedAtMs &&
      e.successor.timestampMs <= e.receivedAtMs &&
      e.rpcCalls > 0 &&
      SHA.test(e.rpcEvidenceSha256)
  );
  const { evidenceSha256, ...body } = e;
  check(SHA.test(evidenceSha256) && digest(body) === evidenceSha256);
  return freeze(e);
}
/** Reject imported/forged JSON and revoked provider epochs before any terminal accounting mutation. */
export function assertGoalTerminalEvidence(evidence: GoalTerminalEvidence): void {
  const guard = evidence && typeof evidence === 'object' ? owned.get(evidence) : undefined;
  check(guard, 'unowned');
  guard();
}
/** Close at the original deadline, even when its canonical evidence arrives later. Never rewinds accounting. */
export function terminalGoalExactLedger(
  raw: GoalExactLedgerState,
  evidence: GoalTerminalEvidence,
  receipts: readonly GoalExactTerminalReceipt[] = []
): GoalExactLedgerState {
  assertGoalTerminalEvidence(evidence);
  const state = restoreGoalExactLedger(raw),
    r = evidence.request;
  check(
    state.goalId === r.goalId &&
      state.episode.endedAtMs === r.deadlineAtMs &&
      state.openingMark.denominator === r.expectedDenominator &&
      state.accountingAtMs <= r.deadlineAtMs &&
      state.lastMark.blockNumber === r.minimumBlockNumber &&
      state.lastMark.blockHash === r.minimumBlockHash &&
      state.lastMark.timestampMs === r.minimumTimestampMs &&
      state.lastMark.blockNumber <= evidence.block.height,
    'accounting'
  );
  check(
    state.settlements.every(
      (s) =>
        s.receipt.blockNumber <= evidence.block.height &&
        (s.receipt.blockNumber !== evidence.block.height || s.receipt.blockHash === evidence.block.hash)
    ),
    'accounting'
  );
  return settleGoalExactTerminal(state, {
    expectedRevision: state.revision,
    accountingAtMs: r.deadlineAtMs,
    mark: evidence.mark,
    receipts,
  });
}
/** Bounded binary canonical lookup. The adjacent successor proves the selected block is truly as-of the deadline. */
export function createGoalTerminalProvider(input: ExecutionStateDependencies) {
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const key of ['request', 'connection', 'now'])
    check(descriptors[key]?.enumerable && 'value' in descriptors[key] && typeof descriptors[key].value === 'function');
  const request = descriptors.request.value as ExecutionStateDependencies['request'],
    connection = descriptors.connection.value as ExecutionStateDependencies['connection'],
    now = descriptors.now.value as () => number;
  const capture = async (raw: GoalTerminalRequest, outerSignal?: AbortSignal): Promise<GoalTerminalEvidence> => {
    const r = requestCopy(raw),
      epoch = connection(),
      started = integer(now());
    check(epoch.connected && epoch.identity && typeof epoch.identity === 'object', 'context-changed');
    check(started >= r.deadlineAtMs, 'not-finalized');
    const controller = new AbortController();
    let timedOut = false,
      count = 0,
      total = 0;
    const abort = () => controller.abort();
    outerSignal?.addEventListener('abort', abort, { once: true });
    if (outerSignal?.aborted) abort();
    const timer = setTimeout(() => {
      timedOut = true;
      abort();
    }, GOAL_TERMINAL_POLICY.timeoutMs);
    const guard = () => {
      const active = connection();
      check(active.connected && active.identity === epoch.identity, 'context-changed');
      const at = integer(now());
      check(at >= started, 'context-changed');
      return at;
    };
    const active = () => {
      guard();
      if (controller.signal.aborted) fail(timedOut ? 'timeout' : 'aborted');
    };
    const receipts: unknown[] = [];
    const rpc = async (method: ExecutionRpcMethod, params: readonly unknown[]) => {
      active();
      check(++count <= GOAL_TERMINAL_POLICY.maximumRpcCalls);
      let rejectAbort!: () => void;
      const interrupted = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new GoalTerminalError(timedOut ? 'timeout' : 'aborted'));
        controller.signal.addEventListener('abort', rejectAbort, { once: true });
      });
      try {
        const requestedAtMs = guard();
        const value = snapshot(await Promise.race([request(method, params, controller.signal), interrupted]));
        active();
        const body = canonical(value);
        total += body.length;
        check(total <= GOAL_TERMINAL_POLICY.maximumTotalResponseCharacters);
        receipts.push({ method, params, requestedAtMs, receivedAtMs: guard(), responseSha256: digest(value) });
        return value;
      } finally {
        controller.signal.removeEventListener('abort', rejectAbort);
      }
    };
    const header = (value: unknown) => {
      check(value && typeof value === 'object' && !Array.isArray(value));
      const h = value as Record<string, unknown>;
      check(typeof h.number === 'string' && /^0x(?:0|[1-9a-f][0-9a-f]{0,7})$/.test(h.number));
      const height = Number(BigInt(h.number));
      check(height > 0);
      hash(h.stateRoot);
      hash(h.extrinsicsRoot);
      hash(h.parentHash);
      check(h.digest && typeof h.digest === 'object' && Array.isArray((h.digest as { logs?: unknown }).logs));
      return { height, parentHash: hash(h.parentHash) };
    };
    try {
      check((await rpc('chain_getBlockHash', [0])) === GOAL_EXACT_POLICY.genesisHash);
      const finalizedHash = hash(await rpc('chain_getFinalizedHead', []));
      check(finalizedHash !== GOAL_EXACT_POLICY.genesisHash);
      const finalizedHeader = header(await rpc('chain_getHeader', [finalizedHash]));
      check((await rpc('chain_getBlockHash', [finalizedHeader.height])) === finalizedHash);
      check(finalizedHeader.height > r.minimumBlockNumber, 'not-finalized');
      const cache = new Map<
        number,
        { block: GoalTerminalBlock; mark?: GoalExactMark; profile: GoalTerminalEvidence['runtimeProfile'] }
      >();
      const read = async (height: number) => {
        const previous = cache.get(height);
        if (previous) return previous;
        check(
          cache.size < GOAL_TERMINAL_POLICY.maximumBlockReads &&
            height >= r.minimumBlockNumber &&
            height <= finalizedHeader.height
        );
        const blockHash = hash(await rpc('chain_getBlockHash', [height])),
          h = header(await rpc('chain_getHeader', [blockHash]));
        check(
          h.height === height &&
            h.parentHash !== blockHash &&
            (height !== finalizedHeader.height || blockHash === finalizedHash)
        );
        const runtime = (await rpc('state_getRuntimeVersion', [blockHash])) as Record<string, unknown>;
        check(
          runtime.specName === 'sora-substrate' &&
            [130, 131].includes(Number(runtime.specVersion)) &&
            runtime.transactionVersion === runtime.specVersion
        );
        const metadataHex = await rpc('state_getMetadata', [blockHash]);
        const codeHash = hash(await rpc('state_getStorageHash', ['0x3a636f6465', blockHash]));
        const identity = {
          genesisHash: GOAL_EXACT_POLICY.genesisHash,
          blockHash,
          metadataHex,
          runtimeVersion: { specVersion: runtime.specVersion, transactionVersion: runtime.transactionVersion },
        };
        const codec = createHistoricalExecutionPoolCodec(identity),
          execution = createHistoricalExecutionCodec(identity),
          keys = codec.storageKeys();
        const changes = await rpc('state_queryStorageAt', [labels.map((label) => keys[label]), blockHash]);
        check(Array.isArray(changes) && changes.length === 1);
        fields(changes[0], ['block', 'changes']);
        check(changes[0].block === blockHash && Array.isArray(changes[0].changes) && changes[0].changes.length === 7);
        const proof = {} as Record<(typeof labels)[number], string | null>;
        for (const [i, label] of labels.entries()) {
          const pair = changes[0].changes[i];
          check(Array.isArray(pair) && pair.length === 2 && pair[0] === keys[label]);
          check(
            pair[1] === null ||
              (typeof pair[1] === 'string' && pair[1].length <= 65538 && /^0x(?:[0-9a-f]{2})*$/.test(pair[1]))
          );
          proof[label] = pair[1];
        }
        const pool = codec.decodeStorage(proof);
        check(pool.state.denominator === r.expectedDenominator);
        const block = { hash: blockHash, height, parentHash: h.parentHash, timestampMs: pool.state.timestampMs };
        check(block.timestampMs <= guard());
        for (const entry of cache.values()) {
          check(
            height > entry.block.height
              ? block.timestampMs > entry.block.timestampMs
              : block.timestampMs < entry.block.timestampMs
          );
          if (height === entry.block.height + 1) check(block.parentHash === entry.block.hash);
          if (height + 1 === entry.block.height) check(entry.block.parentHash === block.hash);
        }
        const result = {
          block,
          ...(pool.status === 'present'
            ? {
                mark: {
                  blockHash,
                  blockNumber: height,
                  timestampMs: block.timestampMs,
                  denominator: r.expectedDenominator,
                  kusdReserveCodec: pool.reserves!.kusdCodec,
                  xorReserveCodec: pool.reserves!.xorCodec,
                },
              }
            : {}),
          profile: { ...execution.binding.runtimeVersion, metadataSha256: execution.binding.metadataSha256, codeHash },
        };
        cache.set(height, result);
        return result;
      };
      let lower = await read(r.minimumBlockNumber);
      check(lower.block.hash === r.minimumBlockHash && lower.block.timestampMs === r.minimumTimestampMs, 'accounting');
      let upper = await read(finalizedHeader.height);
      check(lower.block.timestampMs <= r.deadlineAtMs && upper.block.timestampMs > r.deadlineAtMs, 'not-finalized');
      while (upper.block.height - lower.block.height > 1) {
        const mid = await read(Math.floor((lower.block.height + upper.block.height) / 2));
        if (mid.block.timestampMs <= r.deadlineAtMs) lower = mid;
        else upper = mid;
      }
      check(lower.mark);
      const body = {
        kind: 'canonical-original-deadline-evidence' as const,
        policy: GOAL_TERMINAL_POLICY,
        request: r,
        genesisHash: GOAL_EXACT_POLICY.genesisHash,
        finalized: { hash: finalizedHash, height: finalizedHeader.height },
        block: lower.block,
        successor: upper.block,
        mark: lower.mark,
        runtimeProfile: lower.profile,
        checkedAtMs: started,
        receivedAtMs: guard(),
        rpcCalls: count,
        rpcEvidenceSha256: digest(receipts),
      };
      const result = readGoalTerminalEvidence({ ...body, evidenceSha256: digest(body) });
      active();
      owned.set(result, guard);
      return result;
    } catch (error) {
      if (error instanceof GoalTerminalError) throw error;
      return fail('unavailable');
    } finally {
      clearTimeout(timer);
      outerSignal?.removeEventListener('abort', abort);
    }
  };
  return Object.freeze({ capture, assertCurrent: assertGoalTerminalEvidence });
}
