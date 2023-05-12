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
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import router, { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { isXorAccountAsset } from '@/utils';
import { action, getter } from '@/store/decorators';

@Component({
  components: {
    WalletAboutNetworkDialog: lazyComponent(Components.WalletAboutNetworkDialog),
  },
})
export default class Wallet extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @getter.addLiquidity.isAvailable private isAddLiquidityAvailable!: boolean;

  @action.swap.setTokenFromAddress private setSwapFromAsset!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setSwapToAsset!: (address?: string) => Promise<void>;
  @action.bridge.setAssetAddress private setBridgeAsset!: (address?: string) => Promise<void>;
  @action.addLiquidity.setFirstTokenAddress private setAddliquidityAssetA!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenAddress private setAddliquidityAssetB!: (address: string) => Promise<void>;

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
    if (isXorAccountAsset(asset)) {
      router.push({ name: PageNames.AddLiquidity });
      return;
    }
    const assetAAddress = XOR.address;
    const assetBAddress = asset.address;
    const params = { assetAAddress, assetBAddress };
    await this.setAddliquidityAssetA(assetAAddress);
    await this.setAddliquidityAssetB(assetBAddress);
    router.push({ name: PageNames.AddLiquidity, params });
  }

  async handleBridge(asset: AccountAsset): Promise<void> {
    await this.setBridgeAsset(asset.address);
    router.push({ name: PageNames.Bridge, params: { address: asset.address } });
  }

  openAboutNetworkDialog(): void {
    this.showAboutNetworkDialog = true;
  }
}
</script>

<style lang="scss">
.container--wallet {
  > .el-card {
    &__header {
      padding-top: 0;
      padding-right: 0;
      padding-left: 0;

      .base-title_action {
        > button {
          display: none;
        }
      }
    }
    &__body {
      padding: $inner-spacing-medium 0 0;

      button.liquidity.asset-details-action,
      button.bridge.asset-details-action {
        display: none !important;
      }
    }
  }
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
