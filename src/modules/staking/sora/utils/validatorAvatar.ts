import { toIpfsGatewayUrl } from '@/utils/ipfs';

import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

/** Resolves validator identity images through the configured IPFS gateway when needed. */
export function resolveValidatorAvatarUrl(validator: ValidatorInfoFull): string | null {
  const url = validator.identity?.info.image;
  if (!url) return null;

  try {
    return toIpfsGatewayUrl(url) ?? null;
  } catch (error) {
    console.warn('Failed to convert validator avatar url', error);
    return url;
  }
}
