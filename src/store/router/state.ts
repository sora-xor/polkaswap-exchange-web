import type { RouterState } from './types';

function initialState(): RouterState {
  return {
    current: null,
    prev: null,
    loading: false,
  };
}

const state = initialState();

export default state;
