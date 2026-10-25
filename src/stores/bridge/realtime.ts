import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import { normalizeRealtimeProfile } from '@/services/realtime';
import { syncExternalBlockNumberCompat } from '@/stores/bridge/stateMutations';
import { useSettingsStore } from '@/stores/settings';
import { useWeb3Store } from '@/stores/web3';
import ethersUtil from '@/utils/ethers-util';

import type { TransactionSignVisibilityController } from '@/lib/soraneo-wallet/src/util';
import type { BridgeStateStoreLike } from '@/stores/bridge/stateMutations';
import type { BridgeState } from '@/stores/bridge/types';
import type { RealtimeProfile } from '@/services/realtime';

export type BridgeRealtimeStoreLike = BridgeStateStoreLike &
  Pick<BridgeState, 'connector'> & {
    $subscribe: (callback: (mutation: unknown, state: BridgeState) => void, options?: unknown) => () => void;
    setSignTxDialogVisibility: (visible: boolean) => void;
    updateExternalBalance: () => Promise<void>;
    updateExternalMinBalance: () => Promise<void>;
    updateFeesAndLockedFunds: () => Promise<void>;
  };

export type BridgeRealtimeRuntimeState = {
  reconcileTimer: ReturnType<typeof setTimeout> | null;
  reconcileInFlight: boolean;
  reconcileLastRunTs: number;
  reconcilePending: boolean;
  workerLifecycle: Promise<void>;
};

const BRIDGE_REALTIME_RUNTIME_STATE = new WeakMap<object, BridgeRealtimeRuntimeState>();
const PROFILE_RECONCILE_INTERVAL_MS: Record<RealtimeProfile, { visible: number; hidden: number }> = {
  balanced: { visible: 1000, hidden: 5000 },
  ultra: { visible: 250, hidden: 1000 },
  load_first: { visible: 2000, hidden: 7000 },
};
let lastEvmBlockPollTs = 0;

/**
 * Creates the bridge-owned sign dialog controller expected by wallet signing utilities.
 */
export const createBridgeSignDialogController = (
  store: BridgeRealtimeStoreLike
): TransactionSignVisibilityController => {
  return {
    setVisibility: (visible: boolean) => {
      store.setSignTxDialogVisibility(visible);
    },
    subscribe: (handler: (visible: boolean) => void) => {
      let previous = Boolean(store.flags.isSignTxDialogVisible);

      return store.$subscribe(
        (_mutation, state) => {
          const next = Boolean(state.flags?.isSignTxDialogVisible);

          if (next === previous) {
            return;
          }

          previous = next;
          handler(next);
        },
        { detached: true, flush: 'sync' }
      );
    },
  };
};

/**
 * Returns the mutable realtime runtime state associated with a bridge store instance.
 */
export const getBridgeRealtimeState = (store: BridgeRealtimeStoreLike): BridgeRealtimeRuntimeState => {
  const key = store as object;
  const existing = BRIDGE_REALTIME_RUNTIME_STATE.get(key);

  if (existing) {
    return existing;
  }

  const created: BridgeRealtimeRuntimeState = {
    reconcileTimer: null,
    reconcileInFlight: false,
    reconcileLastRunTs: 0,
    reconcilePending: false,
    workerLifecycle: Promise.resolve(),
  };

  BRIDGE_REALTIME_RUNTIME_STATE.set(key, created);

  return created;
};

/**
 * Serializes worker cleanup/startup work so stale worker disconnects cannot race new subscriptions.
 */
export const enqueueWorkerLifecycle = (store: BridgeRealtimeStoreLike, task: () => Promise<void>): Promise<void> => {
  const runtime = getBridgeRealtimeState(store);
  runtime.workerLifecycle = runtime.workerLifecycle.then(task, task).catch(() => undefined);

  return runtime.workerLifecycle;
};

/**
 * Waits for pending worker lifecycle cleanup before starting a new subscription.
 */
export const flushWorkerLifecycle = async (store: BridgeRealtimeStoreLike): Promise<void> => {
  await getBridgeRealtimeState(store).workerLifecycle;
};

/**
 * Resolves the realtime profile currently configured for bridge reconciliation.
 */
export const resolveRealtimeProfile = (): RealtimeProfile => {
  return normalizeRealtimeProfile(useSettingsStore().featureFlags.wsProfile) as RealtimeProfile;
};

/**
 * Resolves the current reconcile interval from realtime profile and document visibility.
 */
