import type { RegisteredAccountAsset, CodecString } from '@sora-substrate/util';

export type BridgeRegisteredAsset = {
  address: string;
  decimals: number;
  contract?: string;
};

export type SubAccountAsset = {
  address: string;
  decimals: number;
  balance: CodecString;
};

export type RegisteredAccountAssetObject = {
  [key: string]: RegisteredAccountAsset;
};

export type AssetsState = {
  registeredAssets: Record<string, BridgeRegisteredAsset>;
  registeredAssetsFetching: boolean;
};
