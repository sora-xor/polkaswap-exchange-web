import { flushPromises, shallowMount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const connectSoraWalletMock = vi.fn();
const showAppNotificationMock = vi.fn();
const withNotificationsMock = vi.fn(async (handler: () => unknown) => {
  await handler();
});
const subscriptionsLoadingRef = ref(false);
const loadingRef = ref(false);
const isLoggedInRef = ref(false);
const soraAddressRef = ref('sora-address');
const evmAddressRef = ref('');

const setSelectedRewardsMock = vi.fn().mockResolvedValue(undefined);
const getExternalRewardsMock = vi.fn().mockResolvedValue(undefined);
const claimRewardsMock = vi.fn().mockResolvedValue(undefined);
const subscribeOnRewardsMock = vi.fn().mockResolvedValue(undefined);
const unsubscribeFromRewardsMock = vi.fn().mockResolvedValue(undefined);
const resetRewardsMock = vi.fn();
const checkAccountIsConnectedMock = vi.fn().mockResolvedValue(true);

const storeStub = {
  state: {
    rewards: {
      feeFetching: false,
      rewardsFetching: false,
      rewardsClaiming: false,
      transactionError: false,
      transactionStep: 1,
      receivedRewards: [] as any[],
      fee: '0',
      vestedRewards: null,
      crowdloanRewards: {} as Record<string, any[]>,
      internalRewards: null as any,
      externalRewards: [] as any[],
      selectedVested: null,
      selectedInternal: null,
      selectedExternal: [] as any[],
      selectedCrowdloan: {} as Record<string, any[]>,
    },
    wallet: {
      account: {
        address: soraAddressRef.value,
        fiatPriceObject: {},
      },
    },
    settings: {
      windowWidth: 1280,
      nodeIsConnected: true,
    },
  },
  getters: {
    assets: {
      xor: {
        address: 'xor',
        symbol: 'XOR',
        decimals: 18,
        balance: {
          transferable: '0',
        },
      },
    },
    rewards: {
      rewardsAvailable: false,
      externalRewardsAvailable: false,
      externalRewardsSelected: false,
      internalRewardsAvailable: false,
      vestedRewardsAvailable: false,
      rewardsByAssetsList: [] as any[],
    },
    libraryTheme: 'light',
  },
  dispatch: {
    rewards: {
      setSelectedRewards: setSelectedRewardsMock,
      getExternalRewards: getExternalRewardsMock,
      claimRewards: claimRewardsMock,
      subscribeOnRewards: subscribeOnRewardsMock,
      unsubscribeFromRewards: unsubscribeFromRewardsMock,
    },
  },
  commit: {
    rewards: {
      reset: resetRewardsMock,
    },
  },
} as const;

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      InfoLine: { name: 'InfoLineStub', template: '<div><slot /></div>' },
      FormattedAddress: { name: 'FormattedAddressStub', template: '<div><slot /></div>' },
    },
    groupRewardsByAssetsList: (list: unknown[]) => list,
  });
});

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    name: 'LazyComponentStub',
    template: '<div><slot /></div>',
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    tc: (key: string, count: number) => `${key}:${count}`,
    tOrdinal: (value: number | string) => `${value}`,
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    soraAddress: soraAddressRef,
    isLoggedIn: isLoggedInRef,
    connectSoraWallet: connectSoraWalletMock,
  }),
}));

vi.mock('@/composables/useWalletConnect', () => ({
  useWalletConnect: () => ({
    evmProvider: ref(null),
    evmAddress: evmAddressRef,
    connectEvmWallet: vi.fn(),
    disconnectEvmWallet: vi.fn(),
    disconnectExternalNetwork: vi.fn(),
    getEvmProviderIcon: vi.fn(),
  }),
}));

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({
    showAppNotification: showAppNotificationMock,
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: loadingRef,
    withNotifications: withNotificationsMock,
  }),
}));

vi.mock('@/composables/useSubscriptions', () => ({
  useSubscriptions: (options: { startSubscriptions?: Array<() => Promise<unknown> | unknown> } = {}) => {
    options.startSubscriptions?.forEach((fn) => void fn?.());

    return {
      subscriptionsDataLoading: subscriptionsLoadingRef,
      withApi: async (handler: () => unknown) => {
        await handler();
      },
    };
  },
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatCodecNumber: (value: string) => value,
    getFiatAmountByCodecString: (value: string) => `fiat-${value}`,
  }),
}));

vi.mock('@/utils', () => ({
  hasInsufficientXorForFee: () => false,
}));

