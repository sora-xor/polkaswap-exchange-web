import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

const formattedAmountStub = vi.hoisted(() => ({
  getAssetFiatPrice: vi.fn(() => '1'),
  getFiatAmountByFPNumber: vi.fn(),
  formatCodecNumber: vi.fn(),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => formattedAmountStub,
}));

vi.mock('@/store', () => ({
  default: {
    state: {},
    getters: {},
  },
}));

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    currentRoute: { value: { name: 'Swap' } },
    beforeEach: () => undefined,
  },
  lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { useDemeterApr } from '@/modules/staking/demeter/composables/useDemeterApr';

describe('useDemeterApr', () => {
  const apr = useDemeterApr();

  it('returns zero emission when token multiplier is zero', () => {
    const pool = { isFarm: true, multiplier: '10' } as any;
    const tokenInfo = {
      farmsTotalMultiplier: '0',
      farmsAllocation: FPNumber.ZERO,
      tokenPerBlock: FPNumber.ZERO,
    } as any;

    expect(apr.getEmission(pool, tokenInfo).isZero()).toBe(true);
  });

  it('calculates emission and APR for farming pools', () => {
    const pool = {
      isFarm: true,
      multiplier: '2',
      totalTokensInPool: new FPNumber(100),
    } as any;
    const tokenInfo = {
      farmsTotalMultiplier: '4',
      farmsAllocation: new FPNumber(10),
      tokenPerBlock: new FPNumber(2),
    } as any;

    const emission = apr.getEmission(pool, tokenInfo);
    expect(emission.toNumber()).toBeCloseTo(10);

    const tvl = apr.getTvl(pool, new FPNumber(5), {
      balance: '100',
      secondBalance: '200',
    } as any);
    expect(tvl.gt(FPNumber.ZERO)).toBe(true);

    const aprValue = apr.getApr(emission, new FPNumber(1000), new FPNumber(1));
    expect(aprValue.gt(FPNumber.ZERO)).toBe(true);
  });

  it('formats APR and handles zero values', () => {
    const zeroApr = apr.formatApr(FPNumber.ZERO);
    expect(zeroApr).toBe('calculatingText');

    const formatted = apr.formatApr(new FPNumber(12.3456));
    expect(formatted).toBe('12.34%');
  });
});
