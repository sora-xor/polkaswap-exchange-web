import { describe, expect, it } from 'vitest';

import marketTradesSource from '@/components/pages/OrderBook/MarketTradesWidget.vue?raw';

describe('MarketTradesWidget source', () => {
  it('renders market trades columns in the same order as polkaswap.io', () => {
    const priceIndex = marketTradesSource.indexOf("t('priceText')");
    const timeIndex = marketTradesSource.indexOf("t('orderBook.time')");
    const amountIndex = marketTradesSource.indexOf("t('orderBook.amount')");

    expect(priceIndex).toBeGreaterThan(-1);
    expect(timeIndex).toBeGreaterThan(priceIndex);
    expect(amountIndex).toBeGreaterThan(timeIndex);
    expect(marketTradesSource).toContain('<s-table-column header-align="right" align="right">');
  });
});
