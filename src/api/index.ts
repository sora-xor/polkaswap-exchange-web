import { Connection } from '@sora-substrate/connection';
import { axiosInstance } from '@sora-substrate/sdk';
import { api } from '@soramitsu/soraneo-wallet-web';
import { ApiPromise, WsProvider } from 'polkadotApi';

import { NodesConnection } from '@/utils/connection';
import { settingsStorage } from '@/utils/storage';

import type VueRouter from 'vue-router';

export const connection = new Connection(ApiPromise as any, WsProvider as any, {});

export const createAppConnection = () => {
  // inject connection to api
  api.setConnection(connection);

  return new NodesConnection(settingsStorage, connection);
};

export const BASE_URL = import.meta.env.BASE_URL;

axiosInstance.defaults.headers.common['Cache-Control'] = 'no-cache';

export const detectBaseUrl = (router?: VueRouter): string => {
  if (BASE_URL) return BASE_URL;

  if (router && router.mode === 'hash') {
    const { origin, pathname } = window.location;

    return `${origin}${pathname}`;
  }

  return '';
};

export function getRouterMode(router?: VueRouter) {
  return router?.mode === 'hash' ? '#/' : '';
}

/**
 * Returns `detectBaseUrl` + router mode like:
 *
 * polkaswap.io/#/
 */
export function getFullBaseUrl(router?: VueRouter): string {
  const routerMode = getRouterMode(router);
  const baseUrl = detectBaseUrl(router);
  return baseUrl + routerMode;
}

export const updateBaseUrl = (router: VueRouter): void => {
  const baseUrl = detectBaseUrl(router);
  axiosInstance.defaults.baseURL = baseUrl;
};

export default axiosInstance;
