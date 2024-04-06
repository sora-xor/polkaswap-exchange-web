<template>
  <dialog-base :visible.sync="visibility" :title="t('selectLanguageDialog.title')" class="select-language-dialog">
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
          <div :ref="lang.key === selectedLang ? 'selectedEl' : undefined" class="select-language-item s-flex">
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
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Language, Languages } from '@/consts';
import { state, action, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class SelectFiatCurrencyDialog extends Mixins(TranslationMixin) {
  readonly languages = Languages;

  @Ref('selectedEl') selectedEl!: Nullable<[HTMLDivElement]>;

  @state.settings.selectLanguageDialogVisibility private selectLanguageDialogVisibility!: boolean;

  @mutation.settings.setSelectLanguageDialogVisibility private setDialogVisibility!: (flag: boolean) => void;
  @action.settings.setLanguage private setLanguage!: (lang: Language) => Promise<void>;

  get visibility(): boolean {
    return this.selectLanguageDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setDialogVisibility(flag);
    if (flag) {
      this.$nextTick(() => {
        this.selectedEl?.[0]?.scrollIntoView?.({ behavior: 'smooth' });
      });
    }
  }

  get selectedLang(): Language {
    return this.language as Language;
  }

  set selectedLang(value: Language) {
    this.setLanguage(value);
  }
}
</script>

<style lang="scss">
.dialog-wrapper.select-language-dialog {
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

.select-language-list,
.select-language-item {
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
