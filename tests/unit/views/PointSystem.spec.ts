import { flushPromises, mount } from '@vue/test-utils';
import { FPNumber } from '@sora-substrate/sdk';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const getAccountReferralRewards = vi.fn().mockResolvedValue(undefined);
const subscribeOnList = vi.fn().mockResolvedValue(undefined);
const subscribeOnUpdates = vi.fn().mockResolvedValue(undefined);
const fetchBurnXorDataMock = vi.fn();
const fetchBridgeDataMock = vi.fn();
const fetchCountMock = vi.fn();

const storeStub = {
  state: {
    settings: {
      isWalletLoaded: true,
    },
    referrals: {
      referralRewards: {
        rewards: FPNumber.ZERO,
        invitedUserRewards: {},
      },
    },
    wallet: {
      settings: {
        blockNumber: 100,
        networkFees: {
          Swap: '1000000000000000000',
          EthBridgeOutgoing: '500000000000000000',
          AddLiquidity: '700000000000000000',
          RemoveLiquidity: '400000000000000000',
        },
      },
      account: {
        accountAssets: [],
        fiatPriceObject: {
          '0xbridge': '1000000000000000000',
          xor: '1000000000000000000',
        },
      },
    },
    pool: {
      accountLiquidity: [],
    },
  },
  getters: {
    libraryTheme: 'dark',
    wallet: {
      account: {
        account: { address: '5mock' },
      },
      settings: {
        currencySymbol: '$',
      },
    },
    assets: {
      xor: {
        address: 'xor',
        symbol: 'XOR',
        decimals: 18,
      },
    },
  },
  dispatch: {
    referrals: {
      getAccountReferralRewards,
    },
    pool: {
      subscribeOnAccountLiquidityList: subscribeOnList,
      subscribeOnAccountLiquidityUpdates: subscribeOnUpdates,
    },
  },
  commit: {},
};

vi.mock('@/store', () => ({
  __esModule: true,
  default: storeStub,
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    WALLET_CONSTS: {
      FontSizeRate: { MEDIUM: 'MEDIUM' },
      FontWeightRate: { MEDIUM: 'MEDIUM' },
      LogoSize: { SMALL: 'SMALL' },
    },
  });
});

vi.mock('@wallet/src/util', () => ({
  __esModule: true,
  delay: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/indexer/queries/burnXor', () => ({
  __esModule: true,
  fetchData: fetchBurnXorDataMock,
}));

vi.mock('@/indexer/queries/pointSystem', () => ({
  __esModule: true,
  fetchBridgeData: fetchBridgeDataMock,
  fetchCount: fetchCountMock,
  CountType: {
    Swap: 'swap',
    PoolDeposit: 'poolDeposit',
    PoolWithdraw: 'poolWithdraw',
  },
}));

const PointSystem = (await import('@/views/PointSystem.vue')).default;

const buildWrapper = () =>
  mount(PointSystem, {
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
        's-divider': true,
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('PointSystem.vue', () => {
  beforeEach(() => {
    loginState.value = false;
    connectSpy.mockClear();
    getAccountReferralRewards.mockClear();
    subscribeOnList.mockClear();
    subscribeOnUpdates.mockClear();
    fetchBurnXorDataMock.mockReset();
    fetchBridgeDataMock.mockReset();
    fetchCountMock.mockReset();

    storeStub.state.referrals.referralRewards = {
      rewards: FPNumber.ZERO,
      invitedUserRewards: {},
    };
    storeStub.getters.wallet.account.account = { address: '5mock' };
  });

  it('offers wallet connection controls while logged out', async () => {
    const wrapper = buildWrapper();

    await flushPromises();

    expect(getAccountReferralRewards).not.toHaveBeenCalled();

    wrapper.findComponent({ name: 'SButtonStub' }).vm.$emit('click');
    await wrapper.vm.$nextTick();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as any).bridgeData).toHaveLength(0);
  });

  it('fetches point metrics when the wallet logs in', async () => {
    const one = FPNumber.ONE;

    fetchBurnXorDataMock.mockResolvedValue([{ amount: one }, { amount: one }]);

    fetchBridgeDataMock.mockResolvedValue([
      { amount: one, assetId: '0xbridge', type: 'incoming' },
      { amount: one, assetId: '0xbridge', type: 'outgoing' },
    ]);

    fetchCountMock.mockImplementation(async (_start, _end, _account, type) => {
      if (type === 'swap') return 10;
      if (type === 'poolDeposit') return 4;
      if (type === 'poolWithdraw') return 2;
      return 0;
    });

    const wrapper = buildWrapper();

    await flushPromises();
    expect(fetchBurnXorDataMock).not.toHaveBeenCalled();

    loginState.value = true;

    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(getAccountReferralRewards).toHaveBeenCalled();
    expect(fetchBurnXorDataMock).toHaveBeenCalledWith(0, 100, '5mock');
    expect(fetchBridgeDataMock).toHaveBeenCalled();
    expect(fetchCountMock).toHaveBeenCalledWith(0, 100, '5mock', 'swap');
    expect(fetchCountMock).toHaveBeenCalledWith(0, 100, '5mock', 'poolDeposit');
    expect(fetchCountMock).toHaveBeenCalledWith(0, 100, '5mock', 'poolWithdraw');

    const vm = wrapper.vm as any;
    expect(vm.bridgeData).toHaveLength(2);
    expect(vm.totalBridgeTxs).toBe(2);
    expect(vm.totalPoolTxs).toBe(6);
    expect(vm.totalSwapTxs).toBe(10);
    expect(vm.xorBurned.amount).not.toBeUndefined();
  });
});
