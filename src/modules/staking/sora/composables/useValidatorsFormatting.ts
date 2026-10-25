import { FPNumber } from '@sora-substrate/sdk';
import { hexToString, isHex } from '@polkadot/util';
import { computed } from 'vue';

import { useStakingStore } from '@/stores/staking';
import type { Nullable } from '@/types/common';

import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

export function useValidatorsFormatting() {
  const stakingStore = useStakingStore();
  const historyDepth = computed(() => stakingStore.historyDepth as Nullable<number>);

  /**
   * Parses codec values defensively so malformed indexer rows render as zero instead of breaking the validator table.
   */
  const parseCodecAmount = (value: string | null | undefined, decimals?: number): FPNumber => {
    try {
      const amount = FPNumber.fromCodecValue(value ?? '0', decimals);
      return amount.isFinity() ? amount : FPNumber.ZERO;
    } catch {
      return FPNumber.ZERO;
    }
  };

  /**
   * Rejects empty and control-character validator names from malformed identity data.
   */
  const isPrintableIdentityName = (value: string): boolean => Boolean(value.trim()) && !/[\u0000-\u001F\u007F]/u.test(value);

  const decodeName = (validator: ValidatorInfoFull): string => {
    const identityName = validator.identity?.info?.display;

    if (typeof identityName === 'string' && identityName) {
      if (identityName.startsWith('0x')) {
        if (!isHex(identityName)) return validator.address;

        try {
          const decodedName = hexToString(identityName);
          return isPrintableIdentityName(decodedName) ? decodedName : validator.address;
        } catch (error) {
          console.error('Failed to decode validator name', error);
        }
      } else if (isPrintableIdentityName(identityName)) {
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
    return parseCodecAmount(value, 7).toString();
  };

  const formatReturn = (value: string): string => value;

  /**
   * Formats validator exposure totals from codec units without coercing token amounts through JS numbers.
   */
  const formatStake = (value: string | null | undefined, decimals?: number, symbol = 'XOR', precision = 2): string => {
    const amount = parseCodecAmount(value, decimals).toLocaleString(precision);

    return `${amount} ${symbol}`;
  };

  return {
    historyDepth,
    decodeName,
    formatName,
    formatCommission,
    formatReturn,
    formatStake,
  };
}

export type ValidatorsFormattingComposable = ReturnType<typeof useValidatorsFormatting>;
