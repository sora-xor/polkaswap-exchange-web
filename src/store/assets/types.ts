import type { SubAssetId } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export type BridgeRegisteredAsset = {
  address: string | SubAssetId;
  decimals: number;
  kind: string;
  contract?: string;
};

export type AssetsState = {
  registeredAssets: Record<string, BridgeRegisteredAsset>;
  registeredAssetsFetching: boolean;
};
