import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MstNotificationTrxs from '@/components/App/BrowserNotification/MstNotificationTrxs.vue';
import { PageNames } from '@/consts';

const { switchAccountMock, pushMock, afterLoginMock, setIsMSTMock, syncWithStorageMock, routeState, storeState } =
  vi.hoisted(() => ({
    switchAccountMock: vi.fn(),
    pushMock: vi.fn(),
    afterLoginMock: vi.fn(),
    setIsMSTMock: vi.fn(),
    syncWithStorageMock: vi.fn(),
    routeState: {
      name: 'Swap',
    },
    storeState: {
      wallet: {
        account: {
          isMST: false,
        },
      },
    },
  }));

vi.mock('@wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wallet')>();

  return {
    ...actual,
    api: {
      ...actual.api,
      mst: {
        ...actual.api.mst,
        switchAccount: switchAccountMock,
      },
    },
  };
});

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useRoute: () => routeState,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    afterLogin: afterLoginMock,
  }),
}));

vi.mock('@/store', () => ({
  default: {
    state: storeState,
    commit: {
      wallet: {
        account: {
          setIsMST: setIsMSTMock,
          syncWithStorage: syncWithStorageMock,
        },
      },
    },
  },
}));

const mountComponent = (visible = true) =>
  mount(MstNotificationTrxs, {
    props: { visible },
    global: {
      stubs: {
        's-icon': true,
        's-button': {
          emits: ['click'],
          template: '<button class="s-button-stub" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('MstNotificationTrxs', () => {
  beforeEach(() => {
    routeState.name = PageNames.Swap;
    storeState.wallet.account.isMST = false;
    switchAccountMock.mockReset();
    pushMock.mockReset();
    pushMock.mockResolvedValue(undefined);
    afterLoginMock.mockReset();
    afterLoginMock.mockResolvedValue(undefined);
    setIsMSTMock.mockReset();
    syncWithStorageMock.mockReset();
  });

  it('renders only when visible', () => {
    const hiddenWrapper = mountComponent(false);
    expect(hiddenWrapper.find('.notification-mst').exists()).toBe(false);

    const visibleWrapper = mountComponent(true);
    expect(visibleWrapper.find('.notification-mst').exists()).toBe(true);
  });

  it('emits update:visible=false on close click', async () => {
    const wrapper = mountComponent(true);

    await wrapper.find('.close-button').trigger('click');

    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('switches to MST account, navigates to wallet, and closes notification', async () => {
    const wrapper = mountComponent(true);

    await wrapper.findAll('.s-button-stub')[1].trigger('click');

    expect(switchAccountMock).toHaveBeenCalledWith(true);
    expect(setIsMSTMock).toHaveBeenCalledWith(true);
    expect(syncWithStorageMock).toHaveBeenCalledTimes(1);
    expect(afterLoginMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith({ name: PageNames.Wallet });
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('skips account switch and navigation when already in MST wallet context', async () => {
    routeState.name = PageNames.Wallet;
    storeState.wallet.account.isMST = true;
    const wrapper = mountComponent(true);

    await wrapper.findAll('.s-button-stub')[1].trigger('click');

    expect(switchAccountMock).not.toHaveBeenCalled();
    expect(setIsMSTMock).not.toHaveBeenCalled();
    expect(syncWithStorageMock).not.toHaveBeenCalled();
    expect(afterLoginMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });
});
