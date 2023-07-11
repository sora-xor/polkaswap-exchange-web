import type { CodecString } from '@sora-substrate/util';

export type BridgeRegisteredAsset = {
  address: string;
  decimals: number;
  kind: string;
  contract?: string;
};

export type SubAccountAsset = {
  address: string;
  decimals: number;
  balance: CodecString;
};

export type AssetsState = {
  registeredAssets: Record<string, BridgeRegisteredAsset>;
  registeredAssetsFetching: boolean;
};
