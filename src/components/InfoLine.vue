<template>
  <div class="info-line">
    <slot name="info-line-prefix" />
    <span class="info-line-label">{{ label }}</span>
    <s-tooltip
      v-if="tooltipContent"
      popper-class="info-tooltip info-tooltip--info-line"
      :content="tooltipContent"
      placement="right-start"
    >
      <s-icon name="info-16" />
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
  margin-top: -$basic-spacing-small;
  .popper__arrow {
    margin-top: $inner-spacing-mini * 0.5;
  }
}
.info-line-container {
  border-radius: var(--s-border-radius-small);
  margin-top: $inner-spacing-medium;
  padding: $inner-spacing-mini / 2 $inner-spacing-mini;
  width: 100%;
  .p2 {
    padding: $inner-spacing-mini / 4 $inner-spacing-mini / 2;
  }
}
</style>

<style lang="scss" scoped>
.info-line {
  display: flex;
  align-items: center;
  width: 100%;
  padding: $inner-spacing-mini / 4 $inner-spacing-mini / 2;
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-extra-small);
  line-height: var(--s-line-height-small);
  font-feature-settings: $s-font-feature-settings-common;
  border-bottom: 1px solid var(--s-color-base-border-secondary);

  & + .info-line {
    margin-top: $inner-spacing-small;
  }

  &:first-child {
    margin-top: 0;
  }
  &-container {
    width: 100%;
  }
  &-label {
    margin-right: $inner-spacing-mini;
    word-break: keep-all;
    text-transform: uppercase;
  }
  &-value {
    margin-left: auto;
    text-align: right;
    word-break: break-all;
    font-weight: 600
  }
  .asset-symbol {
    word-break: keep-all;
    white-space: nowrap;
  }
  .el-tooltip {
    margin-right: $inner-spacing-mini;
    flex-shrink: 0;
    i {
      margin-top: auto;
      margin-bottom: auto;
      display: block;
      color: var(--s-color-base-content-tertiary);
    }
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
  .el-button {
    margin-left: $inner-spacing-mini;
    margin-right: 0;
  }
  .token-logo {
    margin-right: $inner-spacing-mini;
  }
  p {
    font-size: inherit;
  }
}
</style>
