<script setup lang="ts">
import { useSelectApi } from './api';
import type { SelectOptionGroup, SelectOptionType } from './types';
import { SelectSize } from './types';
import SSelectOption from './SSelectOption.vue';
import type { ComputedRef } from 'vue';
import { isSelectOptions } from '@soramitsu-ui/ui/components/Select/utils';
import SSpinner from '@soramitsu-ui/ui/components/Spinner/SSpinner.vue';
import { IconBasicSearch24 } from '@soramitsu-ui/ui/components/icons';
import escapeStringRegexp from 'escape-string-regexp';
import type { MaybeElementRef } from '@vueuse/core';

const props = defineProps<{
  itemType: SelectOptionType;
  search: boolean;
  maxShownOptions?: number | undefined;
}>();

const api = useSelectApi();

const fontClass = computed(() => (api.size === SelectSize.Xl ? 'sora-tpg-p3' : 'sora-tpg-p4'));

const optionGroups: ComputedRef<SelectOptionGroup[]> = computed(() => {
  const options = api.options;

  if (isSelectOptions(options)) {
    return [{ items: options }];
  }

  return options;
});

const totalOptions = computed(() => optionGroups.value.reduce((acc, group) => acc + group.items.length, 0));

const isSearching = eagerComputed(() => api.searchQuery);

const escapedQuery = computed(() => new RegExp(escapeStringRegexp(api.searchQuery), 'i'));
const shownOptionGroups: ComputedRef<SelectOptionGroup[]> = computed(() => {
  if (!api.searchQuery || api.remoteSearch) {
    return optionGroups.value;
  }

  return optionGroups.value.map((x) => ({ ...x, items: x.items.filter((x) => escapedQuery.value.test(x.label)) }));
});
const isNothingToShow = eagerComputed(() => shownOptionGroups.value.every((x) => !x.items.length));

function isActionButtonShown(selectAllBtn: boolean) {
  return api.multiple && selectAllBtn;
}

function isHeaderShown(optionGroup: SelectOptionGroup) {
  return !isSearching.value && (isActionButtonShown(!!optionGroup.selectAllBtn) || optionGroup.header);
}

function handleSearchInput(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    api.updateSearchQuery(event.target.value);
  }
}

const searchInputRef = ref<MaybeElementRef>(null);

function handleMouseDown(event: Event) {
  if (event.target === searchInputRef.value) {
    return;
  }

  event.preventDefault();
}

const HEADER_FONT = {
  [SelectSize.Xl]: 'sora-tpg-ch2',
  [SelectSize.Lg]: 'sora-tpg-ch3',
  [SelectSize.Md]: 'sora-tpg-ch3',
  [SelectSize.Sm]: 'sora-tpg-ch3',
} as const;

const MAIN_FONT = {
  [SelectSize.Xl]: 'sora-tpg-p3',
  [SelectSize.Lg]: 'sora-tpg-p4',
  [SelectSize.Md]: 'sora-tpg-p4',
  [SelectSize.Sm]: 'sora-tpg-p4',
} as const;

const SEARCH_ICON_SIZE = {
  [SelectSize.Xl]: 24,
  [SelectSize.Lg]: 16,
  [SelectSize.Md]: 16,
  [SelectSize.Sm]: 12,
} as const;

const OPTION_SIZE = {
  [SelectSize.Xl]: 56,
  [SelectSize.Lg]: 40,
  [SelectSize.Md]: 32,
  [SelectSize.Sm]: 24,
} as const;

const dropdownHeight = computed(() => {
  if (!props.maxShownOptions) return;

  return OPTION_SIZE[api.size] * Math.min(props.maxShownOptions, totalOptions.value) + 'px';
});
</script>

<template>
  <div
    class="s-select-dropdown"
    :class="`s-select-dropdown_size_${api.size}`"
    :style="{ height: dropdownHeight ?? 'auto' }"
    data-testid="select-dropdown"
    @mousedown="handleMouseDown"
  >
    <div v-if="search" class="s-select-dropdown__search flex items-center" data-testid="select-dropdown-search">
      <IconBasicSearch24
        class="s-select-dropdown__search-icon flex-shrink-0 mr-8px"
        :width="SEARCH_ICON_SIZE[api.size]"
        :height="SEARCH_ICON_SIZE[api.size]"
      />

      <input
        ref="searchInputRef"
        class="s-select-dropdown__search-input flex-grow bg-transparent"
        :class="MAIN_FONT[api.size]"
        :value="api.searchQuery"
        placeholder="Search"
        @input="handleSearchInput"
      />
    </div>

    <div v-if="api.loading" class="s-select-dropdown__loading flex items-center justify-center">
      <SSpinner />
    </div>

    <div v-else-if="isNothingToShow" class="flex items-center justify-center m-16px" :class="MAIN_FONT[api.size]">
      <slot name="empty"> No data </slot>
    </div>

    <template v-else>
      <template v-for="(optionGroup, i) in shownOptionGroups" :key="i">
        <div v-if="isHeaderShown(optionGroup)" class="s-select-dropdown__header flex items-center justify-between">
          <div v-if="optionGroup.header" :class="HEADER_FONT[api.size]">
            {{ optionGroup.header }}
          </div>
          <button
            v-if="isActionButtonShown(!!optionGroup.selectAllBtn)"
            class="s-select-dropdown__action cursor-pointer ml-auto"
            :class="MAIN_FONT[api.size]"
            tabindex="-1"
            @click="api.toggleGroupSelection(optionGroup)"
          >
            {{ api.isGroupSelected(optionGroup) ? 'Deselect all' : 'Select all' }}
          </button>
        </div>
        <SSelectOption
          v-for="(opt, j) in optionGroup.items"
          :key="j"
          :class="fontClass"
          :type="itemType"
          :multiple="api.multiple"
          :selected="api.isValueSelected(opt.value)"
          @toggle="api.toggleSelection(opt.value)"
        >
          {{ opt.label }}
        </SSelectOption>
      </template>
    </template>
  </div>
</template>
