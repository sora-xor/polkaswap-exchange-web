import { afterEach, describe, expect, it, vi } from 'vitest';
import { blake2AsHex, xxhashAsHex } from '@polkadot/util-crypto';
import { fetchRecentArchivedBotHistory } from '@/features/bot-trading/archive-rpc-history';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import { botFixture } from './fixtures';

// Storage-key fixtures exercise the real chain hash functions rather than the wallet test stub.
vi.unmock('@polkadot/util-crypto');
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
  KUSD: { address: '0x02000c0000000000000000000000000000000000000000000000000000000000', symbol: 'KUSD', decimals: 18 },
}));

const HOUR = 3_600_000;
const endAt = Date.UTC(2026, 8, 19, 3);
const now = endAt + HOUR / 2;
const head = 200_000;
const genesisHash = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const options = {
  startAt: endAt - 3 * HOUR,
  endAt,
  genesisHash,
  currentDenominator: '100000000000000000000000000000000000000',
};
const prefix = (pallet: string, item: string) => xxhashAsHex(pallet, 128) + xxhashAsHex(item, 128).slice(2);
const concat = (address: string) => blake2AsHex(address, 128).slice(2) + address.slice(2);
const timeKey = prefix('Timestamp', 'Now');
const denomKey = prefix('Denomination', 'Denominator');
const poolKey = prefix('PoolXYK', 'Reserves') + concat(XOR.address) + concat(KUSD.address);
const infoKey = (address: string) =>
  prefix('Assets', 'AssetInfosV2') + xxhashAsHex(address, 64).slice(2) + address.slice(2);
const hash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
const timestamp = (height: number) => now - (head - height) * 6_000;

/** Encode independent chain fixtures with exact SCALE integers and metadata bytes. */
function uint(value: string | number, bytes: number): string {
  const hex = BigInt(value)
    .toString(16)
    .padStart(bytes * 2, '0');
  return `0x${hex.match(/../g)!.reverse().join('')}`;
}
function info(symbol: string, decimals = 18): string {
  const text = (value: string) =>
    `${(value.length * 4).toString(16).padStart(2, '0')}${Buffer.from(value).toString('hex')}`;
  return `0x${text(symbol)}${text(symbol)}${decimals.toString(16).padStart(2, '0')}01`;
}
function bot(reverse = false) {
  return {
    ...botFixture(),
    assetIn: reverse ? KUSD : XOR,
    assetOut: reverse ? XOR : KUSD,
    policy: { ...botFixture().policy, feeAsset: XOR },
  };
}
interface Call {
  jsonrpc: string;
  id: number;
  method: string;
  params: unknown[];
}
interface MockOptions {
  genesis?: string;
  finalTime?: number;
  override?: (key: string, height: number, value: string | null) => string | null;
  stateHash?: string;
}
/** A finalized linear chain; each historical storage result is tied to the requested block hash. */
function transport(settings: MockOptions = {}) {
  const batches: Call[][] = [];
  const fullStateHeights: number[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(url).toBe('https://mof2.sora.org/');
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error' });
    const calls = JSON.parse(String(init?.body)) as Call[];
    batches.push(calls);
    const result = calls.map((call) => {
      let value: unknown;
      if (call.method === 'chain_getBlockHash')
        value = call.params[0] === 0 ? (settings.genesis ?? genesisHash) : hash(Number(call.params[0]));
      else if (call.method === 'chain_getFinalizedHead') value = hash(head);
      else if (call.method === 'chain_getHeader') value = { number: `0x${head.toString(16)}` };
      else if (call.method === 'state_queryStorageAt') {
        const keys = call.params[0] as string[];
        const blockHash = call.params[1] as string;
        const height = Number(BigInt(blockHash));
        if (keys.length > 2) fullStateHeights.push(height);
        const changes = keys.map((key) => {
          let stored: string | null = null;
          if (key === timeKey) stored = uint(height === head ? (settings.finalTime ?? now) : timestamp(height), 8);
          if (key === denomKey) stored = uint(options.currentDenominator, 16);
          if (key === infoKey(XOR.address)) stored = info('XOR');
          if (key === infoKey(KUSD.address)) stored = info('KUSD');
          if (key === poolKey) stored = uint('2000000000000000001', 16) + uint('1000000000000000000', 16).slice(2);
          return [key, settings.override ? settings.override(key, height, stored) : stored];
        });
        value = [{ block: settings.stateHash ?? blockHash, changes }];
      } else throw new Error(`Unexpected RPC ${call.method}`);
      return { jsonrpc: '2.0', id: call.id, result: value };
    });
    return new Response(JSON.stringify(result.reverse()), { headers: { 'content-type': 'application/json' } });
  });
  return { fetch, batches, fullStateHeights, deps: { fetch, now: () => now, requestIntervalMs: 0 } };
}

