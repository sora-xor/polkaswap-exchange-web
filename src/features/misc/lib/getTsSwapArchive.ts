import type { GetTsArchivedSwapEvidence } from './getTsSwapProgress';
import { SORA_FUNDING_MAINNET_GENESIS } from './tonswapLiquidity';

const ARCHIVE = 'https://mof2.sora.org/';
const EVENTS_KEY = '0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7';
const HASH = /^0x[0-9a-f]{64}$/i;
const MAX_BYTES = 4 * 1024 * 1024;

export interface GetTsSwapArchiveRuntime {
  specName: string;
  specVersion: number;
  transactionVersion: number;
  stateVersion: number;
}
interface ArchiveDependencies {
  fetch: typeof fetch;
  isCurrent(): boolean;
  decodeBlock(value: unknown): GetTsArchivedSwapEvidence['block'];
  decodeEvents(value: string): GetTsArchivedSwapEvidence['events'];
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Only the node's explicit historical-state pruning error permits this dedicated receipt reader. */
export function isPrunedGetTsSwapStateError(error: unknown): boolean {
  return /state (?:already )?(?:discarded|pruned)|state is not available/i.test(String(error));
}

/**
 * Reads one exact block's receipt from the existing approved archive. The caller
 * supplies a mainnet-canonical finalized block and a matching live decoder. This
 * does not switch the live node or trust an indexed/local completion status.
 */
export async function readGetTsSwapArchive(
  blockHash: string,
  height: number,
  runtime: GetTsSwapArchiveRuntime,
  deps: ArchiveDependencies
): Promise<GetTsArchivedSwapEvidence> {
  if (
    !HASH.test(blockHash) ||
    !Number.isSafeInteger(height) ||
    height < 1 ||
    runtime.specName !== 'sora-substrate' ||
    ![runtime.specVersion, runtime.transactionVersion, runtime.stateVersion].every(
      (value) => Number.isSafeInteger(value) && value >= 0
    )
  )
    throw new Error('Invalid archived receipt context');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let sequence = 0;
  const current = () => {
    if (controller.signal.aborted || !deps.isCurrent()) throw new Error('Archived receipt context changed');
  };
  const rpc = async (calls: Array<[string, unknown[]]>): Promise<unknown[]> => {
    current();
    const requests = calls.map(([method, params]) => ({ jsonrpc: '2.0', id: ++sequence, method, params }));
    const response = await deps.fetch(ARCHIVE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requests),
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
    });
    current();
    if (!response.ok || Number(response.headers.get('content-length') || 0) > MAX_BYTES || !response.body)
      throw new Error('Archived receipt unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let size = 0;
    let text = '';
    try {
      while (true) {
        const chunk = await reader.read();
        current();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BYTES) throw new Error('Archived receipt exceeds bounds');
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    const rows: unknown = JSON.parse(text);
    if (!Array.isArray(rows) || rows.length !== requests.length) throw new Error('Invalid archived receipt');
    const results = new Map<number, unknown>();
    for (const row of rows) {
      if (
        !record(row) ||
        row.jsonrpc !== '2.0' ||
        typeof row.id !== 'number' ||
        !requests.some((request) => request.id === row.id) ||
        results.has(row.id) ||
        'error' in row ||
        !('result' in row)
      )
        throw new Error('Invalid archived receipt');
      results.set(row.id, row.result);
    }
    return requests.map(({ id }) => results.get(id));
  };
  try {
    const [genesis, canonical, signedBlock] = await rpc([
      ['chain_getBlockHash', [0]],
      ['chain_getBlockHash', [height]],
      ['chain_getBlock', [blockHash]],
    ]);
    if (genesis !== SORA_FUNDING_MAINNET_GENESIS || canonical !== blockHash)
      throw new Error('Archived receipt network or fork mismatch');
    if (
      !record(signedBlock) ||
      !record(signedBlock.block) ||
      !record(signedBlock.block.header) ||
      typeof signedBlock.block.header.parentHash !== 'string' ||
      !HASH.test(signedBlock.block.header.parentHash)
    )
      throw new Error('Invalid archived block');
    const [parentRuntime, blockRuntime, events] = await rpc([
      ['state_getRuntimeVersion', [signedBlock.block.header.parentHash]],
      ['state_getRuntimeVersion', [blockHash]],
      ['state_getStorage', [EVENTS_KEY, blockHash]],
    ]);
    // Decode only with the runtime metadata already held by this live chain.
    // An upgrade boundary fails closed instead of guessing an older SCALE layout.
    for (const value of [parentRuntime, blockRuntime]) {
      if (!record(value) || Object.entries(runtime).some(([key, expected]) => value[key] !== expected))
        throw new Error('Archived receipt runtime mismatch');
    }
    if (typeof events !== 'string' || !/^0x(?:[0-9a-f]{2})+$/i.test(events) || events.length > MAX_BYTES)
      throw new Error('Invalid archived events');
    current();
    const decoded = deps.decodeBlock(signedBlock);
    if (decoded.header.hash.toString() !== blockHash || decoded.header.number.toNumber() !== height)
      throw new Error('Archived block does not match canonical header');
    return { block: decoded, events: deps.decodeEvents(events) };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
