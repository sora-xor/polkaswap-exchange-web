<template>
  <dialog-base :visible.sync="isVisible" :title="t('dexSettings.title')" custom-class="settings">
    <market-algorithm />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    DialogBase: components.DialogBase,
    MarketAlgorithm: lazyComponent(Components.MarketAlgorithm),
  },
})
export default class SettingsDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {}
</script>

<style lang="scss">
.settings {
  &.el-dialog__wrapper .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
}
</style>
