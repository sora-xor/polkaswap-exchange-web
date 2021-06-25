<template>
  <div>
    <sora-neo-wallet
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
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { AccountAsset, KnownAssets, KnownSymbols } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'

import router, { lazyComponent } from '@/router'
import { PageNames, Components } from '@/consts'
import { isXorAccountAsset } from '@/utils'

@Component({
  components: {
    AboutNetworkDialog: lazyComponent(Components.AboutNetworkDialog)
  }
})
export default class Wallet extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Getter('isAvailable', { namespace: 'addLiquidity' }) isAddLiquidityAvailable!: boolean

  @Action('setTokenFromAddress', { namespace: 'swap' }) setSwapFromAsset!: (address?: string) => Promise<void>
  @Action('setTokenToAddress', { namespace: 'swap' }) setSwapToAsset!: (address?: string) => Promise<void>
  @Action('setAssetAddress', { namespace: 'bridge' }) setBridgeAsset!: (address?: string) => Promise<void>
  @Action('setFirstTokenAddress', { namespace: 'addLiquidity' }) setAddliquidityAssetA!: (address?: string) => Promise<void>
  @Action('setSecondTokenAddress', { namespace: 'addLiquidity' }) setAddliquidityAssetB!: (address?: string) => Promise<void>
  @Action('setFirstTokenAddress', { namespace: 'createPair' }) setCreatePairAssetA!: (address?: string) => Promise<void>
  @Action('setSecondTokenAddress', { namespace: 'createPair' }) setCreatePairAssetB!: (address?: string) => Promise<void>

  showAboutNetworkDialog = false

  handleClose (): void {
    router.back()
  }

  async handleSwap (asset: AccountAsset): Promise<void> {
    await this.setSwapFromAsset(asset.address)
    await this.setSwapToAsset()
    router.push({ name: PageNames.Swap })
  }

  async handleLiquidity (asset: AccountAsset): Promise<void> {
    if (isXorAccountAsset(asset)) {
      router.push({ name: PageNames.AddLiquidity })
      return
    }
    const assetAAddress = KnownAssets.get(KnownSymbols.XOR).address
    const assetBAddress = asset.address
    const params = { assetAAddress, assetBAddress }
    await this.setAddliquidityAssetA(assetAAddress)
    await this.setAddliquidityAssetB(assetBAddress)
    if (this.isAddLiquidityAvailable) {
      router.push({ name: PageNames.AddLiquidity, params })
      return
    }
    await this.setCreatePairAssetA(assetAAddress)
    await this.setCreatePairAssetB(assetBAddress)
    router.push({ name: PageNames.CreatePair, params })
  }

  async handleBridge (asset: AccountAsset): Promise<void> {
    await this.setBridgeAsset(asset.address)
    router.push({ name: PageNames.Bridge, params: { address: asset.address } })
  }

  openAboutNetworkDialog (): void {
    this.showAboutNetworkDialog = true
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
    }
  }
}
</style>
