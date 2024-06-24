import { FPNumber } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';

import { ZeroStringValue } from '@/consts';

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
  }

  private getAssetMeta(asset: RegisteredAsset): Nullable<IAcalaAssetMetadata> {
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

    if (!(accountAddress && assetMeta)) return ZeroStringValue;

    return await this.withConnection(async () => {
      const ormlTokensAccountData = await (this.api.query.tokens as any).accounts(accountAddress, assetMeta.id);
      const balance = formatBalance(ormlTokensAccountData, assetMeta.decimals);

      return balance.transferable;
    }, ZeroStringValue);
  }

  // overrides SubAdapter
  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: number | string) {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) throw new Error(`[${this.constructor.name}] asset metadata is empty`);

    const value = new FPNumber(amount, asset.externalDecimals).toCodecString();

    return this.api.tx.xTokens.transfer(
      // currencyId: AcalaPrimitivesCurrencyCurrencyId
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

  public override async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    /* Throws error until Substrate 5 migration */
    // return await super.getNetworkFee(asset, sender, recipient);
    // Hardcoded value for Acala - 0.003 ACA
    return '3000000000';
  }
}
