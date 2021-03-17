<template>
  <div :class="['gradient-box', symbolClass]">
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'

@Component
export default class GradientBox extends Vue {
  @Prop({ default: '', type: String }) symbol!: string

  get symbolClass (): string {
    if (!this.symbol) return ''

    return `gradient-box--${this.symbol.toLowerCase()}`
  }
}
</script>

<style lang="scss" scoped>
.gradient-box {
  padding: $basic-spacing * 2;
  border-radius: var(--s-border-radius-medium);
  background: linear-gradient(101.79deg, #E81860 8.64%, #F89B29 93.47%);
  display: flex;
  flex-flow: column nowrap;

  &--pswap {
    background: linear-gradient(110.38deg, #E81860 13.54%, #6453C1 86.15%);
  }

  &--val {
    background: linear-gradient(110.38deg, #C8AC5F 13.54%, #967E2C 86.15%);
  }
}
</style>
