import { Component, Ref, Vue } from 'vue-property-decorator';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

@Component
export default class AssetsSearchMixin extends Vue {
  @Ref('search') readonly search!: any;

  public focusSearchInput(): void {
    this.search?.focus();
  }

  public filterAssetsByQuery(
    assets: Array<Asset | AccountAsset | RegisteredAccountAssetWithDecimals>,
    isRegisteredAssets = false
  ) {
    const addressField = isRegisteredAssets ? 'externalAddress' : 'address';

    return (query: string): Array<Asset | AccountAsset | RegisteredAccountAssetWithDecimals> => {
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
