import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@/lib/substrate/sdk/assets/consts';

vi.mock('@sora-substrate/sdk', async () => ({
  ...(await import('@tests/stubs/sora-sdk')),
  Operation: (await import('@/lib/substrate/sdk/types')).Operation,
}));

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

const reserveXorMock = vi.fn((amount: string) => ({ method: 'reserve', amount }));
const unreserveXorMock = vi.fn((amount: string) => ({ method: 'unreserve', amount }));
const submitExtrinsicMock = vi.fn(async () => undefined);
const notificationErrors: unknown[] = [];
const pushMock = vi.fn();
const routeMock = { name: 'ReferralBonding' };
const accountPair = { address: 'referral-test-account' };

const infoLineStub = {
  name: 'InfoLine',
  props: ['label', 'value', 'fiatValue', 'assetSymbol'],
  template: '<div class="info-line"><slot /></div>',
};

const genericPageHeaderStub = {
  name: 'GenericPageHeader',
  emits: ['back'],
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

vi.mock('@/lib/soraneo-wallet/src/api', async () => {
  const { ReferralSystemModule } = await import('@/lib/substrate/sdk/referralSystem');

  return {
    api: {
      referralSystem: new ReferralSystemModule({
        account: { pair: accountPair },
        api: { tx: { referrals: { reserve: reserveXorMock, unreserve: unreserveXorMock } } },
        submitExtrinsic: submitExtrinsicMock,
      } as never),
    },
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({ push: pushMock }),
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
      ...XOR,
      balance: {
        transferable: '10000000000000000000',
        bonded: '5000000000000000000',
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
    withNotifications: async (handler: () => Promise<void>) => {
      try {
        await handler();
      } catch (error) {
        notificationErrors.push(error);
      }
    },
  }),
}));

let ReferralBondingView: typeof import('@/features/referrals/pages/ReferralBondingPage.vue').default;

const mountView = async () => {
  if (!ReferralBondingView) {
    ({ default: ReferralBondingView } = await import('@/features/referrals/pages/ReferralBondingPage.vue'));
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
  beforeEach(() => {
    pushMock.mockClear();
    reserveXorMock.mockClear();
    unreserveXorMock.mockClear();
    submitExtrinsicMock.mockReset();
    submitExtrinsicMock.mockResolvedValue(undefined);
    notificationErrors.length = 0;
    routeMock.name = 'ReferralBonding';
    storeMocks.referralsStore.setAmount.mockClear();
    storeMocks.referralsStore.resetAmount.mockClear();
    storeMocks.referralsStore.amount = '0';
  });

  it('disables action button when amount is zero', async () => {
    const wrapper = await mountView();

    const actionButton = wrapper.find('.action-button');
    expect(actionButton.attributes('disabled')).toBeDefined();
    expect(actionButton.text()).toContain('buttons.enterAmount');
  });

  it.each([
    { route: 'ReferralBonding', method: 'reserve', operation: Operation.ReferralReserveXor, action: 'bond' },
    { route: 'ReferralUnbonding', method: 'unreserve', operation: Operation.ReferralUnreserveXor, action: 'unbond' },
  ])('submits $action through the real SDK module with the exact XOR amount', async ({ route, method, operation }) => {
    routeMock.name = route;
    storeMocks.referralsStore.amount = '1.234567890123456789';
    const wrapper = await mountView();

    expect(wrapper.find('.action-button').attributes('disabled')).toBeUndefined();
    await wrapper.find('.action-button').trigger('click');
    await flushPromises();

    await wrapper.find('.confirm-btn').trigger('click');
    await flushPromises();

    expect(notificationErrors).toEqual([]);
    expect(submitExtrinsicMock).toHaveBeenCalledExactlyOnceWith(
      { method, amount: '1234567890123456789' },
      accountPair,
      { symbol: 'XOR', amount: '1.234567890123456789', assetAddress: XOR.address, type: operation }
    );
    expect(method === 'reserve' ? unreserveXorMock : reserveXorMock).not.toHaveBeenCalled();
    expect(storeMocks.referralsStore.resetAmount).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith({
      name: 'ReferralProgram',
    });
    expect(wrapper.findComponent({ name: 'referrals-confirm-bonding' })).toBeTruthy();
  });

  it.each(['ReferralBonding', 'ReferralUnbonding'])(
    'retains the entered amount after a failed %s submission',
    async (route) => {
      routeMock.name = route;
      storeMocks.referralsStore.amount = '1.25';
      const submissionError = new Error('Wallet declined the transaction');
      submitExtrinsicMock.mockRejectedValueOnce(submissionError);
      const wrapper = await mountView();

      await wrapper.find('.action-button').trigger('click');
      await wrapper.find('.confirm-btn').trigger('click');
      await flushPromises();

      expect(notificationErrors).toEqual([submissionError]);
      expect(storeMocks.referralsStore.amount).toBe('1.25');
      expect(storeMocks.referralsStore.resetAmount).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    }
  );

  it.each(['ReferralBonding', 'ReferralUnbonding'])(
    'returns from %s to the canonical referral dashboard URL',
    async (route) => {
      routeMock.name = route;
      const wrapper = await mountView();

      wrapper.findComponent({ name: 'GenericPageHeader' }).vm.$emit('back');
      await flushPromises();

      expect(pushMock).toHaveBeenCalledExactlyOnceWith({ name: 'ReferralProgram' });
      expect(submitExtrinsicMock).not.toHaveBeenCalled();
    }
  );
});
