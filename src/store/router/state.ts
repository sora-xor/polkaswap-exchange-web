import type { RouterState } from './types';

function initialState(): RouterState {
  return {
    current: null,
    prev: null,
  };
}

const state = initialState();

export default state;