export const resolveReconcileInterval = (): number => {
  const profile = resolveRealtimeProfile();
  const visible = typeof document === 'undefined' ? true : document.visibilityState === 'visible';
  const schedule = PROFILE_RECONCILE_INTERVAL_MS[profile];

  return visible ? schedule.visible : schedule.hidden;
};

/**
 * Clears a pending reconcile timer and pending reconcile flag.
 */
export const clearReconcileTimer = (store: BridgeRealtimeStoreLike): void => {
  const runtime = getBridgeRealtimeState(store);

  if (runtime.reconcileTimer) {
    clearTimeout(runtime.reconcileTimer);
  }

  runtime.reconcileTimer = null;
  runtime.reconcilePending = false;
};

/**
 * Refreshes bridge-side realtime-dependent balances and fee data.
 */
export const refreshRealtimeBridgeData = async (store: BridgeRealtimeStoreLike): Promise<void> => {
  await Promise.allSettled([
    store.updateExternalBalance(),
    store.updateExternalMinBalance(),
    store.updateFeesAndLockedFunds(),
  ]);
};

export const runScheduledReconcile = async (store: BridgeRealtimeStoreLike): Promise<void> => {
  const runtime = getBridgeRealtimeState(store);

  if (runtime.reconcileInFlight) {
    runtime.reconcilePending = true;
    return;
  }

  runtime.reconcileInFlight = true;
  runtime.reconcilePending = false;
  runtime.reconcileLastRunTs = Date.now();

  try {
    await refreshRealtimeBridgeData(store);
  } finally {
    runtime.reconcileInFlight = false;

    if (runtime.reconcilePending) {
      runtime.reconcilePending = false;
      scheduleReconcile(store);
    }
  }
};

/**
 * Schedules one bridge realtime reconciliation according to the active profile.
 */
export const scheduleReconcile = (store: BridgeRealtimeStoreLike): void => {
  const runtime = getBridgeRealtimeState(store);

  if (runtime.reconcileInFlight) {
    runtime.reconcilePending = true;
    return;
  }

  if (runtime.reconcileTimer) {
    return;
  }

  const interval = resolveReconcileInterval();
  const now = Date.now();
  const delay = Math.max(0, interval - (now - runtime.reconcileLastRunTs));

  runtime.reconcileTimer = setTimeout(() => {
    runtime.reconcileTimer = null;
    void runScheduledReconcile(store);
  }, delay);
};

const resolveEndpointValue = (endpoint?: string | null): string | null => {
  const normalizedEndpoint = endpoint?.trim();

  return normalizedEndpoint || null;
};

/**
 * Resolves the endpoint used by bridge block-update subscriptions.
 */
export const resolveBridgeSubscriptionEndpoint = (store: BridgeRealtimeStoreLike): string | null => {
  if (useWeb3Store().networkType === BridgeNetworkType.Sub) {
    return (
      resolveEndpointValue(store.connector.network?.subNetworkConnection?.connection?.endpoint) ??
      resolveEndpointValue(store.connector.network?.subNetworkConnection?.node?.address)
    );
  }

  const settingsStore = useSettingsStore();

  return (
    resolveEndpointValue(settingsStore.appConnection?.connection?.endpoint) ??
    resolveEndpointValue(settingsStore.appConnection?.node?.address)
  );
};

/**
 * Updates the external bridge block number from subscription payloads or network fallback polling.
 */
export const updateExternalBlockNumber = async (
  store: BridgeRealtimeStoreLike,
  knownSubBlockNumber?: number
): Promise<void> => {
  const isSubBridge = useWeb3Store().networkType === BridgeNetworkType.Sub;

  try {
    if (isSubBridge) {
      if (Number.isFinite(knownSubBlockNumber)) {
        syncExternalBlockNumberCompat(store, knownSubBlockNumber as number);
        return;
      }

      const subNetwork = store.connector?.network;
      if (!subNetwork?.getBlockNumber) {
        syncExternalBlockNumberCompat(store, 0);
        return;
      }

      syncExternalBlockNumberCompat(store, await subNetwork.getBlockNumber());
      return;
    }

    const now = Date.now();
    if (now - lastEvmBlockPollTs < 3000) {
      return;
    }

    lastEvmBlockPollTs = now;
    syncExternalBlockNumberCompat(store, await ethersUtil.getBlockNumber());
  } catch (error) {
    console.error(error);
    syncExternalBlockNumberCompat(store, 0);
  }
};
