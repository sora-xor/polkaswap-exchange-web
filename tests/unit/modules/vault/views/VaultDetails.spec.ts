import { FPNumber } from '@sora-substrate/math';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';

const routerPushSpy = vi.fn();
const routerBackSpy = vi.fn();
const routeParams = ref<Record<string, string | undefined>>({ vault: '1' });
const isLoggedInRef = ref(false);

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

function createSlotPassthroughStub() {
  return defineComponent({
    name: 'SlotPassthroughStub',
    setup(_, { slots }) {
      return () =>
        h(
          'div',
          { class: 'slot-passthrough-stub' },
          Object.keys(slots).flatMap((key) => slots[key]?.() ?? [])
        );
    },
  });
}

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

const storeStub = {
  state: {
    vault: {
      accountVaults: [] as Array<any>,
      accountVaultsLoaded: false,
      closedAccountVaults: [] as Array<any>,
      closedAccountVaultsLoaded: false,
      collaterals: {} as Record<string, any>,
      averageCollateralPrices: {} as Record<string, any>,
      liquidationPenalty: 10,
    },
    settings: {
      percentFormat: {
        format: (value: number) => `${(value * 100).toFixed(2)}%`,
      },
    },
  },
  getters: {
    wallet: {
      account: {
        get isLoggedIn() {
          return isLoggedInRef.value;
        },
      },
    },
    assets: {
      assetDataByAddress: defaultAssetDataByAddress,
    },
    vault: {
      getBorrowTax: defaultBorrowTax,
    },
  },
};

const slotStub = createSlotPassthroughStub();

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAmount: slotStub,
    },
    api: {
      kensetsu: {
        serializeKey: (locked: string, debt: string) => `${locked}-${debt}`,
      },
    },
  });
});

