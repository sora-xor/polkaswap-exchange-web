<template>
  <div :class="computedClasses">
    <token-logo :token="firstToken" :token-symbol="firstTokenSymbol" :size="size" />
    <token-logo :token="secondToken" :token-symbol="secondTokenSymbol" :size="size" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { Token } from '@/types'
import { LogoSize, Components } from '@/consts'
import { lazyComponent } from '@/router'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class PairTokenLogo extends Mixins(TranslationMixin) {
  // TODO 4 alexnatalia: Think one more time about tokenSymbol
  @Prop({ type: Object, default: () => null }) readonly firstToken!: Token
  @Prop({ type: Object, default: () => null }) readonly secondToken!: Token
  @Prop({ type: String, default: '' }) readonly firstTokenSymbol!: string
  @Prop({ type: String, default: '' }) readonly secondTokenSymbol!: string
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize

  get computedClasses (): string {
    const componentClass = 'pair-logo'
    const classes = [componentClass]

    if (this.size) {
      classes.push(`${componentClass}--${this.size.toLowerCase()}`)
    }

    return classes.join(' ')
  }
}
</script>

<style lang="scss" scoped>
.pair-logo {
  position: relative;
  display: block;
  margin-right: $inner-spacing-mini;

  .token-logo {
    position: absolute;

    &:first-child {
      top: 0;
      left: 0;
      z-index: 1;
    }
    &:last-child {
      bottom: 0;
      right: 0;
    }
  }
}

@include element-size('pair-logo--mini', 24px);
@include element-size('pair-logo--small', 36px);
</style>
