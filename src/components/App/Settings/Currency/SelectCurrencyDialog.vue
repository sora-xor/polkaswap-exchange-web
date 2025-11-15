<template>
  <dialog-base v-model:visible="isVisible" :title="t('currencyDialog.currency')" class="select-currency-dialog">
    <search-input
      ref="search"
      v-model="query"
      class="select-currency__search"
      autofocus
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
import { components } from '@wallet';
import { computed, nextTick, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';
import { useSettingsStore } from '@/stores/settings';

import type { CurrencyFields, Currency } from '@wallet/lib/types/currency';

defineOptions({
  name: 'SelectCurrencyDialog',
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
  },
});

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const query = ref('');
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
  get: () => store.state.wallet.settings.currency as Currency,
  set: (value) => {
    store.commit.wallet.settings.setFiatCurrency(value);
  },
});

const currencies = computed(() => store.state.wallet.settings.currencies as CurrencyFields[]);

const filteredCurrencies = computed(() => {
  const rawQuery = query.value.toLowerCase().trim();
  if (!rawQuery) return currencies.value;

  return currencies.value.filter(
    (item) =>
      item.name.toLowerCase().includes(rawQuery) ||
      item.symbol.toLowerCase().includes(rawQuery) ||
      item.key.toLowerCase().includes(rawQuery)
  );
});

function handleClearSearch(): void {
  query.value = '';
}

function setSelectedEl(element: HTMLDivElement | null, isSelected: boolean): void {
  if (isSelected) {
    selectedEl.value = element;
  } else if (selectedEl.value === element) {
    selectedEl.value = null;
  }
}
</script>
