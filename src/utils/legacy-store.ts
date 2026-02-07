import type { CreatedStore, StoreOptions } from 'direct-vuex';

type AnyStoreOptions = StoreOptions<unknown>;
export type LegacyStore = CreatedStore<AnyStoreOptions>['store'];

const LEGACY_STORE_TOKEN = '__POLKASWAP_LEGACY_STORE__';
const LEGACY_STORE_OVERRIDE_TOKEN = '__POLKASWAP_LEGACY_STORE_OVERRIDE__';

const getGlobalScope = (): Record<string, unknown> => {
  return globalThis as Record<string, unknown>;
};

export const setLegacyStore = (instance: LegacyStore): void => {
  getGlobalScope()[LEGACY_STORE_TOKEN] = instance;
};

export const getLegacyStore = (): LegacyStore | null => {
  const scope = getGlobalScope();
  return (
    (scope[LEGACY_STORE_TOKEN] as LegacyStore | undefined) ??
    (scope[LEGACY_STORE_OVERRIDE_TOKEN] as LegacyStore | undefined) ??
    null
  );
};

export const requireLegacyStore = (): LegacyStore => {
  const legacyStore =
    getLegacyStore() ?? ((globalThis as Record<string, unknown>).__PS_APP_STORE__ as LegacyStore | undefined);
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
    scope[LEGACY_STORE_OVERRIDE_TOKEN] = instance;
  } else {
    delete scope[LEGACY_STORE_OVERRIDE_TOKEN];
  }
};
