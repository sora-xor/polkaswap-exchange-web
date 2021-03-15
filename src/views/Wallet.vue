<template>
  <sora-neo-wallet
    class="container"
    v-loading="parentLoading"
    @close="handleClose"
    @swap="handleSwap"
  />
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'
import { PageNames } from '@/consts'
import { isWalletConnected } from '@/utils'

const namespace = 'swap'

@Component
export default class Wallet extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Action('setTokenFrom', { namespace }) setTokenFrom!: (options: any) => Promise<void>
  @Action('setTokenTo', { namespace }) setTokenTo!: (options: any) => Promise<void>

  handleClose (): void {
    router.back()
  }

  async handleSwap (token: any): Promise<void> {
    await this.setTokenFrom({ isWalletConnected: isWalletConnected(), tokenSymbol: token.symbol })
    await this.setTokenTo({ isWalletConnected: isWalletConnected() })
    router.push({ name: PageNames.Swap })
  }
}
</script>
