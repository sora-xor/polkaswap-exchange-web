import { defineGetters } from 'direct-vuex';

import { settingsGetterContext } from '@/store/settings';

import type { SettingsState } from './types';

const getters = defineGetters<SettingsState>()({
  nodeIsConnected(...args): boolean {
    const { state } = settingsGetterContext(args);
    return state.appConnection.nodeIsConnected;
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
