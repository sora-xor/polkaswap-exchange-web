<template>
  <dialog-base :visible.sync="isVisible" :title="t('dexSettings.title')" custom-class="settings">
    <div class="settings-content">
      <div :class="slippageToleranceClasses">
        <div class="slippage-tolerance-default">
          <div class="header">
            {{ t('dexSettings.slippageTolerance') }}
            <branded-tooltip
              popper-class="info-tooltip"
              :content="t('dexSettings.slippageToleranceHint')"
              placement="right-start"
            >
              <s-icon class="header-hint" name="info" size="12" />
            </branded-tooltip>
          </div>
          <s-tabs type="rounded" :value="String(slippageTolerance)" @click="selectSlippageTolerance">
            <s-tab
              v-for="tab in SlippageToleranceValues"
              :key="tab"
              :label="`${tab}%`"
              :name="`${tab}`"
            />
          </s-tabs>
        </div>
        <div class="slippage-tolerance-custom">
          <div class="header">{{ t('dexSettings.custom') }}</div>
          <s-float-input
            class="slippage-tolerance-custom_input"
            size="small"
            v-model="customSlippageTolerance"
            @blur="handleSlippageToleranceOnBlur"
          />
        </div>
        <div v-if="slippageToleranceValidation" class="slippage-tolerance_validation">{{ t(`dexSettings.slippageToleranceValidation.${slippageToleranceValidation}`) }}</div>
      </div>
      <!-- TODO [Release 2]: We'll play with areas below at the next iteration of development -->
      <!-- <div class="transaction-deadline">
        <div class="header">
          {{ t('dexSettings.transactionDeadline') }}
          <s-tooltip popper-class="info-tooltip" border-radius="mini" :content="t('dexSettings.transactionDeadlineHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
            <s-icon class="header-hint" name="info" />
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
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'

@Component({
  components: {
    DialogBase,
    BrandedTooltip: lazyComponent(Components.BrandedTooltip)
  }
})
export default class Settings extends Mixins(TranslationMixin, DialogMixin) {
  readonly defaultSlippageTolerance = 0.5
  readonly SlippageToleranceValues = [
    0.1,
    0.5,
    1
  ]

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
    const prepared = value.replace('%', '')
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

  selectSlippageTolerance ({ name }): void {
    this.setSlippageTolerance(name)
  }

  handleSlippageToleranceOnBlur (): void {
    const value = this.isErrorValue ? +this.defaultSlippageTolerance : +this.slippageTolerance
    this.setSlippageTolerance(value)
  }

  handleSetTransactionDeadline (value: number): void {
    this.setTransactionDeadline(value)
  }
}
</script>

<style lang="scss">
.slippage-tolerance-custom_input.s-input .el-input > input,
.settings .slippage-tolerance .s-tabs .el-tabs__item {
  font-size: var(--s-font-size-mini);
  font-feature-settings: $s-font-feature-settings-common;
  @include font-weight(600, true);
}
.slippage-tolerance-custom_input.s-input {
  min-height: var(--s-size-small);
  .el-input > input {
    height: var(--s-size-small);
    text-align: center;
    padding-top: 0; // TODO: if there is no placeholder, set padding-top to zero
  }
  &.s-focused > .el-input > input {
    box-shadow: var(--s-shadow-tab)
  }
}
.settings {
  &.el-dialog__wrapper .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
  .el-tabs__header {
    margin-bottom: 0;
  }
  .el-tabs__item {
    &.is-focus,
    &.is-active {
      box-shadow: var(--s-shadow-tab) !important;
    }
  }
  .slippage-tolerance--error .el-input__inner {
    &,
    &:focus {
      border-color: var(--s-color-status-error);
    }
  }
  // TODO: remove after UI Lib fix
  .s-placeholder {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.settings {
  .header {
    padding-bottom: $inner-spacing-mini;
    padding-left: $inner-spacing-mini / 2;
    color: var(--s-color-base-content-tertiary);
    font-size: $s-font-size-settings;
    line-height: $s-line-height-base;
    letter-spacing: $s-letter-spacing-type;
    @include font-weight(700);
    &-hint {
      margin-left: $inner-spacing-mini / 2;
      cursor: pointer;
    }
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
      @include font-weight(700);
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
.slippage-tolerance {
  flex-wrap: wrap;
  &-default {
    flex: 2;
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
}
</style>
