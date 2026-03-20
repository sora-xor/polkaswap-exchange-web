import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import slippageToleranceSource from '@/components/shared/Settings/SlippageTolerance.vue?raw';

const setSlippageMock = vi.hoisted(() => vi.fn());
const setDeadlineMock = vi.hoisted(() => vi.fn());

const storeState = vi.hoisted(() => ({
  settings: {
    slippageTolerance: '0.5',
    transactionDeadline: 20,
  },
}));

const storeCommit = vi.hoisted(() => ({
  settings: {
    setSlippageTolerance: setSlippageMock,
    setTransactionDeadline: setDeadlineMock,
  },
}));

const infoLineComponentStub = vi.hoisted(() => ({
  name: 'InfoLineStub',
  props: ['label', 'labelTooltip', 'value'],
  template: '<div class="info-line-stub"><slot /></div>',
}));

const lazyComponentStub = vi.hoisted(() => ({
  name: 'RouterLazyComponentStub',
  template: '<div class="router-lazy-component-stub"><slot /></div>',
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      InfoLine: infoLineComponentStub,
    },
  });
});

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () => lazyComponentStub,
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: storeState,
    commit: storeCommit,
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import SlippageTolerance from '@/components/shared/Settings/SlippageTolerance.vue';

const SettingsTabsStub = {
  name: 'SettingsTabsStub',
  props: ['tabs', 'value'],
  emits: ['update:modelValue'],
  template: '<div class="settings-tabs-stub" @click="$emit(\'update:modelValue\', \'slippage-1\')"></div>',
};

const CollapseStub = {
  name: 'SCollapseStub',
  emits: ['change'],
  template: '<div class="collapse-stub"><slot /></div>',
};

const CollapseItemStub = {
  name: 'SCollapseItemStub',
  template: '<div class="collapse-item-stub"><slot /><slot name="title" /></div>',
};

const FloatInputStub = {
  name: 'SFloatInputStub',
  props: ['modelValue', 'size'],
  emits: ['update:modelValue', 'blur', 'focus'],
  template: `<input
      class="float-input-stub"
      :data-size="size"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    />`,
};

const IconStub = {
  name: 'SIconStub',
  template: '<i class="s-icon-stub"></i>',
};

describe('SlippageTolerance', () => {
  beforeEach(() => {
    storeState.settings.slippageTolerance = '0.5';
    storeState.settings.transactionDeadline = 20;

    setSlippageMock.mockReset();
    setDeadlineMock.mockReset();

    setSlippageMock.mockImplementation((value: string) => {
      storeState.settings.slippageTolerance = value;
    });
    setDeadlineMock.mockImplementation((value: number) => {
      storeState.settings.transactionDeadline = value;
    });
  });

  afterEach(() => {
    storeState.settings.slippageTolerance = '0.5';
    storeState.settings.transactionDeadline = 20;
  });

  const mountComponent = () =>
    mount(SlippageTolerance, {
      global: {
        stubs: {
          SettingsTabs: SettingsTabsStub,
          InfoLine: infoLineComponentStub,
          's-collapse': CollapseStub,
          's-collapse-item': CollapseItemStub,
          's-float-input': FloatInputStub,
          's-icon': IconStub,
        },
      },
    });

  it('emits tab selection to update slippage tolerance', async () => {
    const wrapper = mountComponent();

    const tabsStub = wrapper.findComponent(SettingsTabsStub);
    expect(tabsStub.exists()).toBe(true);
    expect(tabsStub.props('value')).toBe('slippage-0-5');
    const tabs = tabsStub.props('tabs') as Array<{ name: string }>;
    expect(tabs.map((t) => t.name)).toEqual(['slippage-0-1', 'slippage-0-5', 'slippage-1']);

    tabsStub.vm.$emit('update:modelValue', 'slippage-1');
    await wrapper.vm.$nextTick();

    expect(setSlippageMock).toHaveBeenCalledWith('1');
  });

  it('normalizes custom input below minimum on blur', async () => {
    storeState.settings.slippageTolerance = '0.02';

    const wrapper = mountComponent();

    const floatInput = wrapper.findComponent(FloatInputStub);
    expect(floatInput.exists()).toBe(true);

    floatInput.vm.$emit('focus');
    floatInput.vm.$emit('update:modelValue', '0.005');
    expect(storeState.settings.slippageTolerance).toBe('0.005');
    const exposed = (wrapper.vm as unknown as { $: { exposed: { handleSlippageToleranceOnBlur: () => void } } }).$
      .exposed;
    exposed.handleSlippageToleranceOnBlur();
    await flushPromises();

    expect(Number(storeState.settings.slippageTolerance)).toBeGreaterThanOrEqual(0.01);
  });

  it('keeps the slippage arrow chip and glyph flip aligned with production', () => {
    expect(slippageToleranceSource).toContain('.el-collapse.neumorphic .el-icon-arrow-right {');
    expect(slippageToleranceSource).toContain('box-shadow: var(--s-shadow-element-pressed);');
    expect(slippageToleranceSource).toContain('.el-collapse-item__header .el-icon-arrow-right.is-active {');
    expect(slippageToleranceSource).toContain('transform: none;');
    expect(slippageToleranceSource).toContain('.el-collapse-item__header .el-icon-arrow-right.is-active::before {');
    expect(slippageToleranceSource).toContain('transform: scaleY(-1);');
  });

  it('keeps the expanded slippage input compact like the production swap panel', () => {
    expect(slippageToleranceSource).toContain('height: var(--s-size-small);');
    expect(slippageToleranceSource).toContain('padding: $basic-spacing #{$inner-spacing-medium};');
    expect(slippageToleranceSource).toContain('min-height: calc(var(--s-size-small) - (#{$basic-spacing} * 2));');
  });
});
