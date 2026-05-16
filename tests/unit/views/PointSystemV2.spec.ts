import { flushPromises, mount } from '@vue/test-utils';
import { FPNumber } from '@sora-substrate/sdk';
import { BalanceType, VXOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const subscribeOnList = vi.fn().mockResolvedValue(undefined);
const subscribeOnUpdates = vi.fn().mockResolvedValue(undefined);
const getAccountReferralRewards = vi.fn().mockResolvedValue(undefined);
const fetchAccountMetaMock = vi.fn();

const settingsStoreMock = {
  isWalletLoaded: true,
};

const walletStoreMock = {
  account: { address: '5mock' },
  accountAssets: [] as Array<any>,
  fiatPriceObject: {} as Record<string, string>,
};

const referralsStoreMock = {
  referralRewards: null as any,
  getAccountReferralRewards,
};

const poolStoreMock = {
  accountLiquidity: [] as Array<any>,
  subscribeOnAccountLiquidityList: subscribeOnList,
  subscribeOnAccountLiquidityUpdates: subscribeOnUpdates,
};

const assetsStoreMock = {
  assetDataByAddress: vi.fn((address?: string) => ({
    address: address ?? '0x00',
    symbol: (address ?? 'asset').toUpperCase(),
    decimals: 18,
    balance: {
      transferable: '0',
    },
  })),
};

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/stores/referrals', () => ({
  __esModule: true,
  useReferralsStore: () => referralsStoreMock,
}));

vi.mock('@/stores/pool', () => ({
  __esModule: true,
  usePoolStore: () => poolStoreMock,
}));

vi.mock('@/stores/assets', () => ({
  __esModule: true,
  useAssetsStore: () => assetsStoreMock,
}));

vi.mock('@/composables/useInternalConnect', () => ({
  __esModule: true,
  useInternalConnect: () => ({
    connectSoraWallet: connectSpy,
    isLoggedIn: computed(() => loginState.value),
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  __esModule: true,
  delay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/rewards/components/point-system/PointCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'PointCardStub',
    template: '<div class="point-card-stub"><slot /></div>',
  },
}));

vi.mock('@/features/rewards/components/point-system/TaskCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'TaskCardStub',
    template: '<div class="task-card-stub"><slot /></div>',
  },
}));

vi.mock('@/features/rewards/components/point-system/FirstTxCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'FirstTxCardStub',
    template: '<div class="first-tx-card-stub"><slot /></div>',
  },
}));

vi.mock('@/indexer/queries/pointSystem', () => ({
  __esModule: true,
  fetchAccountMeta: fetchAccountMetaMock,
}));

const PointSystemV2 = (await import('@/features/rewards/pages/PointSystemV2Page.vue')).default;

type PointSystemV2Vm = InstanceType<typeof PointSystemV2> & {
  pointsForCards: Record<string, { points: number }>;
  loading: boolean;
  formattedTotalPoints: string;
};

