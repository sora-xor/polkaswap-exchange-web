<template>
  <dialog-base v-model:visible="isVisible" :title="t('currencyDialog.currency')" class="select-currency-dialog">
    <search-input
      ref="search"
      v-model="query"
      class="select-currency__search"
      :placeholder="t('currencyDialog.searchPlaceholder')"
      @clear="handleClearSearch"
    ></search-input>
    <s-scrollbar class="select-currency-scrollbar">
      <s-radio-group v-model="selectedCurrency" class="select-currency-list s-flex">
        <s-radio
          v-for="currency in filteredCurrencies"
          :key="currency.key"
          :label="currency.key"
          :value="currency.key"
          :disabled="currency.disabled"
          size="medium"
          class="select-currency-list__item s-flex"
        >
          <div :ref="(el) => setSelectedEl(el, currency.key === selectedCurrency)" class="select-currency-item s-flex">
            <div class="select-currency-item__value">
              {{ currency.name }}
            </div>
            <div class="select-currency-item__name">
              {{ currency.symbol }}
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
import { useSettingsStore } from '@/stores/settings';

import type { CurrencyFields, Currency } from '@/shims/wallet-currency-types';

defineOptions({
  name: 'SelectCurrencyDialog',
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
  },
});

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const { search, query, handleClearSearch, focusSearchInput } = useSearchInput();
const selectedEl = ref<HTMLDivElement | null>(null);

const isVisible = computed({
  get: () => settingsStore.selectCurrencyDialogVisibility,
  set: (flag: boolean) => {
    settingsStore.setSelectCurrencyDialogVisibility(flag);
    if (flag) {
      nextTick(() => selectedEl.value?.scrollIntoView({ behavior: 'smooth' }));
    }
  },
});

const selectedCurrency = computed<Currency>({
  get: () => settingsStore.currency as Currency,
  set: (value) => {
    settingsStore.setFiatCurrency(value);
  },
});

const currencies = computed(() => settingsStore.currencies as CurrencyFields[]);

const filteredCurrencies = computed(() => {
  const rawQuery = query.value.toLowerCase().trim();
  if (!rawQuery) return currencies.value;

  return currencies.value.filter((item) => {
    const name = String(item?.name ?? '').toLowerCase();
    const symbol = String(item?.symbol ?? '').toLowerCase();
    const key = String(item?.key ?? '').toLowerCase();

    return name.includes(rawQuery) || symbol.includes(rawQuery) || key.includes(rawQuery);
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
    } else {
      handleClearSearch();
    }
  },
  { immediate: false }
);
</script>

<style lang="scss" scoped>
:deep(.dialog-wrapper.select-currency-dialog .el-radio) {
  margin-right: 0;
}

:deep(.select-currency-scrollbar.el-scrollbar) {
  margin-left: -24px;
  margin-right: -24px;
}

:deep(.select-currency-scrollbar.el-scrollbar > .el-scrollbar__wrap) {
  margin-bottom: 0 !important;
  overflow-x: hidden;
}

:deep(.select-currency-scrollbar.el-scrollbar > .el-scrollbar__wrap),
:deep(.select-currency-scrollbar.el-scrollbar > .el-scrollbar__wrap > .el-scrollbar__view) {
  display: flex;
  flex: 1;
  flex-flow: column nowrap;
}

:deep(.select-currency-scrollbar.el-scrollbar > .el-scrollbar__bar.is-vertical) {
  right: 2px;
}

.select-currency-list {
  flex-direction: column;
  height: 600px;
  max-height: 462px;
}

.select-currency-list__item {
  align-items: center;
  border-radius: var(--s-border-radius-mini);
  height: 66px;
  padding: 12px 24px;
}

.select-currency-list .select-currency-item {
  flex-direction: column;
}

.select-currency-list .select-currency-item__value {
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-medium);
  font-weight: 600;
  line-height: var(--s-line-height-medium);
}

.select-currency-list .select-currency-item__name {
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-mini);
  font-weight: 300;
  line-height: var(--s-line-height-medium);
}

.select-currency__search {
  margin-bottom: 16px;
}
</style>
