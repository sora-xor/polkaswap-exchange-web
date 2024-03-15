import { SoraStakingPageNames } from './sora/consts';

export enum StakingPageNames {
  Staking = 'Staking',
}

export const StakingChildPages = [
  StakingPageNames.Staking,
  SoraStakingPageNames.Overview,
  SoraStakingPageNames.NewStake,
  SoraStakingPageNames.ValidatorsType,
  SoraStakingPageNames.SelectValidators,
];
