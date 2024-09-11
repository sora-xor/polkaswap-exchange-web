import { ValidatorsListMode } from '@/modules/staking/sora/consts';
import { ValidatorsFilter } from '@/modules/staking/sora/types';

import type { FPNumber } from '@sora-substrate/math';
import type {
  ValidatorInfo,
  StashNominatorsInfo,
  AccountStakingLedger,
  MyStakingInfo,
  NominatorReward,
} from '@sora-substrate/sdk/build/staking/types';
import type { Subscription } from 'rxjs';

export declare type StakingRewardToken = {
  assetId: string;
  tokenPerBlock: FPNumber;
  x;
  farmsTotalMultiplier: number;
  stakingTotalMultiplier: number;
  farmsAllocation: FPNumber;
  stakingAllocation: FPNumber;
  teamAllocation: FPNumber;
};

export type StakingState = {
  stakeAmount: string;
  newStakeValidatorsMode: Nullable<ValidatorsListMode.RECOMMENDED | ValidatorsListMode.SELECT>;

  validatorsFilter: ValidatorsFilter;
  showValidatorsFilterDialog: boolean;

  wannabeValidators: readonly ValidatorInfo[];
  validatorsInfo: readonly ValidatorInfo[];
  selectedValidators: readonly ValidatorInfo[];

  pendingRewards: Nullable<NominatorReward>;

  minNominatorBond: Nullable<number>;
  unbondPeriod: Nullable<number>;
  maxNominations: Nullable<number>;
  historyDepth: Nullable<number>;

  totalNominators: Nullable<number>;

  activeEra: Nullable<number>;
  activeEraUpdates: Nullable<Subscription>;

  activeEraStart: Nullable<number>;

  currentEra: Nullable<number>;
  currentEraUpdates: Nullable<Subscription>;

  currentEraTotalStake: Nullable<string>;
  currentEraTotalStakeUpdates: Nullable<Subscription>;

  stakingInfo: Nullable<MyStakingInfo>;

  controller: Nullable<string>;
  controllerUpdates: Nullable<Subscription>;

  payee: Nullable<string>;
  payeeUpdates: Nullable<Subscription>;

  nominations: Nullable<StashNominatorsInfo>;
  nominationsUpdates: Nullable<Subscription>;

  accountLedger: Nullable<AccountStakingLedger>;
  accountLedgerUpdates: Nullable<Subscription>;
};
