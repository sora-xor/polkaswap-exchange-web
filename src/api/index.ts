import { axiosInstance } from '@/lib/substrate/sdk/http';

import type { Router } from 'vue-router';

export const BASE_URL = import.meta.env.BASE_URL;

type HistoryLike = { type?: string } | undefined;
type RouterLike = Partial<Router> & {
  mode?: string;
  options?: {
    mode?: string;
    history?: HistoryLike;
  };
  history?: HistoryLike;
};

const HASH_HISTORY = 'hash';

const normalizePathname = (pathname: string): string => {
  if (!pathname) return '/';
  const sanitized = pathname.replace(/index\.html?$/i, '');
  return sanitized.endsWith('/') ? sanitized : `${sanitized}/`;
};

const resolveHistoryType = (router?: RouterLike): string | undefined => {
  if (!router) return undefined;
  return router.options?.history?.type ?? router.history?.type ?? router.options?.mode ?? router.mode;
};

const isHashHistory = (router?: RouterLike): boolean => {
  return resolveHistoryType(router) === HASH_HISTORY;
};

export const sanitizeConfiguredBaseUrl = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/' || trimmed === './' || trimmed === '.') return '';
  return trimmed;
};

const configuredBaseUrl = sanitizeConfiguredBaseUrl(BASE_URL);

axiosInstance.defaults.headers.common['Cache-Control'] = 'no-cache';
// Set a sane default timeout for HTTP JSON-RPC calls
// This avoids long hangs when probing node health or chain id
axiosInstance.defaults.timeout = 7000;
axiosInstance.defaults.baseURL = configuredBaseUrl;

export const api = axiosInstance;

export const detectBaseUrl = (router?: RouterLike, runtimeLocation?: Pick<Location, 'origin' | 'pathname'>): string => {
  if (configuredBaseUrl) return configuredBaseUrl;

  if (!isHashHistory(router)) return '';

  const locationRef =
    runtimeLocation ??
    (typeof window !== 'undefined' ? (window.location as Pick<Location, 'origin' | 'pathname'>) : undefined);

  if (!locationRef) return '';

  const { origin = '', pathname = '/' } = locationRef;

  return `${origin}${normalizePathname(pathname)}`;
};

export function getRouterMode(router?: RouterLike): '#/' | '' {
  return isHashHistory(router) ? '#/' : '';
}

/**
 * Returns `detectBaseUrl` + router mode like:
 *
 * polkaswap.io/#/
 */
export function getFullBaseUrl(router?: RouterLike, runtimeLocation?: Pick<Location, 'origin' | 'pathname'>): string {
  const routerMode = getRouterMode(router);
  const baseUrl = detectBaseUrl(router, runtimeLocation);
  return baseUrl + routerMode;
}

export const updateBaseUrl = (router: RouterLike): void => {
  const baseUrl = detectBaseUrl(router);
  axiosInstance.defaults.baseURL = baseUrl;
};

export default axiosInstance;
