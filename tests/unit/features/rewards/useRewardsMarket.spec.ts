import { FPNumber } from '@sora-substrate/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

const shared = vi.hoisted(() => ({
  fetchTokensData: vi.fn(),
  fetchAssetPriceData: vi.fn(),
}));

vi.mock('@/indexer/queries/asset/assets', () => ({ fetchTokensData: shared.fetchTokensData }));
vi.mock('@/indexer/queries/asset/price', () => ({ fetchAssetPriceData: shared.fetchAssetPriceData }));

import {
  MARKET_CACHE_TTL_MS,
  MARKET_HISTORY_DAYS,
  clearRewardsMarketCache,
  loadRewardsMarket,
  useRewardsMarket,
} from '@/features/rewards/composables/useRewardsMarket';

const PSWAP = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 } as never;
const VAL = { address: '0xval', symbol: 'VAL', decimals: 18 } as never;
const DAY = 24 * 60 * 60 * 1000;

const tokenData = (price: number) => ({
  priceUSD: new FPNumber(price),
  priceChangeDay: new FPNumber(1.5),
  priceChangeWeek: new FPNumber(-3),
  volumeDayUSD: new FPNumber(0),
  volumeWeekUSD: new FPNumber(0),
  tvlUSD: new FPNumber(0),
  velocity: new FPNumber(0),
});

const series = (...closes: number[]) => ({
  edges: closes.map((close, index) => ({
    node: { timestamp: (closes.length - index) * DAY, price: [close, close, close, close], volume: 1 },
  })),
  pageInfo: { hasNextPage: false, endCursor: '' },
});

const flush = async (): Promise<void> => {
  for (let index = 0; index < 5; index++) {
    await Promise.resolve();
    await nextTick();
  }
};

beforeEach(() => {
  clearRewardsMarketCache();
  shared.fetchTokensData.mockReset();
  shared.fetchAssetPriceData.mockReset();
  shared.fetchTokensData.mockImplementation(async (assets: Array<{ address: string }>) => ({
    [assets[0].address]: tokenData(0.004),
  }));
  shared.fetchAssetPriceData.mockImplementation(async () => series(0.003, 0.004, 0.005));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadRewardsMarket', () => {
  it('requests thirty daily candles and orders them by time', async () => {
    const data = await loadRewardsMarket(PSWAP);

    expect(shared.fetchAssetPriceData).toHaveBeenCalledWith('0xpswap', 'DAY', MARKET_HISTORY_DAYS);
    expect(data?.stats?.priceChangeDay.toString()).toBe('1.5');
    // The indexer returns newest first, so the oldest close (0.005) comes first once ordered by time.
    expect(data?.points.map(({ price }) => price)).toEqual([0.005, 0.004, 0.003]);
    expect(data?.points[0].time).toBeLessThan(data?.points[2].time ?? 0);
  });

  it('keeps the half that worked when the other one fails', async () => {
    shared.fetchAssetPriceData.mockRejectedValue(new Error('indexer down'));
    const statsOnly = await loadRewardsMarket(PSWAP);

    expect(statsOnly?.points).toEqual([]);
    expect(statsOnly?.stats).not.toBeNull();

    shared.fetchTokensData.mockRejectedValue(new Error('indexer down'));
    shared.fetchAssetPriceData.mockImplementation(async () => series(1, 2));
    const seriesOnly = await loadRewardsMarket(PSWAP);

    expect(seriesOnly?.stats).toBeNull();
    expect(seriesOnly?.points).toHaveLength(2);
  });

  it('returns null when nothing came back', async () => {
    shared.fetchTokensData.mockResolvedValue({});
    shared.fetchAssetPriceData.mockResolvedValue(null);

    expect(await loadRewardsMarket(PSWAP)).toBeNull();
  });
});

