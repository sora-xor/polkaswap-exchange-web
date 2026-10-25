import { FPNumber } from '@sora-substrate/math';
import { flushPromises, mount } from '@vue/test-utils';
import { BreakpointClass } from '@/consts/layout';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const setCollateralSpy = vi.fn().mockResolvedValue(undefined);
const setDebtSpy = vi.fn().mockResolvedValue(undefined);
const routerPushSpy = vi.fn();

const defaultAssetDataByAddress = (address?: string) =>
  address
    ? {
        address,
        symbol: address.toUpperCase(),
        decimals: 18,
        balance: {},
      }
    : null;

const defaultBorrowTax = () => 0;

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
      assetDataByAddress: defaultAssetDataByAddress,
    },
    vault: {
      getBorrowTax: defaultBorrowTax,
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

const ResponsiveTabsStub = defineComponent({
  name: 'ResponsiveTabsStub',
  props: {
    tabs: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { class: 'responsive-tabs-stub' },
        (props.tabs as Array<{ name: string; label: string }>).map((tab) =>
          h(
            'button',
            {
              class: 'responsive-tabs-stub__tab',
              'data-tab': tab.name,
              onClick: () => emit('update:modelValue', tab.name),
            },
            tab.label
          )
        )
      );
  },
});

const paginationButtonsStub = {
  Prev: 'prev',
  Next: 'next',
  First: 'first',
  Last: 'last',
};

const HistoryPaginationStub = defineComponent({
  name: 'HistoryPaginationStub',
  emits: ['pagination-click'],
  setup(_, { emit }) {
    return () =>
      h('div', { class: 'history-pagination-stub' }, [
        h(
          'button',
          { 'data-pagination': 'first', onClick: () => emit('pagination-click', paginationButtonsStub.First) },
          'first'
        ),
        h(
          'button',
          { 'data-pagination': 'prev', onClick: () => emit('pagination-click', paginationButtonsStub.Prev) },
          'prev'
        ),
        h(
          'button',
          { 'data-pagination': 'next', onClick: () => emit('pagination-click', paginationButtonsStub.Next) },
          'next'
        ),
        h(
          'button',
          { 'data-pagination': 'last', onClick: () => emit('pagination-click', paginationButtonsStub.Last) },
          'last'
        ),
      ]);
  },
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      TokenLogo: SlotPassthroughStub,
      FormattedAmount: SlotPassthroughStub,
      ExternalLink: SlotPassthroughStub,
      HistoryPagination: HistoryPaginationStub,
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

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => ({
    get screenBreakpointClass() {
      return storeStub.state.settings.screenBreakpointClass;
    },
    get windowWidth() {
      return storeStub.state.settings.windowWidth;
    },
  }),
}));

vi.mock('@/stores/assets', () => ({
  __esModule: true,
  useAssetsStore: () => ({
    assetDataByAddress: storeStub.getters.assets.assetDataByAddress,
  }),
}));

vi.mock('@/stores/vault', () => ({
  __esModule: true,
  useVaultStore: () => ({
    get accountVaults() {
      return storeStub.state.vault.accountVaults;
    },
    get closedAccountVaults() {
      return storeStub.state.vault.closedAccountVaults;
    },
    get collaterals() {
      return storeStub.state.vault.collaterals;
    },
    get averageCollateralPrices() {
      return storeStub.state.vault.averageCollateralPrices;
    },
    get getBorrowTax() {
      return storeStub.getters.vault.getBorrowTax;
    },
    setCollateralTokenAddress: (...args: unknown[]) => setCollateralSpy(...args),
    setDebtTokenAddress: (...args: unknown[]) => setDebtSpy(...args),
  }),
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: (...args: unknown[]) => routerPushSpy(...args),
    }),
  };
});

