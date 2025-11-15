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
            <settings-tabs :value="slippageTolerance" :tabs="slippageToleranceTabs" @input="selectTab"></settings-tabs>
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
import { components } from '@wallet';
import { computed, ref } from 'vue';

import { Components } from '@/consts';
import { UiSize } from '@/consts/theme';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useTranslation } from '@/composables/useTranslation';
import type { TabItem } from '@/types/tabs';

defineOptions({
  name: 'SlippageTolerance',
  components: {
    SettingsTabs: lazyComponent(Components.SettingsTabs),
    InfoLine: components.InfoLine,
  },
});

const { t } = useTranslation();
const { formatStringValue, getFPNumber } = useNumberFormatter();

const slippageToleranceFocused = ref(false);
const slippageToleranceOpened = ref(true);

const delimiters = FPNumber.DELIMITERS_CONFIG;

const slippageToleranceExtremeValues = {
  min: 0.01,
  max: 10,
};

const slippageTolerance = computed({
  get: () => store.state.settings.slippageTolerance as string,
  set: (value: string) => {
    store.commit.settings.setSlippageTolerance(value);
  },
});

const transactionDeadline = computed({
  get: () => store.state.settings.transactionDeadline as number,
  set: (value: number) => {
    store.commit.settings.setTransactionDeadline(value);
  },
});

const slippageToleranceTabs = computed<TabItem[]>(() =>
  ['0.1', '0.5', '1'].map((name) => ({
    name,
    label: `${formatStringValue(name)}%`,
  }))
);

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
  slippageTolerance.value = name;
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
    box-shadow: var(--s-shadow-element);

    @include focus-outline($focusWithin: true, $withOffset: true);

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
