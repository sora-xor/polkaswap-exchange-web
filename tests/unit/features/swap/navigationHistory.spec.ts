import { afterEach, describe, expect, it } from 'vitest';

import {
  isSwapBackNavigationFromOrderBook,
  resolveHistoryBackLocation,
} from '@/features/swap/services/navigationHistory';

const resetHistoryState = () => {
  window.history.replaceState({}, '', window.location.href);
};

describe('swap navigation history', () => {
  afterEach(() => {
    resetHistoryState();
  });

  it('reads the browser history back location when available', () => {
    window.history.replaceState({ back: '/trade/XOR/VAL' }, '', window.location.href);

    expect(resolveHistoryBackLocation()).toBe('/trade/XOR/VAL');
  });

  it('detects order book back navigation from path and hash history locations', () => {
    expect(isSwapBackNavigationFromOrderBook('/trade/XOR/VAL')).toBe(true);
    expect(isSwapBackNavigationFromOrderBook('http://localhost/#/trade/XOR/VAL')).toBe(true);
    expect(isSwapBackNavigationFromOrderBook('#/trade/XOR/VAL')).toBe(true);

    expect(isSwapBackNavigationFromOrderBook('/swap/XOR/VAL')).toBe(false);
    expect(isSwapBackNavigationFromOrderBook(null)).toBe(false);
    expect(isSwapBackNavigationFromOrderBook('')).toBe(false);
  });
});
