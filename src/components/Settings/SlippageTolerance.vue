<template>
  <div class="slippage-tolerance" :class="computedClasses">
    <s-collapse @change="handleCollapseChange">
      <s-collapse-item>
        <template #title>
          <info-line
            :label="t('dexSettings.slippageTolerance')"
            :label-tooltip="t('dexSettings.slippageToleranceHint')"
            :value="customSlippageTolerance"
          />
        </template>
        <div :class="slippageToleranceClasses">
          <div class="slippage-tolerance-default">
            <settings-tabs :value="slippageTolerance" :tabs="SlippageToleranceTabs" @input="selectTab" />
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
          <div v-if="slippageToleranceValidation" class="slippage-tolerance_validation">
            {{ t(`dexSettings.slippageToleranceValidation.${slippageToleranceValidation}`) }}
          </div>
        </div>
      </s-collapse-item>
    </s-collapse>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { state, mutation } from '@/store/decorators';
import type { TabItem } from '@/types/tabs';

@Component({
  components: {
    SettingsTabs: lazyComponent(Components.SettingsTabs),
    InfoLine: components.InfoLine,
  },
})
export default class SlippageTolerance extends Mixins(mixins.NumberFormatterMixin, TranslationMixin) {
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  readonly SlippageToleranceTabs: Array<TabItem> = ['0.1', '0.5', '1'].map((name) => ({
    name: name,
    label: `${this.formatStringValue(name)}%`,
  }));

  readonly slippageToleranceExtremeValues = {
    min: 0.01,
    max: 10,
  };

  slippageToleranceFocused = false;
  slippageToleranceOpened = true;

  @state.settings.slippageTolerance slippageTolerance!: string;
  @state.settings.transactionDeadline transactionDeadline!: number;

  @mutation.settings.setSlippageTolerance private setSlippageTolerance!: (value: string) => void;
  @mutation.settings.setTransactionDeadline private setTransactionDeadline!: (value: number) => void;

  get customSlippageTolerance(): string {
    const suffix = this.slippageToleranceFocused ? '' : '%';

    return `${this.slippageTolerance}${suffix}`;
  }

  set customSlippageTolerance(value: string) {
    const prepared = this.prepareInputValue(value);
    this.setSlippageTolerance(prepared);
  }

  get slippageToleranceClasses(): string {
    const defaultClass = 'slippage-tolerance';
    const classes = [defaultClass, 's-flex'];

    if (this.slippageToleranceValidation) {
      classes.push(
        `${defaultClass}--${
          this.slippageToleranceValidation === 'frontrun' ? 'warning' : this.slippageToleranceValidation
        }`
      );
    }

    return classes.join(' ');
  }

  get computedClasses(): string {
    if (this.slippageToleranceOpened) return 'is-collapsed';
    return '';
  }

  get isErrorValue(): boolean {
    const slippageTolerance = Number(this.slippageTolerance);
    return (
      slippageTolerance < this.slippageToleranceExtremeValues.min ||
      slippageTolerance > this.slippageToleranceExtremeValues.max
    );
  }

  get slippageToleranceValidation(): string {
    const slippageTolerance = Number(this.slippageTolerance);
    if (slippageTolerance >= this.slippageToleranceExtremeValues.min && slippageTolerance <= 0.1) {
      return 'warning';
    }
    if (slippageTolerance >= 5 && slippageTolerance <= this.slippageToleranceExtremeValues.max) {
      return 'frontrun';
    }
    if (this.isErrorValue) {
      return 'error';
    }
    return '';
  }

  selectTab(name: string): void {
    this.setSlippageTolerance(name);
  }

  prepareInputValue(value): string {
    let v = value.replace('%', '');

    if (v.length) {
      if (v[0] === '0' && v[1] === '0') {
        v = v.replace(/^0+(?=\d)/, '');
      }
    }

    return v;
  }

  handleSlippageToleranceOnBlur(): void {
    let value = this.slippageTolerance;
    if (
      FPNumber.lt(this.getFPNumber(this.slippageTolerance), this.getFPNumber(this.slippageToleranceExtremeValues.min))
    ) {
      value = `${this.slippageToleranceExtremeValues.min}`;
    }
    this.setSlippageTolerance(value);
    this.slippageToleranceFocused = false;
  }

  handleSlippageToleranceOnFocus(): void {
    this.slippageToleranceFocused = true;
  }

  handleSetTransactionDeadline(value: number): void {
    this.setTransactionDeadline(value);
  }

  handleCollapseChange(): void {
    this.slippageToleranceOpened = !this.slippageToleranceOpened;
  }
}
</script>

<style lang="scss">
.slippage-tolerance .s-flex {
  margin-top: 0px !important;
}
.slippage-tolerance {
  &-custom_input.s-input {
    @include focus-outline($focusWithin: true, $withOffset: true);
    min-height: var(--s-size-small);
    box-shadow: var(--s-shadow-element);

    &.s-focused {
      .el-input__inner {
        color: var(--s-color-theme-accent);
      }
    }

    .el-input > input {
      @include slippage-tolerance-tabs;
    }
  }

  &--error &-custom_input.s-input .el-input > input {
    &,
    &:focus {
      border-color: var(--s-color-status-error);
    }
  }

  .s-placeholder {
    display: none;
  }

  .el-form--actions & {
    margin-top: $inner-spacing-mini;
  }

  .el-collapse.neumorphic .el-icon-arrow-right {
    all: initial;
    * {
      all: unset;
    }

    transition: transform 0.3s;

    margin-left: 6px;
    height: 15px !important;
    width: 15.8px !important;

    background-color: var(--s-color-base-content-tertiary);
    color: var(--s-color-base-on-accent) !important;
    border-radius: var(--s-border-radius-medium);

    &:hover {
      cursor: pointer !important;
    }
  }

  .el-collapse-item__header {
    height: 36px;
  }

  .el-collapse-item__header .el-icon-arrow-right.is-active {
    transform: scale(1, -1);
    transition: transform 0.3s;
  }

  .el-collapse-item__content {
    padding: 0 !important;
    margin-bottom: $inner-spacing-mini;
  }

  .el-collapse--item .is-active .el-collapse {
    background: none;
  }

  .info-line {
    font-size: 14px !important;
    line-height: 2.5 !important;
    font-weight: 300;
    border: none !important;

    &-value {
      color: var(--s-color-theme-accent);
    }

    .el-tooltip {
      margin-bottom: 2px;
    }
  }
}
</style>

<style lang="scss" scoped>
.slippage-tolerance {
  width: 100%;
  flex-wrap: wrap;
  align-items: flex-end;

  &-default {
    flex: 1;

    @include large-mobile(true) {
      margin-bottom: $inner-spacing-mini;
    }

    @include large-mobile {
      margin-right: $inner-spacing-medium;
    }
  }

  &-custom {
    flex: 1;
    min-width: 100px;
  }

  &_validation {
    margin-top: $inner-spacing-mini;
    width: 100%;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
  }
  &--warning {
    color: var(--s-color-status-warning);
  }
  &--error {
    color: var(--s-color-status-error);
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

.is-collapsed .el-collapse {
  background: linear-gradient(0deg, var(--s-color-base-border-secondary) 1px, transparent 1px);
}
</style>
