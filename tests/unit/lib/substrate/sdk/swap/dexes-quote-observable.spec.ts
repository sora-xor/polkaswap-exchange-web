import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { DexId } from '@/lib/substrate/sdk/dex/consts';
import { SwapModule } from '@/lib/substrate/sdk/swap';

import type { SwapQuoteData } from '@/lib/substrate/sdk/swap/types';

const createQuoteData = (dexId: number, amount: string): SwapQuoteData => ({
  quote: () =>
    ({
      dexId,
      result: {
        amount,
        amountWithoutImpact: amount,
        fee: [],
        rewards: [],
        route: [],
      },
    }) as any,
  isAvailable: true,
  liquiditySources: [LiquiditySourceTypes.Default],
});

describe('SwapModule.getDexesSwapQuoteObservable', () => {
  it('does not block active DEX quotes when another DEX stream is silent', async () => {
    const activeDexQuote$ = new Subject<SwapQuoteData>();
    const silentDexQuote$ = new Subject<SwapQuoteData>();

    const swap = new SwapModule({
      dex: {
        publicDexes: [{ dexId: DexId.XOR }, { dexId: DexId.XSTUSD }],
      },
    } as any);

    const getSwapQuoteObservableMock = vi
      .spyOn(swap, 'getSwapQuoteObservable')
      .mockImplementation((_firstAssetAddress, _secondAssetAddress, _sources, dexId) => {
        return dexId === DexId.XOR ? activeDexQuote$ : silentDexQuote$;
      });

    const observable = swap.getDexesSwapQuoteObservable('asset-a', 'asset-b');
    expect(observable).not.toBeNull();

    let latest!: SwapQuoteData;
    const subscription = observable!.subscribe((data) => {
      latest = data;
    });

    // Before active stream emits, fallback quote should resolve to an empty result.
    const fallbackResult = latest.quote('asset-a', 'asset-b', '1', false);
    expect(fallbackResult.dexId).toBe(DexId.XOR);
    expect((fallbackResult.result as any).amount).toBe(0);

    activeDexQuote$.next(createQuoteData(DexId.XOR, '1000000000000000000'));
    await Promise.resolve();

    const quoteResult = latest.quote('asset-a', 'asset-b', '1', false);
    expect(quoteResult.dexId).toBe(DexId.XOR);
    expect((quoteResult.result as any).amount).toBe('1000000000000000000');
    expect(latest.isAvailable).toBe(true);
    expect(latest.liquiditySources).toEqual([LiquiditySourceTypes.Default]);

    expect(getSwapQuoteObservableMock).toHaveBeenCalledTimes(2);

    subscription.unsubscribe();
    activeDexQuote$.complete();
    silentDexQuote$.complete();
  });

  it('keeps active DEX quotes when another DEX stream errors', async () => {
    const activeDexQuote$ = new Subject<SwapQuoteData>();
    const failingDexQuote$ = new Subject<SwapQuoteData>();

    const swap = new SwapModule({
      dex: {
        publicDexes: [{ dexId: DexId.XOR }, { dexId: DexId.XSTUSD }],
      },
    } as any);

    vi.spyOn(swap, 'getSwapQuoteObservable').mockImplementation(
      (_firstAssetAddress, _secondAssetAddress, _sources, dexId) => {
        return dexId === DexId.XOR ? activeDexQuote$ : failingDexQuote$;
      }
    );

    const observable = swap.getDexesSwapQuoteObservable('asset-a', 'asset-b');
    expect(observable).not.toBeNull();

    let latest!: SwapQuoteData;
    const subscription = observable!.subscribe((data) => {
      latest = data;
    });

    failingDexQuote$.error(new Error('DEX stream unavailable'));
    await Promise.resolve();

    activeDexQuote$.next(createQuoteData(DexId.XOR, '42000000000000000000'));
    await Promise.resolve();

    const quoteResult = latest.quote('asset-a', 'asset-b', '1', false);
    expect(quoteResult.dexId).toBe(DexId.XOR);
    expect((quoteResult.result as any).amount).toBe('42000000000000000000');
    expect(latest.isAvailable).toBe(true);
    expect(latest.liquiditySources).toEqual([LiquiditySourceTypes.Default]);

    subscription.unsubscribe();
    activeDexQuote$.complete();
  });
});
