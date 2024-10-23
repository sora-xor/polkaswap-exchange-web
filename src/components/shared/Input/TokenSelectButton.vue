<template>
  <s-button
    :type="buttonType"
    :class="computedClasses"
    :tabindex="buttonTabindex"
    :disabled="disabled"
    size="small"
    border-radius="mini"
    v-on="$listeners"
  >
    <component
      v-if="hasToken"
      :is="tokenLogoComponent"
      :token="token"
      :first-token="tokens[0]"
      :second-token="tokens[1]"
      :size="tokenComponentSize"
      class="token-select-button__logo"
    />
    <span class="token-select-button__text">{{ buttonText }}</span>
    <s-icon v-if="icon && !disabled" class="token-select-button__icon" :name="icon" size="18" />
    <slot />
  </s-button>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';

import type { Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
  },
})
export default class TokenSelectButton extends Mixins(TranslationMixin) {
  @Prop({ type: Object, default: ObjectInit }) readonly token!: AccountAsset | Asset;
  @Prop({ type: Array, default: () => [] }) readonly tokens!: Array<AccountAsset | Asset>;
  @Prop({ type: String, default: '' }) readonly icon!: string;
  @Prop({ type: [Number, String], default: 0 }) readonly tabindex!: number | string;
  @Prop({ type: Boolean, default: false }) readonly disabled!: boolean;

  get hasToken(): boolean {
    return this.tokens.length !== 0 || !!this.token;
  }

  get computedClasses(): Array<string> {
    const baseClass = 'token-select-button';
    const classes = [baseClass];
    if (this.hasToken) {
      classes.push(`${baseClass}--token`);
    }
    return classes;
  }

  get buttonTabindex(): number | string {
    if (this.disabled) return -1;
    return this.tabindex;
  }

  get tokenLogoComponent(): string {
    return this.tokens.length !== 0 ? 'pair-token-logo' : 'token-logo';
  }

  get tokenComponentSize(): string {
    return this.tokens.length !== 0 ? 'mini' : 'small';
  }

  get buttonType(): string {
    return this.hasToken ? 'tertiary' : 'secondary';
  }

  get buttonText(): string {
    if (!this.hasToken) return this.t('buttons.chooseToken');

    if (this.tokens.length !== 0) {
      return this.tokens.map((item) => item.symbol).join('-');
    }

    return this.token?.symbol ?? '';
  }
}
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
