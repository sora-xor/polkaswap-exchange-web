import type { CreatedStore, StoreOptions } from 'direct-vuex';

type AnyStoreOptions = StoreOptions<unknown>;
export type LegacyStore = CreatedStore<AnyStoreOptions>['store'];
type LegacyStoreLike = LegacyStore & {
  original?: LegacyStore;
  getters?: Record<string, unknown>;
};

const LEGACY_STORE_TOKEN = '__POLKASWAP_LEGACY_STORE__';
const LEGACY_STORE_OVERRIDE_TOKEN = '__POLKASWAP_LEGACY_STORE_OVERRIDE__';
const LEGACY_COMPAT_CACHE = new WeakMap<object, LegacyStore>();

const getGlobalScope = (): Record<string, unknown> => {
  return globalThis as Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object';
};

const resolveLegacyStore = (instance: unknown): LegacyStore | null => {
  if (!isRecord(instance)) return null;

  const store = instance as LegacyStoreLike;
  const original = isRecord(store.original) ? (store.original as LegacyStoreLike) : null;

  if (!original?.getters || !store.getters) {
    return store as LegacyStore;
  }

  const cached = LEGACY_COMPAT_CACHE.get(store as object);
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
  }) as LegacyStore;

  LEGACY_COMPAT_CACHE.set(store as object, compatStore);
  return compatStore;
};

export const setLegacyStore = (instance: LegacyStore): void => {
  getGlobalScope()[LEGACY_STORE_TOKEN] = resolveLegacyStore(instance) ?? instance;
};

export const getLegacyStore = (): LegacyStore | null => {
  const scope = getGlobalScope();
  return (
    resolveLegacyStore(scope[LEGACY_STORE_TOKEN]) ?? resolveLegacyStore(scope[LEGACY_STORE_OVERRIDE_TOKEN]) ?? null
  );
};

export const requireLegacyStore = (): LegacyStore => {
  const legacyStore = getLegacyStore() ?? resolveLegacyStore((globalThis as Record<string, unknown>).__PS_APP_STORE__);
  if (!legacyStore) {
    console.warn('Legacy Vuex store has not been initialized yet.');
    // Return a noop-like proxy to avoid hard crashes; runtime consumers should handle missing store defensively.
    return new Proxy(
      {},
      {
        get() {
          return {};
        },
      }
    ) as LegacyStore;
  }
  return legacyStore;
};

export const withLegacyStore = <T>(callback: (store: LegacyStore) => T): T | undefined => {
  const legacyStore = getLegacyStore();
  if (!legacyStore) return undefined;
  return callback(legacyStore);
};

export const setLegacyStoreOverride = (instance: LegacyStore | null): void => {
  const scope = getGlobalScope();
  if (instance) {
    scope[LEGACY_STORE_OVERRIDE_TOKEN] = resolveLegacyStore(instance) ?? instance;
  } else {
    delete scope[LEGACY_STORE_OVERRIDE_TOKEN];
  }
};
