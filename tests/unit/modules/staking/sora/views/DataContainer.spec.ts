import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ValidatorsFilter } from '@/modules/staking/sora/types';

const RouterViewStub = defineComponent({
  name: 'RouterViewStub',
  props: {
    parentLoading: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const attrsObject = { ...(attrs as Record<string, unknown>) };
      const classAttr = attrsObject.class;

      if (classAttr !== undefined) {
        delete attrsObject.class;
      }

      const classes = ['router-view-stub'];
      if (classAttr) {
        classes.push(String(classAttr));
      }

      return h(
        'div',
        {
          class: classes.join(' '),
          ...attrsObject,
        },
        slots.default?.() ?? `parent-loading:${props.parentLoading}`
      );
    };
  },
});

const ValidatorsFilterDialogStub = defineComponent({
  name: 'ValidatorsFilterDialogStub',
  props: {
    visible: { type: Boolean, default: false },
    parentLoading: { type: Boolean, default: false },
    filter: { type: Object, default: () => ({}) },
  },
  emits: ['update:visible', 'save'],
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'validators-filter-dialog-stub',
          'data-visible': String(props.visible),
          'data-parent-loading': String(props.parentLoading),
        },
        JSON.stringify(props.filter)
      );
  },
});

let routerPushMock: ReturnType<typeof vi.fn>;
let routeNameRef: ReturnType<typeof ref<string>>;
let showFilterDialogRef: ReturnType<typeof ref<boolean>>;
let validatorsFilterRef: ReturnType<typeof ref<ValidatorsFilter>>;
let setShowFilterMock: ReturnType<typeof vi.fn>;
let setValidatorsFilterMock: ReturnType<typeof vi.fn>;
let newStakeValidatorsModeRef: ReturnType<typeof ref<boolean>>;
let currentEraRef: ReturnType<typeof ref<number | null>>;
let dispatchStakingMocks: Record<string, ReturnType<typeof vi.fn>>;
let commitStakingMocks: Record<string, ReturnType<typeof vi.fn>>;
let updateSubscriptionsSpy: ReturnType<typeof vi.fn>;

const createDispatchMock = () => vi.fn().mockResolvedValue(undefined);

vi.mock('vue-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: routerPushMock,
  }),
  useRoute: () => ({
    get name() {
      return routeNameRef.value;
    },
  }),
}));

vi.mock('@/modules/staking/sora/consts', () => ({
  __esModule: true,
  SoraStakingPageNames: {
    Overview: 'Overview',
  },
}));

vi.mock('@/modules/staking/sora/components/ValidatorsFilterDialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'ValidatorsFilterDialogStub',
    props: {
      visible: { type: Boolean, default: false },
      parentLoading: { type: Boolean, default: false },
      filter: { type: Object, default: () => ({}) },
    },
    emits: ['update:visible', 'save'],
    template:
      '<div class="validators-filter-dialog-stub" :data-visible="String(visible)" :data-parent-loading="String(parentLoading)">{{ JSON.stringify(filter) }}</div>',
  },
}));

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    validatorsFilter: computed(() => validatorsFilterRef.value),
    showValidatorsFilterDialog: computed(() => showFilterDialogRef.value),
    setValidatorsFilter: (filter: ValidatorsFilter) => setValidatorsFilterMock(filter),
    setShowValidatorsFilterDialog: (value: boolean) => setShowFilterMock(value),
    newStakeValidatorsMode: computed(() => newStakeValidatorsModeRef.value),
    currentEra: computed(() => currentEraRef.value),
    getStakingInfo: () => dispatchStakingMocks.getStakingInfo(),
    getValidatorsInfo: () => dispatchStakingMocks.getValidatorsInfo(),
    getMinNominatorBond: () => dispatchStakingMocks.getMinNominatorBond(),
    getUnbondPeriod: () => dispatchStakingMocks.getUnbondPeriod(),
    getMaxNominations: () => dispatchStakingMocks.getMaxNominations(),
    getHistoryDepth: () => dispatchStakingMocks.getHistoryDepth(),
    getPendingRewards: () => dispatchStakingMocks.getPendingRewards(),
    subscribeOnActiveEra: () => dispatchStakingMocks.subscribeOnActiveEra(),
    subscribeOnCurrentEra: () => dispatchStakingMocks.subscribeOnCurrentEra(),
    subscribeOnController: () => dispatchStakingMocks.subscribeOnController(),
    subscribeOnPayee: () => dispatchStakingMocks.subscribeOnPayee(),
    subscribeOnNominations: () => dispatchStakingMocks.subscribeOnNominations(),
    subscribeOnAccountLedger: () => dispatchStakingMocks.subscribeOnAccountLedger(),
    subscribeOnCurrentEraTotalStake: () => dispatchStakingMocks.subscribeOnCurrentEraTotalStake(),
    resetActiveEraUpdates: () => commitStakingMocks.resetActiveEraUpdates(),
    resetCurrentEraUpdates: () => commitStakingMocks.resetCurrentEraUpdates(),
    resetCurrentEraTotalStakeUpdates: () => commitStakingMocks.resetCurrentEraTotalStakeUpdates(),
    resetControllerUpdates: () => commitStakingMocks.resetControllerUpdates(),
    resetPayeeUpdates: () => commitStakingMocks.resetPayeeUpdates(),
    resetNominationsUpdates: () => commitStakingMocks.resetNominationsUpdates(),
    resetAccountLedgerUpdates: () => commitStakingMocks.resetAccountLedgerUpdates(),
  }),
}));

