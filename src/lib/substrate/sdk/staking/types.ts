import type { History } from '../types';

export interface StakingHistory extends History {
  validators?: string[];
  payee?: string;
  controller?: string;
  payouts: Payouts;
}

export enum StakingRewardsDestination {
  /** not used in sora */
  Staked = 'Staked',
  Stash = 'Stash',
  Controller = 'Controller',
  None = 'None',
}

export interface ValidatorInfo {
  address: string;
  commission: string;
  blocked?: boolean;
}

export interface ValidatorInfoFull extends ValidatorInfo {
  rewardPoints: number;
  nominators: Others;
  identity: Identity | null;
  apy: string;
  isOversubscribed: boolean;
  isKnownGood: boolean;
  stake: {
    total: string;
    own: string;
  };
}

export type Unlocking = {
  value: string;
  remainingEras: string;
  remainingHours: string;
  remainingDays: string;
};

export type MyStakingInfo = {
  myValidators: string[];
  payee: string;
  controller: string;
  redeemAmount: string;
  activeStake: string;
  totalStake: string;
  unbond: {
    unlocking: Unlocking[];
    sum: string;
  };
};

export type Others = {
  who: string;
  value: string;
}[];

export interface ValidatorExposure {
  total: string;
  own: string;
  others: Others;
}

export interface ElectedValidator extends ValidatorExposure {
  address: string;
}

export type StashNominatorsInfo = {
  submittedIn: number; // era in which account submitted the decision to nominate
  suppressed: boolean; // not used currently by substrate and designed for future
  targets: string[]; // list of accountIds of validators nominated by the account
};

export type ActiveEra = {
  index: number; // index of era
  start: number; // timestamp when era was started
};

export type EraElectionStatus = { close: null } | { open: number };

export type RewardPointsIndividual = {
  [key: string]: number;
};

export type EraRewardPoints = {
  total: number;
  individual: RewardPointsIndividual;
};

// To calculate redeemable and unbounding tokens, an active era must be fetched that determines whether an account is ready to claim tokens and unlock them for transfers
export type AccountStakingLedgerUnlock = {
  value: string;
  era: number;
};

export type AccountStakingLedger = {
  stash: string; // address of stash account
  total: string; // active + unlocking (XOR)
  active: string; // still bonded (XOR)
  unlocking: AccountStakingLedgerUnlock[]; // redeemable + unbounding
};

export type NominatorReward = {
  era: string;
  sumRewards: string; // per era for stash address
  validators: {
    address: string;
    value: string;
  }[];
}[];

export type Payouts = {
  era: string;
  validators: string[];
}[];

type JudgementsType = 'Unknown' | 'FeePaid' | 'Reasonable' | 'KnownGood' | 'OutOfDate' | 'LowQuality' | 'Erroneous';

type OriginalInfoItem =
  | 'None'
  | {
      Raw: string;
    };

type InfoItem = 'None' | string;

export type OriginalInfo = {
  legal: OriginalInfoItem;
  web: OriginalInfoItem;
  riot: OriginalInfoItem;
  additional: [];
  pgpFingerprint: null;
  image: OriginalInfoItem;
  display: OriginalInfoItem;
  email: OriginalInfoItem;
  twitter: OriginalInfoItem;
};

export type Info = {
  legal: InfoItem;
  web: InfoItem;
  riot: InfoItem;
  additional: [];
  pgpFingerprint: null;
  image: InfoItem;
  display: InfoItem;
  email: InfoItem;
  twitter: InfoItem;
  name: string;
  description: string;
};

interface CommonIdentity {
  deposit: string;
  judgements: [1 | 0, JudgementsType][];
}

export interface OriginalIdentity extends CommonIdentity {
  info: OriginalInfo;
}

export interface Identity extends CommonIdentity {
  info: Info;
}
