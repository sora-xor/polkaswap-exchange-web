import { FPNumber } from '@sora-substrate/math';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultPageNames } from '@/modules/vault/consts';
import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';

const routerPushSpy = vi.fn();
const routerBackSpy = vi.fn();
const routeParams = ref<Record<string, string | undefined>>({ vault: '1' });
const isLoggedInRef = ref(false);

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
      closedAccountVaults: [] as Array<any>,
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
};

const slotStub = createSlotPassthroughStub();

vi.mock('@wallet', async () => {
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

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    push: routerPushSpy,
    back: routerBackSpy,
  },
  lazyComponent: () => createSlotPassthroughStub(),
}));

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

vi.mock('@/modules/vault/router', () => ({
  __esModule: true,
  vaultLazyComponent: () => createSlotPassthroughStub(),
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
    get closedAccountVaults() {
      return storeStub.state.vault.closedAccountVaults;
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

const VaultDetails = (await import('@/modules/vault/views/VaultDetails.vue')).default;

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

describe('VaultDetails.vue', () => {
  beforeEach(() => {
    routerPushSpy.mockClear();
    routerBackSpy.mockClear();
    isLoggedInRef.value = false;
    routeParams.value = { vault: '1' };
    storeStub.state.vault.accountVaults = [];
    storeStub.state.vault.closedAccountVaults = [];
    storeStub.state.vault.collaterals = {};
    storeStub.state.vault.averageCollateralPrices = {};
  });

  it('redirects to vault list when user is not logged in', async () => {
    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).toHaveBeenCalledWith({ name: VaultPageNames.Vaults });
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

    const wrapper = mountVaultDetails();
    await flushPromises();

    expect(routerPushSpy).not.toHaveBeenCalled();

    const title = wrapper.find('.vault-title__container h3');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('KUSD / XOR');

    wrapper.unmount();
  });
});
