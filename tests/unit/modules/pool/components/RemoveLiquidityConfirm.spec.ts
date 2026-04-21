import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tokens = vi.hoisted(() => ({
  first: { symbol: 'DEMO1' },
  second: { symbol: 'DEMO2' },
}));

const walletComponents = vi.hoisted(() => ({
  DialogBase: {
    name: 'DialogBaseStub',
    template: '<div class="dialog-base"><slot /><slot name="footer" /></div>',
  },
  TokenLogo: {
    name: 'TokenLogoStub',
    template: '<div class="token-logo-stub" />',
  },
  AccountConfirmationOption: {
    name: 'AccountConfirmationStub',
    template: '<div class="account-confirmation-stub" />',
  },
}));

const ButtonStub = {
  name: 'SButtonStub',
  emits: ['click'],
  template: '<button class="s-button" @click="$emit(\'click\')"><slot /></button>',
};

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: walletComponents.DialogBase,
}));

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', () => ({
  default: walletComponents.TokenLogo,
}));

vi.mock('@/lib/soraneo-wallet/src/components/Account/Settings/ConfirmationOption.vue', () => ({
  default: walletComponents.AccountConfirmationOption,
}));

vi.mock('@/stores/pool', () => ({
  __esModule: true,
  usePoolStore: () => ({
    removeLiquidityLiquidityAmount: '1.5',
    removeLiquidityFirstTokenAmount: '1.00',
    removeLiquiditySecondTokenAmount: '2.00',
    removeLiquidityFirstToken: tokens.first,
    removeLiquiditySecondToken: tokens.second,
  }),
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => ({
    slippageTolerance: '0.5',
  }),
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  __esModule: true,
  useNumberFormatter: () => ({
    formatStringValue: (value: string) => value,
  }),
}));

vi.mock('@/modules/pool/components/RemoveLiquidity/TransactionDetails.vue', () => ({
  __esModule: true,
  default: { name: 'RemoveLiquidityTransactionDetails', template: '<div class="transaction-details-stub" />' },
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n');
  return {
    __esModule: true,
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    }),
  };
});

import RemoveLiquidityConfirm from '@/modules/pool/components/RemoveLiquidity/Confirm.vue';

describe('RemoveLiquidityConfirm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountComponent = () =>
    mount(RemoveLiquidityConfirm, {
      props: {
        visible: true,
        parentLoading: false,
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          DialogBase: walletComponents.DialogBase,
          TokenLogo: walletComponents.TokenLogo,
          AccountConfirmationOption: walletComponents.AccountConfirmationOption,
          RemoveLiquidityTransactionDetails: { template: '<div class="transaction-details-stub" />' },
          's-button': ButtonStub,
          's-divider': { template: '<div class="divider-stub"><slot /></div>' },
          's-icon': { template: '<i class="icon-stub"></i>' },
        },
      },
    });

  it('renders formatted token amounts and symbols', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const values = wrapper.findAll('.token-value').map((node) => node.text());
    expect(values).toEqual(['1.00', '2.00']);
    expect(wrapper.text()).toContain(tokens.first.symbol);
    expect(wrapper.text()).toContain(tokens.second.symbol);

    wrapper.unmount();
  });

  it('emits confirmation and closes dialog on confirm click', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const confirmButton = wrapper.findComponent(ButtonStub);
    expect(confirmButton.exists()).toBe(true);
    confirmButton.vm.$emit('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('confirm')).toBeTruthy();
    const visibilityEvents = wrapper.emitted('update:visible') ?? [];
    expect(visibilityEvents.some(([value]) => value === false)).toBe(true);

    wrapper.unmount();
  });
});
