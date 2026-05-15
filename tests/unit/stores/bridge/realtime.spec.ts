import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearReconcileTimer,
  createBridgeSignDialogController,
  enqueueWorkerLifecycle,
  flushWorkerLifecycle,
  getBridgeRealtimeState,
  refreshRealtimeBridgeData,
  resolveBridgeSubscriptionEndpoint,
  resolveRealtimeProfile,
  runScheduledReconcile,
  scheduleReconcile,
  updateExternalBlockNumber,
  type BridgeRealtimeStoreLike,
} from '@/stores/bridge/realtime';

import type { BridgeState } from '@/stores/bridge/types';

const settingsStoreMock = vi.hoisted(() => ({
  featureFlags: {
    wsProfile: 'balanced',
  },
  appConnection: {
    connection: {
      endpoint: 'wss://settings-endpoint.test',
    },
    node: {
      address: 'wss://settings-node.test',
    },
  },
}));

const web3StoreMock = vi.hoisted((): { networkType: unknown } => ({
  networkType: null,
}));

const ethersUtilMock = vi.hoisted(() => ({
  getBlockNumber: vi.fn(async () => 987),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => web3StoreMock,
}));

vi.mock('@/utils/ethers-util', () => ({
  default: ethersUtilMock,
}));

type SubscriptionCallback = (mutation: unknown, state: BridgeState) => void;

const bridgeState = (isSignTxDialogVisible: boolean): BridgeState =>
  ({
    flags: {
      isSignTxDialogVisible,
    },
  }) as BridgeState;

const createStore = (
  options: {
    subEndpoint?: string | null;
    subNodeAddress?: string | null;
    getSubBlockNumber?: (() => Promise<number>) | null;
  } = {}
) => {
  const unsubscribe = vi.fn();
  const subscribe = vi.fn((_callback: SubscriptionCallback, _options?: unknown) => unsubscribe);
  const flags = {
    isSignTxDialogVisible: false,
  };
  const setSignTxDialogVisibility = vi.fn((visible: boolean) => {
    flags.isSignTxDialogVisible = visible;
  });
  const updateExternalBalance = vi.fn(async () => undefined);
  const updateExternalMinBalance = vi.fn(async () => undefined);
  const updateFeesAndLockedFunds = vi.fn(async () => undefined);
  const subEndpoint = 'subEndpoint' in options ? options.subEndpoint : 'wss://sub-endpoint.test';
  const subNodeAddress = 'subNodeAddress' in options ? options.subNodeAddress : 'wss://sub-node.test';
  const connection = subEndpoint ? { endpoint: subEndpoint } : null;
  const node = subNodeAddress ? { address: subNodeAddress } : null;
  const getBlockNumber = 'getSubBlockNumber' in options ? options.getSubBlockNumber : vi.fn(async () => 456);

  const store = {
    flags,
    fees: {
      externalBlockNumber: 0,
    },
    connector: {
      network: {
        getBlockNumber,
        subNetworkConnection: {
          connection,
          node,
        },
      },
    },
    $subscribe: subscribe,
    setSignTxDialogVisibility,
    updateExternalBalance,
    updateExternalMinBalance,
    updateFeesAndLockedFunds,
  } as unknown as BridgeRealtimeStoreLike;

  return {
    store,
    subscribe,
    unsubscribe,
    setSignTxDialogVisibility,
    updateExternalBalance,
    updateExternalMinBalance,
    updateFeesAndLockedFunds,
  };
};

