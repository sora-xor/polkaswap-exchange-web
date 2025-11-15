<template>
  <s-button
    :type="buttonType"
    :class="computedClasses"
    :tabindex="buttonTabindex"
    :disabled="disabled"
    size="small"
    border-radius="mini"
  >
    <component
      v-if="hasToken"
      :is="tokenLogoComponent"
      :token="token"
      :first-token="tokens[0]"
      :second-token="tokens[1]"
      :size="tokenComponentSize"
      class="token-select-button__logo"
    ></component>
    <span class="token-select-button__text">{{ buttonText }}</span>
    <s-icon v-if="icon && !disabled" class="token-select-button__icon" :name="icon" size="18"></s-icon>
  </s-button>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

/**
 * Token selector button that adapts its visuals based on the provided assets.
 */
defineOptions({
  name: 'TokenSelectButton',
  components: {
    TokenLogo: components.TokenLogo,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
  },
});

const props = withDefaults(
  defineProps<{
    token?: AccountAsset | Asset | null;
    tokens?: Array<AccountAsset | Asset>;
    icon?: string;
    tabindex?: number | string;
    disabled?: boolean;
  }>(),
  {
    token: ObjectInit,
    tokens: () => [],
    icon: '',
    tabindex: 0,
    disabled: false,
  }
);

const { t } = useTranslation();

const hasToken = computed(() => props.tokens.length !== 0 || !!props.token);
const computedClasses = computed(() => {
  const baseClass = 'token-select-button';
  return hasToken.value ? [baseClass, `${baseClass}--token`] : [baseClass];
});
const buttonTabindex = computed(() => (props.disabled ? -1 : props.tabindex));
const tokenLogoComponent = computed(() => (props.tokens.length !== 0 ? 'pair-token-logo' : 'token-logo'));
const tokenComponentSize = computed(() => (props.tokens.length !== 0 ? 'mini' : 'small'));
const buttonType = computed(() => (hasToken.value ? 'tertiary' : 'secondary'));
const buttonText = computed(() => {
  if (!hasToken.value) return t('buttons.chooseToken');
  if (props.tokens.length !== 0) {
    return props.tokens.map((item) => item.symbol).join('-');
  }
  return props.token?.symbol ?? '';
});

defineExpose({
  hasToken,
  computedClasses,
  buttonTabindex,
  tokenLogoComponent,
  tokenComponentSize,
  buttonType,
  buttonText,
});
</script>

<style lang="scss">
$baseClass: '.token-select-button';

button.el-button.neumorphic#{$baseClass} {
  &:hover,
  &:active,
  &:focus,
  &.focusing,
  &.s-pressed {
    box-shadow: $button-custom-shadow;

    #{$baseClass}__icon {
      color: var(--s-color-base-content-secondary) !important;
    }
  }

  &--token {
    &:hover,
    &:active,
    &:focus,
    &.focusing,
    &.s-pressed {
      background-color: var(--s-color-utility-surface);
      box-shadow:
        1px 1px 5px rgba(255, 255, 255, 0.7),
        -1px -1px 5px #ffffff,
        0px 0px 20px rgba(247, 84, 163, 0.5);

      #{$baseClass}__icon {
        background-color: var(--s-color-base-content-secondary);
        color: var(--s-color-utility-surface) !important;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
$baseClass: '.token-select-button';

#{$baseClass} {
  &__logo {
    margin-right: $inner-spacing-tiny;
  }

  &__text {
    margin: 0 $inner-spacing-tiny;
    font-weight: 800 !important;
  }

  &__icon {
    margin-left: $inner-spacing-tiny;
    background-color: var(--s-color-base-on-accent);
    color: var(--s-color-base-content-tertiary) !important;
    border-radius: var(--s-border-radius-medium);
  }

  &--token {
    #{$baseClass}__icon {
      background-color: var(--s-color-base-content-tertiary);
      color: var(--s-color-utility-surface) !important;
    }

    #{$baseClass}__text {
      font-size: var(--s-icon-font-size-small);
      color: var(--s-color-base-content-primary);
    }
  }
}
</style>
