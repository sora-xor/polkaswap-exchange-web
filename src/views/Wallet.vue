<template>
  <div class="wallet-container s-flex">
    <sora-neo-wallet />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class Wallet extends Mixins(TranslationMixin) {
}
</script>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$menu-height: 65px;

.wallet-container {
  justify-content: center;
  align-items: center;
  height: calc(100vh - #{$menu-height});
}
</style>
