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

// Subquery Models

// with derived fields
export type SubqueryAccountBaseEntity = AccountBaseEntity & {
  latestHistoryElementId: string;
  lastLiquidationId: string;
};
// with derived fields
export type SubqueryPoolXYKBaseEntity = PoolXYKBaseEntity & {
  baseAssetId: string;
  targetAssetId: string;
};
// with derived fields
export type SubqueryAccountLiquidityBaseEntity = AccountLiquidityBaseEntity & {
  accountId: string;
  poolId: string;
};
// with derived fields
export type SubqueryAccountLiquiditySnapshotBaseEntity = AccountLiquiditySnapshotBaseEntity & {
  accountLiquidityId: string;
};
// with derived fields
export type SubqueryOrderBookSnapshotBaseEntity = OrderBookSnapshotBaseEntity & {
  orderBookId: string;
};
// with derived fields
export type SubqueryOrderBookBaseEntity = OrderBookBaseEntity & {
  baseAssetId: string; // connection field
  quoteAssetId: string; // connection field
};
// with derived fields
export type SubqueryOrderBookOrderBaseEntity = OrderBookOrderBaseEntity & {
  orderBookId: string;
  accountId: string;
};
// with derived fields
export type SubqueryVaultBaseEntity = VaultBaseEntity & {
  ownerId: string;
  collateralAssetId: string;
  debtAssetId: string;
};
// with derived fields
export type SubqueryVaultEventBaseEntity = VaultEventBaseEntity & {
  vaultId: string;
};

// with connection
export type SubqueryAccountEntity = SubqueryAccountBaseEntity & {
  latestHistoryElement: HistoryElementBase;
  lastLiquidation: VaultEventBaseEntity;
};
// with connection
export type SubqueryAccountLiquidityEntity = SubqueryAccountLiquidityBaseEntity & {
  account: SubqueryAccountBaseEntity;
  pool: SubqueryPoolXYKBaseEntity;
  data: ConnectionQueryResponseData<SubqueryAccountLiquiditySnapshotBaseEntity>;
};
// with connection
export type SubqueryAccountLiquiditySnapshotEntity = SubqueryAccountLiquiditySnapshotBaseEntity & {
  accountLiquidity: SubqueryAccountLiquidityBaseEntity;
};
// with connection
export type SubqueryPoolXYKEntity = SubqueryPoolXYKBaseEntity & {
  baseAsset: AssetBaseEntity;
  targetAsset: AssetBaseEntity;
  data: ConnectionQueryResponseData<PoolSnapshotBaseEntity>;
};
// with connection
export type SubqueryPoolSnapshotEntity = PoolSnapshotBaseEntity & {
  pool: SubqueryPoolXYKBaseEntity;
};
// with connection
export type SubqueryOrderBookSnapshotEntity = SubqueryOrderBookSnapshotBaseEntity & {
  orderBook: OrderBookBaseEntity;
};
// with connection
export type SubqueryOrderBookOrderEntity = SubqueryOrderBookOrderBaseEntity & {
  orderBook: SubqueryOrderBookBaseEntity;
  account: SubqueryAccountBaseEntity;
};
// with connection
export type SubqueryOrderBookEntity = SubqueryOrderBookBaseEntity & {
  baseAsset: AssetBaseEntity;
  quoteAsset: AssetBaseEntity;
  data: ConnectionQueryResponseData<SubqueryOrderBookSnapshotBaseEntity>;
  orders: ConnectionQueryResponseData<SubqueryOrderBookOrderBaseEntity>;
};
// with connection
export type SubqueryVaultEntity = SubqueryVaultBaseEntity & {
  owner: SubqueryAccountBaseEntity;
  collateralAsset: AssetBaseEntity;
  debtAsset: AssetBaseEntity;
  events: ConnectionQueryResponseData<SubqueryVaultEventBaseEntity>;
};
// with connection
export type SubqueryVaultEventEntity = SubqueryVaultEventBaseEntity & {
  vault: SubqueryVaultBaseEntity;
};
// with connection
export type SubqueryAssetEntity = AssetBaseEntity & {
  data: ConnectionQueryResponseData<AssetSnapshotBaseEntity>;
  poolXYK: ConnectionQueryResponseData<SubqueryPoolXYKBaseEntity>;
};

export type SubqueryAccountEntityMutation = {
  // subscription payload fields what we need
  id: string;
  latest_history_element_id: string;
};