vi.mock('@/modules/vault/components/CreateVaultDialog.vue', () => ({ default: SlotPassthroughStub }));
vi.mock('@/modules/vault/components/ExploreOverallStats.vue', () => ({ default: SlotPassthroughStub }));
vi.mock('@/modules/vault/components/ExploreCollaterals.vue', () => ({ default: SlotPassthroughStub }));
vi.mock('@/modules/vault/components/PositionStatus.vue', () => ({ default: SlotPassthroughStub }));
vi.mock('@/components/shared/PairTokenLogo.vue', () => ({ default: SlotPassthroughStub }));
vi.mock('@/components/shared/ResponsiveTabs.vue', () => ({ default: ResponsiveTabsStub }));
vi.mock('@/components/shared/ValueStatusWrapper.vue', () => ({ default: SlotPassthroughStub }));

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
    Zero: FPNumber.ZERO,
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

const VaultsView = (await import('@/features/vault/pages/VaultsPage.vue')).default;

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
        'history-pagination': HistoryPaginationStub,
        'responsive-tabs': ResponsiveTabsStub,
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

const createActiveVault = (id = 7) => ({
  id,
  lockedAssetId: 'xor',
  debtAssetId: 'kusd',
  lockedAmount: FPNumber.fromNatural(100),
  debt: FPNumber.fromNatural(10),
  internalDebt: FPNumber.fromNatural(10),
  interestCoefficient: FPNumber.ONE,
});

const createClosedVault = (id = 8, status = 'Closed') => ({
  id,
  status,
  lockedAssetId: 'xor',
  debtAssetId: 'kusd',
  returned: FPNumber.fromNatural(95),
});

