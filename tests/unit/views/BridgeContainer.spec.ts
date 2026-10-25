import { flushPromises, mount } from '@vue/test-utils';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, onBeforeUpdate, reactive, ref, type Ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import type { Nullable } from '@/types/common';
import type { NetworkData } from '@/types/bridge';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';

const selectedNetworkRef = ref<Nullable<NetworkData>>(null);
const selectedNetworkTypeRef = ref<Nullable<BridgeNetworkType>>(null);
const externalAccountRef = ref<string>('');
const subAccountRef = ref<any>(null);
const subBridgeConnectorRef = ref<{ accountApi: unknown } | null>({ accountApi: {} });
const isSignTxDialogVisibleRef = ref(false);
const subNetworkConnectionStateRef = ref({
  network: null as Nullable<string>,
  connection: null,
  connecting: false,
  ready: false,
});
const soraApiMock = vi.hoisted(() => ({
  connected: true,
}));
const guidedRoute = reactive({ path: '/bridge', query: {} as Record<string, string> });
const prepareEthereumFundingSpy = vi.fn();
const cancelPreparationSpy = vi.fn();
const fundingPreparing = ref(false);
const fundingError = ref<string | null>(null);
const fundingStatus = ref('idle');
vi.mock('vue-router', async () => ({
  ...(await vi.importActual('vue-router')),
  useRoute: () => guidedRoute,
}));
vi.mock('@/features/misc/composables/useTonswapBridgeFunding', async () => ({
  ...(await vi.importActual('@/features/misc/composables/useTonswapBridgeFunding')),
  useTonswapBridgeFunding: () => ({
    prepareEthereumFunding: prepareEthereumFundingSpy,
    cancelPreparation: cancelPreparationSpy,
    isPreparing: fundingPreparing,
    error: fundingError,
    status: fundingStatus,
  }),
}));

const createNetworkData = (id: string): NetworkData => ({
  id: id as NetworkData['id'],
  name: id,
  nativeCurrency: null,
  blockExplorerUrls: [],
  shortName: id,
});

