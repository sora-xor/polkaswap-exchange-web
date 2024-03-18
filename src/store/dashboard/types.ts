export type DashboardState = {
  ownedAssetIds: Array<string>;
  ownedAssetIdsInterval: Nullable<ReturnType<typeof setInterval>>;
};
