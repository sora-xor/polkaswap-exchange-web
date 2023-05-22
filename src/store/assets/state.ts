import type { AssetsState } from './types';

function initialState(): AssetsState {
  return {
    registeredAssets: {},
    registeredAssetsFetching: false,
    registeredAssetsBalancesUpdating: false,
  };
}

const state = initialState();

export default state;
