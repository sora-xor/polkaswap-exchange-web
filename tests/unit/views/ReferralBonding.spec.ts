import { flushPromises, mount } from '@vue/test-utils';
import type { Component } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { Operation } from '@sora-substrate/sdk';

const createStorageStub = () => ({
  get: vi.fn((key: string) =>
    key === 'filters' ? JSON.stringify({ option: null, verifiedOnly: false, zeroBalance: false }) : null
  ),
  set: vi.fn(),
  remove: vi.fn(),
});

const storageStub = createStorageStub();
const settingsStorageStub = createStorageStub();
const runtimeStorageStub = createStorageStub();
const layoutsStorageStub = createStorageStub();

vi.mock('@/utils/storage', () => ({
  __esModule: true,
  default: storageStub,
  storage: storageStub,
  settingsStorage: settingsStorageStub,
  runtimeStorage: runtimeStorageStub,
  layoutsStorage: layoutsStorageStub,
  calculateStorageUsagePercentage: vi.fn(() => 0),
  clearLocalStorage: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/util/storage', () => ({
  __esModule: true,
  storage: storageStub,
  settingsStorage: settingsStorageStub,
  runtimeStorage: runtimeStorageStub,
}));

const reserveXorMock = vi.fn();
const unreserveXorMock = vi.fn();

const infoLineStub = {
  name: 'InfoLine',
  props: ['label', 'value', 'fiatValue', 'assetSymbol'],
  template: '<div class="info-line"><slot /></div>',
};

const genericPageHeaderStub = {
  template: '<header class="generic-page-header"><slot /></header>',
};

const tokenInputStub = {
  props: ['modelValue', 'balance', 'token', 'title', 'isMaxAvailable'],
  emits: ['update:modelValue', 'max'],
  template:
    '<div class="token-input"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><button class="max-btn" @click="$emit(\'max\')">max</button></div>',
};

const referralsConfirmBondingStub = {
  props: ['visible'],
  emits: ['update:visible', 'confirm'],
  template:
    '<div v-if="visible" class="confirm-dialog"><slot /><button class="confirm-btn" @click="$emit(\'confirm\')"></button></div>',
};

vi.mock('@wallet', () => ({
  __esModule: true,
  components: {
    InfoLine: infoLineStub,
  },
  WALLET_CONSTS: {
    FontSizeRate: { SMALL: 'SMALL' },
    FontWeightRate: { MEDIUM: 'MEDIUM' },
  },
  api: {
    referralSystem: {
      reserveXor: reserveXorMock,
      unreserveXor: unreserveXorMock,
    },
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'ReferralBonding' }),
  useRouter: () => ({ push: vi.fn() }),
}));

const storeMocks = (() => {
  const referralsStore = {
    amount: '0',
    setAmount: vi.fn(),
    resetAmount: vi.fn(),
  };

  const settingsStore = {
    shouldBalanceBeHidden: false,
    networkFees: {
      [Operation.ReferralReserveXor]: '5000000000',
      [Operation.ReferralUnreserveXor]: '1000000000',
    },
  };

  const assetsStore = {
    xor: {
      address: 'xor',
      symbol: 'XOR',
      decimals: 18,
      balance: {
        transferable: '1000000000000000000000000000000000000000000000',
        bonded: '500000000000000000000000000000000000000000000',
      },
    },
  };

  return { referralsStore, settingsStore, assetsStore };
})();

vi.mock('@/stores/referrals', () => ({
  __esModule: true,
  useReferralsStore: () => storeMocks.referralsStore,
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => storeMocks.settingsStore,
}));

vi.mock('@/stores/assets', () => ({
  __esModule: true,
  useAssetsStore: () => storeMocks.assetsStore,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => (params?.tokenSymbol ? `${key}:${params.tokenSymbol}` : key),
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: { value: false },
    withNotifications: (handler: () => Promise<void>) => handler(),
  }),
}));

const pushMock = vi.fn();

const lazyComponentStubs: Record<string, Component> = {
  'shared/GenericPageHeader': genericPageHeaderStub,
  'shared/Input/TokenInput': tokenInputStub,
  'pages/Referrals/ConfirmBonding': referralsConfirmBondingStub,
};

const fallbackLazyComponent = {
  template: '<div />',
};

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    push: pushMock,
    currentRoute: { value: { name: 'ReferralBonding' } },
  },
  lazyComponent: (component: string) => lazyComponentStubs[component] ?? fallbackLazyComponent,
}));

let ReferralBondingView: typeof import('@/views/ReferralBonding.vue').default;

const mountView = async () => {
  if (!ReferralBondingView) {
    ({ default: ReferralBondingView } = await import('@/views/ReferralBonding.vue'));
  }

  return mount(ReferralBondingView, {
    props: {
      parentLoading: false,
    },
    global: {
      stubs: {
        's-form': { template: '<form><slot /></form>' },
        's-button': {
          props: ['disabled', 'loading', 'type'],
          emits: ['click'],
          template:
            '<button class="s-button" :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        'generic-page-header': genericPageHeaderStub,
        'token-input': tokenInputStub,
        'referrals-confirm-bonding': referralsConfirmBondingStub,
        'info-line': infoLineStub,
      },
      directives: {
        loading: () => undefined,
      },
    },
  });
};

describe('ReferralBonding view', () => {
  it('disables action button when amount is zero', async () => {
    const wrapper = await mountView();

    const actionButton = wrapper.find('.action-button');
    expect(actionButton.attributes('disabled')).toBeDefined();
    expect(actionButton.text()).toContain('buttons.enterAmount');
  });

  it('confirms bonding flow and resets amount', async () => {
    storeMocks.referralsStore.amount = '100000000000';
    const wrapper = await mountView();

    await wrapper.find('.action-button').trigger('click');
    await flushPromises();

    await wrapper.find('.confirm-btn').trigger('click');
    await flushPromises();

    expect(reserveXorMock).toHaveBeenCalledWith('100000000000');
    expect(storeMocks.referralsStore.resetAmount).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith({
      name: 'ReferralProgram',
      params: {
        referrerAddress: 'bond',
      },
    });
    expect(wrapper.findComponent({ name: 'referrals-confirm-bonding' })).toBeTruthy();
  });
});
