export type BridgeRegisteredAsset = {
  address: string;
  decimals: number;
  kind: string;
  contract?: string;
};

export type AssetsState = {
  registeredAssets: Record<string, BridgeRegisteredAsset>;
  registeredAssetsFetching: boolean;
  pinnedAssetsAddresses: string[];
};
