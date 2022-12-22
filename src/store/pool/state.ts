import type { PoolState } from './types';

function initialState(): PoolState {
  return {
    accountLiquidity: [],
    accountLiquidityList: null,
    accountLiquidityUpdates: null,
    poolApyObject: {},
    poolApySubscription: null,
  };
}

const state = initialState();

export default state;
