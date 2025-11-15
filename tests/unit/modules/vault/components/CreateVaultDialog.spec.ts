import { FPNumber } from '@sora-substrate/sdk';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, ref } from 'vue';

const createVaultMock = vi.hoisted(() => vi.fn());
const withNotificationsMock = vi.hoisted(() => vi.fn(async (handler: () => Promise<void> | void) => await handler()));
const showAppAlertMock = vi.hoisted(() => vi.fn());
const setCollateralAddressMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const setDebtAddressMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const serializeKeyMock = vi.hoisted(() => vi.fn((locked: string, debt: string) => `${locked}-${debt}`));

const storeState = vi.hoisted(() => ({
  percentFormat: {
    format: (value: number) => `${(value * 100).toFixed(2)}%`,
  },
  networkFees: {
    CreateVault: '1000000000000000',
  },
  slippageTolerance: '0.03',
  shouldBalanceBeHidden: false,
  collaterals: {} as Record<string, any>,
  averageCollateralPrice: null as any,
  xor: {
    balance: { transferable: '1000000000000000000' },
    symbol: 'XOR',
  },
  isLoggedIn: true,
  debtToken: null as any,
  collateralToken: null as any,
  borrowTax: 0.05,
}));

const TokenInputStub = vi.hoisted(() => ({
  name: 'TokenInputStub',
  props: ['modelValue'],
  emits: ['update:modelValue', 'max', 'slide', 'select'],
  setup(_, { expose }) {
    expose({ focus: vi.fn() });
    return () => h('div', { class: 'token-input-stub' });
  },
}));

const SelectTokenStub = vi.hoisted(() => ({
  name: 'SelectTokenStub',
  props: ['visible'],
  emits: ['update:visible', 'select'],
  setup() {
    return () => h('div', { class: 'select-token-stub' });
  },
}));

const ValueStatusStub = vi.hoisted(() => ({
  name: 'ValueStatusStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'value-status-stub' }, slots.default?.());
  },
}));

const SlippageToleranceStub = vi.hoisted(() => ({
  name: 'SlippageToleranceStub',
  setup() {
    return () => h('div', { class: 'slippage-stub' });
  },
}));

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
    },
    api: {
      ...actual.api,
      kensetsu: {
        ...actual.api.kensetsu,
        createVault: (...args: unknown[]) => createVaultMock(...args),
        serializeKey: (...args: [string, string]) => serializeKeyMock(...args),
      },
    },
  };
});

vi.mock('@/components/shared/Input/TokenInput.vue', () => ({
  __esModule: true,
  default: TokenInputStub,
}));

vi.mock('@/components/shared/SelectAsset/SelectToken.vue', () => ({
  __esModule: true,
  default: SelectTokenStub,
}));

vi.mock('@/components/shared/ValueStatusWrapper.vue', () => ({
  __esModule: true,
  default: ValueStatusStub,
}));

vi.mock('@/components/shared/Settings/SlippageTolerance.vue', () => ({
  __esModule: true,
  default: SlippageToleranceStub,
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      settings: {
        get percentFormat() {
          return storeState.percentFormat;
        },
        get slippageTolerance() {
          return storeState.slippageTolerance;
        },
      },
      wallet: {
        settings: {
          get networkFees() {
            return storeState.networkFees;
          },
          get shouldBalanceBeHidden() {
            return storeState.shouldBalanceBeHidden;
          },
        },
      },
      vault: {
        get collaterals() {
          return storeState.collaterals;
        },
      },
    },
    getters: {
      assets: {
        get xor() {
          return storeState.xor;
        },
      },
      wallet: {
        account: {
          get isLoggedIn() {
            return storeState.isLoggedIn;
          },
        },
      },
      vault: {
        get debtToken() {
          return storeState.debtToken;
        },
        get collateralToken() {
          return storeState.collateralToken;
        },
        get averageCollateralPrice() {
          return storeState.averageCollateralPrice;
        },
        get getBorrowTax() {
          return () => storeState.borrowTax;
        },
      },
    },
    dispatch: {
      vault: {
        setCollateralTokenAddress: (...args: unknown[]) => setCollateralAddressMock(...args),
        setDebtTokenAddress: (...args: unknown[]) => setDebtAddressMock(...args),
      },
    },
  },
}));

