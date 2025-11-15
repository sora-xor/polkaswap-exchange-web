import { FPNumber } from '@sora-substrate/sdk';

import { formatAmountWithSuffix, formatDecimalPlaces, sortPools } from '@/utils';

import type { PoolData } from '@/indexer/queries/pool/pools';
import type { AmountWithSuffix } from '@/types/formats';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

export type PoolTokenRow = {
  asset: RegisteredAccountAsset;
  balance: string;
};

export type PoolExploreTableItem = {
  name: string;
  baseAsset: RegisteredAccountAsset;
  targetAsset: RegisteredAccountAsset;
  priceUSD: number;
  priceUSDFormatted: string;
  apy: number;
  apyFormatted: string;
  tvl: number;
  tvlFormatted: AmountWithSuffix;
  isAccountItem: boolean;
  poolTokens: PoolTokenRow[];
  accountTokens: PoolTokenRow[];
};

type BuildPoolTableItemsOptions = {
  pools: readonly PoolData[];
  accountLiquidity: readonly AccountLiquidity[];
  getAsset: (address?: string) => Nullable<RegisteredAccountAsset>;
};

const formatAccountToken = (value?: string): string => {
  return formatDecimalPlaces(FPNumber.fromCodecValue(value ?? 0));
};

const findAccountPool = (
  accountLiquidity: readonly AccountLiquidity[],
  baseAssetId: string,
  targetAssetId: string
): Nullable<AccountLiquidity> => {
  return (
    accountLiquidity.find(
      (liquidity) => liquidity.firstAddress === baseAssetId && liquidity.secondAddress === targetAssetId
    ) ?? null
  );
};

/**
 * Normalises indexer pool entries into rows consumed by the Pools explore table.
 */
export function buildPoolTableItems({
  pools,
  accountLiquidity,
  getAsset,
}: BuildPoolTableItemsOptions): PoolExploreTableItem[] {
  const items = pools.reduce<PoolExploreTableItem[]>((buffer, pool) => {
    const baseAsset = getAsset(pool.baseAssetId);
    const targetAsset = getAsset(pool.targetAssetId);

    if (!baseAsset || !targetAsset) return buffer;

    const name = `${baseAsset.symbol}-${targetAsset.symbol}`;
    const baseAssetReserves = FPNumber.fromCodecValue(pool.baseAssetReserves ?? 0, baseAsset.decimals);
    const targetAssetReserves = FPNumber.fromCodecValue(pool.targetAssetReserves ?? 0, targetAsset.decimals);
    const tvlUSD = targetAssetReserves.mul(pool.priceUSD).mul(FPNumber.TWO);

    const accountPool = findAccountPool(accountLiquidity, baseAsset.address, targetAsset.address);

    const poolTokens: PoolTokenRow[] = [
      {
        asset: baseAsset,
        balance: formatDecimalPlaces(baseAssetReserves),
      },
      {
        asset: targetAsset,
        balance: formatDecimalPlaces(targetAssetReserves),
      },
    ];

    const accountTokens: PoolTokenRow[] = [
      {
        asset: baseAsset,
        balance: formatAccountToken(accountPool?.firstBalance),
      },
      {
        asset: targetAsset,
        balance: formatAccountToken(accountPool?.secondBalance),
      },
    ];

    buffer.push({
      name,
      baseAsset,
      targetAsset,
      priceUSD: pool.priceUSD.toNumber(),
      priceUSDFormatted: pool.priceUSD.toLocaleString(),
      apy: pool.apy.toNumber(),
      apyFormatted: formatDecimalPlaces(pool.apy, true),
      tvl: tvlUSD.toNumber(),
      tvlFormatted: formatAmountWithSuffix(tvlUSD),
      isAccountItem: Boolean(accountPool),
      poolTokens,
      accountTokens,
    });

    return buffer;
  }, []);

  return [...items].sort((a, b) =>
    sortPools(
      { baseAsset: a.baseAsset, poolAsset: a.targetAsset },
      { baseAsset: b.baseAsset, poolAsset: b.targetAsset }
    )
  );
}

/**
 * Applies the legacy Explore search semantics to pool table rows.
 */
export function filterPoolTableItems(
  items: readonly PoolExploreTableItem[],
  search: string
): readonly PoolExploreTableItem[] {
  const normalized = search.toLowerCase().trim();

  if (!normalized) return items;

  const matchesAsset = (asset?: RegisteredAccountAsset | null): boolean => {
    if (!asset) return false;
    return (
      asset.name?.toLowerCase?.().includes(normalized) ||
      asset.symbol?.toLowerCase?.().includes(normalized) ||
      asset.address?.toLowerCase?.() === normalized
    );
  };

  return items.filter((item) => {
    return (
      item.name.toLowerCase().includes(normalized) || matchesAsset(item.baseAsset) || matchesAsset(item.targetAsset)
    );
  });
}
