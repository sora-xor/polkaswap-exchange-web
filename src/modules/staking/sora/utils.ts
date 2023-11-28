import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

export function formatName(validator: ValidatorInfoFull, maxLength = 20) {
  const name = validator.identity?.info.display ? validator.identity?.info.display : validator.address;
  return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
}
