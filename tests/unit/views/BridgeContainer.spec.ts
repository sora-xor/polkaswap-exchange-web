import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, onBeforeUpdate, ref, type Ref } from 'vue';

import type { Nullable } from '@/types/common';
import type { NetworkData } from '@/types/bridge';

const selectedNetworkRef = ref<Nullable<NetworkData>>(null);
const externalAccountRef = ref<string>('');
const subAccountRef = ref<any>(null);
const subBridgeConnectorRef = ref<{ accountApi: unknown } | null>({ accountApi: {} });
const isSignTxDialogVisibleRef = ref(false);

const getSupportedAppsSpy = vi.fn();
const restoreSelectedNetworkSpy = vi.fn();
const updateExternalBalanceSpy = vi.fn();
const subscribeOnBlockUpdatesSpy = vi.fn();
const updateOutgoingMaxLimitSpy = vi.fn();
const resetBridgeFormSpy = vi.fn();
const resetBlockUpdatesSubscriptionSpy = vi.fn();
const resetOutgoingMaxLimitSubscriptionSpy = vi.fn();
const setSignTxDialogVisibilitySpy = vi.fn();
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

const WalletConfirmDialogStub = defineComponent({
  name: 'WalletConfirmDialogStub',
  setup(_props, { slots }) {
    return () => h('div', { class: 'wallet-confirm-dialog-stub' }, slots.default?.());
  },
});

vi.mock('@wallet', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = createWalletMock();

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

vi.mock('@/router', () => ({
  lazyComponent: vi.fn(() =>
    defineComponent({
      name: 'LazyBridgeComponentStub',
      setup(_, { slots }) {
        return () => h('div', { class: 'lazy-bridge-component-stub' }, slots.default?.());
      },
    })
  ),
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    getters: {
      web3: {
        get selectedNetwork() {
          return selectedNetworkRef.value;
        },
        get subAccount() {
          return subAccountRef.value;
        },
      },
      bridge: {
        get externalAccount() {
          return externalAccountRef.value;
        },
      },
    },
    state: {
      bridge: {
        get subBridgeConnector() {
          return subBridgeConnectorRef.value;
        },
        get isSignTxDialogVisible() {
          return isSignTxDialogVisibleRef.value;
        },
      },
    },
    dispatch: {
      web3: {
        getSupportedApps: (...args: unknown[]) => getSupportedAppsSpy(...args),
        restoreSelectedNetwork: (...args: unknown[]) => restoreSelectedNetworkSpy(...args),
      },
      bridge: {
        updateExternalBalance: (...args: unknown[]) => updateExternalBalanceSpy(...args),
        subscribeOnBlockUpdates: (...args: unknown[]) => subscribeOnBlockUpdatesSpy(...args),
        updateOutgoingMaxLimit: (...args: unknown[]) => updateOutgoingMaxLimitSpy(...args),
        resetBridgeForm: (...args: unknown[]) => resetBridgeFormSpy(...args),
      },
    },
    commit: {
      bridge: {
        setSignTxDialogVisibility: (...args: unknown[]) => setSignTxDialogVisibilitySpy(...args),
        resetBlockUpdatesSubscription: (...args: unknown[]) => resetBlockUpdatesSubscriptionSpy(...args),
        resetOutgoingMaxLimitSubscription: (...args: unknown[]) => resetOutgoingMaxLimitSubscriptionSpy(...args),
      },
    },
  },
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

import BridgeContainer from '@/views/BridgeContainer.vue';

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
    resetBlockUpdatesSubscriptionSpy.mockReset().mockResolvedValue(undefined);
    resetOutgoingMaxLimitSubscriptionSpy.mockReset().mockResolvedValue(undefined);
    setSignTxDialogVisibilitySpy.mockReset().mockResolvedValue(undefined);
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
    expect(resetBlockUpdatesSubscriptionSpy).toHaveBeenCalledTimes(1);

    await subscriptionsArgs.resetSubscriptions[1]!();
    expect(resetOutgoingMaxLimitSubscriptionSpy).toHaveBeenCalledTimes(1);

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
