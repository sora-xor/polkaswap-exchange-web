import { FPNumber } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';

import { ZeroStringValue } from '@/consts';

import { ParachainAdapter, type IParachainAssetMetadata } from '../parachain';

import type { CodecString } from '@sora-substrate/util';
import type { Asset, RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export enum CurrencyId {
  Token = 'Token',
  Erc20 = 'Erc20',
  ForeignAsset = 'ForeignAsset',
}

export type ICurrencyId =
  | {
      [CurrencyId.Token]: string;
    }
  | {
      [CurrencyId.ForeignAsset]: number;
    }
  | {
      [CurrencyId.Erc20]: string;
    };

export class AssetRegistryParachain extends ParachainAdapter<ICurrencyId> {
  protected async requestAssetsMetadatas(): Promise<any> {
    throw new Error(`[${this.constructor.name}] "requestAssetsMetadatas" method is not implemented`);
  }

  protected async requestCurrencyIdByMultilocation(multilocation: any): Promise<any> {
    throw new Error(`[${this.constructor.name}] "requestCurrencyIdByMultilocation" method is not implemented`);
  }

  protected getCurrencyId(nature: any): Nullable<ICurrencyId> {
    throw new Error(`[${this.constructor.name}] "getCurrencyId" method is not implemented`);
  }

  // overrides "SubAdapter"
  public override async connect(): Promise<void> {
    await super.connect();
    await this.getAssetsMetadata();
  }

  protected getNativeCurrencyId(id: string) {
    return { [CurrencyId.Token]: id };
  }

  protected getForeignCurrencyId(id: number) {
    return { [CurrencyId.ForeignAsset]: id };
  }

  protected getErc20CurrencyId(id: string) {
    return { [CurrencyId.Erc20]: id };
  }

  // overrides "ParachainAdapter"
  protected override async getAssetsMetadata(): Promise<void> {
    if (Array.isArray(this.assets)) return;

    const assets: IParachainAssetMetadata<ICurrencyId>[] = [];
    const entries = await this.requestAssetsMetadatas();

    for (const [key, option] of entries) {
      const nature = key.args[0];
      const id = this.getCurrencyId(nature);

      if (!(id && option.isSome)) continue;

      const { value } = option;
      const existensialDeposit = value.minimalBalance ?? value.existentialDeposit;

      const symbol = new TextDecoder().decode(value.symbol); // bytes to string
      const decimals = value.decimals.toNumber();
      const minimalBalance = existensialDeposit.toString();

      assets.push({ id, symbol, decimals, minimalBalance });
    }

    this.assets = Object.freeze(assets);
  }

  // overrides "ParachainAdapter"
  public override async getAssetIdByMultilocation(asset: Asset, multilocation: any): Promise<ICurrencyId | null> {
    const result = await this.requestCurrencyIdByMultilocation(multilocation);
    const id = result.isEmpty ? this.getNativeCurrencyId(asset.symbol) : this.getCurrencyId(result.unwrap());

    return id ?? null;
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!(accountAddress && assetMeta)) return ZeroStringValue;

    return await this.withConnection(async () => {
      const ormlTokensAccountData = await (this.api.query.tokens as any).accounts(accountAddress, assetMeta.id);
      const balance = formatBalance(ormlTokensAccountData, assetMeta.decimals);

      return balance.transferable;
    }, ZeroStringValue);
  }

  // overrides "SubAdapter"
  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) throw new Error(`[${this.constructor.name}] asset metadata is empty`);

    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    return this.api.tx.xTokens.transfer(
      // currencyId: CurrencyId
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
