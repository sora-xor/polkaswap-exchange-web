import { FPNumber } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';

import { ParachainAdapter } from './parachain';

import type { CodecString } from '@sora-substrate/util';
import type { Asset, RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class AstarParachainAdapter extends ParachainAdapter<string> {
  // overrides "SubAdapter"
  public override async connect(): Promise<void> {
    await super.connect();
    await this.getAssetsMetadata();
  }

  // overrides "ParachainAdapter"
  public override async getAssetIdByMultilocation(asset: Asset, multilocation: any): Promise<string> {
    const versionedMultilocation = {
      V3: multilocation,
    };

    const result = await (this.api.query.xcAssetConfig as any).assetLocationToId(versionedMultilocation);

    if (result.isEmpty) return '';

    const id = result.unwrap().toString();

    return id;
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    return await this.assetsAccountRequest(accountAddress, assetMeta.id);
  }

  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    return asset.symbol === this.chainSymbol
      ? this.getNativeTransferExtrinsic(asset, recipient, amount)
      : this.getAssetTransferExtrinsic(asset, recipient, amount);
  }

  /**
   * Transfer native token (ASTR)
   */
  protected getNativeTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: string | number) {
    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    return this.api.tx.polkadotXcm.reserveTransferAssets(
      // dest
      {
        V3: {
          parents: 1,
          interior: {
            X1: {
              Parachain: this.getSoraParachainId(),
            },
          },
        },
      },
      // beneficiary
      {
        V3: {
          parents: 0,
          interior: {
            X1: {
              AccountId32: {
                id: this.api.createType('AccountId32', recipient).toHex(),
              },
            },
          },
        },
      },
      // assets
      {
        V3: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: 'Here',
              },
            },
            fun: {
              Fungible: value,
            },
          },
        ],
      },
      // feeAssetItem
      0
    );
  }

  /**
   * Transfer non native token
   */
  protected getAssetTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) throw new Error(`[${this.constructor.name}] asset metadata is empty`);

    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    return this.api.tx.xTokens.transfer(
      // currencyId
      assetMeta.id,
      // amount: u128
      value,
      // dest: XcmVersionedMultiLocation
      {
        V3: {
          parents: 1,
          interior: {
            X2: [
              {
                Parachain: this.getSoraParachainId(),
              },
              {
                AccountId32: {
                  id: this.api.createType('AccountId32', recipient).toHex(),
                },
              },
            ],
          },
        },
      },
      // destWeightLimit: XcmV3WeightLimit
      'Unlimited'
    );
  }
}