vi.mock('vue-router', () => ({
  __esModule: true,
  useRoute: () => ({
    params: routeParams.value,
  }),
  useRouter: () => ({
    push: routerPushSpy,
    back: routerBackSpy,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => ({
    get isLoggedIn() {
      return isLoggedInRef.value;
    },
  }),
}));

vi.mock('@/stores/assets', () => ({
  __esModule: true,
  useAssetsStore: () => ({
    assetDataByAddress: storeStub.getters.assets.assetDataByAddress,
  }),
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => ({
    get percentFormat() {
      return storeStub.state.settings.percentFormat;
    },
  }),
}));

vi.mock('@/stores/vault', () => ({
  __esModule: true,
  useVaultStore: () => ({
    get accountVaults() {
      return storeStub.state.vault.accountVaults;
    },
    get accountVaultsLoaded() {
      return storeStub.state.vault.accountVaultsLoaded;
    },
    get closedAccountVaults() {
      return storeStub.state.vault.closedAccountVaults;
    },
    get closedAccountVaultsLoaded() {
      return storeStub.state.vault.closedAccountVaultsLoaded;
    },
    get collaterals() {
      return storeStub.state.vault.collaterals;
    },
    get averageCollateralPrices() {
      return storeStub.state.vault.averageCollateralPrices;
    },
    get liquidationPenalty() {
      return storeStub.state.vault.liquidationPenalty;
    },
    get getBorrowTax() {
      return storeStub.getters.vault.getBorrowTax;
    },
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
    Zero: FPNumber.ZERO,
    getFiatAmountByFPNumber: () => '100',
    getFPNumberFiatAmountByFPNumber: () => FPNumber.fromNatural(10),
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    withApi: async (handler: () => Promise<void> | void) => await handler(),
  }),
}));

vi.mock('@/modules/vault/components/AddCollateralDialog.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/modules/vault/components/BorrowMoreDialog.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/modules/vault/components/CloseVaultDialog.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/modules/vault/components/LtvProgressBar.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/components/shared/PairTokenLogo.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/modules/vault/components/PositionStatus.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/modules/vault/components/RepayDebtDialog.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/components/shared/ValueStatusWrapper.vue', () => ({ __esModule: true, default: slotStub }));
vi.mock('@/modules/vault/components/VaultDetailsHistory.vue', () => ({ __esModule: true, default: slotStub }));

const VaultDetails = (await import('@/features/vault/pages/VaultDetailsPage.vue')).default;

const mountVaultDetails = () =>
  mount(VaultDetails, {
    global: {
      stubs: {
        's-button': SButtonStub,
        's-card': createSlotPassthroughStub(),
        's-row': createSlotPassthroughStub(),
        's-col': createSlotPassthroughStub(),
        's-divider': createSlotPassthroughStub(),
        's-tooltip': createSlotPassthroughStub(),
        's-icon': createSlotPassthroughStub(),
        'pair-token-logo': createSlotPassthroughStub(),
        'formatted-amount': createSlotPassthroughStub(),
        'value-status': createSlotPassthroughStub(),
        'ltv-progress-bar': createSlotPassthroughStub(),
        'add-collateral-dialog': createSlotPassthroughStub(),
        'borrow-more-dialog': createSlotPassthroughStub(),
        'repay-debt-dialog': createSlotPassthroughStub(),
        'close-vault-dialog': createSlotPassthroughStub(),
        'vault-details-history': createSlotPassthroughStub(),
        'position-status': createSlotPassthroughStub(),
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

const createActiveVault = (id = 1) => ({
  id,
  lockedAssetId: 'xor',
  debtAssetId: 'kusd',
  lockedAmount: FPNumber.fromNatural(10),
  debt: FPNumber.fromNatural(5),
  vaultType: VaultTypes.V2,
});

const createClosedVault = (id = 1, status = 'Closed') => ({
  id,
  status,
  lockedAssetId: 'xor',
  debtAssetId: 'kusd',
  vaultType: VaultTypes.V2,
  returned: FPNumber.fromNatural(7),
});

const createCollateral = () => ({
  debtSupply: FPNumber.fromNatural(100),
  riskParams: {
    liquidationRatioReversed: 150,
    hardCap: FPNumber.fromNatural(1000),
    stabilityFeeAnnual: FPNumber.fromNatural(12),
  },
});

describe('VaultDetails.vue', () => {
  beforeEach(() => {
    routerPushSpy.mockClear();
    routerBackSpy.mockClear();
    isLoggedInRef.value = false;
    routeParams.value = { vault: '1' };
    storeStub.state.vault.accountVaults = [];
    storeStub.state.vault.accountVaultsLoaded = false;
    storeStub.state.vault.closedAccountVaults = [];
    storeStub.state.vault.closedAccountVaultsLoaded = false;
    storeStub.state.vault.collaterals = {};
    storeStub.state.vault.averageCollateralPrices = {};
    storeStub.state.vault.liquidationPenalty = 10;
    storeStub.getters.assets.assetDataByAddress = defaultAssetDataByAddress;
    storeStub.getters.vault.getBorrowTax = defaultBorrowTax;
  });

  it('redirects to vault list when user is not logged in', async () => {
    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).toHaveBeenCalledWith({ path: '/kensetsu/' });
    wrapper.unmount();
  });

  it('renders vault overview when account vault is available', async () => {
    isLoggedInRef.value = true;

    const vaultId = 1;
    const lockedAssetId = 'xor';
    const debtAssetId = 'kusd';
    const key = `${lockedAssetId}-${debtAssetId}`;

    storeStub.state.vault.accountVaults = [
      {
        id: vaultId,
        lockedAssetId,
        debtAssetId,
        lockedAmount: FPNumber.fromNatural(10),
        debt: FPNumber.fromNatural(5),
        vaultType: VaultTypes.V2,
      },
    ];
    storeStub.state.vault.collaterals = {
      [key]: {
        debtSupply: FPNumber.fromNatural(100),
        riskParams: {
          liquidationRatioReversed: 150,
          hardCap: FPNumber.fromNatural(1000),
          stabilityFeeAnnual: FPNumber.fromNatural(12),
        },
      },
    };
    storeStub.state.vault.averageCollateralPrices = {
      [key]: FPNumber.fromNatural(2),
    };
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();

    const title = wrapper.find('.vault-title__container h3');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('KUSD / XOR');

    wrapper.unmount();
  });

  it('waits for vault subscriptions before resolving a deep-linked vault', async () => {
    isLoggedInRef.value = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();

    const lockedAssetId = 'xor';
    const debtAssetId = 'kusd';
    const key = `${lockedAssetId}-${debtAssetId}`;

    storeStub.state.vault.accountVaults = [
      {
        id: 1,
        lockedAssetId,
        debtAssetId,
        lockedAmount: FPNumber.fromNatural(10),
        debt: FPNumber.fromNatural(5),
        vaultType: VaultTypes.V2,
      },
    ];
    storeStub.state.vault.collaterals = {
      [key]: {
        debtSupply: FPNumber.fromNatural(100),
        riskParams: {
          liquidationRatioReversed: 150,
          hardCap: FPNumber.fromNatural(1000),
          stabilityFeeAnnual: FPNumber.fromNatural(12),
        },
      },
    };
    storeStub.state.vault.averageCollateralPrices = {
      [key]: FPNumber.fromNatural(2),
    };
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    await nextTick();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();
    expect(wrapper.find('.vault-title__container h3').text()).toBe('KUSD / XOR');

    wrapper.unmount();
  });

  it('redirects to vaults when the deep-linked vault lookup resolves without a matching vault', async () => {
    isLoggedInRef.value = true;
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).toHaveBeenCalledWith({ path: '/kensetsu/' });

    wrapper.unmount();
  });

  it('redirects to vaults for a non-numeric deep-linked vault id after lookup settles', async () => {
    isLoggedInRef.value = true;
    routeParams.value = { vault: 'not-a-vault-id' };
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).toHaveBeenCalledWith({ path: '/kensetsu/' });

    wrapper.unmount();
  });

  it('keeps active details renderable when collateral metadata is missing', async () => {
    isLoggedInRef.value = true;
    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('kensetsu.yourCollateral');
    expect(wrapper.text()).toContain('kensetsu.yourDebt');
    expect(wrapper.text()).toContain('kensetsu.availableToBorrow');
    expect(wrapper.text()).not.toContain('kensetsu.totalCollateralReturned');

    wrapper.unmount();
  });

  it('keeps malformed closed vault payloads out of the active details branch', async () => {
    isLoggedInRef.value = true;
    storeStub.state.vault.closedAccountVaults = [
      {
        ...createClosedVault(),
        lockedAmount: FPNumber.fromNatural(999),
        debt: FPNumber.fromNatural(999),
      },
    ];
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('kensetsu.totalCollateralReturned');
    expect(wrapper.text()).not.toContain('kensetsu.yourDebt');

    wrapper.unmount();
  });

  it('renders closed details defensively when returned collateral is missing', async () => {
    isLoggedInRef.value = true;
    storeStub.state.vault.closedAccountVaults = [
      {
        ...createClosedVault(),
        returned: undefined,
      },
    ];
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('kensetsu.totalCollateralReturned');
    expect(wrapper.html()).toContain('value="0"');

    wrapper.unmount();
  });

  it('keeps active details renderable and actions disabled when asset lookup returns null', async () => {
    isLoggedInRef.value = true;
    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;
    storeStub.getters.assets.assetDataByAddress = () => null;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();
    expect(wrapper.find('.vault-title__container h3').text()).toBe('');
    expect(wrapper.text()).toContain('kensetsu.yourCollateral');

    const actionButtons = wrapper.findAll('button.s-typography-button--small');
    expect(actionButtons).toHaveLength(3);
    expect(actionButtons.every((button) => button.attributes('disabled') !== undefined)).toBe(true);

    wrapper.unmount();
  });

  it('escapes hostile asset symbols in the details title', async () => {
    isLoggedInRef.value = true;
    const lockedAssetId = 'xor';
    const debtAssetId = 'kusd';
    const key = `${lockedAssetId}-${debtAssetId}`;

    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.state.vault.collaterals = { [key]: createCollateral() };
    storeStub.state.vault.averageCollateralPrices = { [key]: FPNumber.fromNatural(2) };
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;
    storeStub.getters.assets.assetDataByAddress = (address?: string) =>
      address
        ? {
            address,
            symbol: '<script>alert(1)</script>',
            decimals: 18,
            balance: {},
          }
        : null;

    const wrapper = mountVaultDetails();
    await flushPromises();

    const title = wrapper.find('.vault-title__container h3');
    expect(title.text()).toBe('<script>alert(1)</script> / <script>alert(1)</script>');
    expect(title.html()).not.toContain('<script>alert(1)</script>');
    expect(title.html()).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

    wrapper.unmount();
  });

  it('keeps active details in the active branch under pathological collateral math', async () => {
    isLoggedInRef.value = true;
    const lockedAssetId = 'xor';
    const debtAssetId = 'kusd';
    const key = `${lockedAssetId}-${debtAssetId}`;

    storeStub.state.vault.accountVaults = [createActiveVault()];
    storeStub.state.vault.collaterals = {
      [key]: {
        debtSupply: FPNumber.fromNatural(1000),
        riskParams: {
          liquidationRatioReversed: 0,
          hardCap: FPNumber.fromNatural(100),
          stabilityFeeAnnual: FPNumber.ZERO,
        },
      },
    };
    storeStub.state.vault.averageCollateralPrices = { [key]: FPNumber.ZERO };
    storeStub.getters.vault.getBorrowTax = () => 2;
    storeStub.state.vault.accountVaultsLoaded = true;
    storeStub.state.vault.closedAccountVaultsLoaded = true;

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('kensetsu.yourCollateral');
    expect(wrapper.text()).toContain('kensetsu.availableToBorrow');
    expect(wrapper.text()).not.toContain('kensetsu.totalCollateralReturned');
    expect(wrapper.find('.ltv__title').exists()).toBe(false);

    wrapper.unmount();
  });
});
