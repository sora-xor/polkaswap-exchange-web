<template>
  <s-button :type="buttonType" :class="computedClasses" size="small" border-radius="mini" v-on="$listeners">
    <component
      v-if="hasToken"
      :is="tokenLogoComponent"
      :token="token"
      :first-token="tokens[0]"
      :second-token="tokens[1]"
      :size="tokenComponentSize"
      class="token-select-button__logo"
    />
    <nft-token-logo :asset="token" class="nft-image" />
    <span class="token-select-button__text">{{ buttonText }}</span>
    <s-icon v-if="icon" class="token-select-button__icon" :name="icon" size="18" />
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import { components } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '../mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    NftTokenLogo: components.NftTokenLogo,
  },
})
export default class TokenSelectButton extends Mixins(TranslationMixin) {
  @Prop({ type: Object, default: () => null }) readonly token!: AccountAsset | Asset;
  @Prop({ type: Array, default: () => [] }) readonly tokens!: Array<AccountAsset | Asset>;
  @Prop({ type: String, default: '' }) readonly icon!: boolean;

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

<style lang="scss" scoped>
$baseClass: '.token-select-button';

#{$baseClass} {
  &__logo {
    margin-right: $inner-spacing-mini / 2;
  }

  &__text {
    margin: 0 $inner-spacing-mini / 2;
    font-weight: 800 !important;
  }

  &__icon {
    margin-left: $inner-spacing-mini / 2;
    background-color: var(--s-color-base-on-accent);
    color: var(--s-color-base-content-tertiary) !important;
    border-radius: var(--s-border-radius-medium);
  }

  &:hover,
  &:active,
  &.focusing {
    #{$baseClass}__icon {
      color: var(--s-color-base-content-secondary) !important;
    }
  }

  &--token {
    &:hover,
    &:active,
    &.focusing {
      #{$baseClass}__icon {
        background-color: var(--s-color-base-content-secondary);
        color: var(--s-color-utility-surface) !important;
      }
    }

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

.nft-image {
  border-radius: 50%;
  object-fit: cover;
  width: var(--s-size-mini);
  height: var(--s-size-mini);
  left: 0;
  position: absolute;
  background-color: var(--s-color-base-background);
}
</style>
