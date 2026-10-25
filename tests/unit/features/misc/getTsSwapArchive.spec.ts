import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPrunedGetTsSwapStateError, readGetTsSwapArchive } from '@/features/misc/lib/getTsSwapArchive';
import { SORA_FUNDING_MAINNET_GENESIS } from '@/features/misc/lib/tonswapLiquidity';

const hash = `0x${'1'.repeat(64)}`;
const parent = `0x${'2'.repeat(64)}`;
const runtime = { specName: 'sora-substrate', specVersion: 131, transactionVersion: 131, stateVersion: 0 };
const rawBlock = { block: { header: { parentHash: parent } } };
const decoded = { header: { hash: { toString: () => hash }, number: { toNumber: () => 100 } }, extrinsics: [] };
function fixture(overrides: Record<string, unknown> = {}) {
  const fetcher = vi.fn(async (_url: unknown, init: RequestInit | undefined) => {
    const requests = JSON.parse(String(init?.body)) as Array<{ id: number; method: string; params: unknown[] }>;
    return new Response(
      JSON.stringify(
        requests.map(({ id, method, params }) => ({
          jsonrpc: '2.0',
          id,
          result:
            `${method}:${String(params[0])}` in overrides
              ? overrides[`${method}:${String(params[0])}`]
              : method in overrides
                ? overrides[method]
                : method === 'chain_getBlockHash'
                  ? params[0] === 0
                    ? SORA_FUNDING_MAINNET_GENESIS
                    : hash
                  : method === 'chain_getBlock'
                    ? rawBlock
                    : method === 'state_getRuntimeVersion'
                      ? runtime
                      : '0x00',
        }))
      )
    );
  });
  const deps = {
    fetch: fetcher as unknown as typeof fetch,
    isCurrent: () => true,
    decodeBlock: vi.fn(() => decoded),
    decodeEvents: vi.fn(() => []),
  };
  return { deps, fetcher, read: () => readGetTsSwapArchive(hash, 100, runtime, deps) };
}
afterEach(() => vi.useRealTimers());
describe('purchase swap archived receipt', () => {
  it('recognizes only explicit state pruning, not ordinary offline or validation errors', () => {
    expect(isPrunedGetTsSwapStateError(new Error('4003 State already discarded for 0x123'))).toBe(true);
    expect(isPrunedGetTsSwapStateError('state pruned')).toBe(true);
    for (const error of ['offline', 'timeout', 'Unknown block', 'wrong signer', 'fork'])
      expect(isPrunedGetTsSwapStateError(error)).toBe(false);
  });
  it('binds the archive to mainnet, canonical height and the parent/current runtime before decoding', async () => {
    const { read, deps, fetcher } = fixture();
    expect(await read()).toEqual({ block: decoded, events: [] });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe('https://mof2.sora.org/');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
    expect(deps.decodeBlock).toHaveBeenCalledWith(rawBlock);
    expect(deps.decodeEvents).toHaveBeenCalledWith('0x00');
    const second = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(second.map((request: { params: unknown[] }) => request.params)).toEqual([
      [parent],
      [hash],
      ['0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7', hash],
    ]);
  });
  it('rejects a different network/fork, runtime, malformed event bytes and inconsistent decoded header', async () => {
    for (const overrides of [
      { 'chain_getBlockHash:0': parent },
      { 'chain_getBlockHash:100': parent },
      { [`state_getRuntimeVersion:${parent}`]: { ...runtime, specVersion: 130 } },
      { state_getRuntimeVersion: { ...runtime, specVersion: 132 } },
      { state_getRuntimeVersion: { ...runtime, transactionVersion: 130 } },
      { state_getStorage: null },
      { state_getStorage: '0xxyz' },
    ]) {
      const { read, deps } = fixture(overrides);
      await expect(read()).rejects.toThrow();
      expect(deps.decodeEvents).not.toHaveBeenCalled();
    }
    const wrong = fixture();
    wrong.deps.decodeBlock.mockReturnValue({
      ...decoded,
      header: { ...decoded.header, hash: { toString: () => parent } },
    });
    await expect(wrong.read()).rejects.toThrow('canonical');
  });
  it('rejects invalid input without contacting the archive', async () => {
    const { deps, fetcher } = fixture();
    await expect(readGetTsSwapArchive('invalid', 100, runtime, deps)).rejects.toThrow('context');
    await expect(readGetTsSwapArchive(hash, -1, runtime, deps)).rejects.toThrow('context');
    await expect(readGetTsSwapArchive(hash, 100, { ...runtime, specName: 'other-chain' }, deps)).rejects.toThrow(
      'context'
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects duplicate response ids, RPC errors and oversized streamed responses', async () => {
    for (const payload of [
      JSON.stringify([1, 1, 3].map((id) => ({ id, jsonrpc: '2.0', result: hash }))),
      JSON.stringify([1, 2, 3].map((id) => ({ id, jsonrpc: '2.0', error: { code: 4003 } }))),
      ' '.repeat(4 * 1024 * 1024 + 1),
    ]) {
      const { read, fetcher, deps } = fixture();
      fetcher.mockResolvedValueOnce(new Response(payload));
      await expect(read()).rejects.toThrow();
      expect(deps.decodeBlock).not.toHaveBeenCalled();
    }
  });
  it('aborts a delayed read and rejects context changes before accepting a receipt', async () => {
    vi.useFakeTimers();
    const delayed = fixture();
    delayed.fetcher.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );
    const rejected = expect(delayed.read()).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
    expect(delayed.fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    const changed = fixture();
    changed.deps.isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(changed.read()).rejects.toThrow('context');
    expect(changed.deps.decodeEvents).not.toHaveBeenCalled();
  });
});
