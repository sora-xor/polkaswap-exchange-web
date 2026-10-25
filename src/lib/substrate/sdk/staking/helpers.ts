import { StakingRewardsDestination, RewardPointsIndividual, StashNominatorsInfo, ValidatorExposure } from './types';
import type { Option, u32 } from '@polkadot/types';
import type { PalletStakingEraRewardPoints, PalletStakingNominations } from '@polkadot/types/lookup';
import type { Exposure } from '@polkadot/types/interfaces/staking';

type RuntimeCallWithMetadata = {
  meta?: {
    args?: ArrayLike<unknown>;
  };
};

type StakingBondValue = string | number;
type StakingPayee = string | { Account: string };
type StakingBondParams =
  | [value: StakingBondValue, payee: StakingPayee]
  | [controller: string, value: StakingBondValue, payee: StakingPayee];

const DEFAULT_STAKING_BOND_ARGUMENTS = 3;

const formatEra = (data: Option<u32>): number => {
  const era = data.unwrap();

  return era.toNumber();
};

const formatIndividualRewardPoints = (data: PalletStakingEraRewardPoints): RewardPointsIndividual => {
  const result: RewardPointsIndividual = {};

  for (const [account, points] of data.individual.entries()) {
    result[account.toString()] = points.toNumber();
  }

  return result;
};

const formatNominations = (codec: Option<PalletStakingNominations>): StashNominatorsInfo | null => {
  if (codec.isEmpty) return null;

  const data = codec.unwrap();
  const targets = data.targets.map((target) => target.toString());
  const suppressed = data.suppressed.isTrue;
  const submittedIn = data.submittedIn.toNumber();

  return { targets, suppressed, submittedIn };
};

const formatPayee = (payee: StakingRewardsDestination | string): string | { Account: string } => {
  return payee in StakingRewardsDestination ? payee : { Account: payee };
};

/**
 * Formats staking.bond parameters for both legacy controller-based and modern controller-less runtimes.
 */
const formatStakingBondParams = (
  bondCall: RuntimeCallWithMetadata,
  controller: string,
  value: StakingBondValue,
  payee: StakingPayee
): StakingBondParams => {
  const metadataArgsCount = bondCall.meta?.args?.length;
  const argsCount =
    typeof metadataArgsCount === 'number' && metadataArgsCount > 0 ? metadataArgsCount : DEFAULT_STAKING_BOND_ARGUMENTS;

  return argsCount <= 2 ? [value, payee] : [controller, value, payee];
};

const formatValidatorExposure = (codec: Exposure): ValidatorExposure => {
  return {
    total: codec.total.toString(),
    own: codec.own.toString(),
    others: codec.others.map((item) => ({ who: item.who.toString(), value: item.value.toString() })),
  };
};

export {
  formatEra,
  formatPayee,
  formatStakingBondParams,
  formatNominations,
  formatValidatorExposure,
  formatIndividualRewardPoints,
};
