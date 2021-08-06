<template>
  <span :class="tokenClasses" :style="tokenStyles" />
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import { Asset, AccountAsset, Whitelist } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { LogoSize, ObjectInit } from '@/consts'

@Component
export default class TokenLogo extends Mixins(TranslationMixin) {
  @Getter whitelist!: Whitelist
  @Getter whitelistIdsBySymbol!: any

  @Prop({ type: String, default: '' }) readonly tokenSymbol!: string
  @Prop({ type: Object, default: ObjectInit }) readonly token!: AccountAsset | Asset
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize

  get tokenClasses (): string {
    const tokenLogoClass = 'token-logo'
    const classes = [tokenLogoClass]

    classes.push(`${tokenLogoClass}--${this.size.toLowerCase()}`)
    return classes.join(' ')
  }

  get tokenStyles (): object {
    if (!(this.token || this.tokenSymbol)) return {}

    const address = this.tokenSymbol ? this.whitelistIdsBySymbol[this.tokenSymbol] : this.token.address
    if (!address) return {}

    const asset = this.whitelist[address]
    if (asset) {
      return {
        'background-size': '100%',
        'background-image': `url("${asset.icon}")`
      }
    } else {
      return {}
    }
  }
}
</script>

<style lang="scss" scoped>
$token-background-color: var(--s-color-base-on-accent);
// TODO: replace background color with the next one after icon color fix
// $token-background-color: var(--s-color-base-content-tertiary);
$default-logo: url("~@/assets/img/token-logo-default.svg");

.token-logo {
  background-color: $token-background-color;
  background-image: $default-logo;
  background-size: 60%;
  background-repeat: no-repeat;
  background-position: 50%;
  border: none;
  box-shadow: none;
  border-radius: 50%;
}

@include element-size('token-logo--mini', 16px);
@include element-size('token-logo--small', 24px);
@include element-size('token-logo--medium', 32px);
@include element-size('token-logo--big', var(--s-size-medium));
@include element-size('token-logo--large', 80px);
</style>
