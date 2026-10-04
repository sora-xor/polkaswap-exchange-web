import { describe, expect, it } from 'vitest';
import { FPNumber } from '@sora-substrate/sdk';
import { BUY_XOR_DEFAULT_CARD_USD, buyXorNextSteps } from '@/features/misc/lib/buyXorStart';
import { isGetTsPlanAmount } from '@/features/misc/lib/getTsPlanQuote';

describe('Buy XOR start steps', () => {
  it('lists every approval of each route in order', () => {
    expect(buyXorNextSteps('card', 'USD')).toEqual(['walletsEthereum', 'card', 'convert', 'swap']);
    expect(buyXorNextSteps('ethereum', 'ETH')).toEqual(['walletsEthereum', 'convert', 'swap']);
    expect(buyXorNextSteps('ethereum', 'USDT')).toEqual(['walletsEthereum', 'convert', 'swap']);
    expect(buyXorNextSteps('ton', 'USDT')).toEqual(['walletsTon', 'ton', 'convert', 'swap']);
    expect(buyXorNextSteps('sora', 'DAI')).toEqual(['walletSora', 'swap']);
  });

  it('skips the conversion for DAI already on Ethereum', () => {
    expect(buyXorNextSteps('ethereum', 'DAI')).toEqual(['walletsEthereum', 'transfer', 'swap']);
  });

  it('describes nothing without a payment method', () => {
    expect(buyXorNextSteps(null)).toEqual([]);
    expect(buyXorNextSteps('xor', 'XOR')).toEqual([]);
  });

  it('starts card purchases from a valid whole-dollar budget', () => {
    expect(isGetTsPlanAmount(BUY_XOR_DEFAULT_CARD_USD, 'USD')).toBe(true);
    expect(new FPNumber(BUY_XOR_DEFAULT_CARD_USD).dp(0, 1).toString()).toBe(BUY_XOR_DEFAULT_CARD_USD);
  });
});
