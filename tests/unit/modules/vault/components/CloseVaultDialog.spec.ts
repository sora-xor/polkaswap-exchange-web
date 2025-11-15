import { FPNumber } from '@sora-substrate/sdk';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeState = vi.hoisted(() => ({
  networkFees: {
    CloseVault: '1',
  },
  xor: {
    balance: { transferable: '1000000000000000000' },
    symbol: 'XOR',
  },
}));

const assetBalanceMock = vi.hoisted(() => ({
  value: '1000000000000000000',
}));

const withNotificationsMock = vi.hoisted(() => vi.fn(async (handler: () => Promise<void> | void) => await handler()));
const showAppAlertMock = vi.hoisted(() => vi.fn());
const closeVaultMock = vi.hoisted(() => vi.fn());

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  const actual = createWalletMock();
  return {
    ...actual,
    components: {
      ...actual.components,
      DialogBase: {
        name: 'DialogBaseStub',
        props: ['visible', 'title', 'tooltip'],
        emits: ['update:visible'],
        template: '<div class="dialog"><slot /></div>',
      },
      InfoLine: {
        name: 'InfoLineStub',
        template: '<div class="info-line"></div>',
      },
      ExternalLink: {
        name: 'ExternalLinkStub',
        props: ['href'],
        template: '<a class="external-link" :href="href"><slot /></a>',
      },
    },
    api: {
      ...actual.api,
      kensetsu: {
        ...actual.api.kensetsu,
        closeVault: (...args: unknown[]) => closeVaultMock(...args),
      },
    },
  };
});

vi.mock('@/modules/vault/components/CloseVaultDialog.vue?raw', () => ({}));

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    name: 'PairTokenLogoStub',
    props: ['firstToken', 'secondToken'],
    template: '<div class="pair-token-logo"></div>',
  }),
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      wallet: {
        settings: {
          get networkFees() {
            return storeState.networkFees;
          },
        },
      },
    },
    getters: {
      assets: {
        get xor() {
          return storeState.xor;
        },
      },
    },
  },
}));

vi.mock('@/utils', () => ({
  __esModule: true,
  getAssetBalance: () => assetBalanceMock.value,
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    Zero: FPNumber.ZERO,
    getFPNumberFromCodec: (value: string | number, decimals?: number) =>
      FPNumber.fromCodecValue(String(value), decimals),
    getFiatAmountByFPNumber: () => 'fiat-value',
    getFiatAmountByCodecString: () => 'fiat-fee',
    formatCodecNumber: (value: string) => `formatted-${value}`,
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  __esModule: true,
  useTransaction: () => ({
    loading: { value: false },
    withNotifications: withNotificationsMock,
  }),
}));

vi.mock('@/composables/useNotification', () => ({
  __esModule: true,
  useNotification: () => ({
    showAppAlert: showAppAlertMock,
  }),
}));

import CloseVaultDialog from '@/modules/vault/components/CloseVaultDialog.vue';

const baseVault = {
  lockedAmount: FPNumber.fromNatural(10),
  debt: FPNumber.fromNatural(5),
};

const baseAsset = {
  symbol: 'USD',
  decimals: 18,
};

const mountComponent = (overrides: Record<string, unknown> = {}) =>
  mount(CloseVaultDialog, {
    props: {
      visible: true,
      vault: baseVault,
      lockedAsset: baseAsset,
      debtAsset: baseAsset,
      ...overrides,
    },
    global: {
      stubs: {
        's-card': { template: '<div class="s-card-stub"><slot /></div>' },
        's-button': {
          props: {
            disabled: { type: Boolean, default: false },
          },
          emits: ['click'],
          template: '<button class="s-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        's-icon': { template: '<i class="s-icon-stub"></i>' },
      },
    },
  });

describe('CloseVaultDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.networkFees.CloseVault = '1';
    storeState.xor.balance.transferable = '1000000000000000000';
    assetBalanceMock.value = '1000000000000000000';
  });

  it('shows alert when disabled due to insufficient fee balance', async () => {
    storeState.networkFees.CloseVault = '2000000000000000000'; // huge fee
    storeState.xor.balance.transferable = '100000000000000000'; // small balance

    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    await exposed.handleCloseVault();
    await flushPromises();

    expect(showAppAlertMock).toHaveBeenCalledTimes(1);
    expect(closeVaultMock).not.toHaveBeenCalled();
  });

  it('executes close vault when balances are sufficient', async () => {
    assetBalanceMock.value = '10000000000000000000';
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    await exposed.handleCloseVault();
    await flushPromises();

    expect(withNotificationsMock).toHaveBeenCalledTimes(1);
    expect(closeVaultMock).toHaveBeenCalledWith(baseVault, baseAsset, baseAsset);
    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('update:visible')?.pop()?.[0]).toBe(false);
  });
});
