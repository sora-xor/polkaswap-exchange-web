import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const tMock = vi.fn();

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAmount: {
        props: ['value', 'assetSymbol', 'fontSizeRate'],
        template:
          '<div class="formatted-amount" :data-value="value" :data-asset="assetSymbol" :data-font="fontSizeRate" />',
      },
    },
    WALLET_CONSTS: {
      FontSizeRate: {
        MEDIUM: 'medium',
      },
    },
  });
});

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', async () => {
  const wallet = await import('@tests/stubs/walletRuntime');
  return {
    __esModule: true,
    default: wallet.components.FormattedAmount,
  };
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => tMock(key, params) ?? key,
  }),
}));

const ItemTooltip = (await import('@/features/rewards/components/rewards/ItemTooltip.vue')).default;

describe('RewardsItemTooltip.vue', () => {
  it('renders total vested text and passes props to formatted amount', () => {
    tMock.mockImplementation((key: string) => key);

    const wrapper = mount(ItemTooltip, {
      props: {
        value: '123.45',
        asset: {
          symbol: 'VAL',
        },
      },
      global: {
        stubs: {
          's-popover-panel': {
            template: '<div><slot /><slot name="reference" /></div>',
          },
          's-icon': {
            template: '<i />',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('rewards.totalVested');
    const formatted = wrapper.find('.formatted-amount');
    expect(formatted.exists()).toBe(true);
    expect(formatted.attributes('data-value')).toBe('123.45');
    expect(formatted.attributes('data-asset')).toBe('VAL');
    expect(formatted.attributes('data-font')).toBe('medium');
    expect(tMock).toHaveBeenCalledWith('rewards.totalVested', undefined);
  });
});