afterEach(() => vi.useRealTimers());

describe('recent finalized archive history', () => {
  it('loads exact KUSD reserves and reverses KUSD/XOR without floating-point token math', async () => {
    const forward = await fetchRecentArchivedBotHistory(bot(), options, transport().deps);
    expect(forward.candles).toEqual(
      [1, 2, 3].map((hour) => ({
        timestamp: options.startAt + hour * HOUR,
        close: '2.000000000000000001',
        feeClose: '1',
      }))
    );
    const reverse = await fetchRecentArchivedBotHistory(bot(true), options, transport().deps);
    expect(reverse.candles[0]).toEqual({
      timestamp: options.startAt + HOUR,
      close: '0.49999999999999999975',
      feeClose: '0.49999999999999999975',
    });
    expect(reverse).toMatchObject({
      missing: 0,
      denominationVerified: true,
      provenance: { kind: 'archive-pool-spot', archiveEndpoint: 'https://mof2.sora.org/' },
    });
  });

  it('batches all 168 hours and reads metadata/reserves only once at each exact closing block', async () => {
    const source = transport();
    const history = await fetchRecentArchivedBotHistory(
      bot(),
      { ...options, startAt: endAt - 168 * HOUR },
      source.deps
    );
    expect(history.candles).toHaveLength(168);
    expect(history.missing).toBe(0);
    expect(source.batches.every((batch) => batch.length <= 32)).toBe(true);
    expect(source.fetch.mock.calls.length).toBeLessThan(60);
    expect(source.fullStateHeights).toHaveLength(168);
    expect(new Set(source.fullStateHeights).size).toBe(168);
    for (const height of source.fullStateHeights) {
      expect(timestamp(height) % HOUR).toBe(HOUR - 6_000);
      expect(timestamp(height + 1) % HOUR).toBe(0);
    }
    const methods = new Set(source.batches.flat().map((call) => call.method));
    expect([...methods].sort()).toEqual([
      'chain_getBlockHash',
      'chain_getFinalizedHead',
      'chain_getHeader',
      'state_queryStorageAt',
    ]);
  });

  it.each(['pool', 'metadata', 'precision', 'denomination', 'zero'])(
    'preserves a missing %s hour as a gap',
    async (kind) => {
      const source = transport({
        override(key, height, value) {
          if (timestamp(height) !== endAt - HOUR - 6_000) return value;
          if (kind === 'pool' && key === poolKey) return null;
          if (kind === 'metadata' && key === infoKey(KUSD.address)) return null;
          if (kind === 'precision' && key === infoKey(KUSD.address)) return info('KUSD', 12);
          if (kind === 'denomination' && key === denomKey) return uint('1', 16);
          if (kind === 'zero' && key === poolKey) return uint('0', 16) + uint('1', 16).slice(2);
          return value;
        },
      });
      const history = await fetchRecentArchivedBotHistory(bot(), options, source.deps);
      expect(history.candles.map((row) => row.timestamp)).toEqual([options.startAt + HOUR, endAt]);
      expect(history.missing).toBe(1);
    }
  );

  it.each(['chain', 'stale', 'stateHash', 'currentDenomination', 'reserves', 'metadata', 'timestamp'])(
    'rejects untrusted %s evidence',
    async (kind) => {
      const source = transport({
        genesis: kind === 'chain' ? hash(9) : undefined,
        finalTime: kind === 'stale' ? now - 3 * HOUR : undefined,
        stateHash: kind === 'stateHash' ? hash(8) : undefined,
        override(key, height, value) {
          if (kind === 'currentDenomination' && key === denomKey && height === head) return uint('1', 16);
          if (kind === 'reserves' && key === poolKey) return `0x${'f'.repeat(66)}`;
          if (kind === 'metadata' && key === infoKey(KUSD.address)) return '0x04ff';
          if (kind === 'timestamp' && key === timeKey && height !== head) return uint(now + 1, 8);
          return value;
        },
      });
      await expect(fetchRecentArchivedBotHistory(bot(), options, source.deps)).rejects.toThrow();
    }
  );

  it('accepts u128 maximum reserves without truncating them', async () => {
    const maximum = ((1n << 128n) - 1n).toString();
    const source = transport({
      override: (key, _height, value) =>
        key === poolKey ? uint(maximum, 16) + uint('1000000000000000000', 16).slice(2) : value,
    });
    const result = await fetchRecentArchivedBotHistory(bot(), options, source.deps);
    expect(result.candles[0].close).toBe('340282366920938463463.374607431768211455');
  });

  it('rejects excessive windows or unsafe asset addresses before fetching', async () => {
    const source = transport();
    await expect(
      fetchRecentArchivedBotHistory(bot(), { ...options, startAt: endAt - 169 * HOUR }, source.deps)
    ).rejects.toThrow('bots.errors.history');
    await expect(
      fetchRecentArchivedBotHistory(
        { ...bot(), assetOut: { ...KUSD, address: 'not-a-storage-key' } },
        options,
        source.deps
      )
    ).rejects.toThrow('bots.errors.history');
    expect(source.fetch).not.toHaveBeenCalled();
  });

  it.each(['declared', 'stream', 'duplicate', 'error'])('rejects oversized or invalid %s responses', async (kind) => {
    const source = transport();
    if (kind === 'declared')
      source.fetch.mockResolvedValueOnce(new Response('[]', { headers: { 'content-length': String(512 * 1024 + 1) } }));
    if (kind === 'stream') source.fetch.mockResolvedValueOnce(new Response(' '.repeat(512 * 1024 + 1)));
    if (kind === 'duplicate')
      source.fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { jsonrpc: '2.0', id: 1, result: genesisHash },
            { jsonrpc: '2.0', id: 1, result: hash(head) },
          ])
        )
      );
    if (kind === 'error')
      source.fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { jsonrpc: '2.0', id: 1, error: { message: 'unavailable' } },
            { jsonrpc: '2.0', id: 2, result: hash(head) },
          ])
        )
      );
    await expect(fetchRecentArchivedBotHistory(bot(), options, source.deps)).rejects.toThrow('bots.errors.history');
  });

  it('cancels before transport or during an in-flight request', async () => {
    const source = transport();
    const aborted = new AbortController();
    aborted.abort();
    await expect(
      fetchRecentArchivedBotHistory(bot(), options, { ...source.deps, signal: aborted.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(source.fetch).not.toHaveBeenCalled();
    const controller = new AbortController();
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
          controller.abort();
        })
    );
    await expect(
      fetchRecentArchivedBotHistory(bot(), options, { ...source.deps, fetch, signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('times out an unresponsive read without retrying or continuing the search', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
        })
    );
    const result = fetchRecentArchivedBotHistory(bot(), options, { fetch, now: () => now, requestIntervalMs: 0 });
    const rejection = expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(15_001);
    await rejection;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
