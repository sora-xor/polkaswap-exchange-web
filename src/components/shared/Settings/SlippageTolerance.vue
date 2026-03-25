<template>
  <div class="slippage-tolerance" :class="computedClasses">
    <s-collapse @change="handleCollapseChange">
      <s-collapse-item>
        <template #title>
          <info-line
            :label="t('dexSettings.slippageTolerance')"
            :label-tooltip="t('dexSettings.slippageToleranceHint')"
            :value="localeFormattedSlippageTolerance"
          ></info-line>
        </template>
        <div :class="slippageToleranceClasses">
          <div class="slippage-tolerance-default">
            <settings-tabs
              :value="selectedSlippageTab"
              :tabs="slippageToleranceTabs"
              @update:model-value="selectTab"
            ></settings-tabs>
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
            ></s-float-input>
          </div>
          <div v-if="slippageToleranceValidation" class="slippage-tolerance_validation">
            {{ t(`dexSettings.slippageToleranceValidation.${slippageToleranceValidation}`) }}
          </div>
        </div>
      </s-collapse-item>
    </s-collapse>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@/shims/wallet-components';
import { computed, ref } from 'vue';

import { Components } from '@/consts';
import { UiSize } from '@/consts/theme';
import { lazyComponent } from '@/router';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import type { TabItem } from '@/types/tabs';

import { DEFAULT_SLIPPAGE_TABS_LIST, getTabName } from './useSlippageToleranceModel';

defineOptions({
  name: 'SlippageTolerance',
  components: {
    SettingsTabs: lazyComponent(Components.SettingsTabs),
    InfoLine: components.InfoLine,
  },
});

const { t } = useTranslation();
const { formatStringValue, getFPNumber } = useNumberFormatter();
const settingsStore = useSettingsStore();

const slippageToleranceFocused = ref(false);
const slippageToleranceOpened = ref(true);

const delimiters = FPNumber.DELIMITERS_CONFIG;

const slippageToleranceExtremeValues = {
  min: 0.01,
  max: 10,
};

const slippageTolerance = computed({
  get: () => settingsStore.slippageTolerance,
  set: (value: string) => {
    settingsStore.setSlippageTolerance(value);
  },
});

const transactionDeadline = computed({
  get: () => settingsStore.transactionDeadline,
  set: (value: number) => {
    settingsStore.setTransactionDeadline(value);
  },
});

const slippageToleranceTabs = computed<TabItem[]>(() =>
  DEFAULT_SLIPPAGE_TABS_LIST.map((value) => ({
    name: getTabName(value),
    label: `${formatStringValue(value)}%`,
  }))
);

const selectedSlippageTab = computed(() => {
  const match = DEFAULT_SLIPPAGE_TABS_LIST.find((value) => value === slippageTolerance.value);
  return match ? getTabName(match) : '';
});

const localeFormattedSlippageTolerance = computed(() => `${formatStringValue(slippageTolerance.value)}%`);

const customSlippageTolerance = computed({
  get: () => {
    const suffix = slippageToleranceFocused.value ? '' : '%';
    return `${slippageTolerance.value}${suffix}`;
  },
  set: (value: string) => {
    const prepared = prepareInputValue(value);
    slippageTolerance.value = prepared;
  },
});

const slippageToleranceValidation = computed(() => {
  const tolerance = Number(slippageTolerance.value);

  if (tolerance >= slippageToleranceExtremeValues.min && tolerance <= 0.1) {
    return 'warning';
  }
  if (tolerance >= 5 && tolerance <= slippageToleranceExtremeValues.max) {
    return 'frontrun';
  }
  if (isErrorValue.value) {
    return 'error';
  }
  return '';
});

const isErrorValue = computed(() => {
  const tolerance = Number(slippageTolerance.value);
  return tolerance < slippageToleranceExtremeValues.min || tolerance > slippageToleranceExtremeValues.max;
});

const slippageToleranceClasses = computed(() => {
  const defaultClass = 'slippage-tolerance';
  const classes = [defaultClass, 's-flex'];

  if (slippageToleranceValidation.value) {
    classes.push(
      `${defaultClass}--${
        slippageToleranceValidation.value === 'frontrun' ? 'warning' : slippageToleranceValidation.value
      }`
    );
  }

  return classes.join(' ');
});

