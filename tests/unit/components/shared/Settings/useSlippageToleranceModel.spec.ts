import { FPNumber } from '@sora-substrate/sdk';
import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const formatterMocks = vi.hoisted(() => ({
  formatStringValue: vi.fn((value: string) => `fmt(${value})`),
  getFPNumber: vi.fn((value: string | number) => new FPNumber(value)),
}));

const translationMocks = vi.hoisted(() => ({
  t: vi.fn((key: string) => key),
}));

const settingsStoreMocks = vi.hoisted(() => ({
  currentStore: null as any,
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatStringValue: formatterMocks.formatStringValue,
    getFPNumber: formatterMocks.getFPNumber,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: translationMocks.t,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMocks.currentStore,
}));

import {
  DEFAULT_SLIPPAGE_TABS_LIST,
  getTabName,
  prepareInputValue,
  slippageToleranceExtremeValues,
  useSlippageToleranceModel,
} from '@/components/shared/Settings/useSlippageToleranceModel';

type MockSettingsState = {
  slippageTolerance: string;
  transactionDeadline: number;
};

const createSettingsStore = (initial: Partial<MockSettingsState> = {}) => {
  const state = reactive<MockSettingsState>({
    slippageTolerance: '0.5',
    transactionDeadline: 20,
    ...initial,
  });

  const store = {
    get slippageTolerance() {
      return state.slippageTolerance;
    },
    setSlippageTolerance: vi.fn((value: string) => {
      state.slippageTolerance = value;
    }),
    setTransactionDeadline: vi.fn((value: number) => {
      state.transactionDeadline = value;
    }),
  };

  return { state, store };
};

describe('useSlippageToleranceModel', () => {
  beforeEach(() => {
    settingsStoreMocks.currentStore = createSettingsStore().store;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses the injected settings store by default and exposes formatted tabs', () => {
    const { state, store } = createSettingsStore({ slippageTolerance: '0.5' });
    settingsStoreMocks.currentStore = store;

    const model = useSlippageToleranceModel();

    expect(model.t('slippage')).toBe('slippage');
    expect(model.delimiters).toBe(FPNumber.DELIMITERS_CONFIG);
    expect(model.slippageTolerance.value).toBe('0.5');
    expect(model.slippageTabs.value).toEqual([
      { name: 'slippage-0-1', label: 'fmt(0.1)%' },
      { name: 'slippage-0-5', label: 'fmt(0.5)%' },
      { name: 'slippage-1', label: 'fmt(1)%' },
    ]);
    expect(model.selectedSlippageTab.value).toBe('slippage-0-5');
    expect(model.localeFormattedSlippageTolerance.value).toBe('fmt(0.5)%');
    expect(state.slippageTolerance).toBe('0.5');
  });

  it('normalizes custom input, updates the selected tab, and toggles collapse state', () => {
    const { state, store } = createSettingsStore({ slippageTolerance: '1.5' });
    const model = useSlippageToleranceModel({ settingsStore: store as never });

    expect(model.selectedSlippageTab.value).toBe('');
    expect(model.customSlippageTolerance.value).toBe('1.5%');

    model.handleSlippageToleranceOnFocus();
    expect(model.slippageToleranceFocused.value).toBe(true);
    expect(model.customSlippageTolerance.value).toBe('1.5');

    model.customSlippageTolerance.value = '001.25%';
    expect(state.slippageTolerance).toBe('1.25');

    model.selectTab('slippage-1');
    expect(store.setSlippageTolerance).toHaveBeenCalledWith('1');
    expect(state.slippageTolerance).toBe('1');
    expect(model.selectedSlippageTab.value).toBe('slippage-1');

    expect(model.computedClasses.value).toBe('is-collapsed');
    model.handleCollapseChange();
    expect(model.slippageToleranceOpened.value).toBe(false);
    expect(model.computedClasses.value).toBe('');

    model.handleSetTransactionDeadline(45);
    expect(store.setTransactionDeadline).toHaveBeenCalledWith(45);
  });

  it('classifies slippage validation states and maps front-run warnings to the warning class', () => {
    const { state, store } = createSettingsStore({ slippageTolerance: '0.01' });
    const model = useSlippageToleranceModel({ settingsStore: store as never });

    expect(model.slippageToleranceValidation.value).toBe('warning');
    expect(model.slippageToleranceClasses.value).toBe('slippage-tolerance s-flex slippage-tolerance--warning');

    state.slippageTolerance = '7';
    expect(model.slippageToleranceValidation.value).toBe('frontrun');
    expect(model.slippageToleranceClasses.value).toBe('slippage-tolerance s-flex slippage-tolerance--warning');

    state.slippageTolerance = '10.5';
    expect(model.slippageToleranceValidation.value).toBe('error');
    expect(model.slippageToleranceClasses.value).toBe('slippage-tolerance s-flex slippage-tolerance--error');

    state.slippageTolerance = '1';
    expect(model.slippageToleranceValidation.value).toBe('');
    expect(model.slippageToleranceClasses.value).toBe('slippage-tolerance s-flex');
  });

  it('clamps values below the minimum on blur and clears focus state', () => {
    const { state, store } = createSettingsStore({ slippageTolerance: '0.005' });
    const model = useSlippageToleranceModel({ settingsStore: store as never });

    model.handleSlippageToleranceOnFocus();
    expect(model.slippageToleranceFocused.value).toBe(true);

    model.handleSlippageToleranceOnBlur();

    expect(state.slippageTolerance).toBe(`${slippageToleranceExtremeValues.min}`);
    expect(model.slippageToleranceFocused.value).toBe(false);
  });

  it('exports stable tab-name and input-preparation helpers', () => {
    expect(DEFAULT_SLIPPAGE_TABS_LIST).toEqual(['0.1', '0.5', '1']);
    expect(getTabName('0.1')).toBe('slippage-0-1');
    expect(prepareInputValue('001%')).toBe('1');
    expect(prepareInputValue('05')).toBe('05');
    expect(prepareInputValue('%')).toBe('');
    expect(slippageToleranceExtremeValues).toEqual({ min: 0.01, max: 10 });
  });
});
