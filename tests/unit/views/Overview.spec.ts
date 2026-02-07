import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, reactive, ref, type Component } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectMock = vi.fn();
let routerPushMock: ReturnType<typeof vi.fn>;
const fetchDataMock = vi.fn<[], Promise<number | null>>();

const stakingInitializedRef = ref(false);
const lockedFundsRef = ref(createMockAmount(0));
const lockedFundsFiatRef = ref(null as unknown);
const unlockingFundsRef = ref(createMockAmount(0));
const unlockingFundsFiatRef = ref(null as unknown);
const withdrawableFundsRef = ref(createMockAmount(0));
const withdrawableFundsFiatRef = ref(null as unknown);
const rewardedFundsFiatRef = ref(null as unknown);
const rewardedFundsFormattedRef = ref('0');
const totalStakedFormattedRef = ref('$0');
const unbondPeriodRef = ref(2);
const unbondPeriodFormattedRef = ref('2D 0H 0M');
const minBondRef = ref('10');
const validatorsRef = ref<Array<Record<string, unknown>>>([]);
const nextWithdrawalEraRef = ref<number | null>(null);
const accountLedgerRef = ref<{ unlocking: Array<Record<string, unknown>> }>({ unlocking: [] });
const currentEraRef = ref<number | null>(1);
const activeEraRef = ref<number | null>(1);
const maxApyRef = ref(12);

type StoreState = {
  staking: {
    totalNominators: number | null;
  };
};

var storeState: StoreState = {
  staking: {
    totalNominators: null,
  },
};

const setTotalNominatorsMock = vi.fn((value: number) => {
  if (storeState) {
    storeState.staking.totalNominators = value;
  }
});

function createMockAmount(value: number) {
  return {
    toLocaleString: () => value.toLocaleString(),
    isZero: () => value === 0,
  };
}

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  inheritAttrs: false,
  props: {
    type: { type: String, default: 'default' },
    disabled: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          class: ['s-button-stub', attrs.class],
          disabled: props.disabled || props.disable,
          onClick: (event: Event) => emit('click', event),
        },
        slots.default?.()
      );
  },
});

const SDropdownStub = defineComponent({
  name: 'SDropdownStub',
  emits: ['select'],
  setup(_, { slots, emit, attrs, expose }) {
    const state = reactive({ visible: false });
    const controller = {
      get visible() {
        return state.visible;
      },
      show: () => {
        state.visible = true;
      },
      hide: () => {
        state.visible = false;
      },
    };

    expose({ dropdown: controller });

    return () =>
      h(
        'div',
        {
          ...attrs,
          class: ['dropdown-stub', attrs.class],
        },
        [slots.default?.(), slots.menu ? h('div', { class: 'dropdown-menu-slot' }, slots.menu()) : null]
      );
  },
});

const SDropdownItemStub = defineComponent({
  name: 'SDropdownItemStub',
  props: {
    value: { type: String, default: '' },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: ['dropdown-item-stub', attrs.class],
          'data-value': props.value,
        },
        slots.default?.()
      );
  },
});

const SCardStub = defineComponent({
  name: 'SCardStub',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    return () => h('div', { ...attrs, class: ['s-card-stub', attrs.class] }, slots.default?.());
  },
});

const lazyComponentStub = (name: string): Component =>
  defineComponent({
    name: `${name}Stub`,
    props: {
      visible: { type: Boolean, default: false },
      parentLoading: { type: Boolean, default: false },
    },
    emits: ['update:visible', 'confirm', 'show-rewards', 'show-all-withdraws'],
    setup(props, { slots }) {
      return () => (props.visible ? h('div', { class: `${name.toLowerCase()}-stub` }, slots.default?.()) : null);
    },
  });

vi.mock('vue-i18n', () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    get push() {
      return routerPushMock;
    },
  },
}));

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: ref(false),
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  __esModule: true,
  useInternalConnect: () => ({
    isLoggedIn: computed(() => loginState.value),
    connectSoraWallet: connectMock,
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  const TokenLogoStub = {
    name: 'TokenLogoStub',
    props: ['token', 'size', 'class'],
    template: '<div class="token-logo-stub"></div>',
  };
  const InfoLineStub = {
    name: 'InfoLineStub',
    props: ['label', 'value'],
    template: '<div class="info-line-stub"></div>',
  };
  const FormattedAmountWithFiatValueStub = {
    name: 'FormattedAmountWithFiatValueStub',
    props: ['value', 'fiatValue'],
    template: '<div class="formatted-amount-fiat-stub"></div>',
  };

  return await createWalletMock({
    components: {
      TokenLogo: TokenLogoStub,
      InfoLine: InfoLineStub,
      FormattedAmountWithFiatValue: FormattedAmountWithFiatValueStub,
    },
  });
});

