import {
  AccountBaseEntity,
  AssetBaseEntity,
  AssetSnapshotBaseEntity,
  HistoryElementBase,
  PoolXYKBaseEntity,
  OrderBookBaseEntity,
  OrderBookSnapshotBaseEntity,
  OrderBookOrderBaseEntity,
  VaultBaseEntity,
  VaultEventBaseEntity,
} from '../../types';
export type SubsquidAccountEntity = AccountBaseEntity & {
  latestHistoryElement: HistoryElementBase;
};
export type SubsquidAssetEntity = AssetBaseEntity & {
  data: AssetSnapshotBaseEntity[];
  poolXYK: PoolXYKBaseEntity[];
};
export type SubsquidPoolXYKEntity = PoolXYKBaseEntity & {
  baseAsset: AssetBaseEntity;
  targetAsset: AssetBaseEntity;
};
export type SubsquidOrderBookEntity = OrderBookBaseEntity & {
  baseAsset: AssetBaseEntity;
  quoteAsset: AssetBaseEntity;
  data: OrderBookSnapshotBaseEntity[];
  orders: OrderBookOrderBaseEntity[];
};
export type SubsquidOrderBookSnapshotEntity = OrderBookSnapshotBaseEntity & {
  orderBook: OrderBookBaseEntity;
};
export type SubsquidOrderBookOrderEntity = OrderBookOrderBaseEntity & {
  orderBook: OrderBookBaseEntity;
  account: AccountBaseEntity;
};
export type SubsquidVaultEntity = VaultBaseEntity & {
  owner: AccountBaseEntity;
  collateralAsset: AssetBaseEntity;
  debtAsset: AssetBaseEntity;
  events: VaultEventBaseEntity[];
};
export type SubsquidVaultEventEntity = VaultEventBaseEntity & {
  vault: VaultBaseEntity;
};
export type SubsquidAccountEntityMutation = {
  id: string;
  latestHistoryElement: HistoryElementBase;
};
