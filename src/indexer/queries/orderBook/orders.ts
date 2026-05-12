import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import { OrderStatus } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { OrderBookOrderEntity, ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

const parseSide = (isBuy: boolean): PriceVariant => {
  return isBuy ? PriceVariant.Buy : PriceVariant.Sell;
};
const parseTimestamp = (unixTimestamp: number) => {
  return unixTimestamp * 1000;
};

const PolkaswapAccountOrdersQuery = gql<ConnectionQueryResponse<OrderBookOrderEntity>>`
  query PolkaswapAccountOrdersQuery($after: Cursor, $filter: OrderBookOrderFilter) {
    data: orderBookOrders(orderBy: TIMESTAMP_DESC, after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          type
          orderId
          orderBookId
          accountId
          timestamp
          isBuy
          price
          amount
          amountFilled
          lifetime
          expiresAt
          status
        }
      }
    }
  }
`;

const parseOrderEntity = (item: OrderBookOrderEntity): OrderData => {
  const owner = item.accountId;
  const orderBookId = item.orderBookId;
  const [dexId, base, quote] = orderBookId.split('-');
  const originalAmount = new FPNumber(item.amount);
  const filledAmount = new FPNumber(item.amountFilled);
  const amount = originalAmount.sub(filledAmount);

  return {
    orderBookId: {
      dexId: Number(dexId),
      base,
      quote,
    },
    owner,
    time: parseTimestamp(item.timestamp),
    side: parseSide(item.isBuy),
    price: new FPNumber(item.price),
    originalAmount,
    amount,
    id: item.orderId ?? 0,
    lifespan: parseTimestamp(item.lifetime),
    expiresAt: parseTimestamp(item.expiresAt),
    status: item.status,
  };
};

const polkaswapAccountOrdersFilter = (accountAddress: string, id?: OrderBookId) => {
  const filter: any = {
    and: [{ accountId: { equalTo: accountAddress } }, { status: { notEqualTo: OrderStatus.Active } }],
  };

  if (id) {
    const orderBookId = [id.dexId, id.base, id.quote].join('-');

    filter.and.push({
      orderBookId: { equalTo: orderBookId },
    });
  }

  return filter;
};

export async function fetchOrderBookAccountOrders(
  accountAddress: string,
  id?: OrderBookId
): Promise<Nullable<OrderData[]>> {
  const filter = polkaswapAccountOrdersFilter(accountAddress, id);
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;

  return polkaswapIndexer.services.explorer.fetchAllEntities(
    PolkaswapAccountOrdersQuery,
    { filter },
    parseOrderEntity
  );
}