describe('useRewardsMarket', () => {
  it('loads the first token and exposes stats and points', async () => {
    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([PSWAP, VAL]), ref('https://indexer')))!;

    expect(market.status.value).toBe('loading');
    await flush();

    expect(market.status.value).toBe('ready');
    expect(market.selected.value).toEqual(PSWAP);
    expect(market.stats.value?.priceChangeWeek.toString()).toBe('-3');
    expect(market.points.value).toHaveLength(3);

    scope.stop();
  });

  it('de-duplicates tokens and ignores assets without an address', () => {
    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([PSWAP, PSWAP, {} as never, VAL]), ref('x')))!;

    expect(market.tokens.value.map((token) => token.symbol)).toEqual(['PSWAP', 'VAL']);

    scope.stop();
  });

  it('clears the old series when another token is selected', async () => {
    let resolveVal: (value: unknown) => void = () => undefined;
    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([PSWAP, VAL]), ref('x')))!;
    await flush();

    shared.fetchAssetPriceData.mockImplementationOnce(() => new Promise((resolve) => (resolveVal = resolve)));
    market.select('0xval');
    await nextTick();

    expect(market.selected.value).toEqual(VAL);
    expect(market.points.value).toEqual([]);
    expect(market.status.value).toBe('loading');

    resolveVal(series(9, 8));
    await flush();

    expect(market.status.value).toBe('ready');
    expect(market.points.value).toHaveLength(2);

    scope.stop();
  });

  it('ignores a response that arrives after the selection changed', async () => {
    let resolveSlow: (value: unknown) => void = () => undefined;
    shared.fetchAssetPriceData.mockImplementationOnce(() => new Promise((resolve) => (resolveSlow = resolve)));

    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([PSWAP, VAL]), ref('x')))!;
    await nextTick();

    market.select('0xval');
    await flush();
    expect(market.points.value).toHaveLength(3);

    resolveSlow(series(100));
    await flush();

    expect(market.selected.value).toEqual(VAL);
    expect(market.points.value).toHaveLength(3);

    scope.stop();
  });

  it('keeps its request when the assets are replaced by equal copies', async () => {
    // The SDK hands out a fresh copy of the same asset on every block. Restarting the request each time would drop
    // its own response, so a slow indexer would leave the card on its placeholder for good.
    const copyOf = (asset: unknown) => ({ ...(asset as object) }) as never;
    let resolveSlow: (value: unknown) => void = () => undefined;

    shared.fetchAssetPriceData.mockImplementationOnce(() => new Promise((resolve) => (resolveSlow = resolve)));

    const assets = ref([copyOf(PSWAP)]);
    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(assets, ref('x')))!;
    await nextTick();

    assets.value = [copyOf(PSWAP)];
    await flush();
    assets.value = [copyOf(PSWAP)];
    await flush();

    expect(shared.fetchAssetPriceData).toHaveBeenCalledTimes(1);
    expect(market.status.value).toBe('loading');

    resolveSlow(series(3, 2, 1));
    await flush();

    expect(market.status.value).toBe('ready');
    expect(market.points.value).toHaveLength(3);

    scope.stop();
  });

  it('reports an error when nothing loads and recovers on retry', async () => {
    shared.fetchTokensData.mockRejectedValue(new Error('down'));
    shared.fetchAssetPriceData.mockRejectedValue(new Error('down'));

    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([PSWAP]), ref('x')))!;
    await flush();

    expect(market.status.value).toBe('error');

    shared.fetchTokensData.mockImplementation(async () => ({ '0xpswap': tokenData(1) }));
    shared.fetchAssetPriceData.mockImplementation(async () => series(1, 2));
    await market.reload();

    expect(market.status.value).toBe('ready');
    expect(market.points.value).toHaveLength(2);

    scope.stop();
  });

  it('keeps the chart on screen while the same token reloads', async () => {
    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([PSWAP]), ref('x')))!;
    await flush();

    shared.fetchAssetPriceData.mockImplementationOnce(() => new Promise(() => undefined));
    void market.reload();
    await nextTick();

    expect(market.status.value).toBe('loading');
    expect(market.points.value).toHaveLength(3);

    scope.stop();
  });

  it('reuses cached data until it expires and keys the cache by indexer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const endpoint = ref('https://one');
    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([PSWAP]), endpoint))!;
    await flush();
    expect(shared.fetchAssetPriceData).toHaveBeenCalledTimes(1);

    const second = scope.run(() => useRewardsMarket(ref([PSWAP]), ref('https://one')))!;
    await flush();
    expect(shared.fetchAssetPriceData).toHaveBeenCalledTimes(1);
    expect(second.status.value).toBe('ready');

    endpoint.value = 'https://two';
    await flush();
    expect(shared.fetchAssetPriceData).toHaveBeenCalledTimes(2);

    // Going back inside the lifetime of the cache reuses it ...
    endpoint.value = 'https://one';
    await flush();
    expect(shared.fetchAssetPriceData).toHaveBeenCalledTimes(2);
    expect(market.status.value).toBe('ready');

    // ... and once it ran out the data is fetched again, with nothing forcing a reload.
    vi.setSystemTime(Date.now() + MARKET_CACHE_TTL_MS + 1);
    endpoint.value = 'https://two';
    await flush();
    expect(shared.fetchAssetPriceData).toHaveBeenCalledTimes(3);

    scope.stop();
  });

  it('has nothing to show without tokens', async () => {
    const scope = effectScope();
    const market = scope.run(() => useRewardsMarket(ref([]), ref('x')))!;
    await flush();

    expect(market.status.value).toBe('idle');
    expect(market.selected.value).toBeNull();
    expect(shared.fetchTokensData).not.toHaveBeenCalled();

    scope.stop();
  });
});
