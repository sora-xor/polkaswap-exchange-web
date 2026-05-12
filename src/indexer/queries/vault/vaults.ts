import { FPNumber } from '@sora-substrate/sdk';
import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { ClosedVault } from '@/modules/vault/types';

import type { PolkaswapVaultEntity } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import type { ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

const PolkaswapClosedVaultsQuery = gql<ConnectionQueryResponse<PolkaswapVaultEntity>>`
  query ClosedVaultsQuery($account: String, $after: Cursor = "", $first: Int = 100) {
    data: vaults(
      first: $first
      after: $after
      filter: { ownerId: { equalTo: $account }, status: { in: [Closed, Liquidated] } }
      orderBy: UPDATED_AT_BLOCK_DESC
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          type
          status
          collateralAssetId
          debtAssetId
          collateralAmountReturned
        }
      }
    }
  }
`;

const parsePolkaswapVault = (vault: PolkaswapVaultEntity): ClosedVault => {
  return {
    id: +vault.id,
    vaultType: vault.type === 'Type1' ? VaultTypes.V1 : VaultTypes.V2,
    status: vault.status,
    returned: new FPNumber(vault.collateralAmountReturned ?? 0),
    lockedAssetId: vault.collateralAssetId,
    debtAssetId: vault.debtAssetId,
  };
};

export async function fetchClosedVaults(account: string): Promise<ClosedVault[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const items = await polkaswapIndexer.services.explorer.fetchAllEntities(
    PolkaswapClosedVaultsQuery,
    { account },
    parsePolkaswapVault
  );

  return items ?? [];
}
