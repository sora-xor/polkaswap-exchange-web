<template>
  <s-button
    :type="buttonType"
    :class="computedClasses"
    :tabindex="buttonTabindex"
    :disabled="disabled"
    size="small"
    border-radius="mini"
  >
    <span class="token-select-button__content">
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
    </span>
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
});

const TokenLogo = components.TokenLogo;
const PairTokenLogo = lazyComponent(Components.PairTokenLogo);

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
const tokenLogoComponent = computed(() => (props.tokens.length !== 0 ? PairTokenLogo : TokenLogo));
const tokenComponentSize = computed(() => (props.tokens.length !== 0 ? 'mini' : 'small'));
const buttonType = computed(() => (hasToken.value ? 'tertiary' : 'secondary'));
const normalizeTokenSymbol = (value?: string): string => (value ?? '').replace(/\s+/g, '').trim();
const buttonText = computed(() => {
  if (!hasToken.value) return t('buttons.chooseToken');
  if (props.tokens.length !== 0) {
    return props.tokens.map((item) => normalizeTokenSymbol(item.symbol)).join('-');
  }
  return normalizeTokenSymbol(props.token?.symbol);
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
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  padding-left: 6px !important;
  padding-right: 6px !important;
  line-height: 12px;
  font-weight: 500;
  text-transform: uppercase;
  box-shadow: var(--s-shadow-element-pressed);
  background-color: var(--s-color-base-content-tertiary);
  color: var(--s-color-base-on-accent);

  #{$baseClass}__text {
    color: var(--s-color-base-on-accent);
    text-transform: uppercase;
  }

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
    background-color: var(--s-color-base-border-primary);
    color: var(--s-color-base-content-tertiary);

    #{$baseClass}__text {
      color: var(--s-color-base-content-primary);
      font-size: 18px;
      text-transform: uppercase;
    }

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
  display: block;

  :deep(.s-button__text) {
    white-space: nowrap;
  }

  &__content {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    flex-wrap: nowrap;
    line-height: 1;
  }

  &__logo {
    flex: 0 0 auto;
    margin-right: $inner-spacing-tiny;
    line-height: 1;
  }

  &__text {
    margin: 0 $inner-spacing-tiny;
    font-weight: 800 !important;
    white-space: nowrap;
    word-break: keep-all;
    overflow-wrap: normal;
    line-height: 1;
  }

  &__icon {
    display: block;
    align-items: normal;
    justify-content: normal;
    flex: 0 0 auto;
    margin-left: $inner-spacing-tiny;
    background-color: var(--s-color-base-on-accent);
    color: var(--s-color-base-content-tertiary) !important;
    border-radius: var(--s-border-radius-medium);
    line-height: 1;
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
