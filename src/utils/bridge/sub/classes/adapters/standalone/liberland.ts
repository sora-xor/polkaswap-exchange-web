import { FPNumber } from '@sora-substrate/sdk';
import { BridgeAccountType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId, LiberlandAssetType } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAsset } from '@sora-substrate/sdk/build/assets/types';
import type { LiberlandAssetId } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

const INTEGER_PATTERN = /^(0|[1-9]\d*)$/;

/**
 * Converts bridge registry metadata into the exact Liberland asset enum shape.
 */
const getLiberlandAssetId = (externalAddress: unknown): LiberlandAssetId => {
  const normalized = typeof externalAddress === 'string' ? externalAddress.trim() : '';

  if (!normalized || normalized === LiberlandAssetType.LLD) {
    return LiberlandAssetType.LLD;
  }

  if (!INTEGER_PATTERN.test(normalized)) {
    throw new Error(`[LiberlandAdapter] Invalid Liberland asset id: "${String(externalAddress)}"`);
  }

  const assetId = Number(normalized);

  if (!Number.isSafeInteger(assetId)) {
    throw new Error(`[LiberlandAdapter] Liberland asset id is outside the safe integer range: "${normalized}"`);
  }

  return { [LiberlandAssetType.Asset]: assetId };
};

const getLiberlandAssetNumber = (asset: RegisteredAsset): Nullable<number> => {
  const assetId = getLiberlandAssetId(asset.externalAddress);

  return assetId === LiberlandAssetType.LLD ? null : assetId[LiberlandAssetType.Asset];
};

export class LiberlandAdapter extends SubAdapter {
  protected override async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    const assetId = getLiberlandAssetNumber(asset);

    if (assetId === null) {
      return asset.symbol === this.chainSymbol ? await this.getExistentialDeposit() : ZeroStringValue;
    }

    return await this.assetMinBalanceRequest(assetId);
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetId = getLiberlandAssetNumber(asset);

    if (assetId === null) {
      return asset.symbol === this.chainSymbol ? await this.getTokenBalance(accountAddress, asset) : ZeroStringValue;
    }

    return await this.assetsAccountRequest(accountAddress, assetId);
  }

  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const { externalAddress: address, externalDecimals: decimals } = asset;
    const value = new FPNumber(amount, decimals).toCodecString();

    const assetId = getLiberlandAssetId(address);

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
    try {
      return await super.getNetworkFee(asset, sender, recipient);
    } catch (error) {
      // Hardcoded value for Liberland - 0.0106
      return '10600000000';
    }
  }
}
