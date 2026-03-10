import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const setDataFromLiquidity = vi.fn().mockResolvedValue(undefined);
const setAddressesToRemove = vi.fn();

const storeStub = {
  state: {
    pool: {
      accountLiquidity: [] as Array<any>,
    },
  },
  getters: {
    assets: {
      assetDataByAddress: (address?: string) => ({
        address,
        symbol: address?.toUpperCase() ?? '',
        decimals: 18,
      }),
    },
  },
  dispatch: {
    addLiquidity: {
      setDataFromLiquidity,
    },
  },
  commit: {
    removeLiquidity: {
      setAddresses: setAddressesToRemove,
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
  default: PoolInfoStub,
}));

const loadingRef = ref(false);

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: loadingRef,
    withApi: async <T>(handler: () => Promise<T>) => handler(),
  }),
}));

const SlotPassthroughStub = defineComponent({
  name: 'SlotPassthroughStub',
  setup(_, { slots }) {
    return () =>
      h(
        'div',
        { class: 'lazy-component-stub' },
        Object.keys(slots).flatMap((key) => slots[key]?.() ?? [])
      );
  },
});

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () => SlotPassthroughStub,
}));

vi.mock('@/modules/pool/router', () => ({
  __esModule: true,
  poolLazyComponent: () => ({
    template: '<div class="pool-lazy-component-stub" />',
  }),
}));

const InfoLineStub = defineComponent({
  name: 'InfoLineStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'info-line-stub' }, [slots['info-line-prefix']?.(), slots.default?.()]);
  },
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      InfoLine: InfoLineStub,
    },
  });
});

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

const PoolInfoStub = defineComponent({
  name: 'PoolInfoStub',
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'pool-info-stub' }, [
        slots.default?.(),
        h('div', { class: 'pool-info-buttons' }, slots.buttons?.()),
      ]);
  },
});

const mountPoolView = () =>
  mount(Pool, {
    global: {
      stubs: {
        'generic-page-header': {
          template: '<div class="header-stub" />',
        },
        'pair-token-logo': {
          template: '<div class="pair-logo-stub" />',
        },
        'pool-info': PoolInfoStub,
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
    storeStub.state.pool.accountLiquidity = [];
  });

  it('prompts the user to connect when logged out', async () => {
    const wrapper = mountPoolView();
    await flushPromises();

    expect(wrapper.find('.pool-empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('pool.connectToWallet');
    expect(wrapper.find('.pool-empty-state__action').text()).toContain('connectWalletText');
    await (wrapper.vm as any).connectSoraWallet();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('shows empty liquidity message when logged in without pools', async () => {
    loginState.value = true;
    const wrapper = mountPoolView();
    await flushPromises();

    expect(wrapper.find('.pool-empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('pool.liquidityNotFound');
    expect(wrapper.find('.pool-empty-state__action').text()).toContain('pool.addLiquidity');
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
    expect(setDataFromLiquidity).toHaveBeenCalledWith({ firstAddress: XOR.address, secondAddress: '' });
  });
});
