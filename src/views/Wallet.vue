<template>
  <div class="wallet-container s-flex">
    <sora-neo-wallet @close="handleClose" @swap="handleSwap" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'
import { PageNames } from '@/consts'
import { isWalletConnected } from '@/utils'

@Component
export default class Wallet extends Mixins(TranslationMixin) {
  @Action setTokenFrom

  handleClose (): void {
    router.back()
  }

  async handleSwap (token: any): Promise<void> {
    await this.setTokenFrom({ isWalletConnected: isWalletConnected(), tokenSymbol: token.symbol })
    router.push({ name: PageNames.Swap })
  }
}
</script>

<style lang="scss" scoped>
.wallet-container {
  justify-content: center;
  margin-top: $inner-spacing-big;
}
</style>
