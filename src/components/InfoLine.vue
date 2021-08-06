<template>
  <div class="info-line">
    <slot name="info-line-prefix" />
    <span class="info-line-label">{{ label }}</span>
    <s-tooltip
      v-if="tooltipContent"
      popper-class="info-tooltip info-tooltip--info-line"
      :content="tooltipContent"
      placement="right-start"
      border-radius="mini"
    >
      <s-icon name="info-16" size="14px" />
    </s-tooltip>
    <span v-if="!value && altValue" class="info-line-value">{{ altValue }}</span>
    <div v-else class="info-line-content">
      <span v-if="valuePrefix" class="info-line-value-prefix">{{ valuePrefix }}</span>
      <formatted-amount
        v-if="isFormatted"
        class="info-line-value"
        :value="value"
        :asset-symbol="assetSymbol"
        :font-size-rate="formattedFontSize"
        :font-weight-rate="formattedFontWeight"
      />
      <span v-else class="info-line-value">{{ value }}<span v-if="assetSymbol" class="asset-symbol">{{ ' ' + assetSymbol }}</span></span>
      <formatted-amount
        :value="fiatValue"
        is-fiat-value
        :font-size-rate="formattedFontSize"
        with-left-shift
      />
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { FormattedAmount, FontSizeRate, FontWeightRate } from '@soramitsu/soraneo-wallet-web'

import { InfoTooltipPosition } from '@/consts'

@Component({
  components: { FormattedAmount }
})
export default class InfoLine extends Vue {
  @Prop({ default: '', type: String }) readonly label!: string
  @Prop({ default: '', type: String }) readonly tooltipContent?: string
  @Prop({ default: InfoTooltipPosition.RIGHT, type: String }) readonly tooltipPosition?: string
  @Prop({ default: '' }) readonly value!: string | number
  @Prop({ default: false, type: Boolean }) readonly isFormatted?: boolean
  @Prop({ default: '', type: String }) readonly assetSymbol?: string
  @Prop({ default: '', type: String }) readonly fiatValue?: string
  @Prop({ default: '', type: String }) readonly altValue?: string
  @Prop({ default: '', type: String }) readonly valuePrefix?: string

  get tooltipClasses (): string {
    const iconClass = 'info-line-icon'
    const classes = [iconClass]

    if (this.tooltipPosition) {
      classes.push(`${iconClass}--${this.tooltipPosition.toLowerCase()}`)
    }

    return classes.join(' ')
  }

  get formattedFontSize (): Nullable<FontSizeRate> {
    return this.isFormatted ? FontSizeRate.MEDIUM : null
  }

  get formattedFontWeight (): Nullable<FontWeightRate> {
    return this.isFormatted ? FontWeightRate.SMALL : null
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
  padding: $inner-spacing-mini 0 0;
  width: 100%;

  &__title {
    font-size: var(--s-heading6-font-size);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
    color: var(--s-color-base-content-secondary);
    text-transform: uppercase;
    margin-bottom: $inner-spacing-small;
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
  &-content {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: baseline;
    flex-grow: 1;
  }
  &-value {
    margin-left: auto;
    text-align: right;
    font-weight: 600;
    &-prefix {
      margin-left: auto;
      + .info-line-value {
        margin-left: 0;
      }
    }
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