vi.mock('@/utils/ethers-util', () => ({
  __esModule: true,
  default: {
    checkAccountIsConnected: (...args: unknown[]) =>
      checkAccountIsConnectedMock(...(args as Parameters<typeof checkAccountIsConnectedMock>)),
  },
}));

vi.mock('@/store', () => ({
  default: storeStub,
}));

let RewardsView: (typeof import('@/views/Rewards.vue'))['default'];

beforeAll(async () => {
  RewardsView = (await import('@/views/Rewards.vue')).default;
});

const mountComponent = () =>
  shallowMount(RewardsView, {
    global: {
      stubs: {
        RewardsGradientBox: { template: '<div><slot /></div>' },
        RewardsAmountHeader: { template: '<div><slot /></div>' },
        RewardsAmountTable: { template: '<div><slot /></div>' },
        GenericPageHeader: { template: '<div><slot /></div>' },
        TokensRow: { template: '<div><slot /></div>' },
        SelectProviderDialog: { template: '<div><slot /></div>' },
        's-button': { template: '<button><slot /></button>' },
        's-card': { template: '<div><slot /></div>' },
        's-divider': { template: '<div><slot /></div>' },
        's-icon': { template: '<i />' },
        'el-checkbox-group': { template: '<div><slot /></div>' },
        'el-checkbox': { template: '<div><slot /></div>' },
      },
    },
  });

describe('Rewards.vue', () => {
  beforeEach(() => {
    isLoggedInRef.value = false;
    soraAddressRef.value = 'sora-address';
    evmAddressRef.value = '';
    loadingRef.value = false;
    subscriptionsLoadingRef.value = false;
    connectSoraWalletMock.mockClear();
    showAppNotificationMock.mockClear();
    withNotificationsMock.mockClear();
    setSelectedRewardsMock.mockClear();
    getExternalRewardsMock.mockClear();
    claimRewardsMock.mockClear();
    subscribeOnRewardsMock.mockClear();
    unsubscribeFromRewardsMock.mockClear();
    resetRewardsMock.mockClear();
    checkAccountIsConnectedMock.mockClear();

    Object.assign(storeStub.state.rewards, {
      feeFetching: false,
      rewardsFetching: false,
      rewardsClaiming: false,
      transactionError: false,
      transactionStep: 1,
      receivedRewards: [],
      fee: '0',
      vestedRewards: null,
      crowdloanRewards: {},
      internalRewards: null,
      externalRewards: [],
      selectedVested: null,
      selectedInternal: null,
      selectedExternal: [],
      selectedCrowdloan: {},
    });

    Object.assign(storeStub.getters.rewards, {
      rewardsAvailable: false,
      externalRewardsAvailable: false,
      externalRewardsSelected: false,
      internalRewardsAvailable: false,
      vestedRewardsAvailable: false,
      rewardsByAssetsList: [],
    });
  });

  it('connects SORA wallet when user is not logged in', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await (wrapper.vm as any).handleAction();

    expect(connectSoraWalletMock).toHaveBeenCalledTimes(1);
    expect(claimRewardsMock).not.toHaveBeenCalled();
  });

  it('claims rewards when user is logged in and rewards are available', async () => {
    isLoggedInRef.value = true;
    storeStub.getters.rewards.rewardsAvailable = true;

    const wrapper = mountComponent();
    await flushPromises();

    await (wrapper.vm as any).handleAction();

    expect(claimRewardsMock).toHaveBeenCalledTimes(1);
    expect(claimRewardsMock).toHaveBeenCalledWith({
      internalAddress: 'sora-address',
      externalAddress: '',
    });
  });

  it('updates selected internal rewards through computed setter', async () => {
    storeStub.state.rewards.internalRewards = { amount: '1' } as any;
    storeStub.getters.rewards.internalRewardsAvailable = true;

    const wrapper = mountComponent();
    await flushPromises();

    (wrapper.vm as any).selectedInternalRewardsModel = true;
    await flushPromises();

    expect(setSelectedRewardsMock).toHaveBeenCalledWith({
      selectedInternal: storeStub.state.rewards.internalRewards,
    });
  });

  it('fetches external rewards when EVM address changes', async () => {
    isLoggedInRef.value = true;

    const wrapper = mountComponent();
    await flushPromises();
    getExternalRewardsMock.mockClear();

    evmAddressRef.value = '0x123';
    await flushPromises();

    expect(getExternalRewardsMock).toHaveBeenCalledWith('0x123');
  });
});
