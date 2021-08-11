<template>
  <dialog-base
    :visible.sync="isVisible"
    :before-close="beforeClose"
    :title="t('selectLanguageDialog.title')"
    class="select-language-dialog"
  >
    <s-scrollbar class="select-language-scrollbar">
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
    </s-scrollbar>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

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
.select-language-scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$item-height: 66px;
$list-items: 7;

.select-language-list, .select-language-item {
  flex-direction: column;
}
.select-language-list {
  max-height: calc(#{$item-height} * #{$list-items});

  &__item {
    align-items: center;
    height: $item-height;
    padding: $inner-spacing-small $inner-spacing-big;
    border-radius: var(--s-border-radius-mini);
  }
}
.select-language-item {
  letter-spacing: var(--s-letter-spacing-small);

  &__value {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
    line-height: var(--s-line-height-medium);
    font-weight: 600;
  }
  &__name {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-medium);
    font-weight: 300;
  }
}
</style>
