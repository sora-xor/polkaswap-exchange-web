import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PageNames } from '@/consts';

const kensetsuEnabledRef = ref<boolean | null>(true);
const subscriptionsDataLoadingRef = ref(false);

const subscribeOnCollateralsMock = vi.fn().mockResolvedValue(undefined);
const subscribeOnAccountVaultsMock = vi.fn().mockResolvedValue(undefined);
const updateBalanceSubscriptionsMock = vi.fn().mockResolvedValue(undefined);
const getLiquidationPenaltyMock = vi.fn().mockResolvedValue(undefined);
const subscribeOnBorrowTaxesMock = vi.fn().mockResolvedValue(undefined);
const subscribeOnDebtCalculationMock = vi.fn().mockResolvedValue(undefined);
const resetMock = vi.fn().mockResolvedValue(undefined);

const goToMock = vi.fn();

let storeStub: any;

storeStub = {
  dispatch: {
    vault: {
      subscribeOnCollaterals: subscribeOnCollateralsMock,
      subscribeOnAccountVaults: subscribeOnAccountVaultsMock,
      updateBalanceSubscriptions: updateBalanceSubscriptionsMock,
      getLiquidationPenalty: getLiquidationPenaltyMock,
      subscribeOnBorrowTaxes: subscribeOnBorrowTaxesMock,
      subscribeOnDebtCalculation: subscribeOnDebtCalculationMock,
      reset: resetMock,
    },
  },
  getters: {
    settings: {
      get kensetsuEnabled() {
        return kensetsuEnabledRef.value;
      },
    },
  },
};

const createPassthrough = (tag = 'div', className?: string) =>
  defineComponent({
    name: `Stub${tag}`,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      return () => h(tag, { ...attrs, class: className }, slots.default?.());
    },
  });

const RouterViewStub = createPassthrough('router-view-stub');

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
          onClick: (event: MouseEvent) => emit('click', event),
        },
        slots.default?.()
      );
  },
});

vi.mock('@/composables/useSubscriptions', () => ({
  __esModule: true,
  useSubscriptions: ({ startSubscriptions = [], resetSubscriptions = [] }: any = {}) => {
    startSubscriptions.forEach((handler: any) => handler?.());

    return {
      subscriptionsDataLoading: subscriptionsDataLoadingRef,
      resetSubscriptions,
    };
  },
}));

vi.mock('@/router', () => ({
  __esModule: true,
  goTo: goToMock,
  lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: storeStub,
}));

const VaultsContainer = (await import('@/modules/vault/views/VaultsContainer.vue')).default;

const mountContainer = () =>
  mount(VaultsContainer, {
    global: {
      stubs: {
        'router-view': RouterViewStub,
        's-button': SButtonStub,
        's-icon': createPassthrough('span'),
        's-row': createPassthrough(),
        's-col': createPassthrough(),
        's-card': createPassthrough(),
        's-divider': createPassthrough('hr'),
        's-tooltip': createPassthrough('span'),
      },
      directives: {
        loading: () => undefined,
      },
      inheritAttrs: false,
    },
  });

describe('VaultsContainer.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kensetsuEnabledRef.value = true;
  });

  it('executes vault subscriptions on mount', async () => {
    const wrapper = mountContainer();
    await flushPromises();

    expect(subscribeOnCollateralsMock).toHaveBeenCalledTimes(1);
    expect(subscribeOnAccountVaultsMock).toHaveBeenCalledTimes(1);
    expect(updateBalanceSubscriptionsMock).toHaveBeenCalledTimes(1);
    expect(getLiquidationPenaltyMock).toHaveBeenCalledTimes(1);
    expect(subscribeOnBorrowTaxesMock).toHaveBeenCalledTimes(1);
    expect(subscribeOnDebtCalculationMock).toHaveBeenCalledTimes(1);
    expect(goToMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('redirects to swap when Kensetsu is disabled', async () => {
    kensetsuEnabledRef.value = false;

    const wrapper = mountContainer();
    await flushPromises();

    expect(goToMock).toHaveBeenCalledWith(PageNames.Swap);

    wrapper.unmount();
  });
});
