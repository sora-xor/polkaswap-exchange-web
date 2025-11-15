import { flushPromises, mount } from '@vue/test-utils';
import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const shareLinkSpy = vi.fn();

const subscribeOnInvitedUsers = vi.fn().mockResolvedValue(undefined);
const getAccountReferralRewards = vi.fn().mockResolvedValue(undefined);
const getReferrer = vi.fn().mockResolvedValue(undefined);
const subscribeOnReferrer = vi.fn().mockResolvedValue(undefined);

const resetReferrals = vi.fn();
const unsubscribeFromInvitedUsers = vi.fn();
const resetReferrerSubscription = vi.fn();
const setStorageReferrer = vi.fn();

const storeStub = {
  state: {
    referrals: {
      referralRewards: {
        rewards: FPNumber.ZERO,
        invitedUserRewards: {},
      },
      invitedUsers: ['addr-1', 'addr-2', 'addr-3'],
      referrer: '',
      isReferrerApproved: false,
    },
    settings: {
      isTMA: false,
      telegramBotUrl: null,
    },
    wallet: {
      settings: {
        networkFees: {
          ReferralSetInvitedUser: '1000000000000000000',
        },
      },
    },
  },
  getters: {
    assets: {
      xor: {
        address: XOR.address,
        symbol: XOR.symbol,
        balance: {
          bonded: '2000000000000000000',
        },
      },
    },
    wallet: {
      account: {
        account: {
          address: '5mock-account',
        },
      },
    },
  },
  dispatch: {
    referrals: {
      subscribeOnInvitedUsers,
      getAccountReferralRewards,
      getReferrer,
      subscribeOnReferrer,
    },
  },
  commit: {
    referrals: {
      reset: resetReferrals,
      unsubscribeFromInvitedUsers,
      resetReferrerSubscription,
      setStorageReferrer,
    },
  },
};

vi.mock('@/store', () => ({
  __esModule: true,
  default: storeStub,
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAmount: {
        name: 'FormattedAmountStub',
        template: '<div class="formatted-amount-stub"><slot /><slot name="prefix" /></div>',
      },
      FormattedAddress: {
        name: 'FormattedAddressStub',
        props: ['value'],
        template: '<span class="formatted-address-stub">{{ value }}</span>',
      },
      InfoLine: {
        name: 'InfoLineStub',
        props: ['label', 'value'],
        template: '<div class="info-line-stub"><slot name="info-line-prefix" />{{ label }}{{ value }}</div>',
      },
      WalletAvatar: {
        name: 'WalletAvatarStub',
        template: '<div class="wallet-avatar-stub" />',
      },
      TokenLogo: {
        name: 'TokenLogoStub',
        template: '<div class="token-logo-stub" />',
      },
    },
    api: {
      validateAddress: (value: string) => value.startsWith('5'),
      formatAddress: (value: string) => value,
    },
    WALLET_CONSTS: {
      LogoSize: {
        BIGGER: 'bigger',
      },
      FontSizeRate: {
        SMALL: 'small',
        MEDIUM: 'medium',
      },
      FontWeightRate: {
        MEDIUM: 'medium',
      },
    },
    WALLET_TYPES: {
      Operation: {},
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    settingsStorage: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  });
});

vi.mock('@/utils/telegram', () => ({
  __esModule: true,
  tmaSdkService: {
    shareLink: shareLinkSpy,
  },
}));

vi.mock('@/api', () => ({
  __esModule: true,
  getFullBaseUrl: () => 'https://polkaswap.io/',
  getRouterMode: () => '',
}));

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    push: vi.fn(),
  },
  lazyView: () => ({
    name: 'LazyViewStub',
    template: '<div class="lazy-view-stub" />',
  }),
  lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

const loadingRef = ref(false);

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: loadingRef,
    withApi: async <T>(handler: () => Promise<T>) => handler(),
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  __esModule: true,
  useInternalConnect: () => ({
    connectSoraWallet: connectSpy,
    isLoggedIn: computed(() => loginState.value),
  }),
}));

const copySpy = vi.fn();

