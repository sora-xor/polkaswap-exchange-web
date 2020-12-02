<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('settings.title')"
    customClass="settings"
  >
    <div class="settings-content">
      <s-divider />
      <div class="slippage-tolerance s-flex">
        <div class="slippage-tolerance-default">
          <div class="header">
            {{ t('settings.slippageTolerance') }}
            <s-tooltip popperClass="info-tooltip" borderRadius="mini" :content="t('settings.slippageToleranceHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
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
          <s-tooltip popperClass="info-tooltip" borderRadius="mini" :content="t('settings.transactionDeadlineHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
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
          <s-tooltip popperClass="info-tooltip" borderRadius="mini" :content="t('settings.nodeAddressHint')" theme="light" placement="right-start" animation="none" :show-arrow="false">
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
    font-weight: $s-font-weight-big;
  }
}
.settings {
  .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
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
    font-size: $s-font-size-settings;
    font-weight: $s-font-weight-big;
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
      height: var(--s-size-small);
      line-height: var(--s-size-small);
      background-color: var(--s-color-base-background);
      border-radius: var(--s-border-radius-mini);
      font-size: var(--s-font-size-mini);
      font-weight: $s-font-weight-big;
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
.el-divider {
  margin-bottom: $inner-spacing-mini;
  margin-bottom: $inner-spacing-mini;
}
</style>
