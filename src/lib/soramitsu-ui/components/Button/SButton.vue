<script setup lang="ts">
import { computed } from 'vue';
import { SSpinner } from '../Spinner';
import { usePropTypeFilter } from '@soramitsu-ui/ui/composables/prop-type-filter';
import {
  BUTTON_ICON_POSITION_VALUES,
  BUTTON_SIZE_VALUES,
  BUTTON_TYPE_VALUES,
  SPINNER_SIZE,
  SPINNER_WIDTH,
  FONT_SIZE,
} from './consts';
import type { ButtonType, ButtonSize, ButtonIconPosition, HTMLButtonType } from './types';

const props = withDefaults(
  defineProps<{
    type?: ButtonType;
    size?: ButtonSize;
    nativeType?: HTMLButtonType;
    icon?: string;
    iconPosition?: ButtonIconPosition;
    rounded?: boolean;
    disabled?: boolean;
    loading?: boolean;
    uppercase?: boolean;
  }>(),
  {
    type: 'secondary',
    size: 'md',
    nativeType: 'button',
    icon: '',
    iconPosition: 'left',
    rounded: false,
    disabled: false,
    loading: false,
    uppercase: false,
  }
);

const filterProp = usePropTypeFilter(props);

const definitelyType = filterProp('type', BUTTON_TYPE_VALUES, 'primary');
const definitelySize = filterProp('size', BUTTON_SIZE_VALUES, 'md');
const definitelyIconPosition = filterProp('iconPosition', BUTTON_ICON_POSITION_VALUES, 'left');
const isAction = computed(() => definitelyType.value === 'action');
const font = computed(() => {
  if (definitelySize.value === 'xs' && props.uppercase) {
    return 'sora-tpg-ch3';
  }

  return FONT_SIZE[definitelySize.value];
});
</script>

<template>
  <button
    :type="nativeType"
    :class="[
      's-button',
      `s-button_type_${definitelyType}`,
      `s-button_size_${definitelySize}`,
      `s-button_icon-position_${definitelyIconPosition}`,
      font,
      {
        's-button_disabled': loading || disabled,
        's-button_rounded': isAction && rounded,
        's-button_loading': loading,
      },
    ]"
    :disabled="loading || disabled"
  >
    <SSpinner
      v-if="loading"
      class="flex-grow absolute"
      data-testid="spinner"
      :size="SPINNER_SIZE[definitelySize]"
      :width="SPINNER_WIDTH[definitelySize]"
    />

    <span class="s-button__icon" data-testid="icon">
      <i v-if="icon" :class="icon" />
      <slot v-else name="icon" />
    </span>
    <span class="s-button__text" data-testid="text">
      <slot v-if="!isAction" />
    </span>
  </button>
</template>
