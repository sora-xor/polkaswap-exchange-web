import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import type {
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

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
export type LatestIndexedBlockSource = 'polkaswap' | 'sorametrics';
export type LatestIndexedBlockResult = {
  block: number;
  source: LatestIndexedBlockSource;
};

const PolkaswapIndexerStreamBlockQuery = gql<IndexerStreamBlockResponse>`
  query PolkaswapIndexerStreamBlockQuery {
    data: updatesStream(id: "price") {
      block
    }
  }
`;

const PolkaswapLatestIndexedBlockQuery = gql<ConnectionQueryResponse<LatestIndexedBlockEntity>>`
  query PolkaswapLatestIndexedBlockQuery {
    data: historyElements(first: 1, orderBy: [BLOCK_HEIGHT_DESC, ID_DESC]) {
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
 * Fetches the most recent block height from the active Polkaswap indexer.
 */
async function fetchPolkaswapLatestIndexedBlock(): Promise<Nullable<number>> {
  const explorer = (getCurrentIndexer() as PolkaswapIndexer).services.explorer;
  const streamResponse = await explorer.request(PolkaswapIndexerStreamBlockQuery);
  const streamBlock = parseIndexerStreamBlock(streamResponse);
  if (streamBlock !== null) return streamBlock;

  const response = await explorer.fetchEntities(PolkaswapLatestIndexedBlockQuery);
  return parseLatestIndexedBlock(response);
}

/**
 * Fetches the latest indexed block, using Sorametrics only when explicitly configured.
 */
export async function fetchLatestIndexedBlock(
  sorametricsApiEndpoint = ''
): Promise<Nullable<LatestIndexedBlockResult>> {
  let indexerError: unknown = null;

  try {
    const block = await fetchPolkaswapLatestIndexedBlock();
    if (block !== null) return { block, source: 'polkaswap' };
  } catch (error) {
    indexerError = error;
  }

  if (sorametricsApiEndpoint) {
    const { fetchSorametricsLatestBlock } = await import('@/services/sorametrics');
    const block = await fetchSorametricsLatestBlock(sorametricsApiEndpoint);
    if (block !== null) return { block, source: 'sorametrics' };
  }

  if (indexerError) throw indexerError;

  return null;
}
