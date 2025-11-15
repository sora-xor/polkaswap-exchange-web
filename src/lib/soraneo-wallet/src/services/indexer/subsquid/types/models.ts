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

// Subsquid Models

// with connection
export type SubsquidAccountEntity = AccountBaseEntity & {
  latestHistoryElement: HistoryElementBase;
};

// with connection
export type SubsquidAssetEntity = AssetBaseEntity & {
  data: AssetSnapshotBaseEntity[];
  poolXYK: PoolXYKBaseEntity[];
};

// with connection
export type SubsquidPoolXYKEntity = PoolXYKBaseEntity & {
  baseAsset: AssetBaseEntity;
  targetAsset: AssetBaseEntity;
};

// with connection
export type SubsquidOrderBookEntity = OrderBookBaseEntity & {
  baseAsset: AssetBaseEntity;
  quoteAsset: AssetBaseEntity;
  data: OrderBookSnapshotBaseEntity[];
  orders: OrderBookOrderBaseEntity[];
};

// with connection
export type SubsquidOrderBookSnapshotEntity = OrderBookSnapshotBaseEntity & {
  orderBook: OrderBookBaseEntity;
};

// with connection
export type SubsquidOrderBookOrderEntity = OrderBookOrderBaseEntity & {
  orderBook: OrderBookBaseEntity;
  account: AccountBaseEntity;
};

// with connection
export type SubsquidVaultEntity = VaultBaseEntity & {
  owner: AccountBaseEntity;
  collateralAsset: AssetBaseEntity;
  debtAsset: AssetBaseEntity;
  events: VaultEventBaseEntity[];
};

// with connection
export type SubsquidVaultEventEntity = VaultEventBaseEntity & {
  vault: VaultBaseEntity;
};

export type SubsquidAccountEntityMutation = {
  id: string;
  latestHistoryElement: HistoryElementBase;
};
