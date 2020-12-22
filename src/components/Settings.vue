<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('settings.title')"
    custom-class="settings"
  >
    <div class="settings-content">
      <s-divider />
      <div :class="slippageToleranceClasses">
        <div class="slippage-tolerance-default">
          <div class="header">
            {{ t('settings.slippageTolerance') }}
            <s-tooltip popper-class="info-tooltip" border-radius="mini" :content="t('settings.slippageToleranceHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
              <s-icon class="header-hint" name="info" />
            </s-tooltip>
          </div>
          <s-tabs type="rounded" v-model="model" @click="selectSlippageTolerance">
            <s-tab
              v-for="tab in SlippageToleranceValues"
              :key="tab"
              :label="`${tab}%`"
              :name="`${tab}`"
            />
          </s-tabs>
        </div>
        <div class="slippage-tolerance-custom">
          <div class="header">{{ t('settings.custom') }}</div>
          <!-- TODO: Add size="small" for s-input -->
          <s-input
            v-model="model"
            v-float
            class="slippage-tolerance-custom_input"
            size="small"
          />
        </div>
        <div v-if="slippageToleranceValidation" class="slippage-tolerance_validation">{{ t(`settings.slippageToleranceValidation.${slippageToleranceValidation}`) }}</div>
      </div>
      <s-divider />
      <!-- TODO: We'll play with this field at the next iteration of development -->
      <!-- <div class="transaction-deadline">
        <div class="header">
          {{ t('settings.transactionDeadline') }}
          <s-tooltip popper-class="info-tooltip" border-radius="mini" :content="t('settings.transactionDeadlineHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
            <s-icon class="header-hint" name="info" />
          </s-tooltip>
        </div>
        <div class="value">
          <div class="value-container">{{ transactionDeadline }} {{ t('settings.min') }}</div>
          <s-slider class="value-slider" :value="transactionDeadline" :showTooltip="false" @change="handleSetTransactionDeadline" />
        </div>
      </div>
      <s-divider /> -->
      <div class="node-address">
        <div class="header">
          {{ t('settings.nodeAddress') }}
          <s-tooltip popper-class="info-tooltip" border-radius="mini" :content="t('settings.nodeAddressHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
            <s-icon class="header-hint" name="info" />
          </s-tooltip>
        </div>
        <div class="value">
          <div class="value-container">
            <span class="value-container_label">{{ t('settings.ip') }}: </span>{{ nodeAddress.ip }}
          </div>
          <div class="value-container">
            <span class="value-container_label">{{ t('settings.port') }}: </span>#{{ nodeAddress.port }}
          </div>
        </div>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'

@Component({
  components: {
    DialogBase
  }
})
export default class Settings extends Mixins(TranslationMixin, DialogMixin) {
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

  get model (): string {
    return `${this.slippageTolerance}`
  }

  set model (value: string) {
    // TODO: ask about zero value
    this.setSlippageTolerance({ value })
  }

  get slippageToleranceClasses (): string {
    const defaultClass = 'slippage-tolerance'
    const classes = [defaultClass, 's-flex']

    if (this.slippageToleranceValidation) {
      classes.push(`${defaultClass}--${this.slippageToleranceValidation === 'frontrun' ? 'warning' : this.slippageToleranceValidation}`)
    }

    return classes.join(' ')
  }

  get slippageToleranceValidation (): string {
    if (+this.model >= this.slippageToleranceExtremeValues.min && +this.model < 0.1) {
      return 'warning'
    }
    if (+this.model >= 5 && +this.model <= this.slippageToleranceExtremeValues.max) {
      return 'frontrun'
    }
    if (+this.model < this.slippageToleranceExtremeValues.min || +this.model > this.slippageToleranceExtremeValues.max) {
      return 'error'
    }
    return ''
  }

  selectSlippageTolerance ({ name }): void {
    this.setSlippageTolerance({ value: name })
  }

  handleSetTransactionDeadline (value: number): void {
    this.setTransactionDeadline({ value })
  }
}
</script>

<style lang="scss">
.slippage-tolerance-custom_input.s-input {
  min-height: var(--s-size-small);
  .el-input > input {
    height: var(--s-size-small);
    text-align: center;
    padding-top: 0; // TODO: if there is no placeholder, set padding-top to zero
    @include font-weight(700);
  }
}
.settings {
  .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
  .el-tabs__header {
    margin-bottom: 0;
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
  &-content {
    & > .el-divider:first-child {
      margin-top: 0;
    }
  }
  .header {
    padding-bottom: $inner-spacing-mini;
    color: var(--s-color-base-content-tertiary);
    font-size: $s-font-size-settings;
    @include font-weight(700);
    &-hint {
      margin-left: $inner-spacing-mini;
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
  + .s-divider-secondary {
    margin-top: $inner-spacing-big;
  }
  &--warning,
  &--error {
    + .s-divider-secondary {
      margin-top: $inner-spacing-medium;
    }
  }
}
@include vertical-divider('el-divider');
</style>
