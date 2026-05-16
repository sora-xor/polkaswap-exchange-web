import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';

import type { QueryData, UpdatesStream } from '@/lib/soraneo-wallet/src/services/indexer/types';
import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

type IndexedValidator = Record<string, unknown>;

const PolkaswapStakingValidatorsStreamQuery = gql<QueryData<Nullable<UpdatesStream>>>`
  query PolkaswapStakingValidatorsStreamQuery {
    data: updatesStream(id: "stakingValidators") {
      block
      data
    }
  }
`;

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const parseNominators = (value: unknown): ValidatorInfoFull['nominators'] =>
  Array.isArray(value)
    ? value.map((item) => {
        const nominator = toRecord(item);
        return {
          who: String(nominator.who ?? ''),
          value: String(nominator.value ?? '0'),
        };
      })
    : [];

const parseValidator = (value: IndexedValidator): ValidatorInfoFull => {
  const stake = toRecord(value.stake);

  return {
    address: String(value.address ?? value.id ?? ''),
    commission: String(value.commission ?? '0'),
    blocked: Boolean(value.blocked),
    rewardPoints: Number(value.rewardPoints ?? 0),
    nominators: parseNominators(value.nominators),
    identity: value.identity ? (value.identity as ValidatorInfoFull['identity']) : null,
    apy: String(value.apy ?? '0'),
    isOversubscribed: Boolean(value.isOversubscribed),
    isKnownGood: Boolean(value.isKnownGood),
    stake: {
      total: String(stake.total ?? '0'),
      own: String(stake.own ?? '0'),
    },
  };
};

const parseValidatorsStream = (entity: Nullable<UpdatesStream>): Nullable<ValidatorInfoFull[]> => {
  if (!entity?.data) return null;

  try {
    const data = JSON.parse(entity.data);

    if (!Array.isArray(data)) return null;

    return data.map((item) => parseValidator(toRecord(item)));
  } catch (error) {
    console.warn('Failed to parse indexed staking validators', error);
    return null;
  }
};

/**
 * Reads precomputed staking validator returns from the Polkaswap indexer.
 */
export async function getValidatorsInfoFromIndexer(): Promise<Nullable<ValidatorInfoFull[]>> {
  try {
    const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
    const response = await polkaswapIndexer.services.explorer.request(PolkaswapStakingValidatorsStreamQuery);

    return parseValidatorsStream(response?.data ?? null);
  } catch (error) {
    console.warn('Failed to fetch indexed staking validators', error);
    return null;
  }
}

export const stakingValidatorsQueryInternals = {
  parseValidatorsStream,
};
