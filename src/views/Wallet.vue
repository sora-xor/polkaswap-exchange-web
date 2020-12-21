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

@Component
export default class Wallet extends Mixins(TranslationMixin) {
  @Action setTokenFrom

  handleClose (): void {
    router.push({ name: PageNames.Swap })
  }

  handleSwap (token: any): void {
    // TODO: Ask about this place
    // this.setTokenFrom(token)
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
