import { FPNumber } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

type IAstarAssetMetadata = {
  id: string;
  symbol: string;
  decimals: number;
  minimalBalance: string;
};

export class AstarParachainAdapter extends SubAdapter {
  protected assets: Record<string, IAstarAssetMetadata> | null = null;

  protected async getAssetsMetadata(): Promise<void> {
    if (this.assets) return;

    const assets = {};
    const entries = await (this.api.query.assets as any).metadata.entries();

    for (const [key, value] of entries) {
      const id = key.args[0].toString();
      const symbol = new TextDecoder().decode(value.symbol); // bytes to string
      const decimals = value.decimals.toNumber();
      const minimalBalance = value.deposit.toString();

      assets[symbol] = { id, symbol, decimals, minimalBalance };
    }

    this.assets = Object.freeze(assets);
  }

  private getAssetMeta(asset: RegisteredAsset): Nullable<IAstarAssetMetadata> {
    if (!(asset.symbol && this.assets)) return null;

    return this.assets[asset.symbol];
  }

  // overrides SubAdapter
  public override async connect(): Promise<void> {
    await super.connect();
    await this.getAssetsMetadata();
  }

  protected override async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    const minBalance = assetMeta.minimalBalance;

    return minBalance > '1' ? minBalance : ZeroStringValue;
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    return await this.assetsAccountRequest(accountAddress, assetMeta.id);
  }

  // // overrides SubAdapter
  // protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
  //   if (!this.assets) throw new Error(`[${this.constructor.name}] assets metadata is empty`);

  //   const { id } = this.assets[asset.symbol];
  //   const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

  //   return this.api.tx.xTokens.transfer(
  //     // currencyId: AcalaPrimitivesCurrencyCurrencyId
  //     id,
  //     // amount: u128
  //     value,
  //     // dest: XcmVersionedMultiLocation
  //     {
  //       V3: {
  //         parents: 1,
  //         interior: {
  //           X2: [
  //             {
  //               Parachain: this.getSoraParachainId(),
  //             },
  //             {
  //               AccountId32: {
  //                 id: this.api.createType('AccountId32', recipient).toHex(),
  //               },
  //             },
  //           ],
  //         },
  //       },
  //     },
  //     // destWeightLimit: XcmV3WeightLimit
  //     'Unlimited'
  //   );
  // }

  // /* Throws error until Substrate 5 migration */
  // public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
  //   try {
  //     return await super.getNetworkFee(asset, sender, recipient);
  //   } catch (error) {
  //     // Hardcoded value for Acala - 0.003 ACA
  //     return '3000000000';
  //   }
  // }
}
