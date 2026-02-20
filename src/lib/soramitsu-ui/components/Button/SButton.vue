<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { SSpinner } from '../Spinner';
import { SIcon } from '../Icon';
import { BUTTON_ICON_POSITION_VALUES, SPINNER_SIZE, SPINNER_WIDTH, FONT_SIZE } from './consts';
import type { ButtonType, ButtonSize, ButtonIconPosition, HTMLButtonType } from './types';

type LegacyButtonType = ButtonType | 'tertiary' | 'link';
type LegacyButtonSize = ButtonSize | 'mini' | 'small' | 'medium' | 'large' | 'big';
type LegacyBorderRadius = 'mini' | 'small' | 'medium' | 'big' | 'round';

const LEGACY_TYPE_MAP: Record<LegacyButtonType, ButtonType> = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'secondary',
  outline: 'outline',
  action: 'action',
  link: 'secondary',
};

const LEGACY_SIZE_MAP: Record<LegacyButtonSize, ButtonSize> = {
  mini: 'xs',
  small: 'sm',
  medium: 'md',
  large: 'lg',
  big: 'lg',
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

const MODERN_TO_LEGACY_SIZE: Record<ButtonSize, LegacyButtonSize> = {
  xs: 'mini',
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

const props = withDefaults(
  defineProps<{
    type?: LegacyButtonType;
    size?: LegacyButtonSize;
    nativeType?: HTMLButtonType;
    icon?: string;
    iconPosition?: ButtonIconPosition;
    rounded?: boolean;
    disabled?: boolean;
    loading?: boolean;
    uppercase?: boolean;
    alternative?: boolean;
    borderRadius?: LegacyBorderRadius;
    primary?: boolean;
  }>(),
  {
    type: 'secondary',
    size: 'medium',
    nativeType: 'button',
    icon: '',
    iconPosition: 'left',
    rounded: false,
    disabled: false,
    loading: false,
    uppercase: false,
    alternative: false,
    borderRadius: 'small',
    primary: false,
  }
);

const attrs = useAttrs();

const isLegacyType = (value: string): value is LegacyButtonType => {
  return ['primary', 'secondary', 'tertiary', 'outline', 'action', 'link'].includes(value);
};

const isLegacySize = (value: string): value is LegacyButtonSize => {
  return ['mini', 'small', 'medium', 'large', 'big', 'xs', 'sm', 'md', 'lg'].includes(value);
};

const legacyType = computed<LegacyButtonType>(() => {
  const value = props.type;
  return value && isLegacyType(value) ? value : 'primary';
});

const legacySize = computed<LegacyButtonSize>(() => {
  const value = props.size;
  return value && isLegacySize(value) ? value : 'medium';
});

const definitelyType = computed<ButtonType>(() => LEGACY_TYPE_MAP[legacyType.value] ?? 'primary');
const definitelySize = computed<ButtonSize>(() => LEGACY_SIZE_MAP[legacySize.value] ?? 'md');
const definitelyIconPosition = computed<ButtonIconPosition>(() =>
  BUTTON_ICON_POSITION_VALUES.includes(props.iconPosition) ? props.iconPosition : 'left'
);
const isAction = computed(() => definitelyType.value === 'action');
const legacyStyleType = computed<LegacyButtonType>(() => {
  if (props.primary && legacyType.value === 'action') return 'primary';
  return legacyType.value;
});
const isTooltip = computed(() => attrs.tooltip !== undefined && attrs.tooltip !== false);
const legacyStyleSize = computed<LegacyButtonSize>(() => {
  if (isLegacySize(legacySize.value)) return legacySize.value;
  return MODERN_TO_LEGACY_SIZE[definitelySize.value];
});
const buttonRadius = computed(() => {
  const radius = props.borderRadius;
  if (radius === 'round') return '9999px';
  if (['mini', 'small', 'medium', 'big'].includes(radius)) {
    return `var(--s-border-radius-${radius})`;
  }
  return undefined;
});
const font = computed(() => {
  if ((definitelySize.value === 'xs' || legacyStyleSize.value === 'mini') && props.uppercase) {
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
      {
        's-button_size_mini': legacyStyleSize === 'mini',
      },
      `s-button_icon-position_${definitelyIconPosition}`,
      font,
      'el-button',
      'neumorphic',
      `el-button--${legacyType}`,
      `el-button--${legacyStyleType}`,
      `el-button--${legacyStyleSize}`,
      `s-${legacyType}`,
      `s-${legacyStyleType}`,
      `s-${legacyStyleSize}`,
      `s-border-radius-${borderRadius}`,
      `s-i-position-${definitelyIconPosition}`,
      {
        'el-tooltip': isTooltip,
        'is-disabled': loading || disabled,
        's-alternative': alternative,
        's-button_disabled': loading || disabled,
        's-button_rounded': isAction && rounded,
        's-button_loading': loading,
      },
    ]"
    :style="{ borderRadius: buttonRadius }"
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
      <SIcon v-if="icon" :name="icon" />
      <slot v-else name="icon" />
    </span>
    <span class="s-button__text" data-testid="text">
      <slot v-if="!isAction" />
    </span>
  </button>
</template>

<style lang="scss">
.s-button.s-link {
  background: transparent;
  border: 0;
  padding-left: 0;
  padding-right: 0;

  &:hover,
  &:active,
  &.s-button_disabled {
    background: transparent;
    border: 0;
  }
}
</style>
