<template>
  <dialog-base :visible.sync="isVisible" :title="t('dexSettings.title')" custom-class="settings">
    <market-algorithm />
    <template v-if="chartsFlagEnabled">
      <s-divider />
      <charts-switch />
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { getter } from '@/store/decorators';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    DialogBase: components.DialogBase,
    MarketAlgorithm: lazyComponent(Components.MarketAlgorithm),
    ChartsSwitch: lazyComponent(Components.ChartsSwitch),
  },
})
export default class SettingsDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {
  @getter.settings.chartsFlagEnabled chartsFlagEnabled!: boolean;
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
