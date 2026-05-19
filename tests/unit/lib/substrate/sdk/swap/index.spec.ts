import { describe, expect, it } from 'vitest';

import { getBestResult } from '@/lib/substrate/sdk/swap';

describe('swap getBestResult', () => {
  it('selects the best result when DexId.XOR is absent from the candidate set', () => {
    const result = getBestResult(false, {
      1: { amount: '100', amountWithoutImpact: '100', fee: [], rewards: [], route: [] },
      2: { amount: '200', amountWithoutImpact: '200', fee: [], rewards: [], route: [] },
    } as never);

    expect(result.dexId).toBe(2);
    expect(result.result.amount).toBe('200');
  });
});
