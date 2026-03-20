import type { AppStoreOptions, CreatedAppStore } from '@/store/app-store-bridge';

type AnyStoreOptions = AppStoreOptions<unknown>;
export type AppStoreRuntime = CreatedAppStore<AnyStoreOptions>['store'];
type AppStoreLike = AppStoreRuntime & {
  original?: AppStoreRuntime;
  getters?: Record<string, unknown>;
};

const APP_STORE_TOKEN = '__POLKASWAP_APP_STORE__';
const APP_STORE_OVERRIDE_TOKEN = '__POLKASWAP_APP_STORE_OVERRIDE__';
const LEGACY_STORE_TOKEN = '__POLKASWAP_LEGACY_STORE__';
const LEGACY_STORE_OVERRIDE_TOKEN = '__POLKASWAP_LEGACY_STORE_OVERRIDE__';
const GLOBAL_APP_STORE_TOKEN = '__PS_APP_STORE__';
const APP_COMPAT_CACHE = new WeakMap<object, AppStoreRuntime>();

const getGlobalScope = (): Record<string, unknown> => {
  return globalThis as Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object';
};

const resolveAppStore = (instance: unknown): AppStoreRuntime | null => {
  if (!isRecord(instance)) return null;

  const store = instance as AppStoreLike;
  const original = isRecord(store.original) ? (store.original as AppStoreLike) : null;

  if (!original?.getters || !store.getters) {
    return store as AppStoreRuntime;
  }

  const cached = APP_COMPAT_CACHE.get(store as object);
  if (cached) {
    return cached;
  }

  const mergedGetters = new Proxy(store.getters, {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      return Reflect.get(original.getters as Record<string, unknown>, prop, original.getters);
    },
  });

  const compatStore = new Proxy(store, {
    get(target, prop, receiver) {
      if (prop === 'getters') {
        return mergedGetters;
      }

      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }

      return Reflect.get(original as Record<string, unknown>, prop, original);
    },
  }) as AppStoreRuntime;

  APP_COMPAT_CACHE.set(store as object, compatStore);
  return compatStore;
};

export const setAppStore = (instance: AppStoreRuntime): void => {
  const scope = getGlobalScope();
  const resolved = resolveAppStore(instance) ?? instance;
  scope[APP_STORE_TOKEN] = resolved;
  scope[LEGACY_STORE_TOKEN] = resolved;
  scope[GLOBAL_APP_STORE_TOKEN] = resolved;
};

export const getAppStore = (): AppStoreRuntime | null => {
  const scope = getGlobalScope();
  return (
    resolveAppStore(scope[APP_STORE_TOKEN]) ??
    resolveAppStore(scope[APP_STORE_OVERRIDE_TOKEN]) ??
    resolveAppStore(scope[LEGACY_STORE_TOKEN]) ??
    resolveAppStore(scope[LEGACY_STORE_OVERRIDE_TOKEN]) ??
    resolveAppStore(scope[GLOBAL_APP_STORE_TOKEN]) ??
    null
  );
};

export const requireAppStore = (): AppStoreRuntime => {
  const appStore = getAppStore();
  if (!appStore) {
    console.warn('App Vuex store has not been initialized yet.');
    return new Proxy(
      {},
      {
        get() {
          return {};
        },
      }
    ) as AppStoreRuntime;
  }
  return appStore;
};

export const withAppStore = <T>(callback: (store: AppStoreRuntime) => T): T | undefined => {
  const appStore = getAppStore();
  if (!appStore) return undefined;
  return callback(appStore);
};

export const setAppStoreOverride = (instance: AppStoreRuntime | null): void => {
  const scope = getGlobalScope();
  if (instance) {
    const resolved = resolveAppStore(instance) ?? instance;
    scope[APP_STORE_OVERRIDE_TOKEN] = resolved;
    scope[LEGACY_STORE_OVERRIDE_TOKEN] = resolved;
  } else {
    delete scope[APP_STORE_OVERRIDE_TOKEN];
    delete scope[LEGACY_STORE_OVERRIDE_TOKEN];
  }
};
