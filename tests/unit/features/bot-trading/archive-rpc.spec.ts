// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blake2AsHex, xxhashAsHex } from '@polkadot/util-crypto';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import { fetchMissingArchivedBotHistory } from '@/features/bot-trading/archive-rpc';
import { botFixture } from './fixtures';

vi.unmock('@/lib/substrate/sdk/assets/consts');
vi.unmock('@sora-substrate/sdk/build/assets/consts');
vi.unmock('@polkadot/util-crypto');

const HOUR = 3_600_000;
const START = Date.UTC(2026, 2, 1);
const NOW = START + 24 * HOUR;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const ANCHOR = 25_059_555;
const ANCHOR_HASH = '0x959ac28650702a446bd3ad1963ed60a8aec4ec4f86b1cfe90c4564c38f831203';
const FINALIZED = ANCHOR + 8192;
const options = {
  startAt: START,
  endAt: START + 3 * HOUR,
  genesisHash: GENESIS,
  currentDenominator: '100',
  timestamps: [START + HOUR, START + 3 * HOUR],
};
const bot = () => ({ ...botFixture(), assetIn: XOR, assetOut: VAL, policy: { ...botFixture().policy, feeAsset: XOR } });
const prefix = (pallet: string, item: string) => xxhashAsHex(pallet, 128) + xxhashAsHex(item, 128).slice(2);
const concat = (address: string) => blake2AsHex(address, 128).slice(2) + address.slice(2);
const timeKey = prefix('Timestamp', 'Now');
const denomKey = prefix('Denomination', 'Denominator');
const hash = (height: number) => (height === ANCHOR ? ANCHOR_HASH : `0x${height.toString(16).padStart(64, '0')}`);
const height = (blockHash: string) => (blockHash === ANCHOR_HASH ? ANCHOR : Number.parseInt(blockHash.slice(2), 16));
const unsigned = (value: bigint | number, width: number) =>
  `0x${BigInt(value)
    .toString(16)
    .padStart(width * 2, '0')
    .match(/../g)!
    .reverse()
    .join('')}`;
const encodedText = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  const length = bytes.length < 64 ? [bytes.length << 2] : [((bytes.length << 2) | 1) & 255, bytes.length >> 6];
  return [...length, ...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
};
interface RpcRequest {
  id: number;
  method: string;
  params: unknown[];
}

/** A deterministic fake archive answers real storage keys without performing network requests. */
function archive() {
  const config = {
    denomination: 100n,
    timestamp: (blockHeight: number) => START - 6000 + (blockHeight - ANCHOR) * 6000,
    mutate: (_request: RpcRequest, value: unknown): unknown => value,
  };
  const info = new Map(
    [XOR, VAL, PSWAP].map((asset) => [
      prefix('Assets', 'AssetInfosV2') + xxhashAsHex(asset.address, 64).slice(2) + asset.address.slice(2),
      `0x${encodedText(asset.symbol)}${encodedText('A'.repeat(70))}${asset.decimals.toString(16).padStart(2, '0')}`,
    ])
  );
  const pools = new Map(
    [VAL, PSWAP].map((asset) => [
      prefix('PoolXYK', 'Reserves') + concat(XOR.address) + concat(asset.address),
      unsigned(asset === VAL ? 2000000000000000001n : 4000000000000000000n, 16) +
        unsigned(1000000000000000000n, 16).slice(2),
    ])
  );
  const requests: RpcRequest[][] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
    const batch = JSON.parse(String(init?.body)) as RpcRequest[];
    requests.push(batch);
    const answer = (request: RpcRequest): unknown => {
      if (request.method === 'chain_getBlockHash')
        return request.params[0] === 0 ? GENESIS : hash(Number(request.params[0]));
      if (request.method === 'chain_getFinalizedHead') return hash(FINALIZED);
      if (request.method === 'chain_getHeader') return { number: `0x${FINALIZED.toString(16)}` };
      if (request.method === 'state_queryStorageAt') {
        const [keys, blockHash] = request.params as [string[], string];
        return [
          {
            block: blockHash,
            changes: keys
              .map((key) => [
                key,
                key === timeKey
                  ? unsigned(config.timestamp(height(blockHash)), 8)
                  : key === denomKey
                    ? unsigned(config.denomination, 16)
                    : (info.get(key) ?? pools.get(key) ?? null),
              ])
              .reverse(),
          },
        ];
      }
      throw new Error(`Unexpected read-only RPC ${request.method}`);
    };
    return new Response(
      JSON.stringify(
        batch
          .map((request) => ({
            jsonrpc: '2.0',
            id: request.id,
            result: config.mutate(request, answer(request)),
          }))
          .reverse()
      )
    );
  });
  return { fetch, requests, config, deps: { fetch, now: () => NOW } };
}

