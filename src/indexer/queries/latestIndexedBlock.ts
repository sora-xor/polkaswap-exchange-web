import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import type { ConnectionQueryResponseData } from '@/lib/soraneo-wallet/src/services/indexer/types';

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

const PolkaswapIndexerCheckpointBlockQuery = gql<IndexerStreamBlockResponse>`
  query PolkaswapIndexerCheckpointBlockQuery {
    data: updatesStream(id: "chainState") {
      block
    }
  }
`;

/**
 * Normalizes an indexer-provided block number into a safe display value.
 */
export function parseIndexerBlock(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) {
    return null;
  }

  const block = Number(value);

  return Number.isSafeInteger(block) && block >= 0 ? block : null;
}

/**
 * Extracts a safe integer block height from the indexer's latest history record.
 */
export function parseLatestIndexedBlock(response: Nullable<LatestIndexedBlockResponse>): number | null {
  return parseIndexerBlock(response?.edges?.[0]?.node?.blockHeight);
}

function parseIndexerStreamBlock(response: Nullable<IndexerStreamBlockResponse>): number | null {
  return parseIndexerBlock(response?.data?.block);
}

/**
 * Reads the price stream first, then the bounded worker checkpoint record.
 * Preserves the first request error when neither stream provides a valid block.
 */
async function fetchPolkaswapLatestIndexedBlock(): Promise<number | null> {
  const explorer = (getCurrentIndexer() as PolkaswapIndexer).services.explorer;
  const errors: unknown[] = [];

  for (const query of [PolkaswapIndexerStreamBlockQuery, PolkaswapIndexerCheckpointBlockQuery]) {
    try {
      const response = await explorer.request(query);
      const block = parseIndexerStreamBlock(response);
      if (block !== null) return block;
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length) throw errors[0];

  return null;
}

/**
 * Fetches the latest indexed block, using Sorametrics only when explicitly configured.
 */
export async function fetchLatestIndexedBlock(
  sorametricsApiEndpoint = ''
): Promise<Nullable<LatestIndexedBlockResult>> {
  let indexerError: unknown;
  let indexerFailed = false;

  try {
    const block = await fetchPolkaswapLatestIndexedBlock();
    if (block !== null) return { block, source: 'polkaswap' };
  } catch (error) {
    indexerError = error;
    indexerFailed = true;
  }

  if (sorametricsApiEndpoint) {
    const { fetchSorametricsLatestBlock } = await import('@/services/sorametrics');
    const block = await fetchSorametricsLatestBlock(sorametricsApiEndpoint);
    if (block !== null) return { block, source: 'sorametrics' };
  }

  if (indexerFailed) throw indexerError;

  return null;
}
