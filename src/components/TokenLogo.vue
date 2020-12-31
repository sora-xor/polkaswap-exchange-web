<template>
  <span :class="tokenClasses" />
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { KnownSymbols } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { Token } from '@/types'
import { LogoSize } from '@/consts'
import { getAssetSymbol } from '@/utils'

// TODO 4 alexnatalia: Update Token Icons

@Component
export default class TokenLogo extends Mixins(TranslationMixin) {
  // TODO 4 alexnatalia: Think one more time about tokenSymbol
  @Prop({ type: Object, default: () => null }) readonly token!: Token
  @Prop({ type: String, default: '' }) readonly tokenSymbol!: string
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize

  get tokenClasses (): string {
    const tokenLogoClass = 'token-logo'
    const classes = [tokenLogoClass]

    if (this.tokenSymbol) {
      classes.push(`${tokenLogoClass}--${(getAssetSymbol(this.tokenSymbol)).toLowerCase()}`)
    } else if (this.token && !!KnownSymbols[this.token.symbol]) {
      classes.push(`${tokenLogoClass}--${(getAssetSymbol(this.token.symbol)).toLowerCase()}`)
    }

    classes.push(`${tokenLogoClass}--${this.size.toLowerCase()}`)
    return classes.join(' ')
  }
}
</script>

<style lang="scss" scoped>
$tokens-list: "dot", "ksm", "pswap", "pal", "smc", "usdt", "val", "valerc", "xor", "xorerc";
$token-background-color: var(--s-color-base-on-accent);

.token-logo {
  background-color: $token-background-color;
  background-image: url("~@/assets/img/token-logo-default.svg");
  background-size: 60%;
  background-repeat: no-repeat;
  background-position: 50%;
  border: 1px solid $token-background-color;
  border-radius: 50%;
  box-shadow: var(--s-shadow-tooltip);
  @each $token in $tokens-list {
    &--#{$token} {
      background-size: 100%;
    }
    &--#{$token} {
      background-image: url("~@/assets/img/#{$token}.svg");
    }
  }
}

@include element-size('token-logo--mini', 16px);
@include element-size('token-logo--small', 24px);
@include element-size('token-logo--medium');
</style>
