import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginState = ref(false);
const connectSpy = vi.fn();
const pushMock = vi.fn(async () => undefined);

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useLoading', () => {
  const loading = ref(false);
  return {
    __esModule: true,
    useLoading: () => ({
      loading,
    }),
  };
});

vi.mock('@/composables/useInternalConnect', () => ({
  __esModule: true,
  useInternalConnect: () => ({
    connectSoraWallet: connectSpy,
    isLoggedIn: computed(() => loginState.value),
  }),
}));

vi.mock('vue-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/shared/ui/async', () => ({
  __esModule: true,
  createAsyncComponent: () => ({
    name: 'AsyncComponentStub',
    template: '<div class="async-component-stub"><slot /><slot name="title" /></div>',
  }),
}));

const DepositTxHistoryPage = (await import('@/features/deposit/pages/DepositTxHistoryPage.vue')).default;

const buildWrapper = () =>
  mount(DepositTxHistoryPage, {
    global: {
      stubs: {
        MoonpayHistory: {
          name: 'MoonpayHistoryStub',
          template: '<div class="moonpay-history-stub" />',
        },
        's-button': {
          name: 'SButtonStub',
          template: '<button class="s-button" @click="$emit(\'click\')"><slot /></button>',
        },
        SButton: {
          name: 'SButtonStub',
          template: '<button class="s-button" @click="$emit(\'click\')"><slot /></button>',
        },
        'generic-page-header': {
          name: 'GenericPageHeaderStub',
          emits: ['back'],
          template: '<header class="header-stub" @click="$emit(\'back\')"><slot /></header>',
        },
        GenericPageHeader: {
          name: 'GenericPageHeaderStub',
          emits: ['back'],
          template: '<header class="header-stub" @click="$emit(\'back\')"><slot /></header>',
        },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('DepositTxHistory.vue', () => {
  beforeEach(() => {
    loginState.value = false;
    connectSpy.mockClear();
    pushMock.mockClear();
  });

  it('offers wallet connection when the user is logged out', async () => {
    const wrapper = buildWrapper();

    await flushPromises();

    expect(wrapper.text()).toContain('connectWalletText');

    await (wrapper.vm as any).connectSoraWallet();
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates back to deposit options via header back action', async () => {
    loginState.value = true;
    const wrapper = buildWrapper();

    await flushPromises();

    await (wrapper.vm as any).navigateToDepositOptions();
    expect(pushMock).toHaveBeenCalledWith({ name: 'DepositOptions' });
  });

  it('renders the moonpay history tab by default', () => {
    const wrapper = buildWrapper();

    expect((wrapper.vm as any).currentTab).toBe('MoonpayHistory');
  });
});
