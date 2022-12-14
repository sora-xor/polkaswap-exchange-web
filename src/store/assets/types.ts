import type { RegisteredAccountAsset, CodecString } from '@sora-substrate/util';

export type RegisterAssetWithExternalBalance = {
  address: string;
  externalAddress: string;
  decimals: number;
  symbol: string;
  name: string;
  externalDecimals: number;
  externalBalance: CodecString;
};

export type AssetsState = {
  registeredAssets: Array<RegisterAssetWithExternalBalance>;
  registeredAssetsFetching: boolean;
};

export type RegisteredAccountAssetWithDecimals = RegisteredAccountAsset & { externalDecimals: number };
