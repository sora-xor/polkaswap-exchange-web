import { ValidatorsFilter } from './types';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export const ERA_HOURS = 6;
export const DAY_HOURS = 24;

export enum SoraStakingPageNames {
  Overview = 'Overview',
  ValidatorsType = 'ValidatorsType',
  SelectValidators = 'SelectValidators',
  DataContainer = 'DataContainer',
}

export enum SoraStakingComponents {
  BackButton = 'BackButton',
  StakingHeader = 'StakingHeader',
  StatusBadge = 'StatusBadge',
  ValidatorsList = 'ValidatorsList',
  SelectValidatorsMode = 'SelectValidatorsMode',
  ValidatorAvatar = 'ValidatorAvatar',
  ValidatorsAttentionDialog = 'ValidatorsAttentionDialog',
  ValidatorsFilterDialog = 'ValidatorsFilterDialog',
  StakeDialog = 'StakeDialog',
  ClaimRewardsDialog = 'ClaimRewardsDialog',
  PendingRewardsDialog = 'PendingRewardsDialog',
  ValidatorsDialog = 'ValidatorsDialog',
  ControllerDialog = 'ControllerDialog',
  WithdrawDialog = 'WithdrawDialog',
  AllWithdrawsDialog = 'AllWithdrawsDialog',
  EraCountdown = 'EraCountdown',
}

export const soraStaking = {
  asset: {
    address: '0x0200000000000000000000000000000000000000000000000000000000000000',
    symbol: 'XOR',
    name: 'SORA',
    decimals: 18,
  } as Asset,
  rewardAsset: {
    address: '0x0200040000000000000000000000000000000000000000000000000000000000',
    symbol: 'VAL',
    name: 'SORA Validator Token',
    decimals: 18,
  },
};

export const rewardAsset = '0x0200040000000000000000000000000000000000000000000000000000000000';

export const emptyValidatorsFilter: ValidatorsFilter = {
  hasIdentity: false,
  notSlashed: false,
  notOversubscribed: false,
  twoValidatorsPerIdentity: false,
};

export const recommendedValidatorsFilter: ValidatorsFilter = {
  hasIdentity: false,
  notSlashed: true,
  notOversubscribed: true,
  twoValidatorsPerIdentity: false,
};

export enum ValidatorsFilterType {
  HAS_IDENTITY = 'hasIdentity',
  NOT_SLASHED = 'notSlashed',
  NOT_OVERSUBSCRIBED = 'notOversubscribed',
  TWO_VALIDATORS_PER_IDENTITY = 'twoValidatorsPerIdentity',
}

export enum StakeDialogMode {
  NEW = 'new',
  ADD = 'add',
  REMOVE = 'remove',
}

export enum ValidatorsListMode {
  ALL = 'all',
  USER = 'user',
  SELECT = 'select',
  RECOMMENDED = 'recommended',
}
