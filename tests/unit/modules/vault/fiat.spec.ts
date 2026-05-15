import { FPNumber } from '@sora-substrate/math';
import { DAI, KUSD, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it, vi } from 'vitest';

import { getKensetsuAmountSortValue, getKensetsuFiatAmount } from '@/modules/vault/utils/fiat';

describe('Kensetsu fiat utilities', () => {
  it('uses the resolved fiat price when one is available', () => {
    const amount = FPNumber.fromNatural(10);
    const resolved = FPNumber.fromNatural(15);
    const resolveFiatAmount = vi.fn(() => resolved);

    expect(getKensetsuFiatAmount(amount, DAI, resolveFiatAmount)).toBe(resolved);
    expect(resolveFiatAmount).toHaveBeenCalledWith(amount, DAI);
  });

  it('falls back to 1:1 USD value for known USD-pegged Kensetsu assets', () => {
    const amount = FPNumber.fromNatural(10);
    const resolveFiatAmount = vi.fn(() => null);

    expect(getKensetsuFiatAmount(amount, DAI, resolveFiatAmount)?.toString()).toBe('10');
    expect(getKensetsuFiatAmount(amount, KUSD, resolveFiatAmount)?.toString()).toBe('10');
  });

  it('does not invent fiat value for non-USD-pegged assets', () => {
    const amount = FPNumber.fromNatural(10);
    const resolveFiatAmount = vi.fn(() => null);

    expect(getKensetsuFiatAmount(amount, XOR, resolveFiatAmount)).toBeNull();
    expect(getKensetsuFiatAmount(amount, null, resolveFiatAmount)).toBeNull();
  });

  it('falls back to the token amount for sorting when fiat value is missing', () => {
    const amount = FPNumber.fromNatural(10);
    const fiatAmount = FPNumber.fromNatural(15);

    expect(getKensetsuAmountSortValue(amount, fiatAmount)).toBe(15);
    expect(getKensetsuAmountSortValue(amount, null)).toBe(10);
  });
});
