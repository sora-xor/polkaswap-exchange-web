export type DashboardState = {
  ownedAssetIds: Array<string>;
  ownedAssetIdsInterval: Nullable<ReturnType<typeof setInterval>>;
  /** Invalidates owned-asset requests and polling setup started by an older subscription lifecycle. */
  ownedAssetIdsSubscriptionGeneration: number;
};
