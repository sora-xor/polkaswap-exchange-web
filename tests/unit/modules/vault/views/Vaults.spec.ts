import { flushPromises, mount } from '@vue/test-utils';
import { BreakpointClass } from '@/consts/layout';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const setCollateralSpy = vi.fn().mockResolvedValue(undefined);
const setDebtSpy = vi.fn().mockResolvedValue(undefined);
const routerPushSpy = vi.fn();

const storeStub = {
  state: {
    vault: {
      accountVaults: [] as Array<any>,
      closedAccountVaults: [] as Array<any>,
      collaterals: {} as Record<string, any>,
      averageCollateralPrices: {} as Record<string, any>,
    },
    settings: {
      screenBreakpointClass: BreakpointClass.Desktop,
      windowWidth: 1280,
    },
  },
  getters: {
    assets: {
      assetDataByAddress: (address?: string) =>
        address
          ? {
              address,
              symbol: address.toUpperCase(),
              decimals: 18,
              balance: {},
            }
          : null,
    },
    vault: {
      getBorrowTax: () => 0,
    },
  },
  dispatch: {
    vault: {
      setCollateralTokenAddress: setCollateralSpy,
      setDebtTokenAddress: setDebtSpy,
    },
  },
};

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

const paginationButtonsStub = {
  Prev: 'prev',
  Next: 'next',
  First: 'first',
  Last: 'last',
};

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      TokenLogo: SlotPassthroughStub,
      FormattedAmount: SlotPassthroughStub,
      ExternalLink: SlotPassthroughStub,
      HistoryPagination: SlotPassthroughStub,
    },
    WALLET_CONSTS: {
      PaginationButton: paginationButtonsStub,
    },
    api: {
      kensetsu: {
        serializeKey: (locked: string, debt: string) => `${locked}-${debt}`,
      },
    },
  });
});

vi.mock('@/store', () => ({
  __esModule: true,
  default: storeStub,
}));

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    push: routerPushSpy,
  },
  lazyComponent: () => SlotPassthroughStub,
}));

vi.mock('@/modules/vault/router', () => ({
  __esModule: true,
  vaultLazyComponent: () => SlotPassthroughStub,
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
    TranslationConsts: {
      LTV: 'kensetsu.ltv',
    },
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  __esModule: true,
  useInternalConnect: () => ({
    connectSoraWallet: connectSpy,
    isLoggedIn: computed(() => loginState.value),
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    Zero: {
      toLocaleString: () => '0',
      mul: () => ({
        mul: () => ({ div: () => ({ sub: () => ({ mul: () => ({ isFinity: () => true }) }) }) }),
      }),
      dp: () => ({
        toLocaleString: () => '0',
      }),
    },
    formatCodecNumber: (value: string) => value,
    formatStringValue: (value: string) => value,
    getFiatAmountByFPNumber: () => '0',
    getFiatAmountByCodecString: () => '0',
  }),
}));

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

const VaultsView = (await import('@/modules/vault/views/Vaults.vue')).default;

const mountVaults = () =>
  mount(VaultsView, {
    global: {
      stubs: {
        's-row': SlotPassthroughStub,
        's-col': SlotPassthroughStub,
        's-button': SButtonStub,
        SButton: SButtonStub,
        's-card': SlotPassthroughStub,
        's-divider': SlotPassthroughStub,
        's-tooltip': SlotPassthroughStub,
        'pair-token-logo': SlotPassthroughStub,
        'formatted-amount': SlotPassthroughStub,
        'history-pagination': SlotPassthroughStub,
        'responsive-tabs': SlotPassthroughStub,
        'explore-overall-stats': SlotPassthroughStub,
        'explore-collaterals': SlotPassthroughStub,
        'position-status': SlotPassthroughStub,
        'generic-page-header': SlotPassthroughStub,
        'external-link': SlotPassthroughStub,
        's-icon': SlotPassthroughStub,
        's-row-col': SlotPassthroughStub,
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('Vaults.vue', () => {
  beforeEach(() => {
    loginState.value = false;
    connectSpy.mockClear();
    setCollateralSpy.mockClear();
    setDebtSpy.mockClear();
    routerPushSpy.mockClear();
    storeStub.state.vault.accountVaults = [];
    storeStub.state.vault.closedAccountVaults = [];
    storeStub.state.vault.collaterals = {};
    storeStub.state.vault.averageCollateralPrices = {};
  });

  it('prompts to connect and exposes connect handler', async () => {
    const wrapper = mountVaults();
    await flushPromises();

    expect(wrapper.text()).toContain('connectWalletText');
    await (wrapper.vm as any).connectSoraWallet();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('opens create vault dialog via exposed handler', async () => {
    const wrapper = mountVaults();
    await flushPromises();

    expect((wrapper.vm as any).showCreateVaultDialog).toBe(false);
    await (wrapper.vm as any).handleCreateVault();

    expect((wrapper.vm as any).showCreateVaultDialog).toBe(true);
  });

  it('dispatches collateral and debt selection when reopening a vault', async () => {
    loginState.value = true;
    const wrapper = mountVaults();
    await flushPromises();

    const lockedAsset = { address: 'locked', symbol: 'LOCK' } as any;
    const debtAsset = { address: 'debt', symbol: 'DEBT' } as any;

    await (wrapper.vm as any).handleCreateSelectedVault(lockedAsset, debtAsset);

    expect(setCollateralSpy).toHaveBeenCalledWith('locked');
    expect(setDebtSpy).toHaveBeenCalledWith('debt');
    expect((wrapper.vm as any).showCreateVaultDialog).toBe(true);
  });

  it('navigates to vault details', async () => {
    const wrapper = mountVaults();
    await flushPromises();

    await (wrapper.vm as any).handleOpenVaultDetails({ id: 42 });
    expect(routerPushSpy).toHaveBeenCalledWith({ name: 'VaultDetails', params: { vault: '42' } });
  });
});
