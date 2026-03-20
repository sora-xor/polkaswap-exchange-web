import * as vuexCompat from './vuex-compat';

export type AppStoreOptions<S> = import('./vuex-compat').StoreOptions<S>;
export type CreatedAppStore<T extends AppStoreOptions<any>> = import('./vuex-compat').CreatedStore<T>;

const createAppBridge = vuexCompat.createDirectStore as <T extends AppStoreOptions<any>>(
  options: T
) => CreatedAppStore<T>;

/**
 * Stable bootstrap entry for the app's Vuex compatibility store while the
 * remaining feature modules continue their Pinia migration.
 */
export const createAppStoreBridge = createAppBridge;
