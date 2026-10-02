import { describe, expect, it, vi } from 'vitest';
import { findGetTsAmountSuggestion } from '@/features/misc/lib/getTsAmountSuggestion';
import { emptyGetTsPlan, type GetTsPlanRequest } from '@/features/misc/lib/getTsPlanQuote';

vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: {} }));
vi.mock('@/features/misc/lib/tonswapConversion', () => ({ requestTonswapConversionQuote: vi.fn() }));
const request = { source: 'card', paymentAsset: 'USD', amount: '100', purpose: 'xor' } as const;
const blocked = (r: GetTsPlanRequest) => ({
  ...emptyGetTsPlan(r, 'blocked'),
  feasible: false,
  reason: 'price-impact' as const,
});
const ready = (r: GetTsPlanRequest) => ({
  ...emptyGetTsPlan(r, 'ready'),
  feasible: true,
  spendableXor: '3',
  expiresAt: 2000,
});

describe('smaller funding amount suggestions', () => {
  it('finds a fresh usable example without changing the original budget or purpose', async () => {
    const quote = vi.fn(async (r: GetTsPlanRequest) => (r.amount === '25' ? ready(r) : blocked(r)));
    expect(await findGetTsAmountSuggestion(request, quote, undefined, () => 1000)).toMatchObject({
      state: 'ready',
      preview: { amount: '25', purpose: 'xor' },
    });
    expect(quote.mock.calls.map(([r]) => r.amount)).toEqual(['50', '25']);
    expect(request.amount).toBe('100');
  });
  it('checks the provider minimum when halving would fall below it', async () => {
    const quote = vi.fn(async (r: GetTsPlanRequest) =>
      r.amount === '20'
        ? ready(r)
        : {
            ...blocked(r),
            reason: 'card-minimum' as const,
            providerMinimumUsd: '20',
          }
    );
    expect(await findGetTsAmountSuggestion({ ...request, amount: '30' }, quote, undefined, () => 1000)).toMatchObject({
      state: 'ready',
      preview: { amount: '20' },
    });
    expect(quote.mock.calls.map(([r]) => r.amount)).toEqual(['15', '20']);
  });
  it('never suggests increasing the budget or cycles around a blocked minimum', async () => {
    const quote = vi.fn(async (r: GetTsPlanRequest) =>
      r.amount === '20'
        ? blocked(r)
        : {
            ...blocked(r),
            reason: 'card-minimum' as const,
            providerMinimumUsd: '20',
          }
    );
    expect(await findGetTsAmountSuggestion({ ...request, amount: '30' }, quote)).toEqual({ state: 'no-match' });
    expect(quote.mock.calls.map(([r]) => r.amount)).toEqual(['15', '20', '10']);
    quote.mockClear();
    expect(await findGetTsAmountSuggestion({ ...request, amount: '10' }, quote)).toEqual({ state: 'no-match' });
    expect(quote).toHaveBeenCalledTimes(1);
  });
  it('retains token precision and bounds provider work', async () => {
    const quote = vi.fn(async (r: GetTsPlanRequest) => blocked(r));
    await findGetTsAmountSuggestion(
      { ...request, source: 'ethereum', paymentAsset: 'ETH', amount: '0.000000000000000003' },
      quote
    );
    expect(quote.mock.calls.map(([r]) => r.amount)).toEqual(['0.000000000000000001']);
    quote.mockClear();
    await findGetTsAmountSuggestion(request, quote);
    expect(quote).toHaveBeenCalledTimes(6);
  });
  it('discards stale, mismatched, cancelled and failed evidence', async () => {
    for (const value of [
      { ...ready(request), expiresAt: 1000 },
      { ...ready(request), purpose: 'ts' as const },
      emptyGetTsPlan(request, 'unavailable'),
    ]) {
      expect(
        await findGetTsAmountSuggestion(
          request,
          async () => value,
          undefined,
          () => 1000
        )
      ).toEqual({ state: 'unavailable' });
    }
    const controller = new AbortController();
    const result = findGetTsAmountSuggestion(
      request,
      async (r) => {
        controller.abort();
        return ready(r);
      },
      controller.signal
    );
    expect(await result).toEqual({ state: 'unavailable' });
    expect(
      await findGetTsAmountSuggestion(request, async () => {
        throw new Error('Offline');
      })
    ).toEqual({ state: 'unavailable' });
  });
});
