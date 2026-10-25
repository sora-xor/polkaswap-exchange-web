import { FPNumber } from '@sora-substrate/sdk';
import { BridgeAccountType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId, LiberlandAssetType } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAsset } from '@sora-substrate/sdk/build/assets/types';
import type { LiberlandAssetId } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

const INTEGER_PATTERN = /^(0|[1-9]\d*)$/;
const MAX_LIBERLAND_ASSET_ID = 4_294_967_295;

class InvalidLiberlandAssetIdError extends Error {}

/**
 * Converts bridge registry metadata into the exact Liberland asset enum shape.
 * Blank metadata is valid only for the native LLD asset.
 */
const getLiberlandAssetId = (asset: RegisteredAsset, nativeSymbol: string): LiberlandAssetId => {
  const { externalAddress, symbol } = asset;
  const normalized = typeof externalAddress === 'string' ? externalAddress.trim() : '';

  if (!normalized || normalized === LiberlandAssetType.LLD) {
    if (symbol !== nativeSymbol) {
      throw new InvalidLiberlandAssetIdError(
        `[LiberlandAdapter] Missing Liberland asset id for non-native asset "${symbol}"`
      );
    }

    return LiberlandAssetType.LLD;
  }

  if (!INTEGER_PATTERN.test(normalized)) {
    throw new InvalidLiberlandAssetIdError(
      `[LiberlandAdapter] Invalid Liberland asset id: "${String(externalAddress)}"`
    );
  }

  const assetId = Number(normalized);

  if (!Number.isSafeInteger(assetId) || assetId > MAX_LIBERLAND_ASSET_ID) {
    throw new InvalidLiberlandAssetIdError(
      `[LiberlandAdapter] Liberland asset id is outside the u32 range: "${normalized}"`
    );
  }

  return { [LiberlandAssetType.Asset]: assetId };
};

/**
 * Returns null for native LLD and a number for a validated pallet-assets ID.
 */
const getLiberlandAssetNumber = (asset: RegisteredAsset, nativeSymbol: string): number | null => {
  const assetId = getLiberlandAssetId(asset, nativeSymbol);

  return assetId === LiberlandAssetType.LLD ? null : assetId[LiberlandAssetType.Asset];
};

/**
 * Safely resolves optional balance metadata without querying LLD for an invalid asset.
 */
const tryGetLiberlandAssetNumber = (asset: RegisteredAsset, nativeSymbol: string): number | null | undefined => {
  try {
    return getLiberlandAssetNumber(asset, nativeSymbol);
  } catch (error) {
    if (error instanceof InvalidLiberlandAssetIdError) return undefined;
    throw error;
  }
};

export class LiberlandAdapter extends SubAdapter {
  protected override async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    const assetId = tryGetLiberlandAssetNumber(asset, this.chainSymbol);

    if (assetId === undefined) return ZeroStringValue;

    if (assetId === null) {
      return asset.symbol === this.chainSymbol ? await this.getExistentialDeposit() : ZeroStringValue;
    }

    return await this.assetMinBalanceRequest(assetId);
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetId = tryGetLiberlandAssetNumber(asset, this.chainSymbol);

    if (assetId === undefined) return ZeroStringValue;

    if (assetId === null) {
      return asset.symbol === this.chainSymbol ? await this.getTokenBalance(accountAddress, asset) : ZeroStringValue;
    }

    return await this.assetsAccountRequest(accountAddress, assetId);
  }

  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const { externalDecimals: decimals } = asset;
    const value = new FPNumber(amount, decimals).toCodecString();

    const assetId = getLiberlandAssetId(asset, this.chainSymbol);

    return this.api.tx.soraBridgeApp.burn(
      // networkId
      SubNetworkId.Mainnet,
      // assetId
      assetId,
      // recipient
      { [BridgeAccountType.Sora]: recipient },
      // amount
      value
    );
  }

  /* Throws error until Substrate 5 migration */
  public override async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    // Invalid metadata must not be hidden by the temporary hardcoded fee fallback.
    getLiberlandAssetId(asset, this.chainSymbol);

    try {
      return await super.getNetworkFee(asset, sender, recipient);
    } catch (error) {
      // Hardcoded value for Liberland - 0.0106
      return '10600000000';
    }
  }
}