const buildWrapper = () =>
  mount(PointSystemV2, {
    global: {
      stubs: {
        's-card': {
          template: '<div class="s-card"><slot /><slot name="header" /></div>',
        },
        's-button': {
          name: 'SButtonStub',
          emits: ['click'],
          template: '<button class="s-button" @click="$emit(\'click\')"><slot /></button>',
        },
        's-tabs': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div class="s-tabs"><slot /></div>',
        },
        's-tab': {
          template: '<div class="s-tab"><slot /></div>',
        },
        's-scrollbar': {
          template: '<div class="s-scrollbar"><slot /></div>',
        },
        's-divider': true,
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('PointSystemV2.vue', () => {
  beforeEach(() => {
    loginState.value = false;
    connectSpy.mockClear();
    subscribeOnList.mockClear();
    subscribeOnUpdates.mockClear();
    getAccountReferralRewards.mockClear();
    fetchAccountMetaMock.mockReset();

    referralsStoreMock.referralRewards = null;
    poolStoreMock.accountLiquidity = [];
    walletStoreMock.accountAssets = [];
    walletStoreMock.fiatPriceObject = {};
    walletStoreMock.account = { address: '5mock' };
    assetsStoreMock.assetDataByAddress.mockClear();
  });

  it('prompts the user to connect the wallet when logged out', async () => {
    const wrapper = buildWrapper();

    await flushPromises();

    expect(subscribeOnList).toHaveBeenCalledTimes(1);
    expect(subscribeOnUpdates).toHaveBeenCalledTimes(1);

    wrapper.findComponent({ name: 'SButtonStub' }).vm.$emit('click');
    await wrapper.vm.$nextTick();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.pointsForCards).toBeNull();
  });

  it('loads point-system data after the login state flips to true', async () => {
    const zero = FPNumber.ZERO;
    fetchAccountMetaMock.mockResolvedValue({
      createdAt: { timestamp: 1, block: 1 },
      points: [
        {
          version: 1,
          startedAtBlock: 1,
          bridge: { incomingUSD: zero, outgoingUSD: zero },
          fees: { amount: zero, amountUSD: zero },
          burned: { amount: zero, amountUSD: zero },
          kensetsu: { created: zero, closed: zero, amountUSD: zero },
          orderBook: { created: zero, closed: zero, amountUSD: zero },
          staking: { amount: zero, amountUSD: zero },
          governance: { votes: zero, amount: zero, amountUSD: zero },
        },
      ],
    });

    const wrapper = buildWrapper();

    await flushPromises();
    expect(fetchAccountMetaMock).not.toHaveBeenCalled();

    loginState.value = true;

    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(getAccountReferralRewards).toHaveBeenCalled();
    expect(fetchAccountMetaMock).toHaveBeenCalledWith('5mock');
    expect(wrapper.vm.pointsForCards).not.toBeNull();
    expect(wrapper.vm.totalPoints).toBeGreaterThanOrEqual(0);
  });

  it('does not block point loading on long-lived account liquidity subscriptions', async () => {
    loginState.value = true;
    subscribeOnList.mockReturnValueOnce(new Promise(() => undefined));
    fetchAccountMetaMock.mockResolvedValue({
      createdAt: { timestamp: 1, block: 1 },
      points: [],
    });

    const wrapper = buildWrapper();

    await flushPromises();

    expect(subscribeOnList).toHaveBeenCalledTimes(1);
    expect(fetchAccountMetaMock).toHaveBeenCalledWith('5mock');
    expect((wrapper.vm as unknown as PointSystemV2Vm).loading).toBe(false);
  });

  it('does not render a placeholder first-transaction date without point metadata', async () => {
    loginState.value = true;
    fetchAccountMetaMock.mockResolvedValue(null);

    const wrapper = buildWrapper();

    await flushPromises();

    expect(wrapper.vm.pointsForCards).toBeNull();
    expect(wrapper.find('.first-tx-card-stub').exists()).toBe(false);
  });

  it('keeps point progress in numeric fiat values instead of parsing formatted strings', async () => {
    loginState.value = true;
    walletStoreMock.fiatPriceObject = {
      [VXOR.address]: FPNumber.fromNatural('1', 18).toCodecString(),
    };
    walletStoreMock.accountAssets = [
      {
        address: VXOR.address,
        symbol: VXOR.symbol,
        decimals: 18,
        balance: {
          [BalanceType.Transferable]: FPNumber.fromNatural('2000', 18).toCodecString(),
        },
      },
    ];
    fetchAccountMetaMock.mockResolvedValue({
      createdAt: { timestamp: 1, block: 1 },
      points: [],
    });

    const wrapper = buildWrapper();

    await flushPromises();

    expect(wrapper.vm.pointsForCards?.VXORHoldings.currentProgress).toBe(2000);
  });

  it('formats large total point values for the dashboard header', async () => {
    const wrapper = buildWrapper();
    const vm = wrapper.vm as unknown as PointSystemV2Vm;

    vm.pointsForCards = {
      bridge: { points: 35000 },
      fees: { points: 450 },
    };
    await wrapper.vm.$nextTick();

    expect(vm.formattedTotalPoints).toBe('35,450');
  });
});
