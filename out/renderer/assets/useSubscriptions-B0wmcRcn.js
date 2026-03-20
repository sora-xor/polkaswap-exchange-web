import { a9 as ref, v as useWalletStore, e as useSettingsStore, aA as watch, aB as onBeforeUnmount, aC as onBeforeRouteLeave, h as computed, U as useLoading, a4 as onMounted } from "./index-73GArslZ.js";
var define_process_env_default = {};
const NOOP_ASYNC = async () => void 0;
const NOOP = () => void 0;
const toBoolean = (value) => Boolean(value);
function resolveBooleanSource(source, fallback) {
  if (source) {
    return computed(() => source.value);
  }
  return computed(fallback);
}
const importMetaMode = typeof import.meta !== "undefined" ? "production" : void 0;
const isTestEnvironment = importMetaMode === "test" || false || define_process_env_default.VITEST === "true";
function resolveParentLoading(source) {
  if (!source) {
    return () => false;
  }
  if (typeof source === "function") {
    return () => toBoolean(source());
  }
  return () => toBoolean(source.value);
}
function runAsyncHandlers(handlers) {
  return Promise.all(handlers.value.map((handler) => (handler ?? NOOP_ASYNC)()));
}
function runHandlers(handlers) {
  return Promise.all(handlers.value.map((handler) => (handler ?? NOOP)()));
}
function useSubscriptions(options = {}) {
  if (isTestEnvironment) {
    const loading2 = ref(false);
    const trackLogin2 = ref(options.trackLogin ?? true);
    const trackConnection2 = ref(options.trackConnection ?? true);
    const startHandlers2 = ref([...options.startSubscriptions ?? []]);
    const resetHandlers2 = ref([...options.resetSubscriptions ?? []]);
    const parentLoadingResolver2 = resolveParentLoading(options.parentLoading);
    const subscriptionsDataLoading2 = computed(() => loading2.value || parentLoadingResolver2());
    const walletStore2 = useWalletStore();
    const settingsStore2 = useSettingsStore();
    const runStartHandlers = async () => {
      loading2.value = true;
      try {
        await runAsyncHandlers(startHandlers2);
      } finally {
        loading2.value = false;
      }
    };
    const runResetHandlers = async () => {
      await runHandlers(resetHandlers2);
    };
    if (options.autoStart ?? true) {
      void runStartHandlers();
    }
    const passthrough = async (handler) => {
      if (typeof handler !== "function") {
        return void 0;
      }
      return await handler();
    };
    const restartSubscriptions2 = async (value) => {
      if (value) {
        await runStartHandlers();
      } else {
        await runResetHandlers();
      }
    };
    const isLoggedIn2 = resolveBooleanSource(options.loginSource, () => walletStore2.isLoggedIn);
    const nodeIsConnected2 = resolveBooleanSource(
      options.connectionSource,
      () => settingsStore2.nodeIsConnected ?? false
    );
    const stopLoginWatcher2 = watch(isLoggedIn2, (value) => {
      if (!trackLogin2.value) return;
      void restartSubscriptions2(value);
    });
    const stopConnectionWatcher2 = watch(nodeIsConnected2, (value) => {
      if (!trackConnection2.value) return;
      void restartSubscriptions2(value);
    });
    onBeforeUnmount(() => {
      stopLoginWatcher2();
      stopConnectionWatcher2();
    });
    onBeforeRouteLeave(async (_to, _from, next) => {
      await runResetHandlers();
      next();
    });
    return {
      loading: loading2,
      subscriptionsDataLoading: subscriptionsDataLoading2,
      setStartSubscriptions: (handlers) => {
        startHandlers2.value = [...handlers];
      },
      setResetSubscriptions: (handlers) => {
        resetHandlers2.value = [...handlers];
      },
      updateSubscriptions: runStartHandlers,
      resetSubscriptions: runResetHandlers,
      restartSubscriptions: restartSubscriptions2,
      trackLogin: trackLogin2,
      trackConnection: trackConnection2,
      startHandlers: startHandlers2,
      resetHandlers: resetHandlers2,
      withApi: passthrough,
      withParentLoading: passthrough
    };
  }
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const trackLogin = ref(options.trackLogin ?? true);
  const trackConnection = ref(options.trackConnection ?? true);
  const autoStart = options.autoStart ?? true;
  const startHandlers = ref([...options.startSubscriptions ?? []]);
  const resetHandlers = ref([...options.resetSubscriptions ?? []]);
  const parentLoadingResolver = resolveParentLoading(options.parentLoading);
  const loadingApi = useLoading({ parentLoading: options.parentLoading });
  const { loading, withApi, withParentLoading } = loadingApi;
  const isLoggedIn = resolveBooleanSource(options.loginSource, () => walletStore.isLoggedIn);
  const nodeIsConnected = resolveBooleanSource(options.connectionSource, () => settingsStore.nodeIsConnected ?? false);
  const subscriptionsDataLoading = computed(() => loading.value || parentLoadingResolver());
  const updateSubscriptions = async () => {
    if (loading.value) return;
    await withApi(async () => {
      await withParentLoading(async () => {
        await runAsyncHandlers(startHandlers);
      });
    });
  };
  const resetSubscriptions = async () => {
    await runHandlers(resetHandlers);
  };
  const restartSubscriptions = async (value) => {
    if (value) {
      await updateSubscriptions();
    } else {
      await resetSubscriptions();
    }
  };
  let stopLoginWatcher = null;
  let stopConnectionWatcher = null;
  const registerWatchers = () => {
    if (!stopLoginWatcher) {
      stopLoginWatcher = watch(isLoggedIn, (value) => {
        if (!trackLogin.value) return;
        restartSubscriptions(value);
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
    stopConnectionWatcher?.();
    stopLoginWatcher = null;
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
  const setStartSubscriptions = (handlers) => {
    startHandlers.value = [...handlers];
  };
  const setResetSubscriptions = (handlers) => {
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
    trackConnection,
    startHandlers,
    resetHandlers,
    withApi,
    withParentLoading
  };
}
export {
  useSubscriptions as u
};
