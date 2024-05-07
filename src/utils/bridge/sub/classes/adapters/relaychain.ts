import { FPNumber } from '@sora-substrate/util';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { SubAdapter } from './substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class RelaychainAdapter extends SubAdapter {
  // overrides SubAdapter
  protected override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    return this.api.tx.xcmPallet.reserveTransferAssets(
      // dest
      {
        V3: {
          parents: 0,
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

  /* Throws error until Substrate 5 migration */
  public override async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    try {
      return await super.getNetworkFee(asset, sender, recipient);
    } catch {
      const toCodec = (fee: number) => new FPNumber(fee, asset.externalDecimals).toCodecString();
      // Hardcoded values
      switch (this.subNetwork) {
        case SubNetworkId.Rococo:
          return toCodec(0.000125);
        case SubNetworkId.Alphanet:
          return toCodec(0.019);
        case SubNetworkId.Kusama:
          return toCodec(0.002);
        case SubNetworkId.Polkadot:
          return toCodec(0.059);
        default:
          return '0';
      }
    }
  }
}
