import { defineGetters } from 'direct-vuex';

import { LiquiditySourceForMarketAlgorithm } from '@/consts';
import { settingsGetterContext } from '@/store/settings';

import type { SettingsState } from './types';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';

const getters = defineGetters<SettingsState>()({
  nodeIsConnected(...args): boolean {
    const { state } = settingsGetterContext(args);
    return state.appConnection.nodeIsConnected;
  },
  liquiditySource(...args): LiquiditySourceTypes {
    const { state } = settingsGetterContext(args);
    return LiquiditySourceForMarketAlgorithm[state.marketAlgorithm];
  },
  moonpayApiKey(...args): string {
    const { rootState } = settingsGetterContext(args);
    return rootState.wallet.settings.apiKeys.moonpay;
  },
  moonpayEnabled(...args): boolean {
    const { state, getters } = settingsGetterContext(args);
    return !!getters.moonpayApiKey && !!state.featureFlags.moonpay;
  },
  soraCardEnabled(...args): Nullable<boolean> {
    const { state } = settingsGetterContext(args);
    return state.featureFlags.soraCard;
  },
  orderBookEnabled(...args): Nullable<boolean> {
    const { state } = settingsGetterContext(args);
    return state.featureFlags.orderBook;
  },
  kensetsuEnabled(...args): Nullable<boolean> {
    const { state } = settingsGetterContext(args);
    return state.featureFlags.kensetsu;
  },
  assetOwnerEnabled(...args): Nullable<boolean> {
    const { state } = settingsGetterContext(args);
    return state.featureFlags.assetOwner;
  },
  debugEnabled(...args): Nullable<boolean> {
    const { state } = settingsGetterContext(args);
    return !!state.featureFlags.debug;
  },
  pointSystemV2(...args): Nullable<boolean> {
    const { state } = settingsGetterContext(args);
    return state.featureFlags.pointSystemV2;
  },
  notificationActivated(...args): boolean {
    const { state } = settingsGetterContext(args);
    return state.browserNotifsPermission === 'granted';
  },
  isInternetConnectionEnabled(...args): boolean {
    const { state } = settingsGetterContext(args);
    return state.internetConnection ?? navigator.onLine;
  },
  internetConnectionSpeedMb(...args): number {
    const { state } = settingsGetterContext(args);
    return state.internetConnectionSpeed ?? ((navigator as any)?.connection?.downlink as number) ?? 0;
  },
  /** Stable Connection - more or equal **1 Mb/s** */
  isInternetConnectionStable(...args): boolean {
    const { getters } = settingsGetterContext(args);
    // `!getters.internetConnectionSpeedMb` for the case when `navigator.connection` isn't supported
    return getters.internetConnectionSpeedMb >= 1 || !getters.internetConnectionSpeedMb;
  },
});

export default getters;
