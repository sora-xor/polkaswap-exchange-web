import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MstBridgeWarning from '@/components/App/BrowserNotification/MstBridgeWarning.vue';

const { switchAccountMock, afterLoginMock, setIsMSTMock, syncWithStorageMock, storeState, walletStore } = vi.hoisted(
  () => {
    const storeState = {
      wallet: {
        account: {
          isMST: true,
        },
      },
    };

    const walletStore = {
      get isMstAccount() {
        return storeState.wallet.account.isMST;
      },
      afterLogin: vi.fn(),
      setIsMstAccount: vi.fn(),
      syncAccountWithStorage: vi.fn(),
    };

    return {
      switchAccountMock: vi.fn(),
      afterLoginMock: vi.fn(),
      setIsMSTMock: vi.fn(),
      syncWithStorageMock: vi.fn(),
      storeState,
      walletStore,
    };
  }
);

vi.mock('@tests/stubs/walletRuntime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tests/stubs/walletRuntime')>();

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

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStore,
}));

const mountComponent = (visible = true) =>
  mount(MstBridgeWarning, {
    props: { visible },
    global: {
      stubs: {
        DialogBase: {
          props: ['visible', 'title'],
          template: '<section v-if="visible" class="dialog-base-stub" :data-title="title"><slot /></section>',
        },
        'dialog-base': {
          props: ['visible', 'title'],
          template: '<section v-if="visible" class="dialog-base-stub" :data-title="title"><slot /></section>',
        },
        's-button': {
          emits: ['click'],
          template: '<button class="s-button-stub" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('MstBridgeWarning', () => {
  beforeEach(() => {
    storeState.wallet.account.isMST = true;
    walletStore.afterLogin = afterLoginMock;
    walletStore.setIsMstAccount = setIsMSTMock;
    walletStore.syncAccountWithStorage = syncWithStorageMock;
    switchAccountMock.mockReset();
    afterLoginMock.mockReset();
    afterLoginMock.mockResolvedValue(undefined);
    setIsMSTMock.mockReset();
    syncWithStorageMock.mockReset();
  });

  it('renders only when visible', () => {
    expect(mountComponent(false).find('.dialog-base-stub').exists()).toBe(false);
    expect(mountComponent(true).find('.dialog-base-stub').exists()).toBe(true);
  });

  it('switches back from MST and closes the dialog', async () => {
    const wrapper = mountComponent(true);

    await wrapper.find('.s-button-stub').trigger('click');

    expect(switchAccountMock).toHaveBeenCalledWith(false);
    expect(setIsMSTMock).toHaveBeenCalledWith(false);
    expect(syncWithStorageMock).toHaveBeenCalledTimes(1);
    expect(afterLoginMock).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('closes without switching when the wallet is already non-MST', async () => {
    storeState.wallet.account.isMST = false;
    const wrapper = mountComponent(true);

    await wrapper.find('.s-button-stub').trigger('click');

    expect(switchAccountMock).not.toHaveBeenCalled();
    expect(setIsMSTMock).not.toHaveBeenCalled();
    expect(syncWithStorageMock).not.toHaveBeenCalled();
    expect(afterLoginMock).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });
});
