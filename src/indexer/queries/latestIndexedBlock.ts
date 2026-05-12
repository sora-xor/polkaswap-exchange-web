import { gql } from '@urql/core';

import {
  getCurrentIndexer,
  type SubqueryIndexer,
  type SubsquidIndexer,
} from '@/lib/soraneo-wallet/src/services/indexer';
import type {
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
} from '@/lib/soraneo-wallet/src/services/indexer/types';
import { IndexerType } from '@/indexer/queries/indexerConsts';

type LatestIndexedBlockEntity = {
  blockHeight: string | number | null;
};

type IndexerStreamBlock = {
  block: string | number | null;
};

type IndexerStreamBlockResponse = {
  data: Nullable<IndexerStreamBlock>;
};

type LatestIndexedBlockResponse = Pick<ConnectionQueryResponseData<LatestIndexedBlockEntity>, 'edges'>;

const SubqueryIndexerStreamBlockQuery = gql<IndexerStreamBlockResponse>`
  query SubqueryIndexerStreamBlockQuery {
    data: updatesStream(id: "price") {
      block
    }
  }
`;

const SubsquidIndexerStreamBlockQuery = gql<IndexerStreamBlockResponse>`
  query SubsquidIndexerStreamBlockQuery {
    data: updatesStreamById(id: "price") {
      block
    }
  }
`;

const SubqueryLatestIndexedBlockQuery = gql<ConnectionQueryResponse<LatestIndexedBlockEntity>>`
  query SubqueryLatestIndexedBlockQuery {
    data: historyElements(first: 1, orderBy: [BLOCK_HEIGHT_DESC, ID_DESC]) {
      edges {
        node {
          blockHeight
        }
      }
    }
  }
`;

const SubsquidLatestIndexedBlockQuery = gql<ConnectionQueryResponse<LatestIndexedBlockEntity>>`
  query SubsquidLatestIndexedBlockQuery {
    data: historyElementsConnection(first: 1, orderBy: [blockHeight_DESC, id_DESC]) {
      edges {
        node {
          blockHeight
        }
      }
    }
  }
`;

/**
 * Normalizes an indexer-provided block number into a safe display value.
 */
export function parseIndexerBlock(value: unknown): Nullable<number> {
  const block = Number(value);

  return Number.isSafeInteger(block) && block >= 0 ? block : null;
}

/**
 * Extracts a safe integer block height from the indexer's latest history record.
 */
export function parseLatestIndexedBlock(response: Nullable<LatestIndexedBlockResponse>): Nullable<number> {
  return parseIndexerBlock(response?.edges?.[0]?.node?.blockHeight);
}

function parseIndexerStreamBlock(response: Nullable<IndexerStreamBlockResponse>): Nullable<number> {
  return parseIndexerBlock(response?.data?.block);
}

/**
 * Fetches the most recent block height that the active Polkaswap indexer has indexed.
 */
export async function fetchLatestIndexedBlock(): Promise<Nullable<number>> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const explorer = (indexer as SubqueryIndexer).services.explorer;
      const streamResponse = await explorer.request(SubqueryIndexerStreamBlockQuery);
      const streamBlock = parseIndexerStreamBlock(streamResponse);
      if (streamBlock !== null) return streamBlock;

      const response = await explorer.fetchEntities(SubqueryLatestIndexedBlockQuery);
      return parseLatestIndexedBlock(response);
    }
    case IndexerType.SUBSQUID: {
      const explorer = (indexer as SubsquidIndexer).services.explorer;
      const streamResponse = await explorer.request(SubsquidIndexerStreamBlockQuery);
      const streamBlock = parseIndexerStreamBlock(streamResponse);
      if (streamBlock !== null) return streamBlock;

      const response = await explorer.fetchEntitiesConnection(SubsquidLatestIndexedBlockQuery);
      return parseLatestIndexedBlock(response);
    }
    default:
      return null;
  }
}
