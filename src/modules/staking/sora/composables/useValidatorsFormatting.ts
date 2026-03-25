import { FPNumber } from '@sora-substrate/sdk';
import { hexToString } from '@polkadot/util';
import { computed } from 'vue';

import { useStakingStore } from '@/stores/staking';
import type { Nullable } from '@/types/common';

import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

export function useValidatorsFormatting() {
  const stakingStore = useStakingStore();
  const historyDepth = computed(() => stakingStore.historyDepth as Nullable<number>);

  const decodeName = (validator: ValidatorInfoFull): string => {
    const identityName = validator.identity?.info.display;

    if (identityName) {
      if (identityName.startsWith('0x')) {
        try {
          return hexToString(identityName);
        } catch (error) {
          console.error('Failed to decode validator name', error);
        }
      } else {
        return identityName;
      }
    }

    return validator.address;
  };

  const formatName = (validator: ValidatorInfoFull, maxLength = 20): string => {
    const name = decodeName(validator);
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
  };

  const formatCommission = (value: string): string => {
    return FPNumber.fromCodecValue(value, 7).toString();
  };

  const formatReturn = (value: string): string => value;

  return {
    historyDepth,
    decodeName,
    formatName,
    formatCommission,
    formatReturn,
  };
}

export type ValidatorsFormattingComposable = ReturnType<typeof useValidatorsFormatting>;
