<script setup lang="ts">
import { useSelectApi } from './api';
import type { SelectApi } from './api';
import { SelectButtonType, SelectSize } from './types';
import SSelectChevron from './SSelectChevron';

const props = withDefaults(
  defineProps<{
    type?: SelectButtonType;
  }>(),
  {
    type: SelectButtonType.Default,
  }
);

const api = useSelectApi();

function toggle() {
  api.menuToggle();
}

const formattedSelectedValue = computed<string | null>(() => {
  const opts = api.selectedOptions;
  if (opts.length) {
    if (opts.length === 1) {
      return opts[0].label;
    }
    return `${opts.length} selected`;
  }
  return null;
});

function typography(): string {
  switch (api.size) {
    case SelectSize.Xl:
      return 'sora-tpg-p1';
    case SelectSize.Lg:
      return 'sora-tpg-p3';
    default:
      return 'sora-tpg-p4';
  }
}

const slots = defineSlots<{
  label?: (api: SelectApi<any>) => any;
}>();
</script>

<template>
  <div
    :class="[
      's-select-btn',
      `s-select-btn_${type}`,
      `s-select-btn_size_${api.size}`,
      typography(),
      {
        's-select-btn_empty': !api.isSomethingSelected,
        's-select-btn_disabled': api.disabled,
      },
    ]"
    @click="toggle"
  >
    <span v-if="!!slots.label || api.label" class="s-select-btn__label">
      <slot name="label" v-bind="api">
        {{ api.label }}
      </slot>
      <template v-if="api.isSomethingSelected">:</template>
    </span>

    <span v-if="api.isSomethingSelected" class="s-select-btn__selection">
      {{ formattedSelectedValue }}
    </span>

    <SSelectChevron :rotate="api.isMenuOpened" />
  </div>
</template>
