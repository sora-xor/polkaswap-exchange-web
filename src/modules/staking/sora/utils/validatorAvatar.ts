import { toDwebLink } from '@/utils/ipfs';

import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

export function resolveValidatorAvatarUrl(validator: ValidatorInfoFull): string | null {
  const url = validator.identity?.info.image;
  if (!url) return null;

  try {
    return toDwebLink(url);
  } catch (error) {
    console.warn('Failed to convert validator avatar url', error);
    return url;
  }
}