vi.mock('@/modules/staking/router', () => ({
  __esModule: true,
  soraStakingLazyComponent: (name: string) => lazyComponentStub(name),
}));

vi.mock('@/modules/staking/sora/consts', () => ({
  __esModule: true,
  SoraStakingComponents: {
    BackButton: 'BackButton',
    StakeDialog: 'StakeDialog',
    ClaimRewardsDialog: 'ClaimRewardsDialog',
    PendingRewardsDialog: 'PendingRewardsDialog',
    ValidatorsDialog: 'ValidatorsDialog',
    WithdrawDialog: 'WithdrawDialog',
    AllWithdrawsDialog: 'AllWithdrawsDialog',
    EraCountdown: 'EraCountdown',
  },
  SoraStakingPageNames: {
    ValidatorsType: 'validators-type',
    Staking: 'staking',
  },
  StakeDialogMode: {
    ADD: 'add',
    REMOVE: 'remove',
  },
}));

vi.mock('@/consts', async () => {
  const actual = await vi.importActual<typeof import('@/consts')>('@/consts');

  return {
    __esModule: true,
    ...actual,
    TranslationConsts: {
      ...(actual.TranslationConsts ?? {}),
      APY: 'APY',
    },
  };
});

vi.mock('@/indexer/queries/staking/nominators', () => ({
  __esModule: true,
  fetchData: (...args: unknown[]) => fetchDataMock(...args),
}));

vi.mock('@/store', () => {
  storeState = reactive<StoreState>({
    staking: {
      totalNominators: null,
    },
  });

  return {
    __esModule: true,
    default: {
      state: storeState,
      commit: {
        staking: {
          setTotalNominators: (value: number) => {
            setTotalNominatorsMock(value);
            storeState.staking.totalNominators = value;
          },
        },
      },
    },
  };
});

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    stakingInitialized: computed(() => stakingInitializedRef.value),
    stakingAsset: computed(() => ({ symbol: 'XOR' })),
    rewardAsset: computed(() => ({ symbol: 'VAL' })),
    lockedFunds: computed(() => lockedFundsRef.value),
    lockedFundsFiat: computed(() => lockedFundsFiatRef.value),
    unlockingFunds: computed(() => unlockingFundsRef.value),
    unlockingFundsFiat: computed(() => unlockingFundsFiatRef.value),
    withdrawableFunds: computed(() => withdrawableFundsRef.value),
    withdrawableFundsFiat: computed(() => withdrawableFundsFiatRef.value),
    withdrawableFundsFormatted: computed(() => withdrawableFundsRef.value.toLocaleString()),
    rewardedFundsFormatted: computed(() => rewardedFundsFormattedRef.value),
    rewardedFundsFiat: computed(() => rewardedFundsFiatRef.value),
    totalStakedFormatted: computed(() => totalStakedFormattedRef.value),
    unbondPeriod: computed(() => unbondPeriodRef.value),
    unbondPeriodFormatted: computed(() => unbondPeriodFormattedRef.value),
    minNominatorBondFormatted: computed(() => minBondRef.value),
    validators: computed(() => validatorsRef.value),
    nextWithdrawalEra: computed(() => nextWithdrawalEraRef.value),
    accountLedger: computed(() => accountLedgerRef.value),
    currentEra: computed(() => currentEraRef.value),
    activeEra: computed(() => activeEraRef.value),
    maxApy: computed(() => maxApyRef.value),
  }),
}));

import Overview from '@/modules/staking/sora/views/Overview.vue';

const mountOverview = async () => {
  const wrapper = mount(Overview, {
    global: {
      components: {
        's-button': SButtonStub,
        SButton: SButtonStub,
        's-dropdown': SDropdownStub,
        SDropdown: SDropdownStub,
        's-dropdown-item': SDropdownItemStub,
        SDropdownItem: SDropdownItemStub,
        's-card': SCardStub,
        SCard: SCardStub,
      },
      directives: {
        loading: vi.fn(),
        button: vi.fn(),
      },
    },
  });

  await flushPromises();

  return wrapper;
};

