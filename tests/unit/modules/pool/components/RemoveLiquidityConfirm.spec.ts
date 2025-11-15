import { flushPromises, mount } from '@vue/test-utils';
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

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: walletComponents,
  });
});

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      removeLiquidity: {
        liquidityAmount: '1.5',
        firstTokenAmount: '1.00',
        secondTokenAmount: '2.00',
      },
      settings: {
        slippageTolerance: '0.5',
      },
    },
    getters: {
      removeLiquidity: {
        firstToken: tokens.first,
        secondToken: tokens.second,
      },
    },
  },
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  __esModule: true,
  useNumberFormatter: () => ({
    formatStringValue: (value: string) => value,
  }),
}));

vi.mock('@/modules/pool/router', () => ({
  __esModule: true,
  poolLazyComponent: () => ({ name: 'RemoveLiquidityTransactionDetails' }),
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
