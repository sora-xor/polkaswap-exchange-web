import type { RegisteredAccountAsset, CodecString } from '@sora-substrate/util';

export type BridgeAccountAsset = {
  address: string;
  decimals: number;
  balance: CodecString;
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
  registeredAssets: Record<string, BridgeAccountAsset>;
  registeredAssetsFetching: boolean;
};