afterEach(() => vi.useRealTimers());

describe('bounded missing-hour archival repair', () => {
  it('matches reversed RPC IDs, decodes exact reserves and two-byte SCALE metadata lengths, and returns only requested hours', async () => {
    const test = archive();
    const history = await fetchMissingArchivedBotHistory(bot(), options, test.deps);
    expect(history.candles).toEqual(
      options.timestamps.map((timestamp) => ({ timestamp, close: '2.000000000000000001', feeClose: '1' }))
    );
    expect(history).toMatchObject({
      missing: 1,
      denominationVerified: true,
      provenance: { kind: 'archive-pool-spot' },
    });
    expect(
      test.fetch.mock.calls.every(
        ([url, init]) => url === 'https://mof2.sora.org/' && init?.credentials === 'omit' && init?.redirect === 'error'
      )
    ).toBe(true);
    expect(test.requests.every((batch) => batch.length <= 32)).toBe(true);
    expect(test.requests.length).toBeLessThanOrEqual(33);
    // Both sides of the boundary are observed; the preceding block alone cannot prove a completed close.
    const queried = test.requests
      .flat()
      .filter((row) => row.method === 'chain_getBlockHash')
      .map((row) => row.params[0]);
    expect(queried).toContain(ANCHOR + 600);
    expect(queried).toContain(ANCHOR + 601);
  });

  it('values reversed pairs and external XOR fees from the same archived state', async () => {
    const test = archive();
    const result = await fetchMissingArchivedBotHistory(
      { ...bot(), assetIn: PSWAP, assetOut: VAL },
      options,
      test.deps
    );
    expect(result.candles[0]).toMatchObject({ close: '0.50000000000000000025', feeClose: '0.25' });
  });

  it('converges across a sharp block-rate change and leaves a truly halted hour missing', async () => {
    const test = archive();
    test.config.timestamp = (blockHeight) =>
      START - 6000 + (blockHeight - ANCHOR) * 6000 + (blockHeight > ANCHOR + 1000 ? 2 * HOUR : 0);
    const result = await fetchMissingArchivedBotHistory(
      bot(),
      { ...options, endAt: START + 4 * HOUR, timestamps: [START + 3 * HOUR, START + 4 * HOUR] },
      test.deps
    );
    expect(result.candles.map((candle) => candle.timestamp)).toEqual([START + 4 * HOUR]);
    expect(result.missing).toBe(3);
    expect(test.requests.length).toBeLessThanOrEqual(33);
  });

  it('does not certify historical state from a different denomination', async () => {
    const test = archive();
    test.config.denomination = 1n;
    await expect(fetchMissingArchivedBotHistory(bot(), options, test.deps)).resolves.toMatchObject({
      candles: [],
      missing: 3,
      denominationVerified: false,
    });
  });

  it.each([
    'wrong-genesis',
    'wrong-anchor',
    'wrong-state',
    'nonmonotonic',
    'future-state',
    'malformed-header',
    'malformed-time',
    'malformed-reserves',
    'malformed-metadata',
    'duplicate-storage',
  ])('rejects %s proof without returning repaired prices', async (fault) => {
    const test = archive();
    test.config.mutate = (request, value) => {
      if (fault === 'wrong-genesis' && request.method === 'chain_getBlockHash' && request.params[0] === 0)
        return hash(123);
      if (fault === 'wrong-anchor' && request.method === 'chain_getBlockHash' && request.params[0] === ANCHOR)
        return hash(124);
      if (fault === 'malformed-header' && request.method === 'chain_getHeader') return { number: '0x100000000' };
      if (request.method !== 'state_queryStorageAt') return value;
      const rows = value as Array<{ block: string; changes: Array<[string, unknown]> }>;
      if (fault === 'wrong-state') rows[0].block = hash(123);
      if (fault === 'duplicate-storage' && rows[0].changes.length > 1) rows[0].changes[1] = rows[0].changes[0];
      for (const change of rows[0].changes) {
        if (change[0] === timeKey && fault === 'malformed-time') change[1] = '0x01';
        if (change[0] === timeKey && fault === 'future-state') change[1] = unsigned(NOW + 1, 8);
        if (
          change[0] === timeKey &&
          fault === 'nonmonotonic' &&
          height(String(request.params[1])) !== ANCHOR &&
          height(String(request.params[1])) !== FINALIZED
        )
          change[1] = unsigned(START - HOUR, 8);
        if (change[0].startsWith(prefix('PoolXYK', 'Reserves')) && fault === 'malformed-reserves') change[1] = '0x00';
        if (change[0].startsWith(prefix('Assets', 'AssetInfosV2')) && fault === 'malformed-metadata')
          change[1] = '0x03';
      }
      return value;
    };
    await expect(fetchMissingArchivedBotHistory(bot(), options, test.deps)).rejects.toThrow('bots.errors.history');
  });

  it.each(['duplicate-id', 'missing-id', 'rpc-error', 'http-error', 'large-header', 'large-body', 'invalid-json'])(
    'rejects %s responses',
    async (fault) => {
      const test = archive();
      test.fetch.mockImplementationOnce(async (_url, init) => {
        const calls = JSON.parse(String(init?.body)) as RpcRequest[];
        if (fault === 'http-error') return new Response('', { status: 503 });
        if (fault === 'large-header')
          return new Response('[]', { headers: { 'content-length': String(512 * 1024 + 1) } });
        if (fault === 'large-body') return new Response(' '.repeat(512 * 1024 + 1));
        if (fault === 'invalid-json') return new Response('{');
        return new Response(
          JSON.stringify(
            calls.map((call) => ({
              jsonrpc: '2.0',
              id: fault === 'duplicate-id' ? calls[0].id : fault === 'missing-id' ? call.id + 100 : call.id,
              ...(fault === 'rpc-error' ? { error: { code: -32000 } } : { result: GENESIS }),
            }))
          )
        );
      });
      await expect(fetchMissingArchivedBotHistory(bot(), options, test.deps)).rejects.toThrow('bots.errors.history');
    }
  );

  it('enforces one overall deadline even when fetch ignores cancellation', async () => {
    vi.useFakeTimers();
    const test = archive();
    test.fetch.mockImplementationOnce(() => new Promise(() => {}));
    const result = fetchMissingArchivedBotHistory(bot(), options, test.deps);
    const assertion = expect(result).rejects.toThrow('bots.errors.history');
    await vi.advanceTimersByTimeAsync(30_001);
    await assertion;
    expect(test.fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(test.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    'too-many',
    'duplicate',
    'not-hour',
    'future',
    'bad-address',
    'same-pair',
    'wrong-network',
    'bad-denominator',
  ])('rejects invalid %s inputs before any request', async (fault) => {
    const test = archive();
    const draft = bot();
    const settings = structuredClone(options);
    if (fault === 'too-many')
      settings.timestamps = Array.from({ length: 25 }, (_, index) => START + (index + 1) * HOUR);
    if (fault === 'duplicate') settings.timestamps = [START + HOUR, START + HOUR];
    if (fault === 'not-hour') settings.timestamps = [START + HOUR + 1];
    if (fault === 'future') settings.endAt = NOW + HOUR;
    if (fault === 'bad-address') draft.assetOut = { ...VAL, address: 'not-an-asset' };
    if (fault === 'same-pair') draft.assetOut = XOR;
    if (fault === 'wrong-network') settings.genesisHash = hash(123);
    if (fault === 'bad-denominator') settings.currentDenominator = '0';
    await expect(fetchMissingArchivedBotHistory(draft, settings, test.deps)).rejects.toThrow('bots.errors.history');
    expect(test.fetch).not.toHaveBeenCalled();
  });
});
