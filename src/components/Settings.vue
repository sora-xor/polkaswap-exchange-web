<template>
  <s-dialog
    :visible.sync="isVisible"
    width="496px"
    class="settings"
  >
    <template #title>
      <div class="settings-title">
      {{ t('settings.title') }}
      </div>
    </template>
    <div class="settings-content">
      <s-divider />
      <div class="slippage-tolerance s-flex">
        <div class="slippage-tolerance-default">
          <div class="header">
            {{ t('settings.slippageTolerance') }}
            <s-tooltip :content="t('settings.slippageToleranceHint')">
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
      </div>
      <s-divider />
      <div class="transaction-deadline">
        <div class="header">
          {{ t('settings.transactionDeadline') }}
          <s-tooltip :content="t('settings.transactionDeadlineHint')">
            <s-icon class="header-hint" name="info" />
          </s-tooltip>
        </div>
        <div class="value">
          <div class="value-container">{{ transactionDeadline }} {{ t('settings.min') }}</div>
          <s-slider class="value-slider" :value="transactionDeadline" @change="handleSetTransactionDeadline" />
        </div>
      </div>
      <s-divider />
      <div class="node-address">
        <div class="header">
          {{ t('settings.nodeAddress') }}
          <s-tooltip :content="t('settings.nodeAddressHint')">
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
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class Settings extends Mixins(TranslationMixin) {
  readonly SlippageToleranceValues = [
    0.1,
    0.5,
    1
  ]

  @Getter slippageTolerance!: number
  @Getter transactionDeadline!: number
  @Getter nodeAddress!: { ip: string; port: number }
  @Action setSlippageTolerance!: any
  @Action setTransactionDeadline!: any

  @Prop({ type: Boolean, default: false, required: true }) readonly visible!: boolean

  isVisible = false

  get model (): string {
    return `${this.slippageTolerance}`
  }

  set model (value: string) {
    // TODO: ask about zero value
    this.setSlippageTolerance({ value })
  }

  @Watch('visible')
  private handleVisibleChange (value: boolean): void {
    this.isVisible = value
  }

  @Watch('isVisible')
  private handleIsVisibleChange (value: boolean): void {
    this.$emit('update:visible', value)
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
  min-height: 32px;
  .el-input > input {
    height: 32px;
    text-align: center;
    padding-top: 0; // TODO: if there is no placeholder, set padding-top to zero
    font-weight: 700;
  }
}
</style>

<style lang="scss" scoped>
.settings {
  &-title {
    font-size: $s-font-size-big;
  }
  &-content {
    margin-top: calc(#{$inner-spacing-big} * -2);
  }
  .header {
    font-size: 10px;
    font-weight: 700;
    color: var(--s-color-base-content-tertiary);
    padding-bottom: $inner-spacing-mini;
    &-hint {
      margin-left: $inner-spacing-mini;
    }
  }
  .value {
    display: flex;
    &-container {
      flex: 1;
      height: 32px;
      line-height: 32px;
      background-color: var(--s-color-base-background);
      border-radius: $border-radius-mini;
      font-weight: 700;
      font-size: $s-font-size-mini;
      text-align: center;
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
  &-default {
    flex: 2;
  }
  &-custom {
    flex: 1;
  }
}
</style>