vi.mock('@/composables/useCopyAddress', () => ({
  __esModule: true,
  useCopyAddress: () => ({
    handleCopyAddress: copySpy,
    copyTooltip: vi.fn(() => 'copy-tooltip'),
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    Zero: FPNumber.ZERO,
    formatCodecNumber: (value: string) => value,
    getAssetFiatPrice: () => '1',
    getFiatAmountByFPNumber: () => '10',
    getFiatAmountByCodecString: () => '5',
    getFPNumberFromCodec: (value: string) => FPNumber.fromCodecValue(value ?? '0'),
  }),
}));

const ReferralProgram = (await import('@/views/ReferralProgram.vue')).default;

const buildWrapper = () =>
  mount(ReferralProgram, {
    global: {
      stubs: {
        's-button': {
          name: 'SButtonStub',
          inheritAttrs: false,
          emits: ['click'],
          template: '<button class="s-button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
        },
        SButton: {
          name: 'SButtonStub',
          inheritAttrs: false,
          emits: ['click'],
          template: '<button class="s-button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
        },
        's-collapse': {
          template: '<div class="collapse-stub"><slot /></div>',
        },
        's-collapse-item': {
          template: '<div class="collapse-item-stub"><slot name="title" /><slot /></div>',
        },
        's-pagination': {
          template: '<div class="pagination-stub" />',
        },
        's-input': {
          emits: ['update:modelValue'],
          props: ['modelValue'],
          template:
            '<div class="input-stub"><input class="input-stub-native" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot name="right" /></div>',
        },
        's-card': {
          template: '<section class="card-stub"><slot /></section>',
        },
        's-icon': {
          template: '<i class="icon-stub" />',
        },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('ReferralProgram.vue', () => {
  beforeEach(() => {
    loginState.value = false;
    connectSpy.mockClear();
    copySpy.mockClear();
    shareLinkSpy.mockClear();
    subscribeOnInvitedUsers.mockClear();
    getAccountReferralRewards.mockClear();
    getReferrer.mockClear();
    subscribeOnReferrer.mockClear();
    resetReferrals.mockClear();
    unsubscribeFromInvitedUsers.mockClear();
    resetReferrerSubscription.mockClear();
    setStorageReferrer.mockClear();
    storeStub.state.referrals.referralRewards = {
      rewards: FPNumber.ZERO,
      invitedUserRewards: {},
    };
    storeStub.state.referrals.referrer = '';
    storeStub.state.settings.isTMA = false;
    storeStub.state.settings.telegramBotUrl = null;
    storeStub.state.wallet.settings.networkFees = {
      ReferralSetInvitedUser: '1000000000000000000',
    };
  });

  it('shows connect prompt when logged out and triggers wallet connect', async () => {
    const wrapper = buildWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('connectWalletText');
    const connectButton = wrapper
      .findAllComponents({ name: 'SButtonStub' })
      .find((component) => component.classes().includes('connect-button'));

    expect(connectButton).toBeTruthy();
    connectButton!.vm.$emit('click');
    await flushPromises();
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('subscribes to referral data when logging in and unsubscribes on logout', async () => {
    loginState.value = true;
    const wrapper = buildWrapper();

    await flushPromises();

    expect(subscribeOnInvitedUsers).toHaveBeenCalled();
    expect(getAccountReferralRewards).toHaveBeenCalled();
    expect(getReferrer).toHaveBeenCalled();
    expect(subscribeOnReferrer).toHaveBeenCalled();

    loginState.value = false;
    await flushPromises();

    expect(unsubscribeFromInvitedUsers).toHaveBeenCalled();
    expect(resetReferrerSubscription).toHaveBeenCalled();

    wrapper.unmount();
    expect(resetReferrals).toHaveBeenCalledTimes(1);
  });

  it('persists referrer address when approved', async () => {
    loginState.value = true;
    const wrapper = buildWrapper();
    await flushPromises();

    wrapper.vm.referrerLinkOrCode = '5referrer';
    await flushPromises();

    await wrapper.vm.handleSetReferrer();
    expect(setStorageReferrer).toHaveBeenCalledWith('5referrer');
  });
});
