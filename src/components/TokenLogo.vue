<template>
  <span :class="tokenClasses" />
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Asset, AccountAsset, KnownAssets } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { LogoSize } from '@/consts'

@Component
export default class TokenLogo extends Mixins(TranslationMixin) {
  @Prop({ type: String, default: '' }) readonly tokenSymbol!: string // ONLY for Bridge.vue
  @Prop({ type: Object, default: () => null }) readonly token!: AccountAsset | Asset
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize

  get tokenClasses (): string {
    const tokenLogoClass = 'token-logo'
    const classes = [tokenLogoClass]

    if (this.tokenSymbol) {
      classes.push(`${tokenLogoClass}--${(this.tokenSymbol).toLowerCase()}`)
    } else if (this.token) {
      const knownAsset = KnownAssets.get(this.token.address)
      if (knownAsset) {
        classes.push(`${tokenLogoClass}--${(this.token.symbol as string).toLowerCase()}`)
      }
    }

    classes.push(`${tokenLogoClass}--${this.size.toLowerCase()}`)
    return classes.join(' ')
  }
}
</script>

<style lang="scss" scoped>
// TODO: Check assets list + logo titles
$tokens-list: "bridge-item-xor", "bridge-item-eth", "pswap", "val", "xor", "eth", "vt";
$token-background-color: var(--s-color-base-on-accent);

.token-logo {
  background-color: $token-background-color;
  background-image: url("~@/assets/img/token-logo-default.svg");
  background-size: 60%;
  background-repeat: no-repeat;
  background-position: 50%;
  border: none;
  box-shadow: none;
  border-radius: 50%;
  @each $token in $tokens-list {
    &--#{$token} {
      background-size: 100%;
      background-color: var(--s-color-utility-surface);
    }
    &--#{$token} {
      background-image: url("~@/assets/img/#{$token}.svg");
    }
  }
}

@include element-size('token-logo--mini', 16px);
@include element-size('token-logo--small', 24px);
@include element-size('token-logo--medium');
@include element-size('token-logo--large', 80px);
</style>
