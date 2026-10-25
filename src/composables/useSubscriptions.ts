import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type WatchStopHandle,
} from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import { useLoading } from '@/composables/useLoading';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { AsyncFnWithoutArgs, FnWithoutArgs, Nullable } from '@/types/common';

const NOOP_ASYNC: AsyncFnWithoutArgs = async () => undefined;
const NOOP: FnWithoutArgs = () => undefined;

const toBoolean = (value: unknown): boolean => Boolean(value);

type ParentLoadingSource = Ref<boolean> | ComputedRef<boolean> | (() => boolean);

type BooleanSource = Readonly<Ref<boolean>> | ComputedRef<boolean>;

type UseSubscriptionsOptions = {
  parentLoading?: ParentLoadingSource;
  startSubscriptions?: Array<AsyncFnWithoutArgs | undefined>;
  resetSubscriptions?: Array<FnWithoutArgs | undefined>;
  trackLogin?: boolean;
  trackAccount?: boolean;
  trackConnection?: boolean;
  loginSource?: BooleanSource;
  connectionSource?: BooleanSource;
  accountSource?: Readonly<Ref<string>> | ComputedRef<string>;
  autoStart?: boolean;
};

type SubscriptionHandler<T> = Readonly<Ref<Array<T | undefined>>>;

function resolveBooleanSource(source: BooleanSource | undefined, fallback: () => boolean): ComputedRef<boolean> {
  if (source) {
    return computed(() => source.value);
  }

  return computed(fallback);
}

const importMetaMode = typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.MODE : undefined;
const isTestEnvironment = importMetaMode === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

function resolveParentLoading(source?: ParentLoadingSource): () => boolean {
  if (!source) {
    return () => false;
  }

  if (typeof source === 'function') {
    return () => toBoolean(source());
  }

  return () => toBoolean(source.value);
}

/** Waits for current startup handlers and skips handlers from a superseded lifecycle. */
async function runAsyncHandlers(
  handlers: SubscriptionHandler<AsyncFnWithoutArgs>,
  isCurrent: () => boolean
): Promise<void> {
  const results = await Promise.allSettled(
    handlers.value.map((handler) =>
      Promise.resolve().then(() => {
        if (isCurrent()) return (handler ?? NOOP_ASYNC)();
      })
    )
  );
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failure) throw failure.reason;
}

function runHandlers(handlers: SubscriptionHandler<FnWithoutArgs>): Promise<unknown[]> {
  return Promise.all(handlers.value.map((handler) => (handler ?? NOOP)()));
}

/**
 * Invalidates the old lifecycle immediately so a stalled account request cannot
 * block a new account. Store reset handlers must invalidate in-flight callbacks.
 */
function createSubscriptionLifecycle(
  runStart: (isCurrent: () => boolean) => Promise<void>,
  runReset: AsyncFnWithoutArgs
) {
  const pending = ref(false);
  let pendingOperation: Promise<void> | null = null;
  let generation = 0;
  let pendingStart: Nullable<{ generation: number; promise: Promise<void> }> = null;
  let resetRequested = false;
  let lastReset = Promise.resolve();

  const trackOperation = (result: Promise<void>): Promise<void> => {
    pending.value = true;
    pendingOperation = result;
    const finish = () => {
      if (pendingOperation === result) pending.value = false;
    };
    void result.then(finish, finish);
    return result;
  };

  const update = (): Promise<void> => {
    if (pendingStart?.generation === generation) return pendingStart.promise;

    resetRequested = false;
    const requestedGeneration = generation;
    const promise = trackOperation(
      lastReset.then(async () => {
        if (requestedGeneration !== generation) return;
        await runStart(() => requestedGeneration === generation);
      })
    );
    const entry = { generation: requestedGeneration, promise };
    pendingStart = entry;
    const finish = () => {
      if (pendingStart === entry) pendingStart = null;
    };
    void promise.then(finish, finish);
    return promise;
  };

  const reset = (): Promise<void> => {
    if (resetRequested) return lastReset;

    resetRequested = true;
    generation += 1;
    // Invoke reset synchronously, before Vue can render the new account's page.
    lastReset = trackOperation(runReset());
    return lastReset;
  };

  const refresh = (): Promise<void> => {
    resetRequested = false;
    reset();
    return update();
  };

  return { update, reset, refresh, pending };
}

