const ROOT_STORE_COMPAT_CACHE = new WeakMap<object, RuntimeStore>();

export type RuntimeStore = {
  state?: Record<string, unknown>;
  getters?: Record<string, unknown>;
  commit?: Record<string, unknown>;
  dispatch?: Record<string, unknown>;
  subscribe?: (handler: (...args: unknown[]) => void) => () => void;
  original?: RuntimeStore;
};

let rootStoreInstance: RuntimeStore | null = null;
let rootStoreOverride: RuntimeStore | null = null;

type RuntimeStoreLike = RuntimeStore & {
  getters?: Record<string, unknown>;
  original?: RuntimeStore;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

const resolveRootStore = (instance: unknown): RuntimeStore | null => {
  if (!isRecord(instance)) return null;

  const store = instance as RuntimeStoreLike;
  const original = isRecord(store.original) ? (store.original as RuntimeStoreLike) : null;

  if (!original?.getters || !store.getters) {
    return store;
  }

  const cached = ROOT_STORE_COMPAT_CACHE.get(store as object);
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
  }) as RuntimeStore;

  ROOT_STORE_COMPAT_CACHE.set(store as object, compatStore);

  return compatStore;
};

export const setRootStore = (store: RuntimeStore): void => {
  const resolvedStore = resolveRootStore(store) ?? store;

  rootStoreInstance = resolvedStore;
};

export const getRootStore = (): RuntimeStore => {
  const store = rootStoreOverride ?? rootStoreInstance;

  if (!store) {
    throw new Error('Root store has not been initialised.');
  }

  return store;
};

export const setRootStoreOverride = (store: RuntimeStore | null): void => {
  rootStoreOverride = store ? (resolveRootStore(store) ?? store) : null;
};
