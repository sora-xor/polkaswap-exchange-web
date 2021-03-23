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

  @Action('setTokenFromAddress', { namespace }) setTokenFrom!: (address?: string) => Promise<void>
  @Action('setTokenToAddress', { namespace }) setTokenTo!: (address?: string) => Promise<void>

  handleClose (): void {
    router.back()
  }

  async handleSwap (token: any): Promise<void> {
    await this.setTokenFrom(token.address)
    await this.setTokenTo()
    router.push({ name: PageNames.Swap })
  }
}
</script>
