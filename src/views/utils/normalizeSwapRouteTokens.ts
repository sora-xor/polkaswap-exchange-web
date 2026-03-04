import { XOR } from '@sora-substrate/sdk/build/assets/consts';

type RouteTokenPair = {
  firstAddress: string;
  secondAddress: string;
};

/**
 * Maps route token parameters to a safe swap pair.
 * Swap screen should always keep XOR as FROM token when the route has no valid pair.
 */
export const normalizeSwapRouteTokens = (firstAddress = '', secondAddress = ''): RouteTokenPair => {
  if (firstAddress && secondAddress) {
    return { firstAddress, secondAddress };
  }

  return { firstAddress: XOR.address, secondAddress: '' };
};
