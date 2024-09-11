import { axiosInstance } from '@sora-substrate/sdk';

import type VueRouter from 'vue-router';

export const BASE_URL = process.env.BASE_URL;

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
