<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('dexSettings.title')"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
    custom-class="settings"
  >
    <swap-market-algorithm />
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import SwapMarketAlgorithm from './MarketAlgorithm/MarketAlgorithm.vue';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SwapMarketAlgorithm,
  },
})
export default class SwapSettings extends Mixins(TranslationMixin, mixins.DialogMixin) {
  @Prop({ default: false, type: Boolean }) readonly appendToBody!: boolean;
}
</script>

<style lang="scss">
.settings {
  &.el-dialog__wrapper .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
  .el-divider {
    margin: $inner-spacing-mini $inner-spacing-small $inner-spacing-medium;
    width: calc(100% - #{$inner-spacing-small} * 2);
  }
}
</style>
