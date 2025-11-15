<template>
  <div class="info-line">
    <slot name="info-line-prefix"></slot>
    <span class="info-line-label">{{ label }}</span>
    <s-tooltip
      v-if="labelTooltip"
      popper-class="info-tooltip info-tooltip--info-line"
      :content="labelTooltip"
      placement="right-start"
      border-radius="mini"
      tabindex="-1"
    >
      <s-icon name="info-16" size="14px"></s-icon>
    </s-tooltip>
    <div class="info-line-content">
      <template v-if="isValueExists">
        <slot name="info-line-value-prefix"></slot>
        <formatted-amount
          v-if="isFormatted"
          class="info-line-value"
          :value="value"
          :asset-symbol="assetSymbol"
          :font-size-rate="formattedFontSize"
          :font-weight-rate="formattedFontWeight"
          :value-can-be-hidden="valueCanBeHidden"
        ></formatted-amount>
        <component
          :is="tooltipOrTemplate"
          v-else-if="!valueCanBeHidden || !shouldBalanceBeHidden"
          :content="valueTooltip"
        >
          <span class="info-line-value">
            {{ normalizedValue }}
            <span v-if="assetSymbol" class="asset-symbol">{{ ' ' + assetSymbol }}</span>
          </span>
        </component>
        <span v-else class="info-line-value">{{ HiddenValue }}</span>
        <formatted-amount
          v-if="fiatValue"
          is-fiat-value
          :value="fiatValue"
          :font-size-rate="formattedFontSize"
          :value-can-be-hidden="valueCanBeHidden"
        ></formatted-amount>
      </template>
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Options, Prop } from 'vue-property-decorator';

import { FontSizeRate, FontWeightRate, HiddenValue } from '../consts';
import { state } from '../store/decorators';

import FormattedAmount from './FormattedAmount.vue';

@Options({
  components: { FormattedAmount },
})
export default class InfoLine extends Vue {
  readonly HiddenValue = HiddenValue;

  @Prop({ default: '', type: String }) readonly label!: string;
  @Prop({ default: '', type: String }) readonly labelTooltip!: string;
  @Prop({ default: '', type: [String, Number] }) readonly value!: string | number;
  @Prop({ default: '', type: String }) readonly assetSymbol!: string;
  @Prop({ default: false, type: Boolean }) readonly isFormatted!: boolean;
  @Prop({ default: '', type: String }) readonly fiatValue!: string;
  @Prop({ default: '', type: String }) readonly valueTooltip!: string;
  /**
   * Define directly that this field displays value which can be hidden by hide balances button.
   */
  @Prop({ default: false, type: Boolean }) readonly valueCanBeHidden!: boolean;

  @state.settings.shouldBalanceBeHidden shouldBalanceBeHidden!: boolean;

  get normalizedValue(): string {
    if (this.value === null || this.value === undefined) {
      return '';
    }

    if (typeof this.value === 'string') {
      return this.value;
    }

    return String(this.value);
  }

  get hasInvalidValue(): boolean {
    return ['NaN', 'Infinity', '-Infinity'].includes(this.normalizedValue);
  }

  get isValueExists(): boolean {
    if (this.hasInvalidValue) {
      return false;
    }

    return this.normalizedValue.trim().length > 0;
  }

  get formattedFontSize(): Nullable<FontSizeRate> {
    return this.isFormatted ? FontSizeRate.MEDIUM : null;
  }

  get formattedFontWeight(): Nullable<FontWeightRate> {
    return this.isFormatted ? FontWeightRate.SMALL : null;
  }

  get tooltipOrTemplate(): string {
    return this.valueTooltip ? 's-tooltip' : 'span';
  }
}
</script>

<style lang="scss">
.info-tooltip--info-line {
  margin-top: -10px;
  .popper__arrow {
    margin-top: #{$basic-spacing-mini};
  }
}
.info-line {
  &-container {
    border-radius: var(--s-border-radius-small);
    margin-top: var(--s-basic-spacing);
    padding: var(--s-basic-spacing) 0 0;
    width: 100%;

    &__title {
      font-size: var(--s-heading6-font-size);
      font-weight: 300;
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
      color: var(--s-color-base-content-secondary);
      text-transform: uppercase;
      margin-bottom: #{$basic-spacing-small};
    }
  }
}
</style>

<style lang="scss" scoped>
.info-line {
  display: flex;
  align-items: center;
  width: 100%;
  padding: #{$basic-spacing-extra-mini} #{$basic-spacing-mini};
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-extra-small);
  line-height: var(--s-line-height-small);
  border-bottom: 1px solid var(--s-color-base-border-secondary);
  & + .info-line {
    margin-top: #{$basic-spacing-small};
  }
  &:first-child {
    margin-top: 0;
  }
  &-container {
    width: 100%;
  }
  &-label {
    margin-right: var(--s-basic-spacing);
    word-break: keep-all;
    text-transform: uppercase;
    text-align: left;
  }
  &-content {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: $basic-spacing-tiny;
    flex-wrap: wrap;
    flex-grow: 1;
    word-break: break-all;
    text-align: right;
    margin-left: auto;
  }
  &-value {
    text-align: right;
    font-weight: 600;
  }
  .asset-symbol {
    word-break: keep-all;
    white-space: nowrap;
  }
  .el-tooltip {
    margin-top: -1px;
    margin-right: var(--s-basic-spacing);
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
    margin-left: var(--s-basic-spacing);
    margin-right: 0;
  }
  .token-logo {
    margin-right: var(--s-basic-spacing);
  }
  p {
    font-size: inherit;
  }
  .formatted-amount--fiat-value {
    line-height: inherit;
  }
}

.el-tooltip {
  margin-right: 0 !important;
}
</style>
