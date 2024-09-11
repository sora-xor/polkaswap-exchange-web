import { AssetRegistryParachain, type ICurrencyId } from './common/assetRegistry';

export class CurioParachainAdapter extends AssetRegistryParachain {
  protected override async requestAssetsMetadatas() {
    return await (this.api.query.assetRegistry as any).metadata.entries();
  }

  protected override async requestCurrencyIdByMultilocation(multilocation: any) {
    return await (this.api.query.assetRegistry as any).locationToAssetId(multilocation);
  }

  protected override getCurrencyId(nature: any): Nullable<ICurrencyId> {
    if (nature.isToken) {
      return this.getNativeCurrencyId(nature.asToken.toString());
    } else if (nature.isForeignAsset) {
      return this.getForeignCurrencyId(nature.asForeignAsset.toNumber());
    }

    return null;
  }
}
