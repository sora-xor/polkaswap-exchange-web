<template>
  <dialog-base
    :visible.sync="isVisible"
    :before-close="beforeClose"
    :title="t('selectLanguageDialog.title')"
    class="select-language-dialog"
  >
    <s-radio-group v-model="selectedLang" class="select-language-list s-flex">
      <s-radio
        v-for="lang in languages"
        :key="lang.key"
        :label="lang.key"
        :value="lang.key"
        size="medium"
        class="select-language-list__item s-flex"
      >
        <div class="select-language-item s-flex">
          <div class="select-language-item__value">
            {{ lang.value }}
          </div>
          <div class="select-language-item__name">
            {{ lang.name }}
          </div>
        </div>
      </s-radio>
    </s-radio-group>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { FPNumber } from '@sora-substrate/util'

import { Language, Languages } from '@/consts'

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

  @Getter language!: Language
  @Action setLanguage!: (lang: Language) => Promise<void>

  get selectedLang (): Language {
    return this.language
  }

  set selectedLang (value: Language) {
    this.setLanguage(value)
    this.$root.$i18n.locale = value
    const thousandSymbol = Number(1000).toLocaleString(value).substring(1, 2)
    if (thousandSymbol !== '0') {
      FPNumber.DELIMITERS_CONFIG.thousand = Number(1234).toLocaleString(value).substring(1, 2)
    }
    FPNumber.DELIMITERS_CONFIG.decimal = Number(1.2).toLocaleString(value).substring(1, 2)
  }

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
  .el-radio {
    margin-right: 0;
  }
}
</style>

<style lang="scss" scoped>
.select-language-list, .select-language-item {
  flex-direction: column;
}
.select-language-list {
  &__item {
    align-items: center;
    height: 65px;
    padding-left: $inner-spacing-mini;
    padding-right: $inner-spacing-mini;
    border-radius: var(--s-border-radius-mini);
    &:hover {
      background-color: var(--s-color-base-background-hover);
    }
  }
}
.select-language-item {
  &__value {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-icon-font-size-small);
    font-weight: 800;
  }
  &__name {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    font-weight: 300;
  }
}
</style>
