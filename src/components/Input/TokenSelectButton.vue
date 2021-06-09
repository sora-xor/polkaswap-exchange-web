<template>
  <s-button
    :type="buttonType"
    size="small"
    border-radius="mini"
    icon="chevron-down-rounded-16"
    icon-position="right"
    :class="['token-select-button', { token }]"
    v-on="$listeners"
  >
    <token-logo v-if="token" :token="token" size="small" class="token-select-button__icon" />
    <span class="token-select-button__text">{{ token ? token.symbol : t('buttons.chooseToken') }}</span>
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
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class TokenSelectButton extends Mixins(TranslationMixin) {
  @Prop({ type: Object, default: () => null }) readonly token!: AccountAsset | Asset

  get buttonType (): string {
    return this.token ? 'tertiary' : 'secondary'
  }
}
</script>

<style lang="scss" scoped>
$baseClass: '.token-select-button';

#{$baseClass} {
  &__icon {
    margin-right: $inner-spacing-mini * 0.75;
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
