import type { PoolState } from './types';

function initialState(): PoolState {
  return {
    accountLiquidity: [],
    accountLiquidityList: null,
    accountLiquidityUpdates: null,
    poolApyObject: {},
  };
}

const state = initialState();

export default state;
