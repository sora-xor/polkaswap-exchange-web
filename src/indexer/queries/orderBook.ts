import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { SubqueryConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  OrderBookEntity,
  OrderBookLimitOrderEntity,
  OrderBookMarketOrderEntity,
  OrderBookDeal,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

type OrderBookData = {
  dexId: number;
  baseAssetId: string;
  quoteAssetId: string;
  price: FPNumber;
  priceChangeDay: FPNumber;
  volumeDayUSD: FPNumber;
  status: string;
};

const SubqueryOrderBooksQuery = gql<SubqueryConnectionQueryResponse<OrderBookEntity>>`
  query OrderBookQuery($after: Cursor) {
    data: orderBooks(after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          dexId
          baseAssetId
          quoteAssetId
          price
          priceChangeDay
          volumeDayUSD
          status
        }
      }
    }
  }
`;

const parseOrderBookEntity = (item: OrderBookEntity): OrderBookData => {
  const { dexId, baseAssetId, quoteAssetId, price, priceChangeDay, volumeDayUSD, status } = item;

  return {
    dexId,
    baseAssetId,
    quoteAssetId,
    price: new FPNumber(price ?? 0),
    priceChangeDay: new FPNumber(priceChangeDay ?? 0),
    volumeDayUSD: new FPNumber(volumeDayUSD ?? 0),
    status,
  };
};

export async function fetchOrderBooks(): Promise<Nullable<OrderBookData[]>> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const response = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryOrderBooksQuery,
        {},
        parseOrderBookEntity
      );
      return response;
    }
  }

  return null;
}

const SubqueryAccountMarketOrdersQuery = gql<SubqueryConnectionQueryResponse<OrderBookMarketOrderEntity>>`
  query AccountMarketOrdersQuery($after: Cursor, $orderBookId: String, $accountId: String) {
    data: orderBookMarketOrders(
      orderBy: TIMESTAMP_DESC
      after: $after
      filter: { and: [{ orderBookId: { equalTo: $orderBookId } }, { accountId: { equalTo: $accountId } }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          timestamp
          isBuy
          price
          amount
        }
      }
    }
  }
`;

const SubqueryAccountLimitOrdersQuery = gql<SubqueryConnectionQueryResponse<OrderBookLimitOrderEntity>>`
  query AccountLimitOrdersQuery($after: Cursor, $orderBookId: String, $accountId: String) {
    data: orderBookLimitOrders(
      orderBy: TIMESTAMP_DESC
      after: $after
      filter: {
        and: [
          { orderBookId: { equalTo: $orderBookId } }
          { accountId: { equalTo: $accountId } }
          { status: { notEqualTo: Active } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          timestamp
          isBuy
          price
          amount
          amountFilled
          orderId
          lifetime
          expiresAt
          status
        }
      }
    }
  }
`;

export async function fetchOrderBookAccountOrders(
  dexId: number,
  baseAssetId: string,
  quoteAssetId: string,
  accountAddress: string
) {}
