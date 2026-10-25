import {
  AccountBaseEntity,
  AccountLiquidityBaseEntity,
  AccountLiquiditySnapshotBaseEntity,
  AssetBaseEntity,
  AssetSnapshotBaseEntity,
  ConnectionQueryResponseData,
  HistoryElementBase,
  PoolXYKBaseEntity,
  PoolSnapshotBaseEntity,
  OrderBookBaseEntity,
  OrderBookSnapshotBaseEntity,
  OrderBookOrderBaseEntity,
  VaultBaseEntity,
  VaultEventBaseEntity,
} from '../../types';

// Polkaswap Models

// with derived fields
export type PolkaswapAccountBaseEntity = AccountBaseEntity & {
  latestHistoryElementId: string;
  lastLiquidationId: string;
};
// with derived fields
export type PolkaswapPoolXYKBaseEntity = PoolXYKBaseEntity & {
  baseAssetId: string;
  targetAssetId: string;
};
// with derived fields
export type PolkaswapAccountLiquidityBaseEntity = AccountLiquidityBaseEntity & {
  accountId: string;
  poolId: string;
};
// with derived fields
export type PolkaswapAccountLiquiditySnapshotBaseEntity = AccountLiquiditySnapshotBaseEntity & {
  accountLiquidityId: string;
};
// with derived fields
export type PolkaswapOrderBookSnapshotBaseEntity = OrderBookSnapshotBaseEntity & {
  orderBookId: string;
};
// with derived fields
export type PolkaswapOrderBookBaseEntity = OrderBookBaseEntity & {
  baseAssetId: string; // connection field
  quoteAssetId: string; // connection field
};
// with derived fields
export type PolkaswapOrderBookOrderBaseEntity = OrderBookOrderBaseEntity & {
  orderBookId: string;
  accountId: string;
};
// with derived fields
export type PolkaswapVaultBaseEntity = VaultBaseEntity & {
  ownerId: string;
  collateralAssetId: string;
  debtAssetId: string;
};
// with derived fields
export type PolkaswapVaultEventBaseEntity = VaultEventBaseEntity & {
  vaultId: string;
};

// with connection
export type PolkaswapAccountEntity = PolkaswapAccountBaseEntity & {
  latestHistoryElement: HistoryElementBase;
  lastLiquidation: VaultEventBaseEntity;
};
// with connection
export type PolkaswapAccountLiquidityEntity = PolkaswapAccountLiquidityBaseEntity & {
  account: PolkaswapAccountBaseEntity;
  pool: PolkaswapPoolXYKBaseEntity;
  data: ConnectionQueryResponseData<PolkaswapAccountLiquiditySnapshotBaseEntity>;
};
// with connection
export type PolkaswapAccountLiquiditySnapshotEntity = PolkaswapAccountLiquiditySnapshotBaseEntity & {
  accountLiquidity: PolkaswapAccountLiquidityBaseEntity;
};
// with connection
export type PolkaswapPoolXYKEntity = PolkaswapPoolXYKBaseEntity & {
  baseAsset: AssetBaseEntity;
  targetAsset: AssetBaseEntity;
  data: ConnectionQueryResponseData<PoolSnapshotBaseEntity>;
};
// with connection
export type PolkaswapPoolSnapshotEntity = PoolSnapshotBaseEntity & {
  pool: PolkaswapPoolXYKBaseEntity;
};
// with connection
export type PolkaswapOrderBookSnapshotEntity = PolkaswapOrderBookSnapshotBaseEntity & {
  orderBook: OrderBookBaseEntity;
};
// with connection
export type PolkaswapOrderBookOrderEntity = PolkaswapOrderBookOrderBaseEntity & {
  orderBook: PolkaswapOrderBookBaseEntity;
  account: PolkaswapAccountBaseEntity;
};
// with connection
export type PolkaswapOrderBookEntity = PolkaswapOrderBookBaseEntity & {
  baseAsset: AssetBaseEntity;
  quoteAsset: AssetBaseEntity;
  data: ConnectionQueryResponseData<PolkaswapOrderBookSnapshotBaseEntity>;
  orders: ConnectionQueryResponseData<PolkaswapOrderBookOrderBaseEntity>;
};
// with connection
export type PolkaswapVaultEntity = PolkaswapVaultBaseEntity & {
  owner: PolkaswapAccountBaseEntity;
  collateralAsset: AssetBaseEntity;
  debtAsset: AssetBaseEntity;
  events: ConnectionQueryResponseData<PolkaswapVaultEventBaseEntity>;
};
// with connection
export type PolkaswapVaultEventEntity = PolkaswapVaultEventBaseEntity & {
  vault: PolkaswapVaultBaseEntity;
};
// with connection
export type PolkaswapAssetEntity = AssetBaseEntity & {
  data: ConnectionQueryResponseData<AssetSnapshotBaseEntity>;
  poolXYK: ConnectionQueryResponseData<PolkaswapPoolXYKBaseEntity>;
};

export type PolkaswapAccountEntityMutation = {
  // subscription payload fields what we need
  id: string;
  latest_history_element_id: string;
};
