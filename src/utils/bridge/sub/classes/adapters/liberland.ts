import { FPNumber } from '@sora-substrate/util';
import { BridgeAccountType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId, LiberlandAssetType } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from './substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class LiberlandAdapter extends SubAdapter {
  public async getTokenBalance(accountAddress: string, address: string): Promise<CodecString> {
    return address === LiberlandAssetType.LLD
      ? await this.getAccountBalance(accountAddress)
      : await this.getAccountAssetBalance(accountAddress, address);
  }

  private async getAccountAssetBalance(accountAddress: string, address: string): Promise<CodecString> {
    if (!(this.connected && accountAddress)) return ZeroStringValue;

    await this.api.isReady;

    const assetId = Number(address);
    const result = await (this.api.query.assets as any).account(assetId, accountAddress);

    if (result.isEmpty) return ZeroStringValue;

    const data = result.unwrap();

    if (data.isFrozen.isTrue) return ZeroStringValue;

    return data.balance.toString();
  }

  protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const { externalAddress: address, externalDecimals: decimals } = asset;
    const value = new FPNumber(amount, decimals).toCodecString();

    const assetId = address === LiberlandAssetType.LLD ? address : { Asset: Number(address) };

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
}
