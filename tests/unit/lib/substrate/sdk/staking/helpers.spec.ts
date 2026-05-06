import { describe, expect, it } from 'vitest';

import {
  formatEra,
  formatIndividualRewardPoints,
  formatNominations,
  formatPayee,
  formatValidatorExposure,
} from '@/lib/substrate/sdk/staking/helpers';
import { StakingRewardsDestination } from '@/lib/substrate/sdk/staking/types';

describe('staking helper formatters', () => {
  it('formats the active era codec', () => {
    expect(formatEra({ unwrap: () => ({ toNumber: () => 42 }) } as any)).toBe(42);
  });

  it('formats individual reward points by account id', () => {
    const individual = new Map([
      [{ toString: () => 'stash-a' }, { toNumber: () => 10 }],
      [{ toString: () => 'stash-b' }, { toNumber: () => 25 }],
    ]);

    expect(formatIndividualRewardPoints({ individual } as any)).toEqual({
      'stash-a': 10,
      'stash-b': 25,
    });
  });

  it('formats nominations and preserves empty nomination options', () => {
    expect(formatNominations({ isEmpty: true } as any)).toBeNull();

    expect(
      formatNominations({
        isEmpty: false,
        unwrap: () => ({
          targets: [{ toString: () => 'validator-a' }, { toString: () => 'validator-b' }],
          suppressed: { isTrue: true },
          submittedIn: { toNumber: () => 7 },
        }),
      } as any)
    ).toEqual({
      targets: ['validator-a', 'validator-b'],
      suppressed: true,
      submittedIn: 7,
    });
  });

  it('formats payee destinations and account-specific payees', () => {
    expect(formatPayee(StakingRewardsDestination.Stash)).toBe(StakingRewardsDestination.Stash);
    expect(formatPayee('5Account')).toEqual({ Account: '5Account' });
  });

  it('formats validator exposure totals and nominator exposure rows', () => {
    expect(
      formatValidatorExposure({
        total: { toString: () => '1000' },
        own: { toString: () => '400' },
        others: [
          { who: { toString: () => 'nominator-a' }, value: { toString: () => '250' } },
          { who: { toString: () => 'nominator-b' }, value: { toString: () => '350' } },
        ],
      } as any)
    ).toEqual({
      total: '1000',
      own: '400',
      others: [
        { who: 'nominator-a', value: '250' },
        { who: 'nominator-b', value: '350' },
      ],
    });
  });
});
