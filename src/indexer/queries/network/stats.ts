import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';

import type { QueryData } from '@/lib/soraneo-wallet/src/services/indexer/types';

export { fetchNetworkCounts, readNetworkPeriodCounts } from './volume';
export type { NetworkCounts, ArchiveDayCounts } from './volume';

type NetworkAccountActivityEntity = {
  activeAccounts: number;
};

const PolkaswapNetworkAccountActivityQuery = gql<QueryData<NetworkAccountActivityEntity>>`
  query NetworkAccountActivityQuery($from: Int!, $to: Int!) {
    data: networkAccountActivity(from: $from, to: $to) {
      activeAccounts
    }
  }
`;

/**
 * Fetches the unique count of accounts that participated in transactions over
 * the exact stats range. This remains separate from rolling snapshots because
 * summing per-snapshot unique counts would double-count repeat accounts.
 */
export async function fetchActiveAccounts(from: number, to: number): Promise<FPNumber | null> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const response = await retryOnEmptyResult(
    async () => polkaswapIndexer.services.explorer.request(PolkaswapNetworkAccountActivityQuery, { from, to }),
    (value) => !value
  );
  const activeAccounts = response?.data?.activeAccounts;

  return typeof activeAccounts === 'number' && Number.isSafeInteger(activeAccounts) && activeAccounts >= 0
    ? new FPNumber(activeAccounts)
    : null;
}