const getSupportedAppsSpy = vi.fn();
const restoreSelectedNetworkSpy = vi.fn();
const getRegisteredAssetsSpy = vi.fn();
const bridgeStoreMock = {
  resetBlockUpdatesSubscription: vi.fn(),
  resetOutgoingMaxLimitSubscription: vi.fn(),
  setSignTxDialogVisibility: vi.fn(),
  updateExternalBalance: vi.fn(),
  updateFeesAndLockedFunds: vi.fn(),
  setAssetAddress: vi.fn(),
  subscribeOnBlockUpdates: vi.fn(),
  updateOutgoingMaxLimit: vi.fn(),
  resetBridgeForm: vi.fn(),
  form: {
    assetAddress: '',
  },
  get externalAccount() {
    return externalAccountRef.value;
  },
  get subNetworkConnectionState() {
    return subNetworkConnectionStateRef.value;
  },
};
const updateExternalBalanceSpy = bridgeStoreMock.updateExternalBalance;
const updateFeesAndLockedFundsSpy = bridgeStoreMock.updateFeesAndLockedFunds;
const setAssetAddressSpy = bridgeStoreMock.setAssetAddress;
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

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    getRegisteredAssets: (...args: unknown[]) => getRegisteredAssetsSpy(...args),
  }),
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
      return selectedNetworkTypeRef.value;
    },
    get selectSubNodeDialogVisibility() {
      return false;
    },
    getSupportedApps: (...args: unknown[]) => getSupportedAppsSpy(...args),
    restoreSelectedNetwork: (...args: unknown[]) => restoreSelectedNetworkSpy(...args),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/soraneo-wallet/src/api')>('@/lib/soraneo-wallet/src/api');
  const bridgeProxy = (actual.api as any).bridgeProxy ?? { eth: {}, evm: {}, sub: {} };

  return {
    ...actual,
    api: new Proxy(actual.api, {
      get(target, property, receiver) {
        if (property === 'connected') return soraApiMock.connected;
        if (property === 'bridgeProxy') return bridgeProxy;
        return Reflect.get(target, property, receiver);
      },
    }),
  };
});

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
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    useGetTsPlan().clearPlan();
    useGetTsPlan('xor').clearPlan();
    setActivePinia(createPinia());
    guidedRoute.path = '/bridge';
    guidedRoute.query = {};
    prepareEthereumFundingSpy.mockReset().mockResolvedValue({ symbol: 'DAI' });
    cancelPreparationSpy.mockReset();
    fundingPreparing.value = false;
    fundingError.value = null;
    fundingStatus.value = 'idle';
    selectedNetworkRef.value = null;
    selectedNetworkTypeRef.value = null;
    externalAccountRef.value = '';
    subAccountRef.value = null;
    subBridgeConnectorRef.value = { accountApi: {} };
    isSignTxDialogVisibleRef.value = false;
    subNetworkConnectionStateRef.value = {
      network: null,
      connection: null,
      connecting: false,
      ready: false,
    };
    soraApiMock.connected = true;
    bridgeStoreMock.form.assetAddress = '';

    getSupportedAppsSpy.mockReset().mockResolvedValue(undefined);
    restoreSelectedNetworkSpy.mockReset().mockResolvedValue(undefined);
    getRegisteredAssetsSpy.mockReset().mockResolvedValue(undefined);
    updateExternalBalanceSpy.mockReset().mockResolvedValue(undefined);
    updateFeesAndLockedFundsSpy.mockReset().mockResolvedValue(undefined);
    setAssetAddressSpy.mockReset().mockResolvedValue(undefined);
    subscribeOnBlockUpdatesSpy.mockReset().mockResolvedValue(undefined);
    updateOutgoingMaxLimitSpy.mockReset().mockResolvedValue(undefined);
    resetBridgeFormSpy.mockReset().mockResolvedValue(undefined);
    bridgeStoreMock.resetBlockUpdatesSubscription.mockReset();
    bridgeStoreMock.resetOutgoingMaxLimitSubscription.mockReset();
    bridgeStoreMock.setSignTxDialogVisibility.mockReset();
    bridgeStoreMock.updateExternalBalance.mockReset();
    bridgeStoreMock.updateFeesAndLockedFunds.mockReset();
    bridgeStoreMock.setAssetAddress.mockReset();
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

  it('waits for the SORA API connection before loading bridge apps', async () => {
    vi.useFakeTimers();
    soraApiMock.connected = false;
    const wrapper = await mountBridgeContainer();

    const bridgeAppsTask = subscriptionsArgs.startSubscriptions[2]!();
    await Promise.resolve();

    expect(getSupportedAppsSpy).not.toHaveBeenCalled();
    expect(restoreSelectedNetworkSpy).not.toHaveBeenCalled();

    soraApiMock.connected = true;
    await vi.advanceTimersByTimeAsync(250);
    await bridgeAppsTask;

    expect(getSupportedAppsSpy).toHaveBeenCalledTimes(1);
    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('loads bridge apps after the SORA API connection retry limit is exhausted', async () => {
    vi.useFakeTimers();
    soraApiMock.connected = false;
    const wrapper = await mountBridgeContainer();

    const bridgeAppsTask = subscriptionsArgs.startSubscriptions[2]!();
    await Promise.resolve();

    expect(getSupportedAppsSpy).not.toHaveBeenCalled();
    expect(restoreSelectedNetworkSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250 * 20);
    await bridgeAppsTask;

    expect(getSupportedAppsSpy).toHaveBeenCalledTimes(1);
    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(1);

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

    const firstBridgeAppsTask = subscriptionsArgs.startSubscriptions[2]!();
    await flushPromises();
    const secondBridgeAppsTask = subscriptionsArgs.startSubscriptions[2]!();
    await flushPromises();

    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(1);

    resolveRestore?.();
    await Promise.all([firstBridgeAppsTask, secondBridgeAppsTask]);

    restoreSelectedNetworkSpy.mockResolvedValue(undefined);
    await subscriptionsArgs.startSubscriptions[2]!();

    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('retries network restore after a failed restore task', async () => {
    const wrapper = await mountBridgeContainer();
    const restoreError = new Error('restore failed');

    restoreSelectedNetworkSpy.mockRejectedValueOnce(restoreError);

    await expect(subscriptionsArgs.startSubscriptions[2]!()).rejects.toThrow(restoreError);

    restoreSelectedNetworkSpy.mockResolvedValueOnce(undefined);
    await subscriptionsArgs.startSubscriptions[2]!();

    expect(getSupportedAppsSpy).toHaveBeenCalledTimes(2);
    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('does not restore the previous network when supported app loading fails', async () => {
    const wrapper = await mountBridgeContainer();
    const supportedAppsError = new Error('supported apps unavailable');

    getSupportedAppsSpy.mockRejectedValueOnce(supportedAppsError);

    await expect(subscriptionsArgs.startSubscriptions[2]!()).rejects.toThrow(supportedAppsError);
    expect(restoreSelectedNetworkSpy).not.toHaveBeenCalled();

    getSupportedAppsSpy.mockResolvedValueOnce(undefined);
    await subscriptionsArgs.startSubscriptions[2]!();

    expect(getSupportedAppsSpy).toHaveBeenCalledTimes(2);
    expect(restoreSelectedNetworkSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('disables login tracking on mount', async () => {
    const wrapper = await mountBridgeContainer();

    expect(trackLoginRef.value).toBe(false);

    wrapper.unmount();
  });

  it('resets the bridge form when the selected network changes', async () => {
    selectedNetworkRef.value = createNetworkData('initial-network');

    const wrapper = await mountBridgeContainer();
    resetBridgeFormSpy.mockClear();

    selectedNetworkRef.value = createNetworkData('another-network');
    await nextTick();

    expect(resetBridgeFormSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('does not reset the bridge form when the selected network is unchanged', async () => {
    selectedNetworkRef.value = createNetworkData('stable-network');
    selectedNetworkTypeRef.value = BridgeNetworkType.Sub;

    const wrapper = await mountBridgeContainer();
    resetBridgeFormSpy.mockClear();

    selectedNetworkRef.value = createNetworkData('stable-network');
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
    expect(updateFeesAndLockedFundsSpy).toHaveBeenCalledTimes(1);

    soraAddressRef.value = 'sora-1';
    await nextTick();
    expect(updateExternalBalanceSpy).toHaveBeenCalledTimes(2);
    expect(updateFeesAndLockedFundsSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('refreshes registered assets and financial state after the selected Sub network recovers', async () => {
    selectedNetworkRef.value = createNetworkData(SubNetworkId.Liberland);
    selectedNetworkTypeRef.value = BridgeNetworkType.Sub;
    bridgeStoreMock.form.assetAddress = '0xLiberlandAsset';
    subNetworkConnectionStateRef.value = {
      network: SubNetworkId.Liberland,
      connection: null,
      connecting: true,
      ready: false,
    };
    const wrapper = await mountBridgeContainer();

    subNetworkConnectionStateRef.value = {
      network: SubNetworkId.Liberland,
      connection: null,
      connecting: false,
      ready: true,
    };
    await nextTick();
    await flushPromises();

    expect(getRegisteredAssetsSpy).toHaveBeenCalledTimes(1);
    expect(setAssetAddressSpy).toHaveBeenCalledWith('0xLiberlandAsset');

    wrapper.unmount();
  });

  it('ignores readiness from a Sub network that is no longer selected', async () => {
    selectedNetworkRef.value = createNetworkData(SubNetworkId.Liberland);
    selectedNetworkTypeRef.value = BridgeNetworkType.Sub;
    subNetworkConnectionStateRef.value = {
      network: 'another-network',
      connection: null,
      connecting: false,
      ready: false,
    };
    const wrapper = await mountBridgeContainer();

    subNetworkConnectionStateRef.value = {
      network: 'another-network',
      connection: null,
      connecting: false,
      ready: true,
    };
    await nextTick();
    await flushPromises();

    expect(getRegisteredAssetsSpy).not.toHaveBeenCalled();
    expect(setAssetAddressSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('disconnects external networks on unmount', async () => {
    const wrapper = await mountBridgeContainer();

    expect(disconnectExternalNetworkSpy).not.toHaveBeenCalled();

    wrapper.unmount();

    expect(disconnectExternalNetworkSpy).toHaveBeenCalledTimes(1);
  });

  it('prepares an explicit guided asset after bridge apps initialize instead of restoring unrelated funding', async () => {
    guidedRoute.query = { campaign: 'tonswap', getTs: '1', asset: 'DAI' };
    const wrapper = await mountBridgeContainer();
    await subscriptionsArgs.startSubscriptions[2]!();
    expect(getSupportedAppsSpy).toHaveBeenCalledOnce();
    expect(prepareEthereumFundingSpy).toHaveBeenCalledWith('DAI', '');
    expect(restoreSelectedNetworkSpy).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(cancelPreparationSpy).toHaveBeenCalled();
  });

  it('prefills the campaign DAI amount once and does not apply the draft to ordinary bridge visits', async () => {
    useGetTsPlan().updatePlan({ daiAmount: '12.000000000000000001' });
    const ordinary = await mountBridgeContainer();
    await subscriptionsArgs.startSubscriptions[2]!();
    expect(prepareEthereumFundingSpy).not.toHaveBeenCalled();
    ordinary.unmount();
    guidedRoute.query = { campaign: 'tonswap', getTs: '1', asset: 'DAI' };
    const guided = await mountBridgeContainer();
    await subscriptionsArgs.startSubscriptions[2]!();
    expect(prepareEthereumFundingSpy).toHaveBeenLastCalledWith('DAI', '12.000000000000000001');
    externalAccountRef.value = 'another-wallet';
    subscriptionsDataLoadingRef.value = false;
    await nextTick();
    await flushPromises();
    expect(prepareEthereumFundingSpy).toHaveBeenLastCalledWith('DAI', '');
    guided.unmount();
  });

  it('prefills only the selected purchase purpose and changes drafts when its explicit route changes', async () => {
    useGetTsPlan().updatePlan({ daiAmount: '12.000000000000000001' });
    useGetTsPlan('xor').updatePlan({ daiAmount: '3.000000000000000002' });
    guidedRoute.query = { buyXor: '1', asset: 'DAI' };
    const wrapper = await mountBridgeContainer();
    await subscriptionsArgs.startSubscriptions[2]!();
    expect(prepareEthereumFundingSpy).toHaveBeenLastCalledWith('DAI', '3.000000000000000002');
    subscriptionsDataLoadingRef.value = false;
    guidedRoute.query = { campaign: 'tonswap', getTs: '1', asset: 'DAI' };
    await nextTick();
    await flushPromises();
    expect(prepareEthereumFundingSpy).toHaveBeenLastCalledWith('DAI', '12.000000000000000001');
    wrapper.unmount();
  });

  it('never applies a guided asset query on an existing transaction route', async () => {
    guidedRoute.path = '/bridge/transaction';
    guidedRoute.query = { campaign: 'tonswap', getTs: '1', asset: 'DAI' };
    const wrapper = await mountBridgeContainer();
    await subscriptionsArgs.startSubscriptions[2]!();
    expect(prepareEthereumFundingSpy).not.toHaveBeenCalled();
    expect(restoreSelectedNetworkSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('keeps a failed guided preparation from exposing an actionable stale bridge form', async () => {
    guidedRoute.query = { campaign: 'tonswap', getTs: '1', asset: 'DAI' };
    fundingError.value = 'asset-unavailable';
    subscriptionsDataLoadingRef.value = false;
    const wrapper = await mountBridgeContainer();
    expect(routerViewProps.at(-1)?.fundingPreparationBlocked).toBe(true);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('blocks guided confirmation before metadata initialization has begun', async () => {
    guidedRoute.query = { campaign: 'tonswap', getTs: '1', asset: 'DAI' };
    const wrapper = await mountBridgeContainer();
    expect(prepareEthereumFundingSpy).not.toHaveBeenCalled();
    expect(routerViewProps.at(-1)?.fundingPreparationBlocked).toBe(true);
    fundingStatus.value = 'ready';
    await nextTick();
    expect(routerViewProps.at(-1)?.fundingPreparationBlocked).toBe(false);
    wrapper.unmount();
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
