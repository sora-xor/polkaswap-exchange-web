import { mount } from '@vue/test-utils';
import { FPNumber } from '@sora-substrate/math';
import { nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tMock = vi.fn((key: string, params?: Record<string, string>) => `${key}:${params?.xor}:${params?.euro}`);
const delayMock = vi.fn(() => Promise.resolve());

const soraCardState = reactive({
  euroBalance: '0',
  xorToDeposit: FPNumber.ZERO,
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: tMock,
  }),
}));

vi.mock('@/utils', () => ({
  delay: delayMock,
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      soraCard: soraCardState,
    },
  },
  state: {
    soraCard: soraCardState,
  },
}));

let BalanceIndicator: typeof import('@/components/pages/SoraCard/common/BalanceIndicator.vue').default;

const resetState = () => {
  soraCardState.euroBalance = '0';
  soraCardState.xorToDeposit = FPNumber.ZERO;
};

const mountComponent = () =>
  mount(BalanceIndicator, {
    attachTo: document.body,
  });

describe('BalanceIndicator', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    resetState();
    delayMock.mockClear();
    tMock.mockClear();
    ({ default: BalanceIndicator } = await import('@/components/pages/SoraCard/common/BalanceIndicator.vue'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders indicator text with formatted values', () => {
    soraCardState.euroBalance = '25';
    soraCardState.xorToDeposit = FPNumber.fromNatural('12.3456');

    const wrapper = mountComponent();
    const text = wrapper.find('.sora-card__balance-indicator').text();
    const [, params] = tMock.mock.calls.find(([key]) => key === 'card.xorAmountNeeded') ?? [];

    expect(text).toContain('card.xorAmountNeeded:12.345:75.00');
    expect(params).toEqual({
      xor: '12.345',
      euro: '75.00',
    });

    wrapper.unmount();
  });

  it('animates progress bar when euro balance changes', async () => {
    const wrapper = mountComponent();
    const progress = wrapper.find('.progress-bar--in-progress');
    const setPropertySpy = vi.spyOn(progress.element.style, 'setProperty');

    soraCardState.euroBalance = '2';
    await nextTick();
    await (wrapper.vm as { runProgressBarAnimation: () => Promise<void> }).runProgressBarAnimation();

    expect(delayMock).toHaveBeenCalled();
    expect(setPropertySpy).toHaveBeenCalledWith('width', expect.any(String));

    setPropertySpy.mockRestore();
    wrapper.unmount();
  });
});
