import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

import { Status } from '@soramitsu-ui/ui/types';
import { clampByAvailable, getLtvStatus, percentOf, subtractWithFloor } from '@/modules/vault/util';

vi.mock('@soramitsu-ui/ui', () => ({
  Status: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));
vi.mock('@soramitsu-ui/ui/types', () => ({
  Status: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('vault utilities', () => {
  it('subtractWithFloor prevents negative balances', () => {
    const balance = new FPNumber(1);
    const fee = new FPNumber(0.5);

    expect(subtractWithFloor(balance, fee).toString()).toBe('0.5');
    expect(subtractWithFloor(fee, balance).isZero()).toBe(true);
  });

  it('percentOf clamps to [0, 100]', () => {
    const total = new FPNumber(10);
    expect(percentOf(new FPNumber(5), total)).toBe(50);
    expect(percentOf(new FPNumber(20), total)).toBe(100);
    expect(percentOf(new FPNumber(0), total)).toBe(0);
    expect(percentOf(new FPNumber(5), new FPNumber(0))).toBe(0);
  });

  it('clampByAvailable limits values', () => {
    const available = new FPNumber(10);
    expect(clampByAvailable(new FPNumber(5), available).toString()).toBe('5');
    expect(clampByAvailable(new FPNumber(15), available).toString()).toBe('10');
  });

  it('getLtvStatus maps thresholds correctly', () => {
    expect(getLtvStatus(10)).toBe(Status.Success);
    expect(getLtvStatus(40)).toBe(Status.Warning);
    expect(getLtvStatus(60)).toBe(Status.Error);
  });
});
