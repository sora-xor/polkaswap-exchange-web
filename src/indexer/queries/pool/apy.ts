import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type {
  PolkaswapPoolXYKEntity,
  PolkaswapSubscriptionPayload,
} from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import type { ConnectionQueryResponse, PoolApyObject, UpdatesStream } from '@/lib/soraneo-wallet/src/services/indexer/types';

const PolkaswapApyQuery = gql<ConnectionQueryResponse<PolkaswapPoolXYKEntity>>`
  query PolkaswapApyQuery($after: Cursor = "", $first: Int = 100) {
    data: poolXYKs(first: $first, after: $after, filter: { strategicBonusApy: { greaterThan: "0" } }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          strategicBonusApy
        }
      }
    }
  }
`;

const formatStringNumber = (value: Nullable<string>) => (value ? new FPNumber(value) : FPNumber.ZERO);

const parseApy = (entity: PolkaswapPoolXYKEntity): PoolApyObject => {
  const acc = {};
  const id = entity.id;
  const strategicBonusApyFPNumber = formatStringNumber(entity.strategicBonusApy);
  const isStrategicBonusApyFinity = strategicBonusApyFPNumber.isFinity();
  if (isStrategicBonusApyFinity) {
    acc[id] = strategicBonusApyFPNumber.toCodecString();
  }
  return acc;
};

/**
 * Get strategic bonus APY for each pool
 */
export async function getPoolsApyObject(): Promise<Nullable<PoolApyObject>> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const result = await polkaswapIndexer.services.explorer.fetchAllEntities(PolkaswapApyQuery, {}, parseApy);

  if (!result) return null;

  return result.reduce((acc, item) => ({ ...acc, ...item }), {});
}

const PolkaswapApyStreamSubscription = gql<PolkaswapSubscriptionPayload<UpdatesStream>>`
  subscription PolkaswapApyStreamSubscription {
    payload: updatesStreams(id: "apy", mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;

const parseApyStreamUpdate = (entity: UpdatesStream): PoolApyObject => {
  const data = entity?.data ? JSON.parse(entity.data) : {};

  return Object.entries(data).reduce((acc, [id, apy]) => {
    const strategicBonusApyFPNumber = formatStringNumber(apy as string);
    const isStrategicBonusApyFinity = strategicBonusApyFPNumber.isFinity();
    if (isStrategicBonusApyFinity) {
      acc[id] = strategicBonusApyFPNumber.toCodecString();
    }
    return acc;
  }, {});
};

export function createPoolsApySubscription(
  handler: (entity: PoolApyObject) => void,
  errorHandler: (error: any) => void
): Nullable<VoidFunction> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;

  return polkaswapIndexer.services.explorer.createEntitySubscription(
    PolkaswapApyStreamSubscription,
    {},
    parseApyStreamUpdate,
    handler,
    errorHandler
  );
}
