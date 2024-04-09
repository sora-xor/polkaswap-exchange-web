import { FPNumber } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

enum AcalaPrimitivesCurrencyCurrencyId {
  Token = 'Token',
  Erc20 = 'Erc20',
  ForeignAsset = 'ForeignAsset',
  // this types below looks like not for transfer
  DexShare = 'DexShare',
  LiquidCrowdloan = 'LiquidCrowdloan',
  StableAssetPoolToken = 'StableAssetPoolToken',
}

type IAcalaCurrencyId =
  | {
      [AcalaPrimitivesCurrencyCurrencyId.Token]: string;
    }
  | {
      [AcalaPrimitivesCurrencyCurrencyId.ForeignAsset]: number;
    }
  | {
      [AcalaPrimitivesCurrencyCurrencyId.Erc20]: string;
    };

type IAcalaAssetMetadata = {
  id: IAcalaCurrencyId;
  symbol: string;
  decimals: number;
  minimalBalance: string;
};

function getAcalaCurrencyId(nature: any): Nullable<IAcalaCurrencyId> {
  if (nature.isNativeAssetId) {
    const value = nature.asNativeAssetId;
    if (!value.isToken) return null;
    return { [AcalaPrimitivesCurrencyCurrencyId.Token]: value.asToken.toString() };
  } else if (nature.isForeignAssetId) {
    return { [AcalaPrimitivesCurrencyCurrencyId.ForeignAsset]: nature.asForeignAssetId.toNumber() };
  } else if (nature.isErc20) {
    return { [AcalaPrimitivesCurrencyCurrencyId.Erc20]: nature.asErc20.toString() };
  }

  return null;
}

export class AcalaParachainAdapter extends SubAdapter {
  protected assets: Record<string, IAcalaAssetMetadata> | null = null;

  protected async getAssetsMetadata(): Promise<void> {
    if (this.assets) return;

    const assets = {};
    const entries = await (this.api.query.assetRegistry as any).assetMetadatas.entries();

    for (const [key, option] of entries) {
      const nature = key.args[0];
      const id = getAcalaCurrencyId(nature);

      if (!(id && option.isSome)) continue;

      const symbol = new TextDecoder().decode(option.value.symbol); // bytes to string
      const decimals = option.value.decimals.toNumber();
      const minimalBalance = option.value.minimalBalance.toString();

      assets[symbol] = { id, symbol, decimals, minimalBalance };
    }

    this.assets = Object.freeze(assets);

    console.log(this.assets);
  }

  // overrides SubAdapter
  public async connect(): Promise<void> {
    await super.connect();
    await this.getAssetsMetadata();
  }

  // overrides SubAdapter
  // protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
  //   const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

  //   return this.api.tx.xcmPallet.reserveTransferAssets(
  //     // dest
  //     {
  //       V3: {
  //         parents: 0,
  //         interior: {
  //           X1: {
  //             Parachain: this.getSoraParachainId(),
  //           },
  //         },
  //       },
  //     },
  //     // beneficiary
  //     {
  //       V3: {
  //         parents: 0,
  //         interior: {
  //           X1: {
  //             AccountId32: {
  //               id: this.api.createType('AccountId32', recipient).toHex(),
  //             },
  //           },
  //         },
  //       },
  //     },
  //     // assets
  //     {
  //       V3: [
  //         {
  //           id: {
  //             Concrete: {
  //               parents: 0,
  //               interior: 'Here',
  //             },
  //           },
  //           fun: {
  //             Fungible: value,
  //           },
  //         },
  //       ],
  //     },
  //     // feeAssetItem
  //     0
  //   );
  // }
}
