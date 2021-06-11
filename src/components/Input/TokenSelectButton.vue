<template>
  <s-button
    :type="buttonType"
    size="small"
    border-radius="mini"
    :class="['token-select-button', { token: hasToken }]"
    v-on="$listeners"
  >
    <component v-if="hasToken" :is="tokenLogoComponent" :token="token" :first-token="tokens[0]" :second-token="tokens[1]" :size="tokenComponentSize" class="token-select-button__logo" />
    <span class="token-select-button__text">{{ buttonText }}</span>
    <s-icon v-if="icon" class="token-select-button__icon" :name="icon" />
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Asset, AccountAsset } from '@sora-substrate/util'
import TranslationMixin from '../mixins/TranslationMixin'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo)
  }
})
export default class TokenSelectButton extends Mixins(TranslationMixin) {
  @Prop({ type: Object, default: () => null }) readonly token!: AccountAsset | Asset
  @Prop({ type: Array, default: () => [] }) readonly tokens!: Array<AccountAsset | Asset>
  @Prop({ type: String, default: '' }) readonly icon!: boolean

  get hasToken (): boolean {
    return this.tokens.length !== 0 || !!this.token
  }

  get tokenLogoComponent (): string {
    return this.tokens.length !== 0 ? 'pair-token-logo' : 'token-logo'
  }

  get tokenComponentSize (): string {
    return this.tokens.length !== 0 ? 'mini' : 'small'
  }

  get buttonType (): string {
    return this.hasToken ? 'tertiary' : 'secondary'
  }

  get buttonText (): string {
    if (!this.hasToken) return this.t('buttons.chooseToken')

    if (this.tokens.length !== 0) {
      return this.tokens.map(item => item.symbol).join('-')
    }

    return this.token?.symbol ?? ''
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
  }

  &__icon {
    margin-left: $inner-spacing-mini / 2;
    background-color: var(--s-color-base-content-tertiary);
    color: white !important;
    border-radius: var(--s-border-radius-medium);
    padding: 2px;
  }

  &.token {
    background-color: var(--s-color-utility-surface) !important;

    &:hover {
      background-color: white !important;
      filter: drop-shadow(-1px -1px 5px rgba(247, 84, 163, 0.25)) drop-shadow(1px 1px 5px rgba(247, 84, 163, 0.25));
    }

    #{$baseClass}__text {
      font-size: var(--s-icon-font-size-small);
      color: var(--s-color-base-content-primary);
      font-weight: 800 !important;
      font-variation-settings: "wght" 800 !important;
    }
  }
}
</style>
