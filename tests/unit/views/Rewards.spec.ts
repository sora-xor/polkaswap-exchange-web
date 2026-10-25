import { FPNumber } from '@sora-substrate/sdk';
import { KnownAssets, KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
const connectEvmWalletMock = vi.fn();
const evmProviderRef = ref(null);

const setSelectedRewardsMock = vi.fn().mockResolvedValue(undefined);
const getExternalRewardsMock = vi.fn().mockResolvedValue(undefined);
const claimRewardsMock = vi.fn().mockResolvedValue(undefined);
const subscribeOnRewardsMock = vi.fn().mockResolvedValue(undefined);
const unsubscribeFromRewardsMock = vi.fn().mockResolvedValue(undefined);
const resetRewardsMock = vi.fn();
const checkAccountIsConnectedMock = vi.fn().mockResolvedValue(true);
const subscribeOnFiatPriceMock = vi.fn().mockResolvedValue(undefined);

const rewardsStoreMock = reactive({
  feeFetching: false,
  rewardsFetching: false,
  rewardsClaiming: false,
  transactionError: false,
  transactionStep: 1,
  receivedRewards: [] as any[],
  fee: '0',
  vestedRewards: null as any,
  crowdloanRewards: {} as Record<string, any[]>,
  internalRewards: null as any,
  externalRewards: [] as any[],
  selectedVested: null as any,
  selectedInternal: null as any,
  selectedExternal: [] as any[],
  selectedCrowdloan: {} as Record<string, any[]>,
  rewardsAvailable: false,
  externalRewardsAvailable: false,
  externalRewardsSelected: false,
  internalRewardsAvailable: false,
  vestedRewardsAvailable: false,
  rewardsByAssetsList: [] as any[],
  setSelectedRewards: setSelectedRewardsMock,
  getExternalRewards: getExternalRewardsMock,
  claimRewards: claimRewardsMock,
  subscribeOnRewards: subscribeOnRewardsMock,
  unsubscribeFromRewards: unsubscribeFromRewardsMock,
  reset: resetRewardsMock,
});

const settingsStoreMock = {
  libraryTheme: 'light',
};

const assetsStoreMock = {
  xor: {
    address: 'xor',
    symbol: 'XOR',
    decimals: 18,
    balance: {
      transferable: '0',
    },
  },
};

const walletStoreMock = reactive({
  fiatPriceObject: {} as Record<string, string>,
  indexerType: 'polkaswap',
  indexers: {
    polkaswap: {
      endpoint: 'https://indexer.test/graphql',
    },
  },
  subscribeOnFiatPrice: subscribeOnFiatPriceMock,
});

vi.mock('@/stores/rewards', () => ({
  useRewardsStore: () => rewardsStoreMock,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreMock,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      InfoLine: { name: 'InfoLineStub', template: '<div><slot /></div>' },
      FormattedAddress: { name: 'FormattedAddressStub', template: '<div><slot /></div>' },
    },
  });
});

vi.mock('@/lib/soraneo-wallet/src/util', async () => {
  const actual = await vi.importActual<typeof import('@/lib/soraneo-wallet/src/util')>('@/lib/soraneo-wallet/src/util');

  return {
    ...actual,
    groupRewardsByAssetsList: (list: unknown[]) => list,
  };
});

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
    evmProvider: evmProviderRef,
    evmAddress: evmAddressRef,
    connectEvmWallet: connectEvmWalletMock,
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

let RewardsView: (typeof import('@/features/rewards/pages/RewardsPage.vue'))['default'];
const mountedWrappers: VueWrapper[] = [];
const ORIGINAL_DELIMITERS = { ...FPNumber.DELIMITERS_CONFIG };

beforeAll(async () => {
  RewardsView = (await import('@/features/rewards/pages/RewardsPage.vue')).default;
});

