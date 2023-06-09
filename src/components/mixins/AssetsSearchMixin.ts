import { Component, Mixins } from 'vue-property-decorator';

import SearchInputMixin from '@/components/mixins/SearchInputMixin';

import type { RegisteredAccountAsset } from '@sora-substrate/util';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class AssetsSearchMixin extends Mixins(SearchInputMixin) {
  public filterAssetsByQuery(assets: Array<Asset | AccountAsset | RegisteredAccountAsset>, isRegisteredAssets = false) {
    const addressField = isRegisteredAssets ? 'externalAddress' : 'address';

    return (query: string): Array<Asset | AccountAsset | RegisteredAccountAsset> => {
      if (!query) return assets;

      const search = query.toLowerCase().trim();

      return assets.filter(
        (asset) =>
          asset.name?.toLowerCase?.()?.includes?.(search) ||
          asset.symbol?.toLowerCase?.()?.includes?.(search) ||
          asset[addressField]?.toLowerCase?.() === search
      );
    };
  }
}
