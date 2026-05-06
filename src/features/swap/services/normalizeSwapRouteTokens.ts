import { XOR } from '@sora-substrate/sdk/build/assets/consts';

type RouteTokenPair = {
  firstAddress: string;
  secondAddress: string;
};

/**
 * Maps route token parameters to a safe swap pair.
 * Swap should always keep XOR as the FROM token when no valid pair is present.
 */
export const normalizeSwapRouteTokens = (firstAddress = '', secondAddress = ''): RouteTokenPair => {
  if (firstAddress && secondAddress) {
    return { firstAddress, secondAddress };
  }

  return { firstAddress: XOR.address, secondAddress: '' };
};
