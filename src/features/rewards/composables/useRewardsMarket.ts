import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

import { fetchTokensData, type TokenData } from '@/indexer/queries/asset/assets';
import { fetchAssetPriceData } from '@/indexer/queries/asset/price';
import { SnapshotTypes } from '@/lib/soraneo-wallet/src/services/indexer/types';

import { toPricePoints, type PricePoint } from '../utils/market';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

/** Days of daily candles shown in the price chart (the same window as the app's "1M" price chart). */
export const MARKET_HISTORY_DAYS = 30;

/** Cached market data is reused for this long, so switching tabs does not refetch. */
export const MARKET_CACHE_TTL_MS = 5 * 60 * 1000;

/** Where the market request stands: not started, running, done or failed. */
export type MarketStatus = 'idle' | 'loading' | 'ready' | 'error';

/** What one indexer returns for one token. */
interface MarketData {
  stats: TokenData | null;
  points: PricePoint[];
}

interface CacheEntry extends MarketData {
  loadedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Forgets every cached market response. Used by tests and when the indexer changes. */
export function clearRewardsMarketCache(): void {
  cache.clear();
}

/**
 * Loads token stats and daily price candles for one asset. A failed half degrades to the other half; the result is
 * `null` only when both failed or both came back empty.
 */
export async function loadRewardsMarket(asset: Asset): Promise<MarketData | null> {
  const [statsResult, seriesResult] = await Promise.allSettled([
    fetchTokensData([asset]),
    fetchAssetPriceData(asset.address, SnapshotTypes.DAY, MARKET_HISTORY_DAYS),
  ]);

  const stats = statsResult.status === 'fulfilled' ? (statsResult.value?.[asset.address] ?? null) : null;
  const points =
    seriesResult.status === 'fulfilled' && seriesResult.value?.edges
      ? toPricePoints(seriesResult.value.edges.map((edge) => edge.node))
      : [];

  return stats || points.length ? { stats, points } : null;
}

/**
 * Market context for the reward tokens: current stats and a 30 day price series for the selected token.
 *
 * - Switching token clears the old series (it must never sit under another token's name); reloading the same token
 *   keeps what is on screen until the new data arrives.
 * - Responses that arrive after the selection changed are ignored.
 * - `endpoint` is the active indexer, so a different indexer refetches instead of reusing another one's cache.
 */
export function useRewardsMarket(assets: Ref<readonly Asset[]>, endpoint: Ref<string>) {
  const selectedAddress = ref('');
  const status = ref<MarketStatus>('idle');
  const stats = ref<TokenData | null>(null);
  const points = ref<PricePoint[]>([]);
  let requestId = 0;
  let disposed = false;

  const tokens = computed<Asset[]>(() => {
    const seen = new Set<string>();

    return assets.value.filter((asset) => {
      if (!asset?.address || seen.has(asset.address)) return false;

      seen.add(asset.address);
      return true;
    });
  });

  const selected = computed<Asset | null>(
    () => tokens.value.find((asset) => asset.address === selectedAddress.value) ?? tokens.value[0] ?? null
  );

  const apply = (data: MarketData | null): void => {
    stats.value = data?.stats ?? null;
    points.value = data?.points ?? [];
  };

  const load = async (force = false): Promise<void> => {
    const asset = selected.value;
    const id = ++requestId;

    if (!asset) {
      apply(null);
      status.value = 'idle';
      return;
    }

    const key = `${endpoint.value}|${asset.address}`;
    const cached = cache.get(key);

    if (!force && cached && Date.now() - cached.loadedAt < MARKET_CACHE_TTL_MS) {
      apply(cached);
      status.value = 'ready';
      return;
    }

    status.value = 'loading';

    let data: MarketData | null = null;

    try {
      data = await loadRewardsMarket(asset);
    } catch (error) {
      console.error('[rewards] Failed to load market data', error);
    }

    if (disposed || id !== requestId) return;

    if (data) {
      cache.set(key, { ...data, loadedAt: Date.now() });
      apply(data);
      status.value = 'ready';
      return;
    }

    status.value = 'error';
  };

  // Watch the address and the endpoint themselves. The asset objects are replaced on every block, so watching the
  // `selected` asset (or an array built from it) would restart the request each time and drop its own response.
  watch(
    [() => selected.value?.address ?? '', endpoint],
    ([address], previous) => {
      if (address !== previous?.[0]) apply(null);

      void load();
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    disposed = true;
  });

  return {
    tokens,
    selected,
    status,
    stats,
    points,
    select: (address: string): void => {
      selectedAddress.value = address;
    },
    reload: (): Promise<void> => load(true),
  };
}
