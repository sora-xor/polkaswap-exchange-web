export type BridgeRegisteredAsset = {
  /** asset id in external network */
  address: string;
  /** asset symbol in external network */
  symbol: string;
  /** asset decimals in external network */
  decimals: number;
  /** asset kind related to SORA network */
  kind: string;
  /** asset contract address (for evm) */
  contract?: string;
};

export type AssetsState = {
  registeredAssets: Record<string, BridgeRegisteredAsset>;
  registeredAssetsFetching: boolean;
};
