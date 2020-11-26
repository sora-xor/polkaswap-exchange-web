<template>
  <div :class="computedClasses">
    <token-logo :token="firstToken" :size="size" />
    <token-logo :token="secondToken" :size="size" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { LogoSize, Components } from '@/consts'
import { lazyComponent } from '@/router'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class PairTokenLogo extends Mixins(TranslationMixin) {
  @Prop({ type: String, default: false }) readonly firstToken!: string | boolean | undefined
  @Prop({ type: String, default: false }) readonly secondToken!: string | boolean | undefined
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
  height: 22px;
  width: 22px;
  .token-logo {
    position: absolute;

    &:first-child {
      top: 0;
      left: 0;
      z-index: 1;
      margin: 0;
    }
    &:last-child {
      bottom: 0;
      right: 0;
      margin: 0
    }
  }
}

.pair-logo--mini {
  height: 22px;
  width: 22px;
}

.pair-logo--small {
  height: 34px;
  width: 34px;
}
</style>
