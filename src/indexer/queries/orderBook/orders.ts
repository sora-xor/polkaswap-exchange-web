import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import { OrderStatus } from '@/types/orderBook';
import type { OrderData } from '@/types/orderBook';

import type { OrderBookId } from '@sora-substrate/liquidity-proxy';
import type {
  OrderBookOrderEntity,
  ConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const parseSide = (isBuy: boolean): PriceVariant => {
  return isBuy ? PriceVariant.Buy : PriceVariant.Sell;
};
const parseTimestamp = (unixTimestamp: number) => {
  return unixTimestamp * 1000;
};

const SubqueryAccountOrdersQuery = gql<ConnectionQueryResponse<OrderBookOrderEntity>>`
  query SubqueryAccountOrdersQuery($after: Cursor, $filter: OrderBookOrderFilter) {
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

const SubsquidAccountOrdersQuery = gql<ConnectionQueryResponse<OrderBookOrderEntity>>`
  query SubsquidAccountOrdersQuery($after: Cursor, $where: OrderBookOrderWhereInput) {
    data: orderBookOrdersConnection(orderBy: timestamp_DESC, after: $after, where: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          type
          orderId
          orderBook {
            id
          }
          account {
            id
          }
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
  const owner = 'accountId' in item ? item.accountId : item.account.id;
  const orderBookId = 'orderBookId' in item ? item.orderBookId : item.orderBook.id;
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

const subqueryAccountOrdersFilter = (accountAddress: string, id?: OrderBookId) => {
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

const subsquidAccountOrdersFilter = (accountAddress: string, id?: OrderBookId) => {
  const where: any = {
    account: { id_eq: accountAddress },
    status_not_eq: OrderStatus.Active,
  };

  if (id) {
    const orderBookId = [id.dexId, id.base, id.quote].join('-');

    where.orderBook = { id_eq: orderBookId };
  }

  return where;
};

export async function fetchOrderBookAccountOrders(
  accountAddress: string,
  id?: OrderBookId
): Promise<Nullable<OrderData[]>> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = subqueryAccountOrdersFilter(accountAddress, id);
      const variables = { filter };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const orders = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryAccountOrdersQuery,
        variables,
        parseOrderEntity
      );

      return orders;
    }
    case IndexerType.SUBSQUID: {
      const where = subsquidAccountOrdersFilter(accountAddress, id);
      const variables = { where };
      const subsquidIndexer = indexer as SubsquidIndexer;
      const orders = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidAccountOrdersQuery,
        variables,
        parseOrderEntity
      );

      return orders;
    }
  }

  return null;
}
