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
  public override async getAssetId(asset: Asset): Promise<string> {
    // no way to match by multilocation
    return this.assets?.find((item) => item.symbol === asset.symbol)?.id ?? '';
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    return await this.assetsAccountRequest(accountAddress, assetMeta.id);
  }

  public override async getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    if (!this.connector.soraParachain) throw new Error(`[${this.constructor.name}] soraParachain adapter required`);

    const multilocation = await this.connector.soraParachain.getAssetMulilocation(asset.address);
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
              Concrete: multilocation,
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
}
