import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, onBeforeUpdate, ref, type Ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import type { Nullable } from '@/types/common';
import type { NetworkData } from '@/types/bridge';

const selectedNetworkRef = ref<Nullable<NetworkData>>(null);
const externalAccountRef = ref<string>('');
const subAccountRef = ref<any>(null);
const subBridgeConnectorRef = ref<{ accountApi: unknown } | null>({ accountApi: {} });
const isSignTxDialogVisibleRef = ref(false);

const getSupportedAppsSpy = vi.fn();
const restoreSelectedNetworkSpy = vi.fn();
const bridgeStoreMock = {
  resetBlockUpdatesSubscription: vi.fn(),
  resetOutgoingMaxLimitSubscription: vi.fn(),
  setSignTxDialogVisibility: vi.fn(),
  updateExternalBalance: vi.fn(),
  subscribeOnBlockUpdates: vi.fn(),
  updateOutgoingMaxLimit: vi.fn(),
  resetBridgeForm: vi.fn(),
  get externalAccount() {
    return externalAccountRef.value;
  },
};
const updateExternalBalanceSpy = bridgeStoreMock.updateExternalBalance;
const subscribeOnBlockUpdatesSpy = bridgeStoreMock.subscribeOnBlockUpdates;
const updateOutgoingMaxLimitSpy = bridgeStoreMock.updateOutgoingMaxLimit;
const resetBridgeFormSpy = bridgeStoreMock.resetBridgeForm;
const disconnectExternalNetworkSpy = vi.fn();

let soraAddressRef: Ref<string | null>;
let subscriptionsDataLoadingRef: Ref<boolean>;
let trackLoginRef: Ref<boolean>;
let subscriptionsArgs: {
  startSubscriptions: Array<() => unknown>;
  resetSubscriptions: Array<() => unknown>;
};

const useInternalConnectMock = vi.fn();
const useWeb3ConnectionMock = vi.fn();
const useSubscriptionsMock = vi.fn();

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = createWalletMock();
  const WalletConfirmDialogStub = defineComponent({
    name: 'WalletConfirmDialogStub',
    setup(_props, { slots }) {
      return () => h('div', { class: 'wallet-confirm-dialog-stub' }, slots.default?.());
    },
  });

  return withWalletMock(wallet, {
    components: {
      ...wallet.components,
      ConfirmDialog: WalletConfirmDialogStub,
    },
    WALLET_TYPES: {
      ...(wallet.WALLET_TYPES ?? {}),
      PolkadotJsAccount: class {},
    },
  });
});

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStoreMock,
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => ({
    get selectedNetworkData() {
      return selectedNetworkRef.value;
    },
    get subAccount() {
      return subAccountRef.value;
    },
    get networkSelected() {
      return selectedNetworkRef.value?.id ?? null;
    },
    get networkType() {
      return selectedNetworkRef.value?.type ?? null;
    },
    get selectSubNodeDialogVisibility() {
      return false;
    },
    getSupportedApps: (...args: unknown[]) => getSupportedAppsSpy(...args),
    restoreSelectedNetwork: (...args: unknown[]) => restoreSelectedNetworkSpy(...args),
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: (...args: unknown[]) => useInternalConnectMock(...args),
}));

vi.mock('@/composables/useWeb3Connection', () => ({
  useWeb3Connection: (...args: unknown[]) => useWeb3ConnectionMock(...args),
}));

vi.mock('@/composables/useSubscriptions', () => ({
  useSubscriptions: (...args: unknown[]) => useSubscriptionsMock(...args),
}));

const routerViewProps: Array<Record<string, unknown>> = [];

const RouterViewStub = defineComponent({
  name: 'RouterViewStub',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    routerViewProps.push({ ...attrs });

    onBeforeUpdate(() => {
      routerViewProps.push({ ...attrs });
    });

    return () => h('div', { class: 'router-view-stub', ...attrs }, slots.default?.());
  },
});

const BridgeSelectNetworkStub = defineComponent({
  name: 'BridgeSelectNetworkStub',
  setup() {
    return () => h('div', { class: 'bridge-select-network-stub' });
  },
});

const SelectProviderDialogStub = defineComponent({
  name: 'SelectProviderDialogStub',
  setup() {
    return () => h('div', { class: 'select-provider-dialog-stub' });
  },
});

const ConfirmDialogStub = defineComponent({
  name: 'ConfirmDialogStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'confirm-dialog-stub' }, slots.default?.());
  },
});

import BridgeContainer from '@/features/bridge/pages/BridgeContainerPage.vue';

const mountBridgeContainer = async () => {
  return mount(BridgeContainer, {
    attrs: { 'data-testid': 'bridge-container' },
    global: {
      stubs: {
        'router-view': RouterViewStub,
        'bridge-select-network': BridgeSelectNetworkStub,
        'select-provider-dialog': SelectProviderDialogStub,
        'confirm-dialog': ConfirmDialogStub,
      },
    },
  });
};

