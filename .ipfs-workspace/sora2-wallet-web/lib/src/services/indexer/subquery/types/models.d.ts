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
export type SubqueryAccountBaseEntity = AccountBaseEntity & {
  latestHistoryElementId: string;
  lastLiquidationId: string;
};
export type SubqueryPoolXYKBaseEntity = PoolXYKBaseEntity & {
  baseAssetId: string;
  targetAssetId: string;
};
export type SubqueryAccountLiquidityBaseEntity = AccountLiquidityBaseEntity & {
  accountId: string;
  poolId: string;
};
export type SubqueryAccountLiquiditySnapshotBaseEntity = AccountLiquiditySnapshotBaseEntity & {
  accountLiquidityId: string;
};
export type SubqueryOrderBookSnapshotBaseEntity = OrderBookSnapshotBaseEntity & {
  orderBookId: string;
};
export type SubqueryOrderBookBaseEntity = OrderBookBaseEntity & {
  baseAssetId: string;
  quoteAssetId: string;
};
export type SubqueryOrderBookOrderBaseEntity = OrderBookOrderBaseEntity & {
  orderBookId: string;
  accountId: string;
};
export type SubqueryVaultBaseEntity = VaultBaseEntity & {
  ownerId: string;
  collateralAssetId: string;
  debtAssetId: string;
};
export type SubqueryVaultEventBaseEntity = VaultEventBaseEntity & {
  vaultId: string;
};
export type SubqueryAccountEntity = SubqueryAccountBaseEntity & {
  latestHistoryElement: HistoryElementBase;
  lastLiquidation: VaultEventBaseEntity;
};
export type SubqueryAccountLiquidityEntity = SubqueryAccountLiquidityBaseEntity & {
  account: SubqueryAccountBaseEntity;
  pool: SubqueryPoolXYKBaseEntity;
  data: ConnectionQueryResponseData<SubqueryAccountLiquiditySnapshotBaseEntity>;
};
export type SubqueryAccountLiquiditySnapshotEntity = SubqueryAccountLiquiditySnapshotBaseEntity & {
  accountLiquidity: SubqueryAccountLiquidityBaseEntity;
};
export type SubqueryPoolXYKEntity = SubqueryPoolXYKBaseEntity & {
  baseAsset: AssetBaseEntity;
  targetAsset: AssetBaseEntity;
  data: ConnectionQueryResponseData<PoolSnapshotBaseEntity>;
};
export type SubqueryPoolSnapshotEntity = PoolSnapshotBaseEntity & {
  pool: SubqueryPoolXYKBaseEntity;
};
export type SubqueryOrderBookSnapshotEntity = SubqueryOrderBookSnapshotBaseEntity & {
  orderBook: OrderBookBaseEntity;
};
export type SubqueryOrderBookOrderEntity = SubqueryOrderBookOrderBaseEntity & {
  orderBook: SubqueryOrderBookBaseEntity;
  account: SubqueryAccountBaseEntity;
};
export type SubqueryOrderBookEntity = SubqueryOrderBookBaseEntity & {
  baseAsset: AssetBaseEntity;
  quoteAsset: AssetBaseEntity;
  data: ConnectionQueryResponseData<SubqueryOrderBookSnapshotBaseEntity>;
  orders: ConnectionQueryResponseData<SubqueryOrderBookOrderBaseEntity>;
};
export type SubqueryVaultEntity = SubqueryVaultBaseEntity & {
  owner: SubqueryAccountBaseEntity;
  collateralAsset: AssetBaseEntity;
  debtAsset: AssetBaseEntity;
  events: ConnectionQueryResponseData<SubqueryVaultEventBaseEntity>;
};
export type SubqueryVaultEventEntity = SubqueryVaultEventBaseEntity & {
  vault: SubqueryVaultBaseEntity;
};
export type SubqueryAssetEntity = AssetBaseEntity & {
  data: ConnectionQueryResponseData<AssetSnapshotBaseEntity>;
  poolXYK: ConnectionQueryResponseData<SubqueryPoolXYKBaseEntity>;
};
export type SubqueryAccountEntityMutation = {
  id: string;
  latest_history_element_id: string;
};
