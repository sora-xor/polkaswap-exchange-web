import type { AssetsState } from './types';

function initialState(): AssetsState {
  return {
    registeredAssets: {},
    registeredAssetsFetching: false,
  };
}

const state = initialState();

export default state;