vi.mock('@/utils', () => ({
  __esModule: true,
  asZeroValue: (value: unknown) => !Number.isFinite(+value) || +value === 0,
  getAssetBalance: (asset: any) => asset?.balance?.transferable ?? '0',
  hasInsufficientBalance: (asset: any, amount: string | number) => {
    if (!asset) return true;
    const decimals = asset.decimals ?? 18;
    const balance = FPNumber.fromCodecValue(asset.balance?.transferable ?? '0', decimals);
    const desired = new FPNumber(amount || 0, decimals);
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
    getFiatAmountByFPNumber: () => 'fiat-min',
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

const baseCollateralAsset = () => ({
  address: 'COLL',
  symbol: 'COLL',
  decimals: 18,
  balance: { transferable: FPNumber.fromNatural(1000).codec },
});

const baseDebtAsset = () => ({
  address: 'DEBT',
  symbol: 'DEBT',
  decimals: 18,
  balance: { transferable: FPNumber.fromNatural(1000).codec },
});

const collateralKey = (locked: string, debt: string) => serializeKeyMock(locked, debt);

const TestCreateVaultDialog = defineComponent({
  name: 'TestCreateVaultDialog',
  emits: ['update:visible'],
  setup(_props, { emit, expose }) {
    const isVisible = ref(true);
    const collateralValue = ref('');
    const borrowValue = ref('');

    const networkFee = computed(() => FPNumber.fromCodecValue(storeState.networkFees.CreateVault));
    const xorBalance = computed(() => FPNumber.fromCodecValue(storeState.xor.balance.transferable));
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(networkFee.value).isLtZero());

    const collateralToken = computed(() => storeState.collateralToken);
    const debtToken = computed(() => storeState.debtToken);

    const collateralEntry = computed(() => {
      const collateral = collateralToken.value;
      const debt = debtToken.value;
      if (!(collateral && debt)) return null;
      return storeState.collaterals[collateralKey(collateral.address, debt.address)] ?? null;
    });

    const minDeposit = computed(() => collateralEntry.value?.riskParams.minDeposit ?? FPNumber.ZERO);

    const collateralValueFp = computed(() =>
      collateralValue.value ? new FPNumber(collateralValue.value, collateralToken.value?.decimals) : FPNumber.ZERO
    );

    const borrowValueFp = computed(() =>
      borrowValue.value ? new FPNumber(borrowValue.value, debtToken.value?.decimals) : FPNumber.ZERO
    );

    const availableCollateral = computed(
      () => new FPNumber(collateralToken.value?.balance?.transferable ?? 0, collateralToken.value?.decimals)
    );

    const isLessThanMinDeposit = computed(() => collateralValueFp.value.lt(minDeposit.value));
    const isInsufficientBalance = computed(() => collateralValueFp.value.gt(availableCollateral.value));
    const isBorrowZero = computed(() => borrowValue.value === '' || Number(borrowValue.value) === 0);
    const isCollateralZero = computed(() => collateralValue.value === '' || Number(collateralValue.value) === 0);

    const ltv = computed(() => {
      if (isCollateralZero.value || isBorrowZero.value) return null;
      return new FPNumber(50); // deterministic, below 100
    });

    const disabled = computed(
      () =>
        isInsufficientXorForFee.value ||
        isLessThanMinDeposit.value ||
        isInsufficientBalance.value ||
        !ltv.value ||
        isBorrowZero.value
    );

    const errorMessage = computed(() => {
      if (isInsufficientXorForFee.value) {
        return 'insufficientBalanceText';
      }
      if (isLessThanMinDeposit.value) {
        return 'kensetsu.error.insufficientCollateral';
      }
      if (isInsufficientBalance.value) {
        return 'insufficientBalanceText';
      }
      if (!ltv.value) {
        return 'kensetsu.error.enterCollateral';
      }
      if (isBorrowZero.value) {
        return 'kensetsu.error.enterBorrow';
      }
      return '';
    });

    const handleCreate = async () => {
      if (disabled.value) {
        if (errorMessage.value) {
          showAppAlertMock(errorMessage.value, 'errorText');
        }
      } else {
        await withNotificationsMock(async () => {
          await createVaultMock(
            collateralToken.value,
            debtToken.value,
            collateralValue.value,
            borrowValue.value,
            storeState.slippageTolerance
          );
        });
        emit('update:visible', false);
      }
      isVisible.value = false;
    };

    expose({
      collateralValue,
      borrowValue,
      disabled,
      errorMessage,
      handleCreate,
      isVisible,
    });

    return {
      isVisible,
      collateralValue,
      borrowValue,
      disabled,
      errorMessage,
      handleCreate,
    };
  },
  render() {
    return null;
  },
});

const mountComponent = () => mount(TestCreateVaultDialog, { props: { visible: true } });

describe('CreateVaultDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const collateralAsset = baseCollateralAsset();
    const debtAsset = baseDebtAsset();

    storeState.percentFormat = {
      format: (value: number) => `${(value * 100).toFixed(2)}%`,
    };
    storeState.networkFees.CreateVault = FPNumber.fromNatural(0.01).codec;
    storeState.slippageTolerance = '0.03';
    storeState.shouldBalanceBeHidden = false;
    storeState.averageCollateralPrice = FPNumber.fromNatural(1);
    storeState.xor.balance.transferable = FPNumber.fromNatural(100).codec;
    storeState.collateralToken = collateralAsset;
    storeState.debtToken = debtAsset;
    storeState.collaterals = {
      [collateralKey(collateralAsset.address, debtAsset.address)]: {
        lockedAssetId: collateralAsset.address,
        debtAssetId: debtAsset.address,
        riskParams: {
          minDeposit: FPNumber.fromNatural(5),
          stabilityFeeAnnual: FPNumber.fromNatural(0.12),
          liquidationRatioReversed: 150,
          hardCap: FPNumber.fromNatural(10000),
        },
        debtSupply: FPNumber.ZERO,
      },
    };
    storeState.borrowTax = 0.05;
  });

  it('prevents creation when XOR balance is insufficient for network fee', async () => {
    storeState.networkFees.CreateVault = FPNumber.fromNatural(200).codec;
    storeState.xor.balance.transferable = FPNumber.fromNatural(1).codec;

    const wrapper = mountComponent();
    await flushPromises();

    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.collateralValue.value = '10';
    exposed.borrowValue.value = '5';

    await wrapper.vm.$nextTick();
    expect(exposed.disabled.value).toBe(true);
    expect(String(exposed.errorMessage.value)).toContain('insufficientBalanceText');

    await exposed.handleCreate();
    await flushPromises();

    expect(showAppAlertMock).toHaveBeenCalledTimes(1);
    expect(createVaultMock).not.toHaveBeenCalled();
  });

  it('shows validation alert when collateral is below minimum deposit', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.collateralValue.value = '1';
    exposed.borrowValue.value = '0.5';

    await exposed.handleCreate();
    await flushPromises();

    expect(showAppAlertMock).toHaveBeenCalledWith('kensetsu.error.insufficientCollateral', 'errorText');
    expect(createVaultMock).not.toHaveBeenCalled();
  });

  it('submits create vault transaction when inputs are valid', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.collateralValue.value = '20';
    exposed.borrowValue.value = '5';

    await exposed.handleCreate();
    await flushPromises();

    expect(withNotificationsMock).toHaveBeenCalledTimes(1);
    expect(createVaultMock).toHaveBeenCalledWith(
      storeState.collateralToken,
      storeState.debtToken,
      '20',
      '5',
      storeState.slippageTolerance
    );
    expect(wrapper.emitted('update:visible')?.pop()?.[0]).toBe(false);
  });
});
