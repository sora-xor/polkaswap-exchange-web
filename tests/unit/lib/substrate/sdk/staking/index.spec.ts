import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '@/lib/substrate/sdk/staking';

describe('mapWithConcurrency', () => {
  it('keeps mapped items aligned with original order', async () => {
    const values = [1, 2, 3, 4];

    const output = await mapWithConcurrency(values, 2, async (value, index) => `${index}-${value * 2}`);

    expect(output).toEqual(['0-2', '1-4', '2-6', '3-8']);
  });

  it('does not exceed the configured worker limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      () =>
        new Promise<number>((resolve) => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);

          setTimeout(() => {
            inFlight -= 1;
            resolve(1);
          }, 10);
        })
    );

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
