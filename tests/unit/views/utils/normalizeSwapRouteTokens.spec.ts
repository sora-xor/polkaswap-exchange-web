import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it } from 'vitest';

import { normalizeSwapRouteTokens } from '@/views/utils/normalizeSwapRouteTokens';

describe('normalizeSwapRouteTokens', () => {
  it('returns route pair when both addresses are provided', () => {
    const pair = normalizeSwapRouteTokens('0xFrom', '0xTo');

    expect(pair).toEqual({ firstAddress: '0xFrom', secondAddress: '0xTo' });
  });

  it('falls back to XOR route when route pair is incomplete', () => {
    expect(normalizeSwapRouteTokens('', '')).toEqual({
      firstAddress: XOR.address,
      secondAddress: '',
    });
    expect(normalizeSwapRouteTokens('0xOnlyFirst', '')).toEqual({
      firstAddress: XOR.address,
      secondAddress: '',
    });
    expect(normalizeSwapRouteTokens('', '0xOnlySecond')).toEqual({
      firstAddress: XOR.address,
      secondAddress: '',
    });
  });
});
