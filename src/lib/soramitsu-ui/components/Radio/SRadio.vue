<script setup lang="ts">
import { useRadioGroupApi } from './api';
import type { RadioSize, RadioType } from './types';
import { RADIO_SIZE_VALUES, RADIO_TYPE_VALUES } from './types';
import { uniqueElementId } from '@soramitsu-ui/ui/util';
import SRadioAtom from './SRadioAtom';
import SRadioBody from './SRadioBody';
import { usePropTypeFilter } from '@soramitsu-ui/ui/composables/prop-type-filter';

type RadioValue = null | symbol | string | number | boolean | object;
type LegacyRadioSize = RadioSize | 'small';

interface Props {
  /**
   * Radio option value used by Vue 3 templates.
   */
  value?: RadioValue;
  /**
   * Legacy Element-style option value used by older wallet templates.
   */
  label?: RadioValue;
  disabled?: boolean;
  type?: RadioType;
  size?: LegacyRadioSize;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  label: undefined,
  disabled: false,
  type: 'default',
  size: 'md',
});

const propFilter = usePropTypeFilter(props);
const definitelyType = propFilter('type', RADIO_TYPE_VALUES, 'default');
const definitelySize = computed<RadioSize>(() => {
  // Older wallet templates pass Element-style "small"; use the closest local radio size.
  if (props.size === 'small') return 'md';
  return RADIO_SIZE_VALUES.includes(props.size as RadioSize) ? (props.size as RadioSize) : 'md';
});
const radioValue = computed(() => (props.value !== undefined ? props.value : props.label));

const api = useRadioGroupApi().registerRadio({
  valueRef: radioValue,
  disabledRef: computed(() => props.disabled),
  elRef: templateRef('root'),
});

// ETC

const hover = ref(false);

const uniqueLabelId = uniqueElementId();
const uniqueDescriptionId = uniqueElementId();
const describedBy = computed(() => (definitelyType.value === 'bordered-with-description' ? uniqueDescriptionId : ''));
</script>

<template>
  <!-- handled via CSS -->
  <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events -->
  <SRadioBody
    ref="root"
    role="radio"
    :tabindex="api.tabindex"
    :type="definitelyType"
    :size="definitelySize"
    :label-id="uniqueLabelId"
    :description-id="describedBy"
    :aria-checked="api.isChecked"
    :aria-disabled="disabled"
    data-testid="radio-button"
    class="s-radio"
    @click="api.check()"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <template #atom>
      <SRadioAtom :size="definitelySize" :checked="api.isChecked" :disabled="disabled" :hover="hover" />
    </template>

    <template #label>
      <slot />
    </template>

    <template #description>
      <slot name="description" />
    </template>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      aria-hidden="true"
      role="img"
      class="iconify iconify--ic"
      width="32"
      height="32"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.29 13.29a.996.996 0 0 1-1.41 0L5.71 12.7a.996.996 0 1 1 1.41-1.41L10 14.17l6.88-6.88a.996.996 0 1 1 1.41 1.41l-7.58 7.59z"
      />
    </svg>
  </SRadioBody>
</template>
