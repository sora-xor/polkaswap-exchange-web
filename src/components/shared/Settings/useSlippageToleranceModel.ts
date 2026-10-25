import { FPNumber } from '@sora-substrate/sdk';
import { computed, ref } from 'vue';

import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import type { TabItem } from '@/types/tabs';

const DEFAULT_SLIPPAGE_TABS = ['0.1', '0.5', '1'] as const;
const SLIPPAGE_TOLERANCE_LIMITS = {
  min: 0.01,
  max: 10,
};

type SlippageToleranceModelOptions = {
  settingsStore?: ReturnType<typeof useSettingsStore>;
};

export function useSlippageToleranceModel(options: SlippageToleranceModelOptions = {}) {
  const settingsStore = options.settingsStore ?? useSettingsStore();
  const { formatStringValue, getFPNumber } = useNumberFormatter();
  const { t } = useTranslation();

  const delimiters = FPNumber.DELIMITERS_CONFIG;
  const slippageToleranceFocused = ref(false);
  const slippageToleranceOpened = ref(true);

  const slippageTolerance = computed({
    get: () => settingsStore.slippageTolerance,
    set: (value: string) => {
      settingsStore.setSlippageTolerance(value);
    },
  });

  const slippageTabs = computed<Array<TabItem>>(() =>
    DEFAULT_SLIPPAGE_TABS.map((value) => ({
      name: getTabName(value),
      label: `${formatStringValue(value)}%`,
    }))
  );

  const selectedSlippageTab = computed(() => {
    const match = DEFAULT_SLIPPAGE_TABS.find((value) => value === slippageTolerance.value);
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

  const isErrorValue = computed(() => {
    const current = Number(slippageTolerance.value);
    return current < SLIPPAGE_TOLERANCE_LIMITS.min || current > SLIPPAGE_TOLERANCE_LIMITS.max;
  });

  const slippageToleranceValidation = computed(() => {
    const current = Number(slippageTolerance.value);

    if (current >= SLIPPAGE_TOLERANCE_LIMITS.min && current <= 0.1) {
      return 'warning';
    }
    if (current >= 5 && current <= SLIPPAGE_TOLERANCE_LIMITS.max) {
      return 'frontrun';
    }
    if (isErrorValue.value) {
      return 'error';
    }
    return '';
  });

  const slippageToleranceClasses = computed(() => {
    const defaultClass = 'slippage-tolerance';
    const classes = [defaultClass, 's-flex'];

    const validation = slippageToleranceValidation.value;
    if (validation) {
      classes.push(`${defaultClass}--${validation === 'frontrun' ? 'warning' : validation}`);
    }

    return classes.join(' ');
  });

  const computedClasses = computed(() => (slippageToleranceOpened.value ? 'is-collapsed' : ''));

  const selectTab = (name: string): void => {
    const match = DEFAULT_SLIPPAGE_TABS.find((value) => getTabName(value) === name);
    if (match) {
      slippageTolerance.value = match;
    }
  };

  const handleSlippageToleranceOnBlur = (): void => {
    let value = slippageTolerance.value;

    if (FPNumber.lt(getFPNumber(value), getFPNumber(SLIPPAGE_TOLERANCE_LIMITS.min))) {
      value = `${SLIPPAGE_TOLERANCE_LIMITS.min}`;
    }

    slippageTolerance.value = value;
    slippageToleranceFocused.value = false;
  };

  const handleSlippageToleranceOnFocus = (): void => {
    slippageToleranceFocused.value = true;
  };

  const handleSetTransactionDeadline = (value: number): void => {
    settingsStore.setTransactionDeadline(value);
  };

  const handleCollapseChange = (): void => {
    slippageToleranceOpened.value = !slippageToleranceOpened.value;
  };

  return {
    delimiters,
    t,
    slippageTolerance,
    slippageTabs,
    selectedSlippageTab,
    localeFormattedSlippageTolerance,
    customSlippageTolerance,
    slippageToleranceValidation,
    slippageToleranceClasses,
    computedClasses,
    handleCollapseChange,
    handleSetTransactionDeadline,
    handleSlippageToleranceOnBlur,
    handleSlippageToleranceOnFocus,
    slippageToleranceFocused,
    slippageToleranceOpened,
    selectTab,
    slippageToleranceExtremeValues: SLIPPAGE_TOLERANCE_LIMITS,
  };
}

export function getTabName(value: string): string {
  return `slippage-${value.replace('.', '-')}`;
}

export function prepareInputValue(value: string): string {
  let prepared = value.replace('%', '');

  if (prepared.length && prepared[0] === '0' && prepared[1] === '0') {
    prepared = prepared.replace(/^0+(?=\d)/, '');
  }

  return prepared;
}

export const slippageToleranceExtremeValues = SLIPPAGE_TOLERANCE_LIMITS;
export const DEFAULT_SLIPPAGE_TABS_LIST = [...DEFAULT_SLIPPAGE_TABS];