describe('bridge realtime helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    ethersUtilMock.getBlockNumber.mockClear();
    ethersUtilMock.getBlockNumber.mockResolvedValue(987);
    settingsStoreMock.featureFlags.wsProfile = 'balanced';
    settingsStoreMock.appConnection.connection.endpoint = 'wss://settings-endpoint.test';
    settingsStoreMock.appConnection.node.address = 'wss://settings-node.test';
    web3StoreMock.networkType = BridgeNetworkType.Sub;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a sign dialog controller that emits only visibility changes', () => {
    const { store, subscribe, setSignTxDialogVisibility, unsubscribe } = createStore();
    const handler = vi.fn();
    const controller = createBridgeSignDialogController(store);

    const stop = controller.subscribe(handler);
    controller.setVisibility(true);

    expect(setSignTxDialogVisibility).toHaveBeenCalledWith(true);
    expect(subscribe).toHaveBeenCalledWith(expect.any(Function), { detached: true, flush: 'sync' });
    expect(stop).toBe(unsubscribe);

    const callback = subscribe.mock.calls[0]?.[0];
    callback?.({}, bridgeState(false));
    callback?.({}, bridgeState(true));
    callback?.({}, bridgeState(true));
    callback?.({}, bridgeState(false));

    expect(handler).toHaveBeenNthCalledWith(1, true);
    expect(handler).toHaveBeenNthCalledWith(2, false);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('serializes worker lifecycle tasks per bridge store instance', async () => {
    const { store } = createStore();
    const sequence: string[] = [];
    let finishFirstTask!: () => void;
    const firstTaskDone = new Promise<void>((resolve) => {
      finishFirstTask = resolve;
    });

    void enqueueWorkerLifecycle(store, async () => {
      sequence.push('first-start');
      await firstTaskDone;
      sequence.push('first-end');
    });
    void enqueueWorkerLifecycle(store, async () => {
      sequence.push('second');
    });

    await Promise.resolve();
    expect(sequence).toEqual(['first-start']);

    finishFirstTask();
    await flushWorkerLifecycle(store);

    expect(sequence).toEqual(['first-start', 'first-end', 'second']);
  });

  it('normalizes realtime profile and schedules reconciliation refreshes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T00:00:00Z'));

    const { store, updateExternalBalance, updateExternalMinBalance, updateFeesAndLockedFunds } = createStore();

    settingsStoreMock.featureFlags.wsProfile = 'unsupported';
    expect(resolveRealtimeProfile()).toBe('balanced');

    scheduleReconcile(store);
    expect(getBridgeRealtimeState(store).reconcileTimer).not.toBeNull();

    await vi.runOnlyPendingTimersAsync();

    expect(updateExternalBalance).toHaveBeenCalledOnce();
    expect(updateExternalMinBalance).toHaveBeenCalledOnce();
    expect(updateFeesAndLockedFunds).toHaveBeenCalledOnce();
    expect(getBridgeRealtimeState(store).reconcileTimer).toBeNull();
  });

  it('settles reconciliation updates without throwing when one refresh fails', async () => {
    const { store, updateExternalBalance, updateExternalMinBalance, updateFeesAndLockedFunds } = createStore();

    updateExternalBalance.mockRejectedValueOnce(new Error('balance unavailable'));

    await expect(refreshRealtimeBridgeData(store)).resolves.toBeUndefined();

    expect(updateExternalBalance).toHaveBeenCalledOnce();
    expect(updateExternalMinBalance).toHaveBeenCalledOnce();
    expect(updateFeesAndLockedFunds).toHaveBeenCalledOnce();
  });

  it('queues a follow-up reconcile when a run is already in flight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T00:00:00Z'));

    const { store, updateExternalBalance } = createStore();
    let finishRefresh!: () => void;
    const refreshFinished = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    updateExternalBalance.mockImplementationOnce(async () => refreshFinished);

    const firstRun = runScheduledReconcile(store);
    await Promise.resolve();
    await runScheduledReconcile(store);

    expect(getBridgeRealtimeState(store).reconcilePending).toBe(true);

    finishRefresh();
    await firstRun;

    expect(getBridgeRealtimeState(store).reconcileTimer).not.toBeNull();

    clearReconcileTimer(store);
    expect(getBridgeRealtimeState(store).reconcileTimer).toBeNull();
    expect(getBridgeRealtimeState(store).reconcilePending).toBe(false);
  });

  it('resolves subscription endpoints from the active bridge network', () => {
    const { store: subStore } = createStore();

    web3StoreMock.networkType = BridgeNetworkType.Sub;
    expect(resolveBridgeSubscriptionEndpoint(subStore)).toBe('wss://sub-endpoint.test');

    const { store: subFallbackStore } = createStore({ subEndpoint: null });
    expect(resolveBridgeSubscriptionEndpoint(subFallbackStore)).toBe('wss://sub-node.test');

    web3StoreMock.networkType = BridgeNetworkType.Evm;
    expect(resolveBridgeSubscriptionEndpoint(subStore)).toBe('wss://settings-endpoint.test');

    settingsStoreMock.appConnection.connection.endpoint = '';
    expect(resolveBridgeSubscriptionEndpoint(subStore)).toBe('wss://settings-node.test');
  });

  it('updates Substrate block numbers from subscription payloads or network fallback', async () => {
    const getSubBlockNumber = vi.fn(async () => 456);
    const { store } = createStore({ getSubBlockNumber });

    web3StoreMock.networkType = BridgeNetworkType.Sub;

    await updateExternalBlockNumber(store, 123);
    expect(store.fees.externalBlockNumber).toBe(123);
    expect(getSubBlockNumber).not.toHaveBeenCalled();

    await updateExternalBlockNumber(store);
    expect(store.fees.externalBlockNumber).toBe(456);
    expect(getSubBlockNumber).toHaveBeenCalledOnce();

    const { store: disconnectedStore } = createStore({ getSubBlockNumber: null });
    await updateExternalBlockNumber(disconnectedStore);
    expect(disconnectedStore.fees.externalBlockNumber).toBe(0);
  });

  it('throttles EVM block number fallback polling', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T00:00:00Z'));

    const { store } = createStore();

    web3StoreMock.networkType = BridgeNetworkType.Evm;

    await updateExternalBlockNumber(store);
    expect(store.fees.externalBlockNumber).toBe(987);
    expect(ethersUtilMock.getBlockNumber).toHaveBeenCalledOnce();

    vi.setSystemTime(new Date('2026-05-15T00:00:01Z'));
    await updateExternalBlockNumber(store);
    expect(ethersUtilMock.getBlockNumber).toHaveBeenCalledOnce();

    ethersUtilMock.getBlockNumber.mockResolvedValueOnce(988);
    vi.setSystemTime(new Date('2026-05-15T00:00:04Z'));
    await updateExternalBlockNumber(store);
    expect(store.fees.externalBlockNumber).toBe(988);
    expect(ethersUtilMock.getBlockNumber).toHaveBeenCalledTimes(2);
  });
});