const mountComponent = () => {
  const wrapper = shallowMount(RewardsView, {
    global: {
      stubs: {
        RewardsGradientBox: { template: '<div><slot /></div>' },
        RewardsAmountHeader: { template: '<div><slot /></div>' },
        RewardsAmountTable: { template: '<div><slot /></div>' },
        GenericPageHeader: { template: '<div><slot /></div>' },
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

  mountedWrappers.push(wrapper);

  return wrapper;
};

describe('Rewards.vue', () => {
  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    Object.assign(FPNumber.DELIMITERS_CONFIG, ORIGINAL_DELIMITERS);
  });

  beforeEach(() => {
    isLoggedInRef.value = false;
    soraAddressRef.value = 'sora-address';
    evmAddressRef.value = '';
    evmProviderRef.value = null;
    loadingRef.value = false;
    subscriptionsLoadingRef.value = false;
    connectSoraWalletMock.mockClear();
    connectEvmWalletMock.mockClear();
    showAppNotificationMock.mockClear();
    withNotificationsMock.mockClear();
    setSelectedRewardsMock.mockClear();
    getExternalRewardsMock.mockClear();
    claimRewardsMock.mockClear();
    subscribeOnRewardsMock.mockClear();
    unsubscribeFromRewardsMock.mockClear();
    resetRewardsMock.mockClear();
    checkAccountIsConnectedMock.mockClear();
    subscribeOnFiatPriceMock.mockClear();

    Object.assign(rewardsStoreMock, {
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
      rewardsAvailable: false,
      externalRewardsAvailable: false,
      externalRewardsSelected: false,
      internalRewardsAvailable: false,
      vestedRewardsAvailable: false,
      rewardsByAssetsList: [],
    });

    settingsStoreMock.libraryTheme = 'light';
    assetsStoreMock.xor = {
      address: 'xor',
      symbol: 'XOR',
      decimals: 18,
      balance: {
        transferable: '0',
      },
    };
    walletStoreMock.fiatPriceObject = {};
    walletStoreMock.indexers.polkaswap.endpoint = 'https://indexer.test/graphql';
  });

  it('connects SORA wallet when user is not logged in', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('.rewards-empty-state').exists()).toBe(false);
    expect(wrapper.find('.rewards-hero__hint').text()).toBe('rewards.hint.connectAccounts');
    expect(wrapper.find('[data-test-name="LoginAndGet"]').exists()).toBe(true);

    await (wrapper.vm as any).handleAction();

    expect(connectSoraWalletMock).toHaveBeenCalledTimes(1);
    expect(claimRewardsMock).not.toHaveBeenCalled();
  });

  it('puts the connect action in the hero and explains the steps below it', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('.rewards-hero [data-test-name="LoginAndGet"]').exists()).toBe(true);
    expect(wrapper.find('.rewards-claim [data-test-name="LoginAndGet"]').exists()).toBe(false);
    expect(wrapper.find('.rewards-hero__title').text()).toBe('rewards.hero.connectTitle');
    expect(wrapper.findAll('.rewards-howto li').map((step) => step.text())).toEqual([
      'rewards.howTo.connect',
      'rewards.howTo.choose',
      'rewards.action.signAndClaim',
    ]);
    expect(wrapper.find('rewards-amount-table-stub').exists()).toBe(false);
    expect(wrapper.find('rewards-amount-header-stub').exists()).toBe(false);
  });

  it('moves the claim action under the claim list once the user is connected', async () => {
    isLoggedInRef.value = true;
    rewardsStoreMock.rewardsAvailable = true;

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('.rewards-claim [data-test-name="LoginAndGet"]').exists()).toBe(true);
    expect(wrapper.find('.rewards-hero [data-test-name="LoginAndGet"]').exists()).toBe(false);
    expect(wrapper.find('.rewards-claim .rewards-hint').exists()).toBe(true);
    expect(wrapper.find('.rewards-howto').exists()).toBe(false);
    expect(wrapper.find('.rewards-grid').classes()).not.toContain('rewards-grid--solo');
  });

  it('reports what the page is doing in the status pill', async () => {
    const status = async () => {
      const wrapper = mountComponent();
      await flushPromises();

      return [wrapper.find('.rewards-status').classes(), wrapper.find('.rewards-status').text()] as const;
    };

    expect(await status()).toEqual([expect.arrayContaining(['rewards-status--connect']), 'rewards.status.connect']);

    isLoggedInRef.value = true;
    expect(await status()).toEqual([expect.arrayContaining(['rewards-status--empty']), 'rewards.status.empty']);

    rewardsStoreMock.rewardsAvailable = true;
    expect(await status()).toEqual([expect.arrayContaining(['rewards-status--ready']), 'rewards.status.ready']);

    rewardsStoreMock.rewardsClaiming = true;
    expect(await status()).toEqual([expect.arrayContaining(['rewards-status--claiming']), 'rewards.claiming.pending']);

    rewardsStoreMock.rewardsClaiming = false;
    rewardsStoreMock.transactionError = true;
    expect(await status()).toEqual([expect.arrayContaining(['rewards-status--error']), 'rewards.status.failed']);

    rewardsStoreMock.transactionError = false;
    rewardsStoreMock.receivedRewards = [{ asset: { symbol: 'PSWAP', decimals: 18 }, amount: '1' }];
    expect(await status()).toEqual([expect.arrayContaining(['rewards-status--success']), 'rewards.claiming.success']);
  });

  it('shows claim progress instead of the claim list while a claim is running', async () => {
    isLoggedInRef.value = true;
    rewardsStoreMock.rewardsAvailable = true;
    rewardsStoreMock.rewardsClaiming = true;
    rewardsStoreMock.externalRewardsSelected = true;
    rewardsStoreMock.transactionStep = 2;

    const wrapper = mountComponent();
    await flushPromises();

    const steps = wrapper.find('rewards-claim-steps-stub');

    expect(steps.exists()).toBe(true);
    expect(steps.attributes('total')).toBe('2');
    expect(steps.attributes('current')).toBe('2');
    expect(steps.attributes('status')).toBe('pending');
    expect(wrapper.find('.rewards-claiming-text').text()).toBe('rewards.claiming.pending');
    expect(wrapper.find('.rewards-claim').exists()).toBe(false);
    expect(wrapper.find('[data-test-name="LoginAndGet"]').exists()).toBe(false);
    // Without the claim card the analytics take the full width instead of leaving the second column empty.
    expect(wrapper.find('.rewards-grid').classes()).toContain('rewards-grid--solo');
  });

  it('offers a retry after a failed claim and hides the stale "Claiming" headline', async () => {
    isLoggedInRef.value = true;
    rewardsStoreMock.rewardsAvailable = true;
    rewardsStoreMock.transactionError = true;
    rewardsStoreMock.transactionStep = 2;

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('rewards-claim-steps-stub').attributes('status')).toBe('error');
    expect(wrapper.find('.rewards-claiming-text').exists()).toBe(false);
    expect(wrapper.find('.rewards-claiming-text--transaction').text()).toBe(
      'rewards.transactions.failed:{"order":"2","total":1}'
    );

    const retry = wrapper.find('[data-test-name="LoginAndGet"]');

    expect(retry.exists()).toBe(true);
    expect(retry.text()).toBe('retryText');
    expect(wrapper.find('.rewards-grid').classes()).not.toContain('rewards-grid--solo');

    await (wrapper.vm as any).handleAction();

    expect(claimRewardsMock).toHaveBeenCalledTimes(1);
  });

  it('has no claim action once the rewards were received', async () => {
    isLoggedInRef.value = true;
    rewardsStoreMock.rewardsAvailable = true;
    rewardsStoreMock.receivedRewards = [{ asset: { symbol: 'PSWAP', decimals: 18 }, amount: '1' }];

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('rewards-claim-steps-stub').attributes('status')).toBe('done');
    expect(wrapper.find('.rewards-claiming-text').text()).toBe('rewards.claiming.success');
    expect(wrapper.find('[data-test-name="LoginAndGet"]').exists()).toBe(false);
    expect(wrapper.find('rewards-burst-stub').attributes('active')).toBe('true');
    expect(wrapper.find('.rewards-grid').classes()).toContain('rewards-grid--solo');
  });

  it('feeds the analytics cards and keeps the price card useful without rewards', async () => {
    isLoggedInRef.value = true;

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('rewards-breakdown-stub').attributes('connected')).toBe('true');
    expect(wrapper.find('rewards-vesting-stub').attributes('connected')).toBe('true');
    expect(wrapper.find('rewards-market-stub').exists()).toBe(true);
    expect(wrapper.find('rewards-reactor-stub').exists()).toBe(true);
  });

  it('hands the analytics cards the numbers it derives from the store', async () => {
    const pswap = KnownAssets.get(KnownSymbols.PSWAP);
    const codec = (value: number) => new FPNumber(value).toCodecString();

    isLoggedInRef.value = true;
    rewardsStoreMock.vestedRewardsAvailable = true;
    rewardsStoreMock.vestedRewards = { limit: codec(1000), total: codec(11000), rewards: [] };
    walletStoreMock.fiatPriceObject = { [pswap.address]: codec(2) };

    const wrapper = mountComponent();
    await flushPromises();

    const breakdown = wrapper.findComponent({ name: 'RewardsBreakdown' }).props('breakdown');
    const vesting = wrapper.findComponent({ name: 'RewardsVesting' }).props('vesting');

    expect(breakdown.segments.map(({ id, fiat }: any) => [id, fiat?.toString()])).toEqual([['strategic', '2000']]);
    expect(vesting.rows).toHaveLength(1);
    expect(vesting.rows[0].id).toBe('strategic');
    expect(vesting.rows[0].unlocked).toBeCloseTo(1000 / 11000, 3);
  });

  it('shows what is still locked with the delimiters of the app language', async () => {
    // The wallet amount component reads its value with these delimiters: `10000` would be read as 10, not 10,000.
    Object.assign(FPNumber.DELIMITERS_CONFIG, { thousand: '.', decimal: ',' });

    const pswap = KnownAssets.get(KnownSymbols.PSWAP);

    isLoggedInRef.value = true;
    rewardsStoreMock.vestedRewardsAvailable = true;
    rewardsStoreMock.vestedRewards = {
      limit: new FPNumber(1000).toCodecString(),
      total: new FPNumber(11000).toCodecString(),
      rewards: [],
    };
    walletStoreMock.fiatPriceObject = { [pswap.address]: new FPNumber(1).toCodecString() };

    const wrapper = mountComponent();
    await flushPromises();

    const locked = wrapper.findAll('.rewards-stat').find((stat) => stat.text().includes('rewards.stats.locked'));

    expect(locked?.find('formatted-amount-stub').attributes('value')).toBe('10.000');
  });

  it('claims rewards when user is logged in and rewards are available', async () => {
    isLoggedInRef.value = true;
    rewardsStoreMock.rewardsAvailable = true;

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
    rewardsStoreMock.internalRewards = { amount: '1' } as any;
    rewardsStoreMock.internalRewardsAvailable = true;

    const wrapper = mountComponent();
    await flushPromises();

    (wrapper.vm as any).selectedInternalRewardsModel = true;
    await flushPromises();

    expect(setSelectedRewardsMock).toHaveBeenCalledWith({
      selectedInternal: rewardsStoreMock.internalRewards,
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

  it('connects an Ethereum account without forwarding the click event as a provider', async () => {
    isLoggedInRef.value = true;

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('.rewards-connect-button').trigger('click');

    expect(connectEvmWalletMock).toHaveBeenCalledTimes(1);
    expect(connectEvmWalletMock).toHaveBeenCalledWith();
  });

  it('refreshes fiat prices when displayed reward assets are missing prices', async () => {
    isLoggedInRef.value = true;
    rewardsStoreMock.rewardsByAssetsList = [
      {
        asset: { address: 'pswap', symbol: 'PSWAP', decimals: 18 },
        amount: '1',
      },
    ];

    mountComponent();
    await flushPromises();

    expect(subscribeOnFiatPriceMock).toHaveBeenCalledTimes(1);
  });

  it('does not refresh fiat prices when displayed reward assets already have prices', async () => {
    isLoggedInRef.value = true;
    walletStoreMock.fiatPriceObject = { pswap: '1' };
    rewardsStoreMock.rewardsByAssetsList = [
      {
        asset: { address: 'pswap', symbol: 'PSWAP', decimals: 18 },
        amount: '1',
      },
    ];

    mountComponent();
    await flushPromises();

    expect(subscribeOnFiatPriceMock).not.toHaveBeenCalled();
  });

  it('waits for an indexer endpoint before refreshing reward fiat prices', async () => {
    isLoggedInRef.value = true;
    walletStoreMock.indexers.polkaswap.endpoint = '';
    rewardsStoreMock.rewardsByAssetsList = [
      {
        asset: { address: 'pswap', symbol: 'PSWAP', decimals: 18 },
        amount: '1',
      },
    ];

    mountComponent();
    await flushPromises();

    expect(subscribeOnFiatPriceMock).not.toHaveBeenCalled();

    walletStoreMock.indexers.polkaswap.endpoint = 'https://indexer.test/graphql';
    await flushPromises();

    expect(subscribeOnFiatPriceMock).toHaveBeenCalledTimes(1);
  });
});
