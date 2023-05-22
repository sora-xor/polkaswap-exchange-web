import type { RegisteredAccountAsset, CodecString } from '@sora-substrate/util';

export type EvmAccountAsset = {
  address: string;
  decimals: number;
  balance: CodecString;
  contract?: string;
};

export type RegisteredAccountAssetObject = {
  [key: string]: RegisteredAccountAsset;
};

export type AssetsState = {
  registeredAssets: Record<string, EvmAccountAsset>;
  registeredAssetsFetching: boolean;
  registeredAssetsBalancesUpdating: boolean;
};
