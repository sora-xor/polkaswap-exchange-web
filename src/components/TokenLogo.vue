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
  @Prop({ type: String, default: false, required: true }) readonly token!: string
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize

  get tokenClasses (): string {
    let classes = 'token-logo'
    if (this.token && tokens.includes(this.token)) {
      classes += ' token-logo--' + this.token.toLowerCase()
    }

    if (this.size === LogoSize.MEDIUM) {
      classes += ' token-logo--medium'
    } else {
      classes += ' token-logo--small'
    }

    return classes
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
  &.token-logo--small {
    @include token-logo-size(23px);
  }
  &.token-logo--medium {
    @include token-logo-size(40px);
  }
}
</style>
