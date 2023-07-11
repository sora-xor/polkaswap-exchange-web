import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

export type BridgeRegisteredAsset = {
  address: string;
  decimals: number;
  contract?: string;
  kind?: string;
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
