import { describe, expect, it } from 'vitest';

import { OrderBookModule } from '@/lib/substrate/sdk/orderBook';

describe('OrderBookModule connection guards', () => {
  it('returns empty order book data when connection api is unavailable', async () => {
    const orderBook = new OrderBookModule({
      connection: { api: null },
    } as any);

    await expect(orderBook.getOrderBooks()).resolves.toEqual({});
    await expect(orderBook.getUserOrderBooks('cnVx...')).resolves.toEqual([]);
  });
});
