import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type {
  ConnectionQueryResponse,
  HistoryElement,
  HistoryElementEthBridgeIncoming,
  HistoryElementEthBridgeOutgoing,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

type BridgeHistoryElement = HistoryElementEthBridgeIncoming | HistoryElementEthBridgeOutgoing;
type CountResponse = {
  totalCount: number;
};

export type BridgeData = {
  amount: FPNumber;
  assetId: string;
  type: 'incoming' | 'outgoing';
};

export enum CountType {
  Swap = 'swap',
  PoolDeposit = 'poolDeposit',
  PoolWithdraw = 'poolWithdraw',
}

const SubqueryBridgeQuery = gql<ConnectionQueryResponse<HistoryElement>>`
  query BridgeQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          {
            or: [
              {
                and: [
                  { data: { contains: { to: $account } } }
                  { module: { equalTo: "bridgeMultisig" } }
                  { method: { equalTo: "asMulti" } }
                ]
              }
              {
                and: [
                  { address: { equalTo: $account } }
                  { module: { equalTo: "ethBridge" } }
                  { method: { equalTo: "transferToSidechain" } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          data
        }
      }
    }
  }
`;

const SubsquidBridgeQuery = gql<ConnectionQueryResponse<HistoryElement>>`
  query BridgeQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          {
            OR: [
              {
                AND: [
                  { data_jsonContains: { to: $account } }
                  { module_eq: "bridgeMultisig" }
                  { method_eq: "asMulti" }
                ]
              }
              { AND: [{ address_eq: $account }, { module_eq: "ethBridge" }, { method_eq: "transferToSidechain" }] }
            ]
          }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          data
        }
      }
    }
  }
`;

const parseBridgeData = (item: HistoryElement): BridgeData => {
  const data = item.data as BridgeHistoryElement;

  return {
    amount: new FPNumber(data.amount),
    assetId: data.assetId,
    type: (data as HistoryElementEthBridgeOutgoing).sidechainAddress ? 'outgoing' : 'incoming',
  };
};

export async function fetchBridgeData(start: number, end: number, account: string): Promise<BridgeData[]> {
  const indexer = getCurrentIndexer();
  const variables = { start, end, account };

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryBridgeQuery,
        variables,
        parseBridgeData
      );
      return items ?? [];
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      const items = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidBridgeQuery,
        variables,
        parseBridgeData
      );
      return items ?? [];
    }
  }

  return [];
}

const getSubqueryCountQuery = (filter: string) => gql<ConnectionQueryResponse<CountResponse>>`
  query CountQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          { address: { equalTo: $account } }
          ${filter}
        ]
      }
    ) {
      totalCount
    }
  }
`;

const getSubsquidCountQuery = (filter: string) => gql<ConnectionQueryResponse<CountResponse>>`
  query CountQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          { address_eq: $account }
          ${filter}
        ]
      }
    ) {
      totalCount
    }
  }
`;

const CountFilers = {
  [IndexerType.SUBQUERY]: {
    [CountType.Swap]: `{ module: { equalTo: "liquidityProxy" } } { method: { equalTo: "swap" } }`,
    [CountType.PoolDeposit]: `{ module: { equalTo: "poolXYK" } } { method: { equalTo: "depositLiquidity" } }`,
    [CountType.PoolWithdraw]: `{ module: { equalTo: "poolXYK" } } { method: { equalTo: "withdrawLiquidity" } }`,
  },
  [IndexerType.SUBSQUID]: {
    [CountType.Swap]: `{ module_eq: "liquidityProxy" } { method_eq: "swap" }`,
    [CountType.PoolDeposit]: `{ module_eq: "poolXYK" } { method_eq: "depositLiquidity" }`,
    [CountType.PoolWithdraw]: `{ module_eq: "poolXYK" } { method_eq: "withdrawLiquidity" }`,
  },
};

export async function fetchCount(start: number, end: number, account: string, type: CountType): Promise<number> {
  const indexer = getCurrentIndexer();
  const variables = { start, end, account };
  const filter = CountFilers[indexer.type]?.[type];

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const response = await subqueryIndexer.services.explorer.fetchEntities(getSubqueryCountQuery(filter), variables);
      return response?.totalCount ?? 0;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      const response = await subsquidIndexer.services.explorer.fetchEntitiesConnection(
        getSubsquidCountQuery(filter),
        variables
      );
      return response?.totalCount ?? 0;
    }
  }

  return 0;
}
