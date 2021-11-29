import { axiosInstance, XOR } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import VueRouter from 'vue-router';

import { NOIR_TOKEN_ADDRESS } from '@/consts';

// DEFINE 2 assets in wallet
api.accountDefaultAssetsAddresses = [XOR.address, NOIR_TOKEN_ADDRESS];

export const BASE_URL = process.env.BASE_URL;

axiosInstance.defaults.headers.common['Cache-Control'] = 'no-cache';

const detectBaseUrl = (router?: VueRouter): string => {
  if (BASE_URL) return BASE_URL;

  if (router && router.mode === 'hash') {
    const { origin, pathname } = window.location;

    return `${origin}${pathname}`;
  }

  return '';
};

export const updateBaseUrl = (router: VueRouter): void => {
  const baseUrl = detectBaseUrl(router);
  axiosInstance.defaults.baseURL = baseUrl;
};

export default axiosInstance;
