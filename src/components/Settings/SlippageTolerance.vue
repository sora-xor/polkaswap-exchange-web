<template>
  <div :class="slippageToleranceClasses">
    <div class="slippage-tolerance-default">
      <settings-header :title="t('dexSettings.slippageTolerance')" :tooltip="t('dexSettings.slippageToleranceHint')" />
      <settings-tabs :value="String(slippageTolerance)" :tabs="SlippageToleranceTabs" @click="selectTab"/>
    </div>
    <div class="slippage-tolerance-custom">
      <settings-header :title="t('dexSettings.custom')" />
      <s-float-input
        class="slippage-tolerance-custom_input"
        size="small"
        :decimals="2"
        :max="slippageToleranceExtremeValues.max"
        v-model="customSlippageTolerance"
        @blur="handleSlippageToleranceOnBlur"
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
  readonly SlippageToleranceTabs = [
    0.1,
    0.5,
    1
  ].map(name => ({ name: String(name), label: `${name}%` }))

  readonly slippageToleranceExtremeValues = {
    min: 0.01,
    max: 10
  }

  @Getter slippageTolerance!: number
  @Getter transactionDeadline!: number
  @Getter nodeAddress!: { ip: string; port: number }
  @Action setSlippageTolerance!: any
  @Action setTransactionDeadline!: any

  get customSlippageTolerance (): string {
    return `${this.slippageTolerance}%`
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
    return this.slippageTolerance < this.slippageToleranceExtremeValues.min || this.slippageTolerance > this.slippageToleranceExtremeValues.max
  }

  get slippageToleranceValidation (): string {
    if (this.slippageTolerance >= this.slippageToleranceExtremeValues.min && this.slippageTolerance <= 0.1) {
      return 'warning'
    }
    if (this.slippageTolerance >= 5 && this.slippageTolerance <= this.slippageToleranceExtremeValues.max) {
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
        this.getFPNumber(
          this.slippageToleranceExtremeValues.min
        )
      )
    ) {
      value = this.slippageToleranceExtremeValues.min
    }
    this.setSlippageTolerance(value)
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

    .el-input > input {
      font-size: var(--s-font-size-mini);
      font-feature-settings: $s-font-feature-settings-common;
      font-weight: 600 !important;

      height: var(--s-size-small);
      text-align: center;
      padding-top: 0; // TODO: if there is no placeholder, set padding-top to zero
    }

    &.s-focused > .el-input > input {
      box-shadow: var(--s-shadow-tab)
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
}
</style>

<style lang="scss" scoped>
.slippage-tolerance {
  flex-wrap: wrap;
  &-default {
    flex: 2;
    margin-right: $inner-spacing-medium;
  }
  &-custom {
    flex: 1;
  }
  &_validation {
    margin-top: $inner-spacing-mini;
    width: 100%;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
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
