import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import SoraCardKYC from '@/components/pages/SoraCard/SoraCardKYC.vue';
import { CardUIViews } from '@/types/card';

vi.mock('@/store/consts', () => ({
  WalletModuleRegistry: { WalletModules: [] },
}));

vi.mock('@/store', () => ({
  default: {
    state: {},
    getters: {},
    dispatch: {},
    commit: {},
  },
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    INDEXER_TYPES: {
      SUBQUERY: 'SUBQUERY',
      SUBSQUID: 'SUBSQUID',
    },
    components: {
      WalletBase: {
        name: 'WalletBaseStub',
        template: '<div class="wallet-base"><slot /></div>',
      },
    },
    WALLET_CONSTS: {
      AppWallet: {
        FearlessWallet: 'fearless-wallet',
      },
      ETH_BRIDGE_STATES: {
        SORA_COMMITED: 'sora_committed',
        SORA_REJECTED: 'sora_rejected',
        EVM_REJECTED: 'evm_rejected',
      },
    },
    vuex: {
      WalletModules: [],
      walletModules: {
        wallet: {
          namespaced: true,
          state: () => ({}),
          getters: {},
          actions: {},
          mutations: {},
          modules: {
            account: { namespaced: true },
            router: { namespaced: true },
            settings: { namespaced: true },
            subscriptions: { namespaced: true },
            transactions: { namespaced: true },
          },
        },
      },
    },
    api: {
      bridgeProxy: {
        eth: {},
      },
    },
  });
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    template: '<div class="lazy-component" />',
  }),
}));

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SoraCardKYC, {
    props,
    global: {
      stubs: {
        TermsAndConditions: {
          template: '<div class="terms" />',
        },
        Guidance: {
          template: '<div class="guidance" />',
        },
        Phone: {
          template: '<div class="phone" />',
        },
        Email: {
          template: '<div class="email" />',
        },
        Payment: {
          template: '<div class="payment" />',
        },
        KycView: {
          template: '<div class="kyc-view" />',
        },
        's-button': { template: '<button><slot /></button>' },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('SoraCardKYC.vue', () => {
  it('starts on guidance when getReadyPage is true', () => {
    const wrapper = mountComponent({ getReadyPage: true });
    const vm = wrapper.vm as unknown as { step: number };
    expect(vm.step).toBe(4); // Guidance
  });

  it('emits navigation events based on phone confirmation response', () => {
    const wrapper = mountComponent();
    const vm = wrapper.vm as unknown as { confirmPhone: (state: CardUIViews) => void };

    vm.confirmPhone(CardUIViews.Payment);
    expect((wrapper.vm as unknown as { step: number }).step).toBe(3);

    vm.confirmPhone(CardUIViews.Kyc);
    expect((wrapper.vm as unknown as { step: number }).step).toBe(4);

    vm.confirmPhone(CardUIViews.Email);
    expect((wrapper.vm as unknown as { step: number }).step).toBe(2);

    vm.confirmPhone(CardUIViews.KycResult);
    expect(wrapper.emitted('go-to-kyc-result')).toHaveLength(1);

    vm.confirmPhone(CardUIViews.Start);
    expect(wrapper.emitted('go-to-start')).toHaveLength(1);

    vm.confirmPhone(CardUIViews.Dashboard);
    expect(wrapper.emitted('go-to-dashboard')).toHaveLength(1);
  });

  it('handles rejection flow with limited back navigation', () => {
    const wrapper = mountComponent();
    const vm = wrapper.vm as unknown as { step: number; handleBack: () => void };

    vm.handleBack();
    expect(wrapper.emitted('go-to-start')).toHaveLength(1);

    vm.step = 1;
    vm.handleBack();
    expect(vm.step).toBe(0);

    vm.step = 2;
    vm.handleBack();
    expect(vm.step).toBe(1);

    vm.step = 5;
    vm.handleBack();
    expect(vm.step).toBe(4);
  });

  it('emits go-to-start when KYC confirmation returns start', () => {
    const wrapper = mountComponent();
    const vm = wrapper.vm as unknown as { confirmKyc: (state: CardUIViews) => void };

    vm.confirmKyc(CardUIViews.KycResult);
    expect(wrapper.emitted('go-to-kyc-result')).toHaveLength(1);

    vm.confirmKyc(CardUIViews.Start);
    expect(wrapper.emitted('go-to-start')).toHaveLength(1);
  });
});