describe('BridgeContainer.vue', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    selectedNetworkRef.value = null;
    externalAccountRef.value = '';
    subAccountRef.value = null;
    subBridgeConnectorRef.value = { accountApi: {} };
    isSignTxDialogVisibleRef.value = false;

    getSupportedAppsSpy.mockReset().mockResolvedValue(undefined);
    restoreSelectedNetworkSpy.mockReset().mockResolvedValue(undefined);
    updateExternalBalanceSpy.mockReset().mockResolvedValue(undefined);
    subscribeOnBlockUpdatesSpy.mockReset().mockResolvedValue(undefined);
    updateOutgoingMaxLimitSpy.mockReset().mockResolvedValue(undefined);
    resetBridgeFormSpy.mockReset().mockResolvedValue(undefined);
    bridgeStoreMock.resetBlockUpdatesSubscription.mockReset();
    bridgeStoreMock.resetOutgoingMaxLimitSubscription.mockReset();
    bridgeStoreMock.setSignTxDialogVisibility.mockReset();
    bridgeStoreMock.updateExternalBalance.mockReset();
    bridgeStoreMock.subscribeOnBlockUpdates.mockReset();
    bridgeStoreMock.updateOutgoingMaxLimit.mockReset();
    bridgeStoreMock.resetBridgeForm.mockReset();
    disconnectExternalNetworkSpy.mockReset().mockResolvedValue(undefined);

    soraAddressRef = ref(null);
    subscriptionsDataLoadingRef = ref(true);
    trackLoginRef = ref(true);
    subscriptionsArgs = { startSubscriptions: [], resetSubscriptions: [] };
    routerViewProps.length = 0;

    useInternalConnectMock.mockReturnValue({ soraAddress: soraAddressRef });
    useWeb3ConnectionMock.mockReturnValue({ disconnectExternalNetwork: disconnectExternalNetworkSpy });
    useSubscriptionsMock.mockImplementation((args: typeof subscriptionsArgs) => {
      subscriptionsArgs = args;
      return {
        subscriptionsDataLoading: subscriptionsDataLoadingRef,
        trackLogin: trackLoginRef,
      };
    });
  });

  it('configures bridge subscription lifecycle actions', async () => {
    const wrapper = await mountBridgeContainer();

    expect(useSubscriptionsMock).toHaveBeenCalledTimes(1);
    expect(subscriptionsArgs.startSubscriptions).toHaveLength(3);
    expect(subscriptionsArgs.resetSubscriptions).toHaveLength(2);

    await subscriptionsArgs.startSubscriptions[0]!();
    expect(subscribeOnBlockUpdatesSpy).toHaveBeenCalledTimes(1);

    await subscriptionsArgs.startSubscriptions[1]!();
    expect(updateOutgoingMaxLimitSpy).toHaveBeenCalledTimes(1);

    await subscriptionsArgs.startSubscriptions[2]!();
    expect(getSupportedAppsSpy).toHaveBeenCalledTimes(1);
    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(1);

    await subscriptionsArgs.resetSubscriptions[0]!();
    expect(bridgeStoreMock.resetBlockUpdatesSubscription).toHaveBeenCalledTimes(1);

    await subscriptionsArgs.resetSubscriptions[1]!();
    expect(bridgeStoreMock.resetOutgoingMaxLimitSubscription).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('deduplicates in-flight network restore requests', async () => {
    const wrapper = await mountBridgeContainer();

    let resolveRestore: (() => void) | undefined;
    restoreSelectedNetworkSpy.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRestore = resolve;
        })
    );

    await subscriptionsArgs.startSubscriptions[2]!();
    await subscriptionsArgs.startSubscriptions[2]!();

    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(1);

    resolveRestore?.();
    await flushPromises();

    restoreSelectedNetworkSpy.mockResolvedValue(undefined);
    await subscriptionsArgs.startSubscriptions[2]!();

    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('disables login tracking on mount', async () => {
    const wrapper = await mountBridgeContainer();

    expect(trackLoginRef.value).toBe(false);

    wrapper.unmount();
  });

  it('resets the bridge form when the selected network changes', async () => {
    selectedNetworkRef.value = { id: 'initial-network' } as NetworkData;

    const wrapper = await mountBridgeContainer();
    resetBridgeFormSpy.mockClear();

    selectedNetworkRef.value = { id: 'another-network' } as NetworkData;
    await nextTick();

    expect(resetBridgeFormSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('does not reset the bridge form when the selected network is unchanged', async () => {
    selectedNetworkRef.value = { id: 'stable-network', type: 'sub' } as unknown as NetworkData;

    const wrapper = await mountBridgeContainer();
    resetBridgeFormSpy.mockClear();

    selectedNetworkRef.value = { id: 'stable-network', type: 'sub' } as unknown as NetworkData;
    await nextTick();

    expect(resetBridgeFormSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('updates external balances when SORA or external accounts change', async () => {
    const wrapper = await mountBridgeContainer();
    updateExternalBalanceSpy.mockClear();

    externalAccountRef.value = 'external-1';
    await nextTick();
    expect(updateExternalBalanceSpy).toHaveBeenCalledTimes(1);

    soraAddressRef.value = 'sora-1';
    await nextTick();
    expect(updateExternalBalanceSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('disconnects external networks on unmount', async () => {
    const wrapper = await mountBridgeContainer();

    expect(disconnectExternalNetworkSpy).not.toHaveBeenCalled();

    wrapper.unmount();

    expect(disconnectExternalNetworkSpy).toHaveBeenCalledTimes(1);
  });

  it('forwards subscription loading state to the router view', async () => {
    const wrapper = await mountBridgeContainer();

    const initialProps = routerViewProps.at(-1);
    expect(initialProps?.parentLoading).toBe(true);
    expect(initialProps?.['data-testid']).toBe('bridge-container');

    subscriptionsDataLoadingRef.value = false;
    await nextTick();
    await flushPromises();

    const updatedProps = routerViewProps.at(-1);
    expect(updatedProps?.parentLoading).toBe(false);

    wrapper.unmount();
  });
});
