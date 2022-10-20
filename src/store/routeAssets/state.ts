import type { RouteAssetsState } from './types';

function initialState(): RouteAssetsState {
  return {
    recipients: [],
    file: null,
    processed: false,
    uploadCSVPage: true,
    subscriptions: [],
  };
}

const state = initialState();

export default state;
