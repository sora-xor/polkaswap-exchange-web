import { FPNumber } from '@sora-substrate/sdk';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

const repayVaultDebtMock = vi.hoisted(() => vi.fn());
const withNotificationsMock = vi.hoisted(() => vi.fn(async (handler: () => Promise<void> | void) => await handler()));
const showAppAlertMock = vi.hoisted(() => vi.fn());

const storeState = vi.hoisted(() => ({
  networkFees: {
    CreateVault: '0',
  },
  xor: {
    balance: { transferable: '0' },
    symbol: 'XOR',
  },
  shouldBalanceBeHidden: false,
}));

const TokenInputStub = vi.hoisted(() => ({
  name: 'TokenInputStub',
  props: ['modelValue'],
  emits: ['update:modelValue', 'max', 'slide'],
  setup(_, { expose }) {
    expose({ focus: vi.fn() });
    return () => h('div', { class: 'token-input-stub' });
  },
}));

const ValueStatusStub = vi.hoisted(() => ({
  name: 'ValueStatusStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'value-status-stub' }, slots.default?.());
  },
}));

const PrevNextInfoLineStub = vi.hoisted(() => ({
  name: 'PrevNextInfoLineStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'prev-next-info-line-stub' }, slots.default?.());
  },
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
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
      ValueStatusWrapper: ValueStatusStub,
    },
    api: {
      kensetsu: {
        repayVaultDebt: (...args: unknown[]) => repayVaultDebtMock(...args),
      },
    },
  });
});

vi.mock('@/components/shared/Input/TokenInput.vue', () => ({
  __esModule: true,
  default: TokenInputStub,
}));

vi.mock('@/components/shared/ValueStatusWrapper.vue', () => ({
  __esModule: true,
  default: ValueStatusStub,
}));

vi.mock('@/modules/vault/components/PrevNextInfoLine.vue', () => ({
  __esModule: true,
  default: PrevNextInfoLineStub,
}));

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => ({
    get networkFees() {
      return storeState.networkFees;
    },
    get shouldBalanceBeHidden() {
      return storeState.shouldBalanceBeHidden;
    },
  }),
}));

vi.mock('@/stores/assets', () => ({
  __esModule: true,
  useAssetsStore: () => ({
    get xor() {
      return storeState.xor;
    },
  }),
}));

vi.mock('@/utils', () => ({
  __esModule: true,
  asZeroValue: (value: unknown) => !Number.isFinite(+value) || +value === 0,
  getAssetBalance: (asset: any) => asset?.balance?.transferable ?? '0',
  hasInsufficientBalance: (asset: any, amount: string | number) => {
    if (!asset) return true;
    const decimals = asset.decimals ?? 18;
    const desired = new FPNumber(amount || 0, decimals);
    const balance = FPNumber.fromCodecValue(asset.balance?.transferable ?? '0', decimals);
    return balance.lt(desired);
  },
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
    Hundred: FPNumber.HUNDRED,
    getFPNumber: (value: string | number, decimals?: number) => new FPNumber(value, decimals),
    getFPNumberFromCodec: (value: string | number, decimals?: number) =>
      FPNumber.fromCodecValue(String(value), decimals),
    formatCodecNumber: (value: string) => `formatted-${value}`,
    getFiatAmountByCodecString: () => 'fiat-fee',
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

import RepayDebtDialog from '@/modules/vault/components/RepayDebtDialog.vue';

const baseVault = () => ({
  debt: FPNumber.fromNatural(10),
});

const debtAsset = () => ({
  symbol: 'USDT',
  decimals: 18,
  balance: { transferable: FPNumber.fromNatural(50).codec },
});

const mountComponent = (overrides: Record<string, unknown> = {}) =>
  mount(RepayDebtDialog, {
    props: {
      visible: true,
      vault: baseVault(),
      debtAsset: debtAsset(),
      prevLtv: FPNumber.fromNatural(50),
      maxSafeDebt: FPNumber.fromNatural(15),
      maxLtv: 150,
      ...overrides,
    },
    global: {
      stubs: {
        's-button': {
          name: 'SButtonStub',
          emits: ['click'],
          template: '<button class="action" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('RepayDebtDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.networkFees.CreateVault = FPNumber.fromNatural(0.01).codec;
    storeState.xor.balance.transferable = FPNumber.fromNatural(100).codec;
  });

  it('displays alert when XOR balance is insufficient for fees', async () => {
    storeState.networkFees.CreateVault = FPNumber.fromNatural(500).codec;
    storeState.xor.balance.transferable = FPNumber.fromNatural(1).codec;

    const wrapper = mountComponent();
    await flushPromises();

    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.repayDebtValue.value = '1';
    await wrapper.vm.$nextTick();
    expect(exposed.disabled.value).toBe(true);
    expect(String(exposed.errorMessage.value)).toContain('insufficientBalanceText');

    await exposed.handleRepayDebt();
    await flushPromises();

    expect(showAppAlertMock).toHaveBeenCalledTimes(1);
    expect(repayVaultDebtMock).not.toHaveBeenCalled();
  });

  it('alerts when attempting to repay more than outstanding debt', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.repayDebtValue.value = '20';
    await exposed.handleRepayDebt();
    await flushPromises();

    expect(showAppAlertMock).toHaveBeenCalledWith('kensetsu.error.repayMoreThanDebt', 'errorText');
    expect(repayVaultDebtMock).not.toHaveBeenCalled();
  });

  it('submits repay transaction when inputs are valid', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.repayDebtValue.value = '5';
    await exposed.handleRepayDebt();
    await flushPromises();

    expect(withNotificationsMock).toHaveBeenCalledTimes(1);
    expect(repayVaultDebtMock).toHaveBeenCalledWith(expect.any(Object), '5', expect.any(Object));
    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('update:visible')?.pop()?.[0]).toBe(false);
  });
});
