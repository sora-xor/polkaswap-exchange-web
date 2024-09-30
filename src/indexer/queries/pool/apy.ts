import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type {
  SubqueryPoolXYKEntity,
  SubquerySubscriptionPayload,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type { SubsquidPoolXYKEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import type {
  ConnectionQueryResponse,
  PoolApyObject,
  SubscriptionPayload,
  UpdatesStream,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const SubqueryApyQuery = gql<ConnectionQueryResponse<SubqueryPoolXYKEntity>>`
  query SubqueryApyQuery($after: Cursor = "", $first: Int = 100) {
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

const SubsquidApyQuery = gql<ConnectionQueryResponse<SubsquidPoolXYKEntity>>`
  query SubsquidApyQuery($after: String = null, $first: Int = 1000) {
    data: poolXyksConnection(orderBy: id_ASC, first: $first, after: $after, where: { strategicBonusApy_gt: "0" }) {
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

const parseApy = (entity: SubsquidPoolXYKEntity | SubqueryPoolXYKEntity): PoolApyObject => {
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
  const indexer = getCurrentIndexer();

  let result: Nullable<PoolApyObject[]>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      result = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryApyQuery, {}, parseApy);
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      result = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidApyQuery, {}, parseApy);
      break;
    }
  }

  if (!result) return null;

  return result.reduce((acc, item) => ({ ...acc, ...item }), {});
}

const SubqueryApyStreamSubscription = gql<SubquerySubscriptionPayload<UpdatesStream>>`
  subscription SubqueryApyStreamSubscription {
    payload: updatesStreams(id: "apy", mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;

const SubsquidApyStreamSubscription = gql<SubscriptionPayload<UpdatesStream>>`
  subscription SubsquidApyStreamSubscription {
    payload: updatesStreamById(id: "apy") {
      id
      block
      data
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
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;

      return subqueryIndexer.services.explorer.createEntitySubscription(
        SubqueryApyStreamSubscription,
        {},
        parseApyStreamUpdate,
        handler,
        errorHandler
      );
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;

      return subsquidIndexer.services.explorer.createEntitySubscription(
        SubsquidApyStreamSubscription,
        {},
        parseApyStreamUpdate,
        handler,
        errorHandler
      );
    }
  }

  return null;
}