describe('Overview.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginState.value = false;
    stakingInitializedRef.value = false;
    lockedFundsRef.value = createMockAmount(0);
    lockedFundsFiatRef.value = null;
    unlockingFundsRef.value = createMockAmount(0);
    unlockingFundsFiatRef.value = null;
    withdrawableFundsRef.value = createMockAmount(0);
    withdrawableFundsFiatRef.value = null;
    rewardedFundsFiatRef.value = null;
    rewardedFundsFormattedRef.value = '0';
    totalStakedFormattedRef.value = '$0';
    unbondPeriodRef.value = 2;
    unbondPeriodFormattedRef.value = '2D 0H 0M';
    minBondRef.value = '10';
    validatorsRef.value = [];
    nextWithdrawalEraRef.value = null;
    accountLedgerRef.value = { unlocking: [] };
    currentEraRef.value = 1;
    activeEraRef.value = 1;
    maxApyRef.value = 12;
    storeState.staking.totalNominators = null;
    fetchDataMock.mockResolvedValue(123);
    routerPushMock = vi.fn();
  });

  it('shows connect prompt when wallet disconnected', async () => {
    const wrapper = await mountOverview();

    const connectButton = wrapper
      .findAllComponents(SButtonStub)
      .find((component) => component.classes().includes('action-wallet'));

    expect(connectButton).toBeTruthy();
    connectButton!.vm.$emit('click');
    await flushPromises();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it('navigates to validators selection for new stake', async () => {
    loginState.value = true;
    stakingInitializedRef.value = false;

    const wrapper = await mountOverview();
    const newStakeButton = wrapper
      .findAllComponents(SButtonStub)
      .find((component) => component.classes().includes('action-button'));

    expect(newStakeButton?.text()).toBe('soraStaking.newStake.title');
    newStakeButton!.vm.$emit('click');
    await flushPromises();
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'validators-type' });
  });

  it('manages stake dialogs and claim flow when staking is initialized', async () => {
    loginState.value = true;
    stakingInitializedRef.value = true;
    lockedFundsRef.value = createMockAmount(10);
    withdrawableFundsRef.value = createMockAmount(5);
    accountLedgerRef.value = { unlocking: [{ era: 5 }] };

    const wrapper = await mountOverview();
    const vm = wrapper.vm as unknown as {
      claimRewards: () => void;
      stakeMore: () => void;
      removeStake: () => void;
      handleStake: () => void;
      handleWithdraw: () => void;
      showAllWithdraws: () => void;
      showClaimRewardsDialog: boolean;
      showStakeDialog: boolean;
      stakeDialogMode: string;
      showWithdrawDialog: boolean;
      showAllWithdrawsDialog: boolean;
    };

    expect(wrapper.text()).toContain('soraStaking.actions.claim');
    expect(wrapper.text()).toContain('soraStaking.actions.remove');
    expect(wrapper.text()).toContain('soraStaking.actions.more');

    vm.claimRewards();
    expect(vm.showClaimRewardsDialog).toBe(true);

    vm.stakeMore();
    expect(vm.showStakeDialog).toBe(true);
    expect(vm.stakeDialogMode).toBe('add');
    vm.handleStake();

    vm.removeStake();
    expect(vm.stakeDialogMode).toBe('remove');

    vm.handleWithdraw();
    expect(vm.showWithdrawDialog).toBe(true);

    vm.showAllWithdraws();
    expect(vm.showAllWithdrawsDialog).toBe(true);
    expect(vm.showWithdrawDialog).toBe(false);
  });

  it('opens dialogs from dropdown selections', async () => {
    loginState.value = true;
    stakingInitializedRef.value = true;

    const wrapper = await mountOverview();
    const vm = wrapper.vm as unknown as {
      handleSelectDropdownMenuItem: (value: string) => void;
      showPendingRewardsDialog: boolean;
      showValidatorsDialog: boolean;
    };

    vm.handleSelectDropdownMenuItem('pending-rewards');
    expect(vm.showPendingRewardsDialog).toBe(true);

    vm.handleSelectDropdownMenuItem('validators');
    expect(vm.showValidatorsDialog).toBe(true);
  });

  it('fetches nominators count on mount', async () => {
    loginState.value = true;
    stakingInitializedRef.value = true;

    await mountOverview();
    await flushPromises();

    expect(fetchDataMock).toHaveBeenCalledTimes(1);
    expect(setTotalNominatorsMock).toHaveBeenCalledWith(123);
    expect(storeState.staking.totalNominators).toBe(123);
  });
});
