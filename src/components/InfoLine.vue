<template>
  <div class="info-line">
    <span class="info-line-label">{{ label }}</span>
    <s-tooltip v-if="tooltipContent" :class="tooltipClasses" popper-class="info-tooltip info-tooltip--info-line" border-radius="mini" :content="tooltipContent" theme="light" placement="right-start" animation="none" :show-arrow="false">
      <s-icon name="info" size="16" />
    </s-tooltip>
    <span class="info-line-value">{{ value }}<span v-if="assetSymbol" class="asset-symbol">{{ ' ' + assetSymbol }}</span></span>
    <slot />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { InfoTooltipPosition } from '@/consts'

@Component
export default class InfoLine extends Vue {
  @Prop({ default: '', type: String }) readonly label!: string
  @Prop({ default: '', type: String }) readonly tooltipContent?: string
  @Prop({ default: InfoTooltipPosition.RIGHT, type: String }) readonly tooltipPosition?: string
  @Prop({ default: '' }) readonly value!: string | number
  @Prop({ default: '', type: String }) readonly assetSymbol?: string

  get tooltipClasses (): string {
    const iconClass = 'info-line-icon'
    const classes = [iconClass]

    if (this.tooltipPosition) {
      classes.push(`${iconClass}--${this.tooltipPosition.toLowerCase()}`)
    }

    return classes.join(' ')
  }
}
</script>

<style lang="scss">
.info-tooltip--info-line {
  margin-left: #{$inner-spacing-mini / 2} !important;
}
</style>

<style lang="scss" scoped>
.info-line {
  display: flex;
  align-items: center;
  margin-top: $inner-spacing-mini / 2;
  width: 100%;
  padding: $inner-spacing-mini / 4 $inner-spacing-mini / 2;
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-small);
  font-feature-settings: $s-font-feature-settings-common;
  line-height: $s-line-height-big;
  &:first-child {
    margin-top: 0;
  }
  &-container {
    width: 100%;
  }
  &-label {
    margin-right: $inner-spacing-mini;
    word-break: keep-all;
  }
  &-value {
    margin-left: auto;
    text-align: right;
    word-break: break-all;
  }
  .asset-symbol {
    word-break: keep-all;
    white-space: nowrap;
  }
  .el-tooltip {
    margin-right: $inner-spacing-mini;
    flex-shrink: 0;
  }
  &-icon {
    position: relative;
    height: var(--s-size-mini);
    width: var(--s-size-mini);
    border-radius: var(--s-border-radius-small);
    color: inherit;
    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }
    &:before {
      position: absolute;
      display: block;
      height: var(--s-icon-font-size-mini);
      width: var(--s-icon-font-size-mini);
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      margin: auto;
      font-size: var(--s-icon-font-size-mini);
    }
    &--left {
      order: -1;
    }
  }
}
</style>
