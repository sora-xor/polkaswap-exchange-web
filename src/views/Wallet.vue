<template>
  <div>
    <sora-neo-wallet
      class="container container--wallet"
      v-loading="parentLoading"
      @close="handleClose"
      @swap="handleSwap"
      @learn-more="openAboutNetworkDialog"
    />
    <about-network-dialog :visible.sync="showAboutNetworkDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import router, { lazyComponent } from '@/router'
import { PageNames, Components } from '@/consts'

const namespace = 'swap'

@Component({
  components: {
    AboutNetworkDialog: lazyComponent(Components.AboutNetworkDialog)
  }
})
export default class Wallet extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Action('setTokenFromAddress', { namespace }) setTokenFrom!: (address?: string) => Promise<void>
  @Action('setTokenToAddress', { namespace }) setTokenTo!: (address?: string) => Promise<void>

  showAboutNetworkDialog = false

  handleClose (): void {
    router.back()
  }

  async handleSwap (token: any): Promise<void> {
    await this.setTokenFrom(token.address)
    await this.setTokenTo()
    router.push({ name: PageNames.Swap })
  }

  openAboutNetworkDialog (): void {
    this.showAboutNetworkDialog = true
  }
}
</script>

<style lang="scss">
.container--wallet {
  .el-card {
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
