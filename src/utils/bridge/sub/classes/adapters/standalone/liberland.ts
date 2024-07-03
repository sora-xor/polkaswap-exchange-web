import { FPNumber } from '@sora-substrate/util';
import { BridgeAccountType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId, LiberlandAssetType } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class LiberlandAdapter extends SubAdapter {
  protected override async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    const assetId = Number(asset.externalAddress);

    return await this.withConnection(async () => {
      const result = await (this.api.query.assets as any).asset(assetId);

      if (result.isEmpty) return ZeroStringValue;

      const data = result.unwrap();
      const minBalance = data.minBalance.toString();

      return minBalance > '1' ? minBalance : ZeroStringValue;
    }, ZeroStringValue);
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    return await this.assetsAccountRequest(accountAddress, Number(asset.externalAddress));
  }

  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
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
  public override async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    try {
      return await super.getNetworkFee(asset, sender, recipient);
    } catch (error) {
      // Hardcoded value for Liberland - 0.0106
      return '10600000000';
    }
  }
}
