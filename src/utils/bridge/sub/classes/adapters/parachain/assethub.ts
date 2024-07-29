import { FPNumber } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';

import { ParachainAdapter } from './parachain';

import type { CodecString } from '@sora-substrate/util';
import type { Asset, RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class AssethubParachainAdapter extends ParachainAdapter<string> {
  // overrides "SubAdapter"
  public override async connect(): Promise<void> {
    await super.connect();
    await this.getAssetsMetadata();
  }

  // overrides "ParachainAdapter"
  public override async getAssetIdByMultilocation(asset: Asset, multilocation: any): Promise<string> {}

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    return await this.assetsAccountRequest(accountAddress, assetMeta.id);
  }

  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {}
}
