import { settingsStorage } from '@soramitsu/soraneo-wallet-web';

import type { AssetsState } from './types';

const pinnedAssetsString = settingsStorage.get('pinnedAssets');
const pinnedAssetsAddresses = pinnedAssetsString ? JSON.parse(pinnedAssetsString) : [];

function initialState(): AssetsState {
  return {
    registeredAssets: {},
    registeredAssetsFetching: false,
  };
}

const state = initialState();

export default state;
