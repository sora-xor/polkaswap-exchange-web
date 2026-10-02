import { XOR } from '@sora-substrate/sdk/build/assets/consts';

/** Explicit XOR acquisition clears the spend asset without requiring a campaign or guessing the user's funds. */
export function getTonswapAcquisitionPair(
  query: Record<string, unknown> | undefined,
  firstAddress = '',
  secondAddress = ''
): { firstAddress: string; secondAddress: string } | null {
  if (query?.acquire !== 'XOR' || firstAddress || secondAddress) return null;
  return { firstAddress: '', secondAddress: XOR.address };
}
