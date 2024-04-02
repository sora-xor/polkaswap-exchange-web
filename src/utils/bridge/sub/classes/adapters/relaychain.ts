import { FPNumber } from '@sora-substrate/util';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { SubAdapter } from './substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class RelaychainAdapter extends SubAdapter {
  protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
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
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    try {
      return await super.getNetworkFee(asset, sender, recipient);
    } catch {
      switch (this.subNetwork) {
        case SubNetworkId.Rococo:
          // Hardcoded value for Rococo - 0.000125 ROC
          return new FPNumber(0.000125, asset.externalDecimals).toCodecString();
        case SubNetworkId.Kusama:
          // Hardcoded value for Kusama - 0.002 KSM
          return new FPNumber(0.002, asset.externalDecimals).toCodecString();
        case SubNetworkId.Polkadot:
          // Hardcoded value for Polkadot - 0.02236 DOT
          return new FPNumber(0.02236, asset.externalDecimals).toCodecString();
        default:
          return '0';
      }
    }
  }
}