vi.mock('@/composables/useSubscriptions', () => ({
  __esModule: true,
  useSubscriptions: ({
    parentLoading,
    startSubscriptions = [],
    autoStart,
  }: {
    parentLoading?: Readonly<{ value: boolean }> | (() => boolean);
    startSubscriptions?: Array<() => Promise<unknown>>;
    autoStart?: boolean;
  }) => {
    const loading = ref(false);
    const resolveParent = () => {
      if (!parentLoading) return false;
      if (typeof parentLoading === 'function') {
        return Boolean(parentLoading());
      }
      return Boolean(parentLoading.value);
    };
    const subscriptionsDataLoading = computed(() => loading.value || resolveParent());
    const updateSubscriptions = vi.fn(async () => {
      updateSubscriptionsSpy();
      for (const handler of startSubscriptions) {
        await handler?.();
      }
    });

    if (autoStart) {
      void updateSubscriptions();
    }

    return {
      loading,
      subscriptionsDataLoading,
      updateSubscriptions,
    };
  },
}));

import DataContainer from '@/features/staking/pages/SoraDataContainerPage.vue';

const mountComponent = async (options?: { parentLoading?: boolean; attrs?: Record<string, string> }) => {
  const wrapper = mount(DataContainer, {
    props: options?.parentLoading !== undefined ? { parentLoading: options.parentLoading } : {},
    attrs: options?.attrs,
    global: {
      stubs: {
        RouterView: RouterViewStub,
      },
      directives: {
        loading: vi.fn(),
      },
    },
  });

  await flushPromises();

  return wrapper;
};

describe('DataContainer.vue', () => {
  beforeEach(() => {
    routerPushMock = vi.fn();
    routeNameRef = ref('AnotherStakingRoute');
    showFilterDialogRef = ref(false);
    validatorsFilterRef = ref({
      hasIdentity: false,
      notSlashed: false,
      notOversubscribed: false,
      twoValidatorsPerIdentity: false,
    });
    setShowFilterMock = vi.fn((value: boolean) => {
      showFilterDialogRef.value = value;
    });
    setValidatorsFilterMock = vi.fn((filter: ValidatorsFilter) => {
      validatorsFilterRef.value = filter;
    });
    newStakeValidatorsModeRef = ref(false);
    currentEraRef = ref(1);
    dispatchStakingMocks = {
      getStakingInfo: createDispatchMock(),
      getValidatorsInfo: createDispatchMock(),
      getMinNominatorBond: createDispatchMock(),
      getUnbondPeriod: createDispatchMock(),
      getMaxNominations: createDispatchMock(),
      getHistoryDepth: createDispatchMock(),
      getPendingRewards: createDispatchMock(),
      subscribeOnActiveEra: createDispatchMock(),
      subscribeOnCurrentEra: createDispatchMock(),
      subscribeOnController: createDispatchMock(),
      subscribeOnPayee: createDispatchMock(),
      subscribeOnNominations: createDispatchMock(),
      subscribeOnAccountLedger: createDispatchMock(),
      subscribeOnCurrentEraTotalStake: createDispatchMock(),
    };
    commitStakingMocks = {
      resetActiveEraUpdates: vi.fn(),
      resetCurrentEraUpdates: vi.fn(),
      resetCurrentEraTotalStakeUpdates: vi.fn(),
      resetControllerUpdates: vi.fn(),
      resetPayeeUpdates: vi.fn(),
      resetNominationsUpdates: vi.fn(),
      resetAccountLedgerUpdates: vi.fn(),
    };
    updateSubscriptionsSpy = vi.fn();
  });

  it('loads staking data and redirects when validators mode is disabled', async () => {
    await mountComponent();

    expect(updateSubscriptionsSpy).toHaveBeenCalledTimes(1);
    expect(dispatchStakingMocks.getStakingInfo).toHaveBeenCalledTimes(1);
    expect(dispatchStakingMocks.getValidatorsInfo).toHaveBeenCalledTimes(1);
    expect(dispatchStakingMocks.getPendingRewards).toHaveBeenCalledTimes(1);
    expect(dispatchStakingMocks.subscribeOnActiveEra).toHaveBeenCalledTimes(1);
    expect(dispatchStakingMocks.subscribeOnCurrentEraTotalStake).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'Overview' });
  });

  it('handles validators filter dialog interactions', async () => {
    showFilterDialogRef.value = true;
    const wrapper = await mountComponent();

    const dialog = wrapper.findComponent({ name: 'ValidatorsFilterDialogStub' });
    expect(dialog.exists()).toBe(true);
    expect(dialog.props('visible')).toBe(true);

    dialog.vm.$emit('update:visible', false);
    expect(setShowFilterMock).toHaveBeenCalledWith(false);

    const nextFilter: ValidatorsFilter = {
      hasIdentity: true,
      notSlashed: true,
      notOversubscribed: false,
      twoValidatorsPerIdentity: true,
    };

    dialog.vm.$emit('save', nextFilter);
    expect(setShowFilterMock).toHaveBeenCalledWith(false);
    expect(setValidatorsFilterMock).toHaveBeenCalledWith(nextFilter);
  });

  it('re-subscribes to total stake when era changes', async () => {
    await mountComponent();
    dispatchStakingMocks.subscribeOnCurrentEraTotalStake.mockClear();

    currentEraRef.value = 5;
    await flushPromises();

    expect(dispatchStakingMocks.subscribeOnCurrentEraTotalStake).toHaveBeenCalledTimes(1);
  });

  it('applies parent loading state to the validators dialog', async () => {
    showFilterDialogRef.value = true;
    const wrapper = await mountComponent({ parentLoading: true });
    const dialog = wrapper.findComponent({ name: 'ValidatorsFilterDialogStub' });

    expect(dialog.exists()).toBe(true);
    expect(dialog.props('parentLoading')).toBe(true);
  });
});
