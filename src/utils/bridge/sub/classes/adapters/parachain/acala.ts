import { AssetRegistryParachain, type ICurrencyId } from './common/assetRegistry';

export class AcalaParachainAdapter extends AssetRegistryParachain {
  protected override async requestAssetsMetadatas() {
    return await (this.api.query.assetRegistry as any).assetMetadatas.entries();
  }

  protected override async requestCurrencyIdByMultilocation(multilocation: any) {
    return await (this.api.query.assetRegistry as any).locationToCurrencyIds(multilocation);
  }

  protected override getCurrencyId(nature: any): Nullable<ICurrencyId> {
    if (nature.isNativeAssetId) {
      const value = nature.asNativeAssetId;
      if (!value.isToken) return null;
      return this.getNativeCurrencyId(value.asToken.toString());
    } else if (nature.isForeignAssetId) {
      return this.getForeignCurrencyId(nature.asForeignAssetId.toNumber());
    } else if (nature.isErc20) {
      return this.getErc20CurrencyId(nature.asErc20.toString());
    }

    return null;
  }
}
