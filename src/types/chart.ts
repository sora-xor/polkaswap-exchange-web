import type {
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

/** "open", "close", "low", "high" data */
export type OCLH = [number, number, number, number];

export type SnapshotItem = {
  timestamp: number;
  price: OCLH;
  volume: number;
};

export type RequestMethod = (
  entityId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
) => Promise<Nullable<ConnectionQueryResponseData<SnapshotItem>>>;

export type RequestSubscriptionCallback = AsyncFnWithoutArgs | FnWithoutArgs;
export type RequestSubscription = (callback: RequestSubscriptionCallback) => Promise<Nullable<FnWithoutArgs>>;