const computedClasses = computed(() => (slippageToleranceOpened.value ? 'is-collapsed' : ''));

function selectTab(name: string): void {
  const match = DEFAULT_SLIPPAGE_TABS_LIST.find((value) => getTabName(value) === name);
  if (match) {
    slippageTolerance.value = match;
  }
}

function prepareInputValue(value: string): string {
  let sanitized = value.replace('%', '');
  if (sanitized.length && sanitized.startsWith('0') && sanitized[1] === '0') {
    sanitized = sanitized.replace(/^0+(?=\d)/, '');
  }
  return sanitized;
}

function handleSlippageToleranceOnBlur(): void {
  let value = slippageTolerance.value;
  if (FPNumber.lt(getFPNumber(value), getFPNumber(slippageToleranceExtremeValues.min))) {
    value = `${slippageToleranceExtremeValues.min}`;
  }
  slippageTolerance.value = value;
  slippageToleranceFocused.value = false;
}

function handleSlippageToleranceOnFocus(): void {
  slippageToleranceFocused.value = true;
}

function handleSetTransactionDeadline(value: number): void {
  transactionDeadline.value = value;
}

function handleCollapseChange(): void {
  slippageToleranceOpened.value = !slippageToleranceOpened.value;
}

defineExpose({
  selectTab,
  handleSlippageToleranceOnBlur,
  handleSlippageToleranceOnFocus,
  handleSetTransactionDeadline,
  handleCollapseChange,
});
</script>

<style lang="scss">
.slippage-tolerance .s-flex {
  margin-top: 0px !important;
}
.slippage-tolerance {
  &-custom_input.s-input {
    min-height: var(--s-size-small);
    height: var(--s-size-small);
    padding: $basic-spacing #{$inner-spacing-medium};
    box-shadow: var(--s-shadow-element);

    @include focus-outline($focusWithin: true, $withOffset: true);

    &.s-focused {
      .el-input__inner {
        color: var(--s-color-theme-accent);
      }
    }

    .s-input__content {
      min-height: calc(var(--s-size-small) - (#{$basic-spacing} * 2));
    }

    .el-input,
    .el-input__inner {
      height: calc(var(--s-size-small) - (#{$basic-spacing} * 2));
      line-height: calc(var(--s-size-small) - (#{$basic-spacing} * 2));
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

  .el-collapse.neumorphic .el-icon-arrow-right {
    transition: transform 0.3s;

    margin-left: 6px;
    height: 15px;
    line-height: 15px;
    width: 15.8px;
    padding: 0;
    position: relative;

    background-color: var(--s-color-base-content-tertiary);
    color: var(--s-color-base-on-accent) !important;
    border-radius: var(--s-border-radius-medium);
    font-size: 16px;
    font-weight: 300;
    font-family: var(--s-font-family-icons) !important;
    box-shadow: var(--s-shadow-element-pressed);
  }

  .el-collapse-item__header {
    justify-content: normal;
    font-size: 13px;
    font-weight: 500;
    line-height: 48px;
  }

  .el-collapse-item__arrow {
    margin: 0 0 0 auto;
  }

  .el-collapse-item__header .el-icon-arrow-right {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .el-collapse-item__header .el-icon-arrow-right::before {
    position: absolute;
    transition: transform 0.25s ease-in-out;
  }

  .el-collapse-item__header .el-icon-arrow-right.is-active {
    transform: none;
  }

  .el-collapse-item__header .el-icon-arrow-right.is-active::before {
    transform: scaleY(-1);
  }

  .info-line .s-icon-info-16 {
    color: var(--s-color-base-content-tertiary);
  }

  .el-collapse-item__header {
    height: 36px;
  }

  .el-collapse-item__content {
    padding: 0 !important;
    line-height: inherit;
  }

  .el-collapse--item .is-active .el-collapse {
    background: none;
  }

  .info-line {
    font-size: 14px !important;
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
  gap: $inner-spacing-mini;

  &-default {
    flex: 1;
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
