import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => ({
  connectEvmProvider: vi.fn(),
  subscribeOnEvmProviders: vi.fn(),
  storeState: null as null | {
    appEvmProviders: unknown[];
    selectProviderDialogVisibility: boolean;
    setSelectProviderDialogVisibility: (value: boolean) => void;
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useWeb3Connection', () => ({
  useWeb3Connection: () => ({
    connectEvmProvider: shared.connectEvmProvider,
    evmProvider: { value: null },
    evmProviderLoading: { value: null },
    subscribeOnEvmProviders: shared.subscribeOnEvmProviders,
  }),
}));

vi.mock('@/stores/web3', async () => {
  const { reactive } = await import('vue');

  shared.storeState ??= reactive({
    appEvmProviders: [],
    selectProviderDialogVisibility: false,
    setSelectProviderDialogVisibility(value: boolean) {
      this.selectProviderDialogVisibility = value;
    },
  });

  return {
    useWeb3Store: () => shared.storeState,
  };
});

vi.mock('@/utils/connection/evm/providers', () => ({
  PredefinedProvider: {
    Fearless: 'Fearless Wallet',
    MetaMask: 'MetaMask',
    WalletConnect: 'WalletConnect',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBase',
    props: ['appendToBody', 'title', 'visible'],
    emits: ['update:visible'],
    template: '<div class="dialog-base"><slot /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue', () => ({
  default: {
    name: 'ExtensionConnectionList',
    props: [
      'connectedWallet',
      'recommendedWallets',
      'selectedWallet',
      'selectedWalletLoading',
      'showDisclaimer',
      'wallets',
    ],
    emits: ['select'],
    template: '<div class="extension-connection-list"></div>',
  },
}));

import SelectProvider from '@/components/shared/Dialog/SelectProvider.vue';

describe('SelectProvider dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    if (shared.storeState) {
      shared.storeState.appEvmProviders = [];
      shared.storeState.selectProviderDialogVisibility = false;
      shared.storeState.setSelectProviderDialogVisibility = vi.fn((value: boolean) => {
        shared.storeState!.selectProviderDialogVisibility = value;
      });
    }

    shared.connectEvmProvider.mockResolvedValue(undefined);
    shared.subscribeOnEvmProviders.mockResolvedValue(undefined);
  });

  it('tears down provider discovery if subscription setup resolves after the dialog hides', async () => {
    const unsubscribe = vi.fn();
    let resolveSubscribe!: (unsubscribe: VoidFunction) => void;

    shared.subscribeOnEvmProviders.mockReturnValue(
      new Promise<VoidFunction>((resolve) => {
        resolveSubscribe = resolve;
      })
    );
    shared.storeState!.selectProviderDialogVisibility = true;

    const wrapper = mount(SelectProvider);

    expect(shared.subscribeOnEvmProviders).toHaveBeenCalledTimes(1);

    wrapper.findComponent({ name: 'DialogBase' }).vm.$emit('update:visible', false);
    await nextTick();

    expect(shared.storeState!.selectProviderDialogVisibility).toBe(false);

    resolveSubscribe(unsubscribe);
    await flushPromises();

    expect(unsubscribe).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('does not start a duplicate provider discovery subscription while setup is pending', async () => {
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();
    let resolveSubscribe!: (unsubscribe: VoidFunction) => void;

    shared.subscribeOnEvmProviders
      .mockReturnValueOnce(
        new Promise<VoidFunction>((resolve) => {
          resolveSubscribe = resolve;
        })
      )
      .mockResolvedValueOnce(secondUnsubscribe);
    shared.storeState!.selectProviderDialogVisibility = true;

    const wrapper = mount(SelectProvider);

    expect(shared.subscribeOnEvmProviders).toHaveBeenCalledTimes(1);

    wrapper.findComponent({ name: 'DialogBase' }).vm.$emit('update:visible', false);
    await nextTick();
    wrapper.findComponent({ name: 'DialogBase' }).vm.$emit('update:visible', true);
    await nextTick();

    expect(shared.subscribeOnEvmProviders).toHaveBeenCalledTimes(1);

    resolveSubscribe(firstUnsubscribe);
    await flushPromises();

    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.subscribeOnEvmProviders).toHaveBeenCalledTimes(2);

    wrapper.unmount();

    expect(secondUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
