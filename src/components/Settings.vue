<template>
  <dialog-base :visible.sync="isVisible" :title="t('dexSettings.title')" custom-class="settings">
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'

@Component({
  components: {
    DialogBase,
    BrandedTooltip: lazyComponent(Components.BrandedTooltip)
  }
})
export default class Settings extends Mixins(TranslationMixin, DialogMixin, NumberFormatterMixin) {
}
</script>

<style lang="scss">
.settings {
  &.el-dialog__wrapper .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
}
</style>
