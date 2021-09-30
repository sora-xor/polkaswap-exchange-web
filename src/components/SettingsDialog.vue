<template>
  <dialog-base :visible.sync="isVisible" :title="t('dexSettings.title')" custom-class="settings" width="464px">
    <market-algorithm />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    DialogBase,
    MarketAlgorithm: lazyComponent(Components.MarketAlgorithm),
  },
})
export default class SettingsDialog extends Mixins(TranslationMixin, DialogMixin) {}
</script>

<style lang="scss">
.settings {
  &.el-dialog__wrapper .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
}
</style>
