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
      formatting.formatName(
        { ...validator, identity: { info: { display: 'Long validator name for truncation' } } },
        10
      )
    ).toBe('Long valid...');
    expect(formatting.formatCommission('100000000')).toBe('10');
    expect(formatting.formatStake('1234567890000000000000', 18, 'XOR')).toBe('1,234.56 XOR');
  });

  it('falls back to the address for malformed validator identity payloads', () => {
    const formatting = useValidatorsFormatting();

    expect(formatting.decodeName({ address: 'validator-without-info', identity: {} } as any)).toBe(
      'validator-without-info'
    );
    expect(
      formatting.decodeName({
        address: 'validator-with-non-string-display',
        identity: { info: { display: 42 } },
      } as any)
    ).toBe('validator-with-non-string-display');
    expect(
      formatting.decodeName({
        address: 'validator-with-control-character-display',
        identity: { info: { display: 'Validator\u0000Name' } },
      } as any)
    ).toBe('validator-with-control-character-display');
    expect(
      formatting.decodeName({
        address: 'validator-with-whitespace-display',
        identity: { info: { display: '   \n\t   ' } },
      } as any)
    ).toBe('validator-with-whitespace-display');
  });

  it('falls back to the address when an advertised hex identity is malformed or decodes to controls', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const formatting = useValidatorsFormatting();

    try {
      expect(
        formatting.decodeName({
          address: 'validator-with-invalid-hex-display',
          identity: { info: { display: '0xnot-hex' } },
        } as any)
      ).toBe('validator-with-invalid-hex-display');
      expect(
        formatting.decodeName({
          address: 'validator-with-control-hex-display',
          identity: { info: { display: '0x00000e00' } },
        } as any)
      ).toBe('validator-with-control-hex-display');
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('formats malformed codec amounts as zero instead of throwing', () => {
    const formatting = useValidatorsFormatting();

    expect(formatting.formatCommission('not-a-codec-value')).toBe('0');
    expect(formatting.formatStake('not-a-codec-value', 18, 'XOR')).toBe('0 XOR');
    expect(formatting.formatStake(undefined, 18, 'XOR')).toBe('0 XOR');
    expect(formatting.formatStake(null, 18, 'VAL')).toBe('0 VAL');
  });
});
