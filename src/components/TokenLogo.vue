<template>
  <span :class="tokenClasses" />
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { Token } from '@/types'
import { LogoSize } from '@/consts'

const tokens = [
  'XOR', 'KSM'
]
@Component
export default class TokenLogo extends Mixins(TranslationMixin) {
  @Prop({ type: Object, default: () => ({}) }) readonly token!: Token
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize

  get tokenClasses (): string {
    const tokenLogoClass = 'token-logo'
    const classes = [tokenLogoClass]

    if (this.token && tokens.includes(this.token.symbol)) {
      classes.push(`${tokenLogoClass}--${this.token.symbol.toLowerCase()}`)
    }

    classes.push(`${tokenLogoClass}--${this.size.toLowerCase()}`)
    return classes.join(' ')
  }
}
</script>

<style lang="scss" scoped>
.token-logo {
  background-color: var(--s-color-base-border-secondary);
  background-image: url("~@/assets/img/token-logo-default.svg");
  background-size: 60%;
  background-repeat: no-repeat;
  background-position: 50%;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: 50%;
  box-shadow: var(--s-shadow-tooltip);
  &--ksm,
  &--xor {
    background-size: 100%;
  }
  &--ksm {
    background-image: url("~@/assets/img/ksm.svg");
  }
  &--xor {
    background-image: url("~@/assets/img/xor.svg");
  }
}

@include element-size('token-logo--mini', 16px);
@include element-size('token-logo--small', 24px);
@include element-size('token-logo--medium');
</style>
