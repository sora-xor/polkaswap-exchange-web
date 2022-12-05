import { ZeroStringValue } from '@/consts';
import type { PriceState } from './types';

function initialState(): PriceState {
  return {
    price: ZeroStringValue,
    priceReversed: ZeroStringValue,
  };
}

const state = initialState();

export default state;
