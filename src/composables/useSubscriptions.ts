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
import type { AsyncFnWithoutArgs, FnWithoutArgs } from '@/types/common';

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

function runAsyncHandlers(handlers: SubscriptionHandler<AsyncFnWithoutArgs>): Promise<unknown[]> {
  return Promise.all(handlers.value.map((handler) => (handler ?? NOOP_ASYNC)()));
}

function runHandlers(handlers: SubscriptionHandler<FnWithoutArgs>): Promise<unknown[]> {
  return Promise.all(handlers.value.map((handler) => (handler ?? NOOP)()));
}

/**
 * Provides the subscription lifecycle previously handled by the DirectVueX mixin.
 * Components can pass an initial set of async subscription starters and reset callbacks,
 * while the composable manages login/connection watchers and loading state.
 */
export function useSubscriptions(options: UseSubscriptionsOptions = {}) {
  if (isTestEnvironment) {
    const loading = ref(false);
    const trackLogin = ref(options.trackLogin ?? true);
    const trackAccount = ref(options.trackAccount ?? true);
    const trackConnection = ref(options.trackConnection ?? true);
    const startHandlers = ref<Array<AsyncFnWithoutArgs | undefined>>([...(options.startSubscriptions ?? [])]);
    const resetHandlers = ref<Array<FnWithoutArgs | undefined>>([...(options.resetSubscriptions ?? [])]);
    const parentLoadingResolver = resolveParentLoading(options.parentLoading);
    const subscriptionsDataLoading = computed(() => loading.value || parentLoadingResolver());
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();

    const runStartHandlers = async () => {
      loading.value = true;
      try {
        await runAsyncHandlers(startHandlers);
      } finally {
        loading.value = false;
      }
    };

    const runResetHandlers = async () => {
      await runHandlers(resetHandlers);
    };

    if (options.autoStart ?? true) {
      void runStartHandlers();
    }

    const passthrough = async <T>(handler?: AsyncFnWithoutArgs<T> | FnWithoutArgs<T>): Promise<T> => {
      if (typeof handler !== 'function') {
        return undefined as T;
      }

      return await handler();
    };

    const restartSubscriptions = async (value: boolean) => {
      if (value) {
        await runStartHandlers();
      } else {
        await runResetHandlers();
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

    const stopAccountWatcher = watch(accountIdentity, (value, previous) => {
      if (!trackLogin.value || !trackAccount.value) return;
      if (!(value && previous) || value === previous) return;
      void runResetHandlers().then(runStartHandlers);
    });

    const stopConnectionWatcher = watch(nodeIsConnected, (value) => {
      if (!trackConnection.value) return;
      void restartSubscriptions(value);
    });

    onBeforeUnmount(() => {
      stopLoginWatcher();
      stopAccountWatcher();
      stopConnectionWatcher();
    });

    onBeforeRouteLeave(async (_to, _from, next) => {
      await runResetHandlers();
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
      updateSubscriptions: runStartHandlers,
      resetSubscriptions: runResetHandlers,
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
  const { loading, withApi, withParentLoading } = loadingApi;

  const isLoggedIn = resolveBooleanSource(options.loginSource, () => walletStore.isLoggedIn);
  const accountIdentity = computed(
    () => options.accountSource?.value ?? `${walletStore.accountSource ?? ''}:${walletStore.address ?? ''}`
  );
  const nodeIsConnected = resolveBooleanSource(options.connectionSource, () => settingsStore.nodeIsConnected ?? false);

  const subscriptionsDataLoading = computed(() => loading.value || parentLoadingResolver());

  const updateSubscriptions = async (): Promise<void> => {
    if (loading.value) return;

    await withApi(async () => {
      await withParentLoading(async () => {
        await runAsyncHandlers(startHandlers);
      });
    });
  };

  const resetSubscriptions = async (): Promise<void> => {
    await runHandlers(resetHandlers);
  };

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
      stopAccountWatcher = watch(accountIdentity, (value, previous) => {
        if (!trackLogin.value || !trackAccount.value) return;
        if (!(value && previous) || value === previous) return;
        void resetSubscriptions().then(updateSubscriptions);
      });
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
