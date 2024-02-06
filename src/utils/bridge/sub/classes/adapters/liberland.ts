import { FPNumber } from '@sora-substrate/util';
import { BridgeAccountType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId, LiberlandAssetType } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from './substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class LiberlandAdapter extends SubAdapter {
  // overrides SubAdapter method
  public async getTokenBalance(accountAddress: string, assetAddress: string): Promise<CodecString> {
    return assetAddress
      ? await this.getAccountAssetBalance(accountAddress, assetAddress)
      : await this.getAccountBalance(accountAddress);
  }

  // overrides SubAdapter method
  public async getAssetMinimumAmount(assetAddress: string): Promise<CodecString> {
    return assetAddress ? await this.getAssetMinDeposit(assetAddress) : await this.getExistensionalDeposit();
  }

  protected async getAssetMinDeposit(assetAddress: string): Promise<CodecString> {
    await this.connect();

    const assetId = Number(assetAddress);
    const result = await (this.api.query.assets as any).asset(assetId);

    if (result.isEmpty) return ZeroStringValue;

    const data = result.unwrap();

    return data.minBalance.toString(); // [TODO: Liberland] check that this is CodecString
  }

  protected async getAccountAssetBalance(accountAddress: string, assetAddress: string): Promise<CodecString> {
    if (!(this.connected && accountAddress)) return ZeroStringValue;

    await this.api.isReady;

    const assetId = Number(assetAddress);
    const result = await (this.api.query.assets as any).account(assetId, accountAddress);

    if (result.isEmpty) return ZeroStringValue;

    const data = result.unwrap();

    if (data.isFrozen.isTrue) return ZeroStringValue;

    return data.balance.toString();
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
}
