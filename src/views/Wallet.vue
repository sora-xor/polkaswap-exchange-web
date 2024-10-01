<template>
  <div>
    <sora-wallet
      v-loading="parentLoading"
      class="container container--wallet"
      @close="handleClose"
      @swap="handleSwap"
      @liquidity="handleLiquidity"
      @bridge="handleBridge"
      @learn-more="openAboutNetworkDialog"
    />
    <wallet-about-network-dialog :visible.sync="showAboutNetworkDialog" />
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames, Components } from '@/consts';
import router, { lazyComponent } from '@/router';
import { action, getter } from '@/store/decorators';

import type { AccountAsset, Whitelist } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    WalletAboutNetworkDialog: lazyComponent(Components.WalletAboutNetworkDialog),
  },
})
export default class Wallet extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @getter.wallet.account.whitelist private whitelist!: Whitelist;

  @action.swap.setTokenFromAddress private setSwapFromAsset!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setSwapToAsset!: (address?: string) => Promise<void>;
  @action.addLiquidity.setFirstTokenAddress private setAddliquidityAssetA!: (address: string) => Promise<void>;

  showAboutNetworkDialog = false;

  handleClose(): void {
    router.back();
  }

  async handleSwap(asset: AccountAsset): Promise<void> {
    await this.setSwapFromAsset(asset.address);
    await this.setSwapToAsset();
    router.push({ name: PageNames.Swap });
  }

  async handleLiquidity(asset: AccountAsset): Promise<void> {
    if (api.dex.baseAssetsIds.includes(asset.address)) {
      this.setAddliquidityAssetA(asset.address);
      router.push({ name: PageNames.AddLiquidity });
      return;
    }

    const assetAAddress = XOR.address;
    const assetBAddress = asset.address;

    const first = this.whitelist[assetAAddress]?.symbol ?? assetAAddress;
    const second = this.whitelist[assetBAddress]?.symbol ?? assetBAddress;
    const params = { first, second };

    router.push({ name: PageNames.AddLiquidity, params });
  }

  handleBridge(asset: AccountAsset): void {
    router.push({ name: PageNames.Bridge, params: { address: asset.address } });
  }

  openAboutNetworkDialog(): void {
    this.showAboutNetworkDialog = true;
  }
}
</script>

<style lang="scss">
.container--wallet {
  .history .history-items {
    padding: 0 $inner-spacing-mini;
  }
  .s-icon-basic-check-mark-24 {
    @include icon-styles;
  }

  @include large-mobile(true) {
    .account-credentials_description {
      .account-credentials_address {
        .first {
          width: 36px;
        }
      }
    }
  }
}
</style>
