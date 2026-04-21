import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import { toPrecision } from '@/utils/fp';

describe('utils/fp', () => {
  it('rounds values using FPNumber.toFixed and returns a new FPNumber', () => {
    const source = new FPNumber('1.2399');

    const result = toPrecision(source, 2);

    expect(result).toBeInstanceOf(FPNumber);
    expect(result).not.toBe(source);
    expect(result.toFixed(2)).toBe(source.toFixed(2));
  });

  it('preserves trailing zero precision for whole numbers', () => {
    const result = toPrecision(new FPNumber('5'), 4);

    expect(result.toFixed(4)).toBe('5.0000');
  });
});