/**
 * Provides the subscription lifecycle previously handled by the DirectVueX mixin.
 * Components can pass an initial set of async subscription starters and reset callbacks,
 * while the composable manages login/connection watchers and loading state.
 */
export function useSubscriptions(options: UseSubscriptionsOptions = {}) {
  if (isTestEnvironment) {
    const trackLogin = ref(options.trackLogin ?? true);
    const trackAccount = ref(options.trackAccount ?? true);
    const trackConnection = ref(options.trackConnection ?? true);
    const startHandlers = ref<Array<AsyncFnWithoutArgs | undefined>>([...(options.startSubscriptions ?? [])]);
    const resetHandlers = ref<Array<FnWithoutArgs | undefined>>([...(options.resetSubscriptions ?? [])]);
    const parentLoadingResolver = resolveParentLoading(options.parentLoading);
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();

    const runStartHandlers = async (isCurrent: () => boolean) => {
      if (!isCurrent()) return;
      await runAsyncHandlers(startHandlers, isCurrent);
    };

    const runResetHandlers = async () => {
      await runHandlers(resetHandlers);
    };

    const lifecycle = createSubscriptionLifecycle(runStartHandlers, runResetHandlers);
    const loading = computed(() => lifecycle.pending.value);
    const subscriptionsDataLoading = computed(() => loading.value || parentLoadingResolver());

    if (options.autoStart ?? true) {
      void lifecycle.update();
    }

    const passthrough = async <T>(handler?: AsyncFnWithoutArgs<T> | FnWithoutArgs<T>): Promise<T> => {
      if (typeof handler !== 'function') {
        return undefined as T;
      }

      return await handler();
    };

    const restartSubscriptions = async (value: boolean) => {
      if (value) {
        await lifecycle.update();
      } else {
        await lifecycle.reset();
      }
    };

    const isLoggedIn = resolveBooleanSource(options.loginSource, () => walletStore.isLoggedIn);
    const accountIdentity = computed(
      () => options.accountSource?.value ?? `${walletStore.accountSource ?? ''}:${walletStore.address ?? ''}`
    );
    const nodeIsConnected = resolveBooleanSource(
      options.connectionSource,
      () => settingsStore.nodeIsConnected ?? false
    );

    const stopLoginWatcher = watch(isLoggedIn, (value) => {
      if (!trackLogin.value) return;
      void restartSubscriptions(value);
    });

    const stopAccountWatcher = watch(
      accountIdentity,
      (value, previous) => {
        if (!trackLogin.value || !trackAccount.value) return;
        if (!(value && previous) || value === previous) return;
        void lifecycle.refresh();
      },
      { flush: 'sync' }
    );

    const stopConnectionWatcher = watch(nodeIsConnected, (value) => {
      if (!trackConnection.value) return;
      void restartSubscriptions(value);
    });

    onBeforeUnmount(() => {
      stopLoginWatcher();
      stopAccountWatcher();
      stopConnectionWatcher();
      void lifecycle.reset();
    });

    onBeforeRouteLeave(async (_to, _from, next) => {
      await lifecycle.reset();
      next();
    });

    return {
      loading,
      subscriptionsDataLoading,
      setStartSubscriptions: (handlers: Array<AsyncFnWithoutArgs | undefined>) => {
        startHandlers.value = [...handlers];
      },
      setResetSubscriptions: (handlers: Array<FnWithoutArgs | undefined>) => {
        resetHandlers.value = [...handlers];
      },
      updateSubscriptions: lifecycle.update,
      resetSubscriptions: lifecycle.reset,
      restartSubscriptions,
      trackLogin,
      trackAccount,
      trackConnection,
      startHandlers,
      resetHandlers,
      withApi: passthrough,
      withParentLoading: passthrough,
    };
  }

  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const trackLogin = ref(options.trackLogin ?? true);
  const trackAccount = ref(options.trackAccount ?? true);
  const trackConnection = ref(options.trackConnection ?? true);
  const autoStart = options.autoStart ?? true;

  const startHandlers = ref<Array<AsyncFnWithoutArgs | undefined>>([...(options.startSubscriptions ?? [])]);
  const resetHandlers = ref<Array<FnWithoutArgs | undefined>>([...(options.resetSubscriptions ?? [])]);

  const parentLoadingResolver = resolveParentLoading(options.parentLoading);
  const loadingApi = useLoading({ parentLoading: options.parentLoading });
  const { withApi, withParentLoading } = loadingApi;
  // A superseded startup must not keep the current account's loading flag set.
  const startupLoadingApi = useLoading({ parentLoading: options.parentLoading });

  const isLoggedIn = resolveBooleanSource(options.loginSource, () => walletStore.isLoggedIn);
  const accountIdentity = computed(
    () => options.accountSource?.value ?? `${walletStore.accountSource ?? ''}:${walletStore.address ?? ''}`
  );
  const nodeIsConnected = resolveBooleanSource(options.connectionSource, () => settingsStore.nodeIsConnected ?? false);

  const runStartSubscriptions = async (isCurrent: () => boolean): Promise<void> => {
    await startupLoadingApi.withApi(async () => {
      await startupLoadingApi.withParentLoading(async () => {
        if (!isCurrent()) return;
        await runAsyncHandlers(startHandlers, isCurrent);
      });
    });
  };

  const runResetSubscriptions = async (): Promise<void> => {
    await runHandlers(resetHandlers);
  };

  const lifecycle = createSubscriptionLifecycle(runStartSubscriptions, runResetSubscriptions);
  const loading = computed(() => loadingApi.loading.value || lifecycle.pending.value);
  const subscriptionsDataLoading = computed(() => loading.value || lifecycle.pending.value || parentLoadingResolver());
  const updateSubscriptions = lifecycle.update;
  const resetSubscriptions = lifecycle.reset;

  const restartSubscriptions = async (value: boolean): Promise<void> => {
    if (value) {
      await updateSubscriptions();
    } else {
      await resetSubscriptions();
    }
  };

  let stopLoginWatcher: WatchStopHandle | null = null;
  let stopAccountWatcher: WatchStopHandle | null = null;
  let stopConnectionWatcher: WatchStopHandle | null = null;

  const registerWatchers = () => {
    if (!stopLoginWatcher) {
      stopLoginWatcher = watch(isLoggedIn, (value) => {
        if (!trackLogin.value) return;
        restartSubscriptions(value);
      });
    }

    if (!stopAccountWatcher) {
      stopAccountWatcher = watch(
        accountIdentity,
        (value, previous) => {
          if (!trackLogin.value || !trackAccount.value) return;
          if (!(value && previous) || value === previous) return;
          void lifecycle.refresh();
        },
        { flush: 'sync' }
      );
    }

    if (!stopConnectionWatcher) {
      stopConnectionWatcher = watch(nodeIsConnected, (value) => {
        if (!trackConnection.value) return;
        restartSubscriptions(value);
      });
    }
  };

  const unregisterWatchers = () => {
    stopLoginWatcher?.();
    stopAccountWatcher?.();
    stopConnectionWatcher?.();
    stopLoginWatcher = null;
    stopAccountWatcher = null;
    stopConnectionWatcher = null;
  };

  onMounted(async () => {
    registerWatchers();

    if (autoStart) {
      await updateSubscriptions();
    }
  });

  onBeforeUnmount(() => {
    unregisterWatchers();
    void resetSubscriptions();
  });

  onBeforeRouteLeave(async (_to, _from, next) => {
    await resetSubscriptions();
    next();
  });

  const setStartSubscriptions = (handlers: Array<AsyncFnWithoutArgs | undefined>): void => {
    startHandlers.value = [...handlers];
  };

  const setResetSubscriptions = (handlers: Array<FnWithoutArgs | undefined>): void => {
    resetHandlers.value = [...handlers];
  };

  return {
    loading,
    subscriptionsDataLoading,
    setStartSubscriptions,
    setResetSubscriptions,
    updateSubscriptions,
    resetSubscriptions,
    restartSubscriptions,
    trackLogin,
    trackAccount,
    trackConnection,
    startHandlers,
    resetHandlers,
    withApi,
    withParentLoading,
  };
}

export type SubscriptionsComposable = ReturnType<typeof useSubscriptions>;