const createCollateral = () => ({
  debtSupply: FPNumber.fromNatural(100),
  riskParams: {
    liquidationRatioReversed: 150,
    hardCap: FPNumber.fromNatural(1000),
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
    storeStub.state.settings.windowWidth = 1280;
    storeStub.state.settings.screenBreakpointClass = BreakpointClass.Desktop;
    storeStub.getters.assets.assetDataByAddress = defaultAssetDataByAddress;
    storeStub.getters.vault.getBorrowTax = defaultBorrowTax;
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

  it('renders active vault cards without calling a missing type guard', async () => {
    loginState.value = true;
    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.state.vault.collaterals = {
      'xor-kusd': createCollateral(),
    };
    storeStub.state.vault.averageCollateralPrices = {
      'xor-kusd': FPNumber.fromNatural(2),
    };

    const wrapper = mountVaults();
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData).toHaveLength(1);
    expect(wrapper.text()).toContain('kensetsu.yourCollateral');
    expect(wrapper.text()).toContain('kensetsu.availableToBorrow');
  });

  it('does not expose stale vault cards while the wallet is disconnected', async () => {
    loginState.value = false;
    storeStub.state.vault.accountVaults = [createActiveVault()];

    const wrapper = mountVaults();
    await flushPromises();

    expect(wrapper.text()).toContain('connectWalletText');
    expect(wrapper.text()).not.toContain('kensetsu.yourCollateral');
    expect((wrapper.vm as any).filteredVaultsData).toHaveLength(1);
  });

  it('keeps active vault cards renderable when collateral metadata is missing', async () => {
    loginState.value = true;
    storeStub.state.vault.accountVaults = [createActiveVault()];

    const wrapper = mountVaults();
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData).toHaveLength(1);
    expect(wrapper.text()).toContain('kensetsu.yourCollateral');
    expect(wrapper.text()).toContain('n/a');
  });

  it('keeps malformed closed vault payloads out of the active card branch', async () => {
    loginState.value = true;
    storeStub.state.vault.closedAccountVaults = [
      {
        ...createClosedVault(),
        lockedAmount: FPNumber.fromNatural(999),
      },
    ];

    const wrapper = mountVaults();
    await flushPromises();
    await wrapper.find('[data-tab="Closed"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData).toHaveLength(1);
    expect(wrapper.text()).toContain('kensetsu.totalCollateralReturned');
    expect(wrapper.text()).not.toContain('kensetsu.yourCollateral');
  });

  it('separates closed and liquidated vaults even when both come from closed account history', async () => {
    loginState.value = true;
    storeStub.state.vault.closedAccountVaults = [createClosedVault(8, 'Closed'), createClosedVault(9, 'Liquidated')];

    const wrapper = mountVaults();
    await flushPromises();

    expect(wrapper.text()).toContain('kensetsu.status.Closed (1)');
    expect(wrapper.text()).toContain('kensetsu.status.Liquidated (1)');

    await wrapper.find('[data-tab="Liquidated"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData).toHaveLength(1);
    expect((wrapper.vm as any).filteredVaultsData[0].id).toBe(9);
    expect(wrapper.text()).toContain('kensetsu.totalCollateralReturned');
  });

  it('keeps active vault cards renderable when asset lookup returns null', async () => {
    loginState.value = true;
    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.getters.assets.assetDataByAddress = () => null;

    const wrapper = mountVaults();
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData).toHaveLength(1);
    expect(wrapper.text()).toContain('kensetsu.yourCollateral');
    expect(wrapper.text()).toContain('n/a');
  });

  it('escapes hostile asset symbols in the vault title', async () => {
    loginState.value = true;
    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.getters.assets.assetDataByAddress = (address?: string) =>
      address
        ? {
            address,
            symbol: '<script>alert(1)</script>',
            decimals: 18,
            balance: {},
          }
        : null;

    const wrapper = mountVaults();
    await flushPromises();

    expect(wrapper.text()).toContain('<script>alert(1)</script> / <script>alert(1)</script>');
    expect(wrapper.find('.vault-title__name').html()).not.toContain('<script>alert(1)</script>');
    expect(wrapper.find('.vault-title__name').html()).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('clamps pathological collateral math and hostile borrow tax without crashing', async () => {
    loginState.value = true;
    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.getters.vault.getBorrowTax = () => 2;
    storeStub.state.vault.collaterals = {
      'xor-kusd': {
        debtSupply: FPNumber.fromNatural(1000),
        riskParams: {
          liquidationRatioReversed: 0,
          hardCap: FPNumber.fromNatural(100),
        },
      },
    };
    storeStub.state.vault.averageCollateralPrices = {
      'xor-kusd': FPNumber.ZERO,
    };

    const wrapper = mountVaults();
    await flushPromises();

    const [vault] = (wrapper.vm as any).filteredVaultsData;
    expect(vault.ltv).toBeNull();
    expect(vault.available.isZero()).toBe(true);
    expect(wrapper.text()).toContain('n/a');
  });

  it('renders closed history defensively when returned collateral is missing', async () => {
    loginState.value = true;
    storeStub.state.vault.closedAccountVaults = [
      {
        ...createClosedVault(),
        returned: undefined,
      },
    ];

    const wrapper = mountVaults();
    await flushPromises();
    await wrapper.find('[data-tab="Closed"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData).toHaveLength(1);
    expect(wrapper.text()).toContain('kensetsu.totalCollateralReturned');
  });

  it('clamps active-vault pagination at both ends', async () => {
    loginState.value = true;
    storeStub.state.vault.accountVaults = Array.from({ length: 9 }, (_, index) => createActiveVault(index + 1));

    const wrapper = mountVaults();
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([1, 2, 3, 4, 5, 6]);

    await wrapper.find('[data-pagination="next"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([7, 8, 9]);

    await wrapper.find('[data-pagination="next"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([7, 8, 9]);

    await wrapper.find('[data-pagination="prev"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-pagination="prev"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('resets pagination when switching between active and closed tabs', async () => {
    loginState.value = true;
    storeStub.state.vault.accountVaults = Array.from({ length: 9 }, (_, index) => createActiveVault(index + 1));
    storeStub.state.vault.closedAccountVaults = [createClosedVault(99, 'Closed')];

    const wrapper = mountVaults();
    await flushPromises();
    await wrapper.find('[data-pagination="next"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([7, 8, 9]);

    await wrapper.find('[data-tab="Closed"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([99]);

    await wrapper.find('[data-tab="Opened"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('uses the smaller mobile page size without dropping active vaults', async () => {
    loginState.value = true;
    storeStub.state.settings.windowWidth = 500;
    storeStub.state.settings.screenBreakpointClass = BreakpointClass.Mobile;
    storeStub.state.vault.accountVaults = [createActiveVault(1), createActiveVault(2), createActiveVault(3)];

    const wrapper = mountVaults();
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([1, 2]);

    await wrapper.find('[data-pagination="next"]').trigger('click');
    await flushPromises();

    expect((wrapper.vm as any).filteredVaultsData.map(({ id }: { id: number }) => id)).toEqual([3]);
  });
});
