<template>
  <dialog-base
    :visible.sync="isVisible"
    :before-close="beforeClose"
    :title="t('selectLanguageDialog.title')"
    class="select-language-dialog"
  >
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import { Languages } from '@/consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from './DialogBase.vue'

@Component({
  components: {
    DialogBase
  }
})
export default class SelectLanguageDialog extends Mixins(TranslationMixin, DialogMixin) {
  readonly languages = Languages

  @Getter nodeList!: Array<Node>

  beforeClose (closeFn: Function): void {
    closeFn()
  }
}
</script>

<style lang="scss">
.dialog-wrapper.select-language-dialog {
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-mini * 4;
  }
}
</style>
