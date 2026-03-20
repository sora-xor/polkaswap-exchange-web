<script setup lang="ts">
import { computed, provide, reactive, ref, toRefs, watch } from 'vue';
import { useToggle, whenever } from '@vueuse/core';
import type { SelectOption, SelectOptionGroup } from './types';
import { SelectSize } from './types';
import { useSelectModel } from './use-model';
import type { SelectApi } from './api';
import { SELECT_API_KEY } from './api';
import { and, not } from '@vueuse/math';
import { SPopover, SPopoverWrappedTransition } from '@soramitsu-ui/ui/components/Popover';

type SearchEmit = (event: 'search', value: string) => void;

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    multiple?: boolean;
    options?: SelectOption[] | SelectOptionGroup[];

    size?: SelectSize;

    /**
     * This value is used if `label` slot is missing
     */
    label?: string | null;

    /**
     * - Doesn't allow to unselect value in single mode
     * - Doesn't allow to unselect last the only one picked value in multiple mode
     * - Planned: auto-selects the first available option when `modelValue` is null (see docs/backlog.md#select)
     */
    mandatory?: boolean;

    /**
     * Planned: synchronize dropdown width with trigger width (see docs/backlog.md#select)
     */
    syncMenuAndInputWidths?: boolean;

    /**
     * By default the component will close its dropdown when the value is selected.
     * **Works only in single mode.**.
     *
     * Turn on this prop to disable auto-close.
     */
    noAutoClose?: boolean;

    /**
     * Enables loading state.
     */
    loading?: boolean;

    /**
     * Makes popper same width as trigger.
     */
    sameWidthPopper?: boolean;

    /**
     * When enabled, passes `search: true` to the `trigger` slot
     */
    triggerSearch?: boolean;

    /**
     * When enabled, passes `search: true` to the `dropdown` slot
     */
    dropdownSearch?: boolean;

    /**
     * By default, the component filters options by their labels. Set `true` to disable automatic filtering.
     */
    remoteSearch?: boolean;
  }>(),
  {
    size: SelectSize.Md,
    options: () => [],
    multiple: false,
    disabled: false,
    syncMenuAndInputWidths: false,
    noAutoClose: false,
    label: null,
    loading: false,
    sameWidthPopper: false,
    triggerSearch: false,
    dropdownSearch: false,
    remoteSearch: false,
    mandatory: false,
  }
);

const emit = defineEmits<SearchEmit>();

const model = defineModel<any>({ default: null });
const { multiple, disabled, loading, options, size, label, noAutoClose, remoteSearch, mandatory } = toRefs(props);

const normalizedMultiple = computed(() => {
  if (multiple.value) {
    return true;
  }

  const currentModel = model.value;

  return Array.isArray(currentModel);
});

watch(
  [normalizedMultiple, () => model.value],
  ([isMultiple, current]) => {
    if (isMultiple) {
      if (!Array.isArray(current)) {
        const isEmptySelection = current === null || current === undefined;
        model.value = isEmptySelection ? [] : [current];
      }

      return;
    }

    if (Array.isArray(current)) {
      const [firstValue] = current;
      model.value = firstValue ?? null;
    }
  },
  { immediate: true }
);

watch(multiple, (isMultiple) => {
  if (!isMultiple && Array.isArray(model.value)) {
    const [firstValue] = model.value;
    model.value = firstValue ?? null;
  }
});

const modeling = useSelectModel({
  model,
  multiple: normalizedMultiple,
  options,
  storeSelectedOptions: remoteSearch,
  singleModeAutoClose: not(noAutoClose),
  onAutoClose: () => togglePopper(false),
  mandatory,
});

const [showPopper, togglePopper] = useToggle(false);

// close popper if select is disabled
whenever(and(disabled, showPopper), () => togglePopper(false), { immediate: true });

const searchQuery = ref('');
whenever(not(showPopper), () => {
  updateSearchQuery('');
});

function updateSearchQuery(query: string | undefined) {
  searchQuery.value = query ?? '';

  emit('search', searchQuery.value);
}

const api: SelectApi<any> = reactive({
  ...modeling,
  multiple: normalizedMultiple,
  options,
  disabled,
  loading,
  mandatory,
  label,
  isMenuOpened: showPopper,
  menuToggle: togglePopper,
  size,
  noAutoClose,
  searchQuery,
  remoteSearch,
  updateSearchQuery,
});

provide(SELECT_API_KEY, api);
</script>

<template>
  <div>
    <SPopover
      v-model:show="showPopper"
      :same-width="sameWidthPopper"
      placement="bottom-start"
      trigger="manual"
      distance="4"
      @click-outside="togglePopper(false)"
    >
      <template #trigger>
        <div>
          <slot name="control" v-bind="{ search: triggerSearch }" />
        </div>
      </template>

      <template #popper>
        <SPopoverWrappedTransition
          name="s-select-dropdown-transition"
          eager
          :wrapper-attrs="{ class: 'z-10' }"
          :inner-wrapper-attrs="{ class: { 'w-full': sameWidthPopper } }"
        >
          <slot name="dropdown" v-bind="{ search: dropdownSearch }" />
        </SPopoverWrappedTransition>
      </template>
    </SPopover>
  </div>
</template>

<style lang="scss">
$ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
$ease-in-back: cubic-bezier(0.36, 0, 0.66, -0.56);
$dur: 0.2s;

.s-select-dropdown-transition {
  &-enter-active {
    transition: all $dur $ease-out-back;
  }
  &-leave-active {
    transition: all $dur $ease-in-back;
  }

  &-enter-from,
  &-leave-to {
    transform: scale(0.6);
    opacity: 0;
  }
}
</style>
