<script setup lang="ts">
import { useSelectApi } from './api';
import type { SelectApi } from './api';
import { SelectSize } from './types';
import SSelectChevron from './SSelectChevron';
import SSelectChip from './SSelectChip.vue';
import STextField from '@soramitsu-ui/ui/components/TextField/STextField.vue';
import { IconBasicSearch24 } from '@soramitsu-ui/ui/components/icons';
import type { MaybeElementRef } from '@vueuse/core';

const props = withDefaults(
  defineProps<{
    search?: boolean;
  }>(),
  {
    search: false,
  }
);

const slots = defineSlots<{
  label?: (api: SelectApi<any>) => any;
}>();
const api = useSelectApi();

const selectionsJoined = computed<string>(() => api.selectedOptions.map((x) => x.label).join(', '));

const SEARCH_ICON_SIZE = {
  [SelectSize.Xl]: 24,
  [SelectSize.Lg]: 20,
  [SelectSize.Md]: 18,
  [SelectSize.Sm]: 15,
} as const;

/**
 * Column layout - when label is on top of the selection.
 * Non-column: `<label>: <selection>`
 */
const isColumnLayout = computed<boolean>(() => {
  return api.size === SelectSize.Xl;
});

const shouldUseChips = computed(() => api.multiple && props.search);

function typographyLabel(): string {
  return !api.isSomethingSelected && api.size === SelectSize.Xl ? 'sora-tpg-p3' : 'sora-tpg-p4';
}

function typographySelection(): string {
  return api.size === SelectSize.Xl ? 'sora-tpg-p3' : 'sora-tpg-p4';
}

const inputRef = ref<MaybeElementRef>(null);
const isFocused = ref(false);
const shouldShowLabel = computed(
  () => !(props.search && (api.searchQuery || api.isSomethingSelected || isFocused.value))
);

function focusInput() {
  if (!(inputRef.value instanceof HTMLInputElement)) {
    return;
  }

  inputRef.value.focus();
  isFocused.value = true;
}

function handleInputBlur() {
  api.menuToggle(false);
  isFocused.value = false;
}

function handleInputClick(event: MouseEvent) {
  if (!props.search) {
    api.menuToggle();

    return;
  }

  if (event.target !== document.activeElement) {
    event.preventDefault();
  }

  focusInput();
  api.menuToggle(true);
}

function handleMouseDown(event: MouseEvent) {
  if (event.target === inputRef.value) {
    return;
  }

  event.preventDefault();
}

function handleInput(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  api.updateSearchQuery(event.target.value);
}

const FLabel = () => {
  const label = slots.label?.(api) ?? api.label;
  return h(
    'span',
    {
      class: ['s-select-input__label', typographyLabel()],
    },
    (!isColumnLayout.value && api.isSomethingSelected ? [label, ':'] : label) as any
  );
};

const FSelection = () =>
  api.isSomethingSelected
    ? h(
        'span',
        {
          class: ['overflow-hidden', 'overflow-ellipsis', typographySelection()],
        },
        selectionsJoined.value
      )
    : null;

function handleChevronClick(event: MouseEvent) {
  api.menuToggle();
  if (!api.isMenuOpened) event.stopImmediatePropagation();
}
</script>

<template>
  <STextField
    v-if="search && isColumnLayout"
    :model-value="api.searchQuery"
    :label="api.label || ''"
    :filled-state="api.isSomethingSelected"
    :disabled="api.disabled"
    @update:model-value="api.updateSearchQuery"
    @click:input-wrapper="api.menuToggle(true)"
    @blur="api.menuToggle(false)"
  >
    <template #label>
      <slot name="label" v-bind="api" />
    </template>

    <template #prefix>
      <template v-if="shouldUseChips">
        <SSelectChip
          v-for="option in api.selectedOptions"
          :key="option.label"
          :label="option.label"
          class="min-w-0 mr-8px mt-4px"
          :class="typographySelection()"
          @click:delete="api.unselect(option.value)"
          @mousedown.prevent.stop
        />
      </template>
      <FSelection v-else class="mr-8px" />
    </template>

    <template #append>
      <SSelectChevron :rotate="api.isMenuOpened" :variant="24" width="24" height="24" @click="handleChevronClick" />
    </template>
  </STextField>

  <div
    v-else
    :class="[
      's-select-input',
      `s-select-input_size_${api.size}`,
      {
        's-select-input_empty': !api.isSomethingSelected,
        's-select-input_disabled': api.disabled,
      },
    ]"
    @click="handleInputClick"
    @mousedown="handleMouseDown"
  >
    <template v-if="isColumnLayout">
      <div class="flex flex-col flex-1 truncate">
        <FLabel />
        <FSelection />
      </div>
    </template>

    <template v-else>
      <div
        class="flex items-center flex-1 truncate"
        :class="{
          'flex-wrap': shouldUseChips,
          '-mt-4px': shouldUseChips,
        }"
      >
        <IconBasicSearch24
          v-if="search && !shouldUseChips"
          class="s-select-input__search-icon flex-shrink-0 mr-8px"
          :width="SEARCH_ICON_SIZE[api.size]"
          :height="SEARCH_ICON_SIZE[api.size]"
        />
        <FLabel v-if="shouldShowLabel" :class="{ 'mt-4px': shouldUseChips }" />

        <template v-if="shouldUseChips">
          <SSelectChip
            v-for="option in api.selectedOptions"
            :key="option.label"
            class="min-w-0 mr-8px mt-4px"
            :class="typographySelection()"
            :label="option.label"
            @click:delete="api.unselect(option.value)"
            @mousedown.prevent.stop
          />
        </template>
        <FSelection v-else class="min-w-0 flex-grow-1 ml-4px mr-4px" />

        <input
          v-if="search"
          ref="inputRef"
          :value="api.searchQuery"
          class="min-w-1/4 bg-transparent outline-none flex-grow basis-0"
          :class="[{ 'mt-4px': shouldUseChips }, typographySelection()]"
          @input="handleInput"
          @blur="handleInputBlur"
        />
      </div>
    </template>

    <div>
      <SSelectChevron :rotate="api.isMenuOpened" :variant="24" @click="handleChevronClick" />
    </div>
  </div>
</template>
