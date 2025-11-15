import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const fiatPriceObjectStub: { current: Record<string, string> } = {
  current: { AAA: '1' },
};

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    fiatPriceObject: fiatPriceObjectStub.current,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `i18n:${key}`,
    TranslationConsts: {
      APR: 'APR',
    },
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      TokenLogo: {
        name: 'TokenLogoStub',
        template: '<div class="token-logo-stub"></div>',
      },
    },
  });
});

// Needs to be imported after mocks.
import StatusBadge from '@/components/shared/StatusBadge.vue';

const mountComponent = (props: Record<string, unknown>) =>
  mount(StatusBadge, {
    props,
  });

describe('StatusBadge', () => {
  const baseProps = {
    stopped: false,
    active: true,
    apr: '15%',
    rewardAsset: { symbol: 'AAA', address: 'AAA' },
  };

  it('shows active state title and indicator when farming running', () => {
    const wrapper = mountComponent(baseProps);

    expect(wrapper.classes()).toContain('active');
    expect(wrapper.text()).toContain('i18n:demeterFarming.staking.active');
    expect(wrapper.find('.status-badge-logo-icon.active').exists()).toBe(true);
    expect(wrapper.text()).toContain('15% APR');
  });

  it('shows stopped title and removes active indicator', () => {
    const wrapper = mountComponent({
      ...baseProps,
      stopped: true,
    });

    expect(wrapper.classes()).toContain('active'); // still active badge
    expect(wrapper.text()).toContain('i18n:demeterFarming.staking.stopped');
    expect(wrapper.find('.status-badge-logo-icon.active').exists()).toBe(false);
  });

  it('hides APR when fiat prices are unavailable', () => {
    fiatPriceObjectStub.current = {};
    const wrapper = mountComponent(baseProps);
    expect(wrapper.text()).not.toContain('APR');
    fiatPriceObjectStub.current = { AAA: '1' };
  });
});
