import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const stakingStore = {
    historyDepth: 84,
  };

  return { stakingStore };
});

vi.mock('@/stores/staking', () => ({
  useStakingStore: () => shared.stakingStore,
}));

import { useValidatorsFormatting } from '@/modules/staking/sora/composables/useValidatorsFormatting';

describe('useValidatorsFormatting', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.stakingStore.historyDepth = 84;
  });

  it('reads history depth through the staking store facade and formats validator data', () => {
    const formatting = useValidatorsFormatting();
    const validator = {
      address: 'validator-1',
      identity: {
        info: {
          display: 'Validator One',
        },
      },
    } as any;

    expect(formatting.historyDepth.value).toBe(84);
    expect(formatting.decodeName(validator)).toBe('Validator One');
    expect(
      formatting.formatName({ ...validator, identity: { info: { display: 'Long validator name for truncation' } } }, 10)
    ).toBe('Long valid...');
    expect(formatting.formatCommission('100000000')).toBe('10');
  });
});
