import { describe, expect, it } from 'vitest';

import { createStatsRange } from '@/features/misc/components/stats/range';

describe('stats range helper', () => {
  it('uses the actual current second as the upper bound instead of the bucket start', () => {
    const hour = 60 * 60;
    const result = createStatsRange(1_782_755_207_999, hour, 24);

    expect(result).toEqual({
      from: 1_782_755_207,
      to: 1_782_668_807,
      previousFrom: 1_782_668_807,
      previousTo: 1_782_582_407,
    });
  });
});
