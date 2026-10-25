import { describe, expect, it } from 'vitest';

import { getMissingRewardFiatPriceAssets } from '@/features/rewards/utils/fiat';

describe('rewards fiat utilities', () => {
  it('returns unique reward assets that have amounts but no fiat price', () => {
    const pswap = { address: '0xPSWAP', symbol: 'PSWAP', decimals: 18 } as never;
    const val = { address: '0xVAL', symbol: 'VAL', decimals: 18 } as never;

    expect(
      getMissingRewardFiatPriceAssets(
        [
          { asset: pswap, amount: '10' },
          { asset: pswap, amount: '20' },
          { asset: val, amount: '5' },
        ],
        { '0xval': '200' }
      )
    ).toEqual([pswap]);
  });

  it('ignores empty reward amounts and already priced assets', () => {
    const pswap = { address: '0xPSWAP', symbol: 'PSWAP', decimals: 18 } as never;

    expect(getMissingRewardFiatPriceAssets([{ asset: pswap, amount: '' }], {})).toEqual([]);
    expect(getMissingRewardFiatPriceAssets([{ asset: pswap, amount: '1' }], { '0xpswap': '100' })).toEqual([]);
  });
});
