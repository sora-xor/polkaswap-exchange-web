import type { RegisteredAccountAsset, CodecString } from '@sora-substrate/util';

export type EvmAccountAsset = {
  address: string;
  decimals: number;
  balance: CodecString;
  contract?: string;
};

// TODO: move externalDecimals to RegisteredAccountAsset;
export type RegisteredAccountAssetWithDecimals = RegisteredAccountAsset & { externalDecimals: number };

export type RegisteredAccountAssetObject = {
  [key: string]: RegisteredAccountAssetWithDecimals;
};

export type AssetsState = {
  registeredAssets: Record<string, EvmAccountAsset>;
  registeredAssetsFetching: boolean;
};
