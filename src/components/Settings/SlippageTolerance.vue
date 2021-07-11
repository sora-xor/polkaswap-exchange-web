<template>
  <div :class="slippageToleranceClasses">
    <div class="slippage-tolerance-default">
      <settings-header :title="t('dexSettings.slippageTolerance')" :tooltip="t('dexSettings.slippageToleranceHint')" />
      <settings-tabs :value="String(slippageTolerance)" :tabs="SlippageToleranceTabs" @click="selectTab" />
    </div>
    <div class="slippage-tolerance-custom">
      <s-float-input
        class="slippage-tolerance-custom_input"
        size="small"
        :decimals="2"
        has-locale-string
        :delimiters="delimiters"
        :max="slippageToleranceExtremeValues.max"
        v-model="customSlippageTolerance"
        @blur="handleSlippageToleranceOnBlur"
        @focus="handleSlippageToleranceOnFocus"
      />
    </div>
    <div v-if="slippageToleranceValidation" class="slippage-tolerance_validation">{{ t(`dexSettings.slippageToleranceValidation.${slippageToleranceValidation}`) }}</div>
    <!-- TODO [Release 2]: We'll play with areas below at the next iteration of development -->
    <!-- <div class="transaction-deadline">
      <div class="header">
        {{ t('dexSettings.transactionDeadline') }}
        <s-tooltip popper-class="info-tooltip" border-radius="mini" :content="t('dexSettings.transactionDeadlineHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
          <s-icon class="header-hint" name="info-16" />
        </s-tooltip>
      </div>
      <div class="value">
        <div class="value-container">{{ transactionDeadline }} {{ t('dexSettings.min') }}</div>
        <s-slider class="value-slider" :value="transactionDeadline" :showTooltip="false" @input="handleSetTransactionDeadline" />
      </div>
    </div> -->
    <!-- <div class="node-address">
      <div class="header">{{ t('dexSettings.nodeAddress') }}</div>
      <div class="value">
        <div class="value-container">
          <span class="value-container_label">{{ t('dexSettings.ip') }} </span>{{ nodeAddress.ip }}
        </div>
        <div class="value-container">
          <span class="value-container_label">{{ t('dexSettings.port') }} </span>#{{ nodeAddress.port }}
        </div>
      </div>
    </div> -->
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { FPNumber } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    SettingsHeader: lazyComponent(Components.SettingsHeader),
    SettingsTabs: lazyComponent(Components.SettingsTabs)
  }
})
export default class SlippageTolerance extends Mixins(TranslationMixin, NumberFormatterMixin) {
  readonly delimiters = FPNumber.DELIMITERS_CONFIG
  readonly SlippageToleranceTabs: Array<object> = [
    '0.1',
    '0.5',
    '1'
  ].map(name => ({ name: String(name), label: `${this.formatStringValue(name)}%` }))

  readonly slippageToleranceExtremeValues = {
    min: 0.01,
    max: 10
  }

  slippageToleranceFocused = false

  @Getter slippageTolerance!: string
  @Getter transactionDeadline!: number
  @Getter nodeAddress!: { ip: string; port: number }
  @Action setSlippageTolerance!: (value: string) => Promise<void>
  @Action setTransactionDeadline!: any

  get customSlippageTolerance (): string {
    const suffix = this.slippageToleranceFocused ? '' : '%'

    return `${this.slippageTolerance}${suffix}`
  }

  set customSlippageTolerance (value: string) {
    const prepared = this.prepareInputValue(value)
    this.setSlippageTolerance(prepared)
  }

  get slippageToleranceClasses (): string {
    const defaultClass = 'slippage-tolerance'
    const classes = [defaultClass, 's-flex']

    if (this.slippageToleranceValidation) {
      classes.push(`${defaultClass}--${this.slippageToleranceValidation === 'frontrun' ? 'warning' : this.slippageToleranceValidation}`)
    }

    return classes.join(' ')
  }

  get isErrorValue (): boolean {
    const slippageTolerance = Number(this.slippageTolerance)
    return slippageTolerance < this.slippageToleranceExtremeValues.min || slippageTolerance > this.slippageToleranceExtremeValues.max
  }

  get slippageToleranceValidation (): string {
    const slippageTolerance = Number(this.slippageTolerance)
    if (slippageTolerance >= this.slippageToleranceExtremeValues.min && slippageTolerance <= 0.1) {
      return 'warning'
    }
    if (slippageTolerance >= 5 && slippageTolerance <= this.slippageToleranceExtremeValues.max) {
      return 'frontrun'
    }
    if (this.isErrorValue) {
      return 'error'
    }
    return ''
  }

  selectTab ({ name }): void {
    this.setSlippageTolerance(name)
  }

  prepareInputValue (value): string {
    let v = value.replace('%', '')

    if (v.length) {
      if (v[0] === '0' && v[1] === '0') {
        v = v.replace(/^0+(?=\d)/, '')
      }
    }

    return v
  }

  handleSlippageToleranceOnBlur (): void {
    let value = this.slippageTolerance
    if (
      FPNumber.lt(
        this.getFPNumber(this.slippageTolerance),
        this.getFPNumber(this.slippageToleranceExtremeValues.min)
      )
    ) {
      value = `${this.slippageToleranceExtremeValues.min}`
    }
    this.setSlippageTolerance(value)
    this.slippageToleranceFocused = false
  }

  handleSlippageToleranceOnFocus (): void {
    this.slippageToleranceFocused = true
  }

  handleSetTransactionDeadline (value: number): void {
    this.setTransactionDeadline(value)
  }
}
</script>

<style lang="scss">
.slippage-tolerance {
  &-custom_input.s-input {
    min-height: var(--s-size-small);
    box-shadow: var(--s-shadow-element-pressed);

    &.s-focused {
      box-shadow: var(--s-shadow-element);
    }

    .el-input > input {
      font-size: var(--s-font-size-medium);
      text-align: center;
    }
  }

  &--error &-custom_input.s-input .el-input > input  {
    &, &:focus {
      border-color: var(--s-color-status-error);
    }
  }

  .s-placeholder {
    display: none;
  }

  .el-form--actions & {
    margin-top: $inner-spacing-medium;
  }
}
</style>

<style lang="scss" scoped>
.slippage-tolerance {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;

  &-default {
    margin-right: $inner-spacing-medium;
  }

  &-custom {
    flex: 1;
  }

  &_validation {
    margin-top: $inner-spacing-mini;
    width: 100%;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
  }
  &--warning {
    color: var(--s-color-status-warning)
  }
  &--error {
    color: var(--s-color-status-error)
  }

  .value {
    display: flex;
    &-container {
      flex: 1;
      height: var(--s-size-small);
      line-height: var(--s-size-small);
      background-color: var(--s-color-base-background);
      border-radius: var(--s-border-radius-mini);
      font-size: var(--s-font-size-mini);
      text-align: center;
      font-weight: 700;
      &_label {
        color: var(--s-color-base-content-tertiary);
      }
      &:not(:last-child) {
        margin-right: $inner-spacing-medium;
      }
    }
    &-slider {
      flex: 2;
    }
  }
}
</style>
