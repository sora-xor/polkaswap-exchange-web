<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('selectLanguageDialog.title')"
    custom-class="select-language-dialog"
  >
    <search-input
      ref="search"
      v-model="query"
      class="select-language__search"
      :placeholder="t('searchText')"
      @clear="handleClearSearch"
    ></search-input>
    <s-scrollbar class="select-language-scrollbar">
      <s-radio-group v-model="selectedLang" class="select-language-list s-flex">
        <s-radio
          v-for="lang in filteredEntries"
          :key="lang.key"
          :label="lang.key"
          :value="lang.key"
          size="medium"
          class="select-language-list__item s-flex"
        >
          <div :ref="(el) => setSelectedEl(el, lang.key === selectedLang)" class="select-language-item s-flex">
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

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { computed, nextTick, ref, watch } from 'vue';

import { useSearchInput } from '@/composables/useSearchInput';
import { useTranslation } from '@/composables/useTranslation';
import { Language, Languages } from '@/consts';
import { useSettingsStore } from '@/stores/settings';

defineOptions({
  name: 'SelectLanguageDialog',
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
  },
});

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const { search, query, searchQuery, handleClearSearch, focusSearchInput } = useSearchInput();
const selectedEl = ref<HTMLDivElement | null>(null);

const isVisible = computed({
  get: () => settingsStore.selectLanguageDialogVisibility,
  set: (flag: boolean) => {
    settingsStore.setSelectLanguageDialogVisibility(flag);
  },
});

const selectedLang = computed<Language>({
  get: () => settingsStore.language as Language,
  set: (value) => {
    void settingsStore.setLanguage(value);
  },
});

const entries = computed(() =>
  Languages.map((language) => {
    const translationKey = `languages.${language.key}`;
    const translatedName = t(translationKey);

    return {
      key: language.key as Language,
      value: language.value,
      name: translatedName !== translationKey ? translatedName : language.name,
    };
  })
);

const filteredEntries = computed(() => {
  if (!searchQuery.value) return entries.value;

  return entries.value.filter((entry) => {
    const normalizedValue = entry.value.toLowerCase();
    const normalizedName = entry.name.toLowerCase();
    const normalizedKey = entry.key.toLowerCase();

    return (
      normalizedValue.includes(searchQuery.value) ||
      normalizedName.includes(searchQuery.value) ||
      normalizedKey.includes(searchQuery.value)
    );
  });
});

function setSelectedEl(element: HTMLDivElement | null, isSelected: boolean): void {
  if (isSelected) {
    selectedEl.value = element;
  } else if (selectedEl.value === element) {
    selectedEl.value = null;
  }
}

watch(
  isVisible,
  (visible) => {
    if (visible) {
      void focusSearchInput();
      nextTick(() => selectedEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } else {
      handleClearSearch();
    }
  },
  { immediate: false }
);
</script>

<style lang="scss" scoped>
:deep(.dialog-card.select-language-dialog .el-radio) {
  margin-right: 0;
}

:deep(.select-language-scrollbar.el-scrollbar) {
  margin-left: -24px;
  margin-right: -24px;
}

:deep(.select-language-scrollbar.el-scrollbar > .el-scrollbar__wrap) {
  margin-bottom: 0 !important;
  overflow-x: hidden;
}

:deep(.select-language-scrollbar.el-scrollbar > .el-scrollbar__wrap),
:deep(.select-language-scrollbar.el-scrollbar > .el-scrollbar__wrap > .el-scrollbar__view) {
  display: flex;
  flex: 1;
  flex-flow: column nowrap;
}

:deep(.select-language-scrollbar.el-scrollbar > .el-scrollbar__bar.is-vertical) {
  right: 2px;
}

:deep(.select-language-scrollbar.el-scrollbar > .el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

.select-language__search {
  margin-bottom: 16px;
}

.select-language-list {
  flex-direction: column;
  min-width: 100%;
  height: 600px;
  max-height: 462px;
}

:deep(.select-language-list__item) {
  align-items: center;
  min-width: 100%;
  border-radius: var(--s-border-radius-mini);
  min-height: 56px;
  padding: 12px 24px;
}

:deep(.select-language-list__item > .flex) {
  width: 100%;
  align-items: flex-start;
}

.select-language-item {
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.select-language-item__value {
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-medium);
  font-weight: 600;
  line-height: var(--s-line-height-medium);
}

.select-language-item__name {
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-mini);
  font-weight: 300;
  line-height: var(--s-line-height-medium);
}
</style>
