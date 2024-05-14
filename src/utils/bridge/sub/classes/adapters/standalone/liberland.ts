import { FPNumber } from '@sora-substrate/util';
import { BridgeAccountType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId, LiberlandAssetType } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class LiberlandAdapter extends SubAdapter {
  // overrides SubAdapter method
  public async getTokenBalance(accountAddress: string, asset: RegisteredAsset): Promise<CodecString> {
    return asset.externalAddress
      ? await this.getAccountAssetBalance(accountAddress, asset.externalAddress)
      : await this.getAccountBalance(accountAddress);
  }

  // overrides SubAdapter method
  public async getAssetMinDeposit(asset: RegisteredAsset): Promise<CodecString> {
    return asset.externalAddress
      ? await this.getAssetDeposit(asset.externalAddress)
      : await this.getExistentialDeposit();
  }

  protected async getAssetDeposit(assetAddress: string): Promise<CodecString> {
    return await this.withConnection(async () => {
      const assetId = Number(assetAddress);
      const result = await (this.api.query.assets as any).asset(assetId);

      if (result.isEmpty) return ZeroStringValue;

      const data = result.unwrap();
      const minBalance = data.minBalance.toString();

      return minBalance > '1' ? minBalance : ZeroStringValue;
    }, ZeroStringValue);
  }

  protected async getAccountAssetBalance(accountAddress: string, assetAddress: string): Promise<CodecString> {
    if (!accountAddress) return ZeroStringValue;

    return await this.withConnection(async () => {
      const assetId = Number(assetAddress);
      const result = await (this.api.query.assets as any).account(assetId, accountAddress);

      if (result.isEmpty) return ZeroStringValue;

      const data = result.unwrap();

      if (!data.status.isLiquid) return ZeroStringValue;

      return data.balance.toString();
    }, ZeroStringValue);
  }

  protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const { externalAddress: address, externalDecimals: decimals } = asset;
    const value = new FPNumber(amount, decimals).toCodecString();

    const assetId = address ? { Asset: Number(address) } : LiberlandAssetType.LLD;

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
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    try {
      return await super.getNetworkFee(asset, sender, recipient);
    } catch (error) {
      // Hardcoded value for Liberland - 0.0106
      return '10600000000';
    }
  }
}
