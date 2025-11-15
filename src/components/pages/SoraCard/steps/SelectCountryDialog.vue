<template>
  <dialog-base v-model:visible="visibilityModel" class="select-country-dialog" :title="t('card.selectCountryText')">
    <search-input
      ref="searchRef"
      v-model="query"
      class="select-country__search"
      autofocus
      :placeholder="t('card.filterCountries')"
      @clear="handleClearSearch"
    ></search-input>
    <s-scrollbar class="select-country__scrollbar">
      <div class="select-country__list">
        <div
          v-button
          v-for="item in filteredCountries"
          :key="item.key"
          class="p1 select-country__item s-flex"
          @click="selectCountry(item)"
        >
          <span class="flags flag-emodji">{{ item.flag }}</span>
          <span class="text">
            <p class="p1 text__name">{{ item.translatedName }}</p>
            <p class="p3 text__name">{{ item.name }}</p>
          </span>
          <span class="p1 code">{{ item.dialCode }}</span>
        </div>
      </div>
    </s-scrollbar>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { countryCodeEmoji } from 'country-code-emoji';
import { computed, nextTick, onMounted, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import type { CountryInfo, PhoneCode } from '@/types/card';
import { getPhoneCodes } from '@/utils/card';

const DialogBase = components.DialogBase;
const SearchInput = components.SearchInput;
const SelectCountryDialog = lazyComponent(Components.SelectCountryDialog);

interface SelectCountryProps {
  visible: boolean;
}

const props = defineProps<SelectCountryProps>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'select', country: CountryInfo): void;
}>();

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const query = ref('');
const searchRef = ref<InstanceType<typeof SearchInput> | null>(null);
const countriesObject = ref<Record<string, PhoneCode>>({});

const visibilityModel = computed({
  get: () => props.visible,
  set: (flag: boolean) => {
    emit('update:visible', flag);
    if (flag) {
      nextTick(() => {
        query.value = '';
        searchRef.value?.focus?.();
      });
    }
  },
});

const displayRegions = computed(() => settingsStore.displayRegions);

const formatCountryName = (key: string, defaultValue: string): string => {
  try {
    const isoCode = key.toUpperCase();
    const regions = displayRegions.value;
    if (!regions) return defaultValue;
    return regions.of(isoCode) ?? defaultValue;
  } catch (error) {
    console.warn('Unsupported format of SORA Card Phone Country', error);
    return defaultValue;
  }
};

const countries = computed<Array<CountryInfo>>(() =>
  Object.entries(countriesObject.value)
    .map(([key, value]) => {
      let flag = '';
      try {
        flag = countryCodeEmoji(key);
      } catch {
        flag = '';
      }
      return {
        key,
        name: value.name,
        dialCode: value.dial_code,
        flag,
        translatedName: formatCountryName(key, value.name),
      };
    })
    .sort((a, b) => a.translatedName.localeCompare(b.translatedName))
);

const filteredCountries = computed(() => {
  const items = countries.value;
  const text = query.value.trim().toLowerCase();
  if (!text) return items;
  return items.filter(
    (item) =>
      item.dialCode.includes(text) ||
      item.name.toLowerCase().includes(text) ||
      item.translatedName.toLowerCase().includes(text)
  );
});

const handleClearSearch = () => {
  query.value = '';
};

const selectCountry = (country: CountryInfo) => {
  handleClearSearch();
  emit('select', country);
  emit('update:visible', false);
};

onMounted(async () => {
  countriesObject.value = await getPhoneCodes();
});

defineExpose({
  filteredCountries,
});
</script>

<style lang="scss">
.select-country__scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$item-height: 66px;
$list-items: 7;
$max-text-width: 370px;

.select-country {
  &__search {
    margin-bottom: $inner-spacing-medium;
  }
  &__list {
    height: calc(#{$item-height} * #{$list-items});
  }
  &__item {
    align-items: center;
    height: $item-height;
    padding: $inner-spacing-small $inner-spacing-big;

    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }
    .text {
      flex: 1;
      &__name {
        max-width: $max-text-width;
        @include text-ellipsis;
      }
    }
    .flags {
      margin-right: $inner-spacing-mini;
    }
  }
}
</style>
