import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref, computed } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VerificationStatus } from '@/types/card';

import type { Nullable } from '@/types/common';

const loginAccountMock = vi.fn(async () => undefined);

function createContext() {
  const state = reactive({
    settings: {
      language: 'en',
      isWalletLoaded: true,
    },
    soraCard: {
      attemptCounter: { freeAttemptsLeft: '1', hasFreeAttempts: true },
      wantsToPassKycAgain: false,
      fees: { retry: '10' },
      rejectReasons: [],
    },
    wallet: {
      account: {
        source: undefined,
      },
    },
  });

  const getters = {
    soraCard: {
      currentStatus: VerificationStatus.Pending as VerificationStatus,
    },
    settings: {
      soraCardEnabled: true as Nullable<boolean>,
    },
  };

  const dispatch = {
    pool: {
      subscribeOnAccountLiquidityList: vi.fn(async () => undefined),
      subscribeOnAccountLiquidityUpdates: vi.fn(async () => undefined),
      unsubscribeAccountLiquidityListAndUpdates: vi.fn(async () => undefined),
    },
    soraCard: {
      subscribeToTotalXorBalance: vi.fn(async () => undefined),
      unsubscribeFromTotalXorBalance: vi.fn(async () => undefined),
      getUserStatus: vi.fn(async () => undefined),
      getUserKycAttempt: vi.fn(async () => undefined),
      getUserIban: vi.fn(async () => undefined),
    },
    wallet: {
      account: {
        loginAccount: vi.fn(async () => undefined),
      },
    },
  };

  const commit = {
    soraCard: {
      setWillToPassKycAgain: vi.fn(),
    },
  };

  const store = {
    state,
    getters,
    dispatch,
    commit,
  };

  const reset = () => {
    state.soraCard.attemptCounter = { freeAttemptsLeft: '1', hasFreeAttempts: true };
    state.soraCard.wantsToPassKycAgain = false;
    state.wallet.account.source = undefined;
    getters.settings.soraCardEnabled = true;
    getters.soraCard.currentStatus = VerificationStatus.Pending;
    Object.values(dispatch.pool).forEach((fn) => (fn as vi.Mock).mockClear());
    Object.values(dispatch.soraCard).forEach((fn) => (fn as vi.Mock).mockClear());
    loginAccountMock.mockClear();
    commit.soraCard.setWillToPassKycAgain.mockClear();
  };

  return {
    state,
    getters,
    dispatch,
    commit,
    store,
    reset,
    computed,
  };
}

const ctx = createContext();

let SoraCardView: typeof import('@/views/SoraCard.vue').default;

vi.mock('@/store', () => ({
  default: ctx.store,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    loginAccount: loginAccountMock,
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  const storageMock = {
    set: vi.fn(),
    get: vi.fn(() => null),
    remove: vi.fn(),
  };

  return createWalletMock({
    api: {
      validateAddress: vi.fn(() => false),
    },
    WALLET_CONSTS: {
      AppWallet: {
        FearlessWallet: 'fearless-wallet',
      },
    },
    storage: storageMock,
    settingsStorage: storageMock,
  });
});

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    name: 'LazyComponentStub',
    template: '<div class="lazy-component-stub"><slot /></div>',
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {},
  }),
  onBeforeRouteLeave: () => undefined,
  onBeforeRouteUpdate: () => undefined,
}));

vi.mock('@/utils', () => ({
  waitForSoraNetworkFromEnv: vi.fn(async () => undefined),
}));

const loadComponent = async () => {
  if (!SoraCardView) {
    SoraCardView = (await import('@/views/SoraCard.vue')).default;
  }
  return SoraCardView;
};

const mountComponent = async () =>
  mount(await loadComponent(), {
    global: {
      directives: {
        loading: () => undefined,
      },
      stubs: {
        's-button': { template: '<button><slot /></button>' },
      },
    },
  });

beforeEach(() => {
  ctx.reset();
});

describe('SoraCard.vue', () => {
  it('shows maintenance step when soraCard feature is disabled', async () => {
    ctx.getters.settings.soraCardEnabled = false;

    const wrapper = await mountComponent();
    await flushPromises();

    expect((wrapper.vm as unknown as { step: Nullable<string> }).step).toBe('Maintenance');
  });

  it('navigates to dashboard when verification is accepted', async () => {
    ctx.getters.soraCard.currentStatus = VerificationStatus.Accepted;

    const wrapper = await mountComponent();
    await flushPromises();

    expect(ctx.dispatch.soraCard.getUserIban).toHaveBeenCalled();
    expect((wrapper.vm as unknown as { step: string | null }).step).toBe('Dashboard');
  });

  it('opens KYC when rejection has free attempts and user wants to retry', async () => {
    ctx.state.soraCard.wantsToPassKycAgain = true;
    ctx.getters.soraCard.currentStatus = VerificationStatus.Rejected;

    const wrapper = await mountComponent();
    await flushPromises();

    const vm = wrapper.vm as unknown as { step: string | null; getReadyPage: boolean };
    expect(vm.step).toBe('KYC');
    expect(vm.getReadyPage).toBe(true);
  });

  it('redirects to confirmation info for pending status', async () => {
    const wrapper = await mountComponent();
    await flushPromises();

    expect((wrapper.vm as unknown as { step: string | null }).step).toBe('ConfirmationInfo');
  });
});
