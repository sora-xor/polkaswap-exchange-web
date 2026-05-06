import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { computed, defineComponent, h, ref } from 'vue';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const setDataFromLiquidity = vi.fn().mockResolvedValue(undefined);
const setAddressesToRemove = vi.fn();
const assetLookup: Record<string, any> = {};
const poolStoreMock = {
  accountLiquidity: [] as Array<any>,
  setAddLiquidityDataFromLiquidity: setDataFromLiquidity,
  setRemoveLiquidityAddresses: setAddressesToRemove,
};

vi.mock('@/stores/assets', () => ({
  __esModule: true,
  useAssetsStore: () => ({
    assetDataByAddress: (address?: string) => (address ? (assetLookup[address] ?? null) : null),
  }),
}));

vi.mock('@/stores/pool', () => ({
  __esModule: true,
  usePoolStore: () => poolStoreMock,
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

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    formatCodecNumber: (value: string) => `formatted-${value}`,
    formatStringValue: (value: string) => `formatted-${value}`,
    getFiatAmountByCodecString: () => '10',
  }),
}));

vi.mock('@/modules/pool/composables/usePoolApy', () => ({
  __esModule: true,
  usePoolApy: () => ({
    getPoolApyFormatted: () => '15%',
  }),
}));

vi.mock('@/components/shared/PoolInfo.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'PoolInfoStub',
    template: '<div class="pool-info-stub"><slot /><div class="pool-info-buttons"><slot name="buttons" /></div></div>',
  },
}));

vi.mock('@/components/shared/GenericPageHeader.vue', () => ({
  __esModule: true,
  default: {
    name: 'GenericPageHeaderStub',
    template: '<div class="header-stub" />',
  },
}));

vi.mock('@/components/shared/PairTokenLogo.vue', () => ({
  __esModule: true,
  default: {
    name: 'PairTokenLogoStub',
    template: '<div class="pair-logo-stub" />',
  },
}));

vi.mock('@/modules/pool/components/AddLiquidity/Dialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'AddLiquidityDialogStub',
    template: '<div class="add-dialog-stub" />',
  },
}));

vi.mock('@/modules/pool/components/RemoveLiquidity/Dialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'RemoveLiquidityDialogStub',
    template: '<div class="remove-dialog-stub" />',
  },
}));

const loadingRef = ref(false);

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: loadingRef,
    withApi: async <T>(handler: () => Promise<T>) => handler(),
  }),
}));

const InfoLineStub = defineComponent({
  name: 'InfoLineStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'info-line-stub' }, [slots['info-line-prefix']?.(), slots.default?.()]);
  },
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  default: InfoLineStub,
}));

const Pool = (await import('@/modules/pool/views/Pool.vue')).default;

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  inheritAttrs: false,
  emits: ['click'],
  setup(_, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          class: ['s-button', attrs.class],
          onClick: (event: MouseEvent) => emit('click', event),
        },
        slots.default?.()
      );
  },
});

const CollapseStub = defineComponent({
  name: 'SCollapseStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'collapse-stub' }, slots.default?.());
  },
});

const CollapseItemStub = defineComponent({
  name: 'SCollapseItemStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'collapse-item-stub' }, [slots.title?.(), slots.default?.()]);
  },
});

const mountPoolView = () =>
  mount(Pool, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'generic-page-header': {
          template: '<div class="header-stub" />',
        },
        'pair-token-logo': {
          template: '<div class="pair-logo-stub" />',
        },
        'add-liquidity-dialog': {
          template: '<div class="add-dialog-stub" />',
        },
        'remove-liquidity-dialog': {
          template: '<div class="remove-dialog-stub" />',
        },
        's-button': SButtonStub,
        SButton: SButtonStub,
        's-collapse': CollapseStub,
        's-collapse-item': CollapseItemStub,
        'info-line': {
          template: '<div class="info-line-stub"><slot name="info-line-prefix" /><slot /></div>',
        },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('Pool.vue', () => {
  beforeEach(() => {
    loginState.value = false;
    connectSpy.mockClear();
    setDataFromLiquidity.mockClear();
    setAddressesToRemove.mockClear();
    poolStoreMock.accountLiquidity = [];
    Object.keys(assetLookup).forEach((key) => delete assetLookup[key]);
    assetLookup[XOR.address] = {
      address: XOR.address,
      symbol: 'XOR',
      name: 'XOR',
      decimals: 18,
    };
    assetLookup['addr-1'] = {
      address: 'addr-1',
      symbol: 'ADDR-1',
      name: 'Asset 1',
      decimals: 18,
    };
    assetLookup['addr-2'] = {
      address: 'addr-2',
      symbol: 'ADDR-2',
      name: 'Asset 2',
      decimals: 18,
    };
  });

  it('prompts the user to connect when logged out', async () => {
    const wrapper = mountPoolView();
    await flushPromises();

    expect(wrapper.find('.pool-empty-state').exists()).toBe(false);
    expect(wrapper.find('.pool-info-container--empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('pool.connectToWallet');
    const actionButton = wrapper.findAll('button').find((button) => button.text().includes('connectWalletText'));
    expect(actionButton).toBeDefined();
    expect(actionButton?.classes()).not.toContain('el-button--add-liquidity');
    expect(actionButton?.classes()).toContain('s-typography-button--large');
    await actionButton?.trigger('click');

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('shows empty liquidity message when logged in without pools', async () => {
    loginState.value = true;
    const wrapper = mountPoolView();
    await flushPromises();

    expect(wrapper.find('.pool-empty-state').exists()).toBe(false);
    expect(wrapper.find('.pool-info-container--empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('pool.liquidityNotFound');
    expect(wrapper.find('[data-test-name="addLiquidity"]').text()).toContain('pool.addLiquidity');
  });

  it('triggers add and remove actions for existing liquidity', async () => {
    loginState.value = true;
    const wrapper = mountPoolView();
    await flushPromises();

    const vm = wrapper.vm as any;
    const item = {
      firstAsset: { address: 'addr-1' },
      secondAsset: { address: 'addr-2' },
    } as any;

    vm.handleAddLiquidity(item);
    expect(setDataFromLiquidity).toHaveBeenCalledWith({ firstAddress: 'addr-1', secondAddress: 'addr-2' });

    vm.handleRemoveLiquidity(item);
    expect(setAddressesToRemove).toHaveBeenCalledWith({ firstAddress: 'addr-1', secondAddress: 'addr-2' });

    vm.handleAddLiquidity();
    expect(setDataFromLiquidity).toHaveBeenCalledWith({ firstAddress: '', secondAddress: '' });
  });

  it('renders liquidity rows even when a pool asset is missing from the asset registry', async () => {
    loginState.value = true;
    delete assetLookup['addr-unknown'];
    poolStoreMock.accountLiquidity = [
      {
        address: 'pool-1',
        firstAddress: XOR.address,
        secondAddress: 'addr-unknown',
        firstBalance: '100',
        secondBalance: '200',
        symbol: 'POOLXYK',
        decimals: 18,
        decimals2: 18,
        balance: '10',
        name: 'Pool XYK Token',
        poolShare: '25',
        reserveA: '1000',
        reserveB: '2000',
        totalSupply: '5000',
      },
    ];

    const wrapper = mountPoolView();
    await flushPromises();

    expect(wrapper.find('.pool-info-container--empty').exists()).toBe(false);
    expect(wrapper.find('.collapse-item-stub').exists()).toBe(true);
    expect(wrapper.text()).toContain('XOR-unknownAssetText');
  });
});
