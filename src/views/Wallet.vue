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
    <about-network-dialog :visible.sync="showAboutNetworkDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter, Action } from 'vuex-class';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import router, { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { isXorAccountAsset } from '@/utils';

@Component({
  components: {
    AboutNetworkDialog: lazyComponent(Components.AboutNetworkDialog),
  },
})
export default class Wallet extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @Getter('isAvailable', { namespace: 'addLiquidity' }) isAddLiquidityAvailable!: boolean;

  @Action('setTokenFromAddress', { namespace: 'swap' }) setSwapFromAsset!: (address?: string) => Promise<void>;
  @Action('setTokenToAddress', { namespace: 'swap' }) setSwapToAsset!: (address?: string) => Promise<void>;
  @Action('setAssetAddress', { namespace: 'bridge' }) setBridgeAsset!: (address?: string) => Promise<void>;
  @Action('setFirstTokenAddress', { namespace: 'addLiquidity' }) setAddliquidityAssetA!: (
    address?: string
  ) => Promise<void>;

  @Action('setSecondTokenAddress', { namespace: 'addLiquidity' }) setAddliquidityAssetB!: (
    address?: string
  ) => Promise<void>;

  @Action('setFirstTokenAddress', { namespace: 'createPair' }) setCreatePairAssetA!: (
    address?: string
  ) => Promise<void>;

  @Action('setSecondTokenAddress', { namespace: 'createPair' }) setCreatePairAssetB!: (
    address?: string
  ) => Promise<void>;

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
    if (this.isAddLiquidityAvailable) {
      router.push({ name: PageNames.AddLiquidity, params });
      return;
    }
    await this.setCreatePairAssetA(assetAAddress);
    await this.setCreatePairAssetB(assetBAddress);
    router.push({ name: PageNames.CreatePair, params });
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
    }
    &__body {
      padding: $inner-spacing-medium 0 0;

      .preview-image {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: $inner-spacing-small;
        &__content {
          object-fit: cover;
          border-radius: calc(var(--s-border-radius-mini) * 0.75);
        }
        &__icon {
          color: var(--s-color-base-content-tertiary);
          font-size: 32px !important;
          margin-bottom: $basic-spacing;
        }
        .placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      }
    }
  }
  .history .history-items {
    padding: 0 $inner-spacing-mini;
  }
  .s-icon-basic-check-mark-24 {
    @include icon-styles;
  }
}
</style>
