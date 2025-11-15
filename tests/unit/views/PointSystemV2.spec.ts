import { flushPromises, mount } from '@vue/test-utils';
import { FPNumber } from '@sora-substrate/sdk';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const subscribeOnList = vi.fn().mockResolvedValue(undefined);
const subscribeOnUpdates = vi.fn().mockResolvedValue(undefined);
const getAccountReferralRewards = vi.fn().mockResolvedValue(undefined);
const fetchAccountMetaMock = vi.fn();

const storeStub = {
  state: {
    settings: {
      isWalletLoaded: true,
    },
    referrals: {
      referralRewards: null,
    },
    wallet: {
      account: {
        accountAssets: [] as Array<any>,
        fiatPriceObject: {} as Record<string, string>,
      },
    },
    pool: {
      accountLiquidity: [] as Array<any>,
    },
  },
  getters: {
    wallet: {
      account: {
        account: { address: '5mock' },
      },
    },
    assets: {
      assetDataByAddress: (address?: string) => ({
        address: address ?? '0x00',
        symbol: (address ?? 'asset').toUpperCase(),
        decimals: 18,
        balance: {
          transferable: '0',
        },
      }),
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
  commit: {
    wallet: {
      settings: {},
    },
  },
};

vi.mock('@/store', () => ({
  __esModule: true,
  default: storeStub,
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

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@wallet/src/util', () => ({
  __esModule: true,
  delay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () => ({
    name: 'LazyComponentStub',
    template: '<div class="lazy-component-stub"><slot /></div>',
  }),
}));

vi.mock('@/indexer/queries/pointSystem', () => ({
  __esModule: true,
  fetchAccountMeta: fetchAccountMetaMock,
}));

const PointSystemV2 = (await import('@/views/PointSystemV2.vue')).default;

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

    storeStub.state.referrals.referralRewards = null;
    storeStub.state.wallet.account.accountAssets = [];
    storeStub.state.wallet.account.fiatPriceObject = {};
    storeStub.state.pool.accountLiquidity = [];
    storeStub.getters.wallet.account.account = { address: '5mock' };
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
});
