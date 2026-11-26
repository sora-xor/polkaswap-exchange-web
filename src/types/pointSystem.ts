import { FPNumber } from '@sora-substrate/math';

export interface Level {
  threshold: number;
  multiplier: number;
}

export interface Category {
  /** In-app destination for browsing this activity when account progress is unavailable. */
  activityPath?: string;
  maxPercentage: number;
  levels: Level[];
  titleProgress: string;
  titleTask: string;
  descriptionTask: string;
  imageName: string;
}

export type CalculateCategoryPointResult = {
  levelCurrent: number;
  threshold: number;
  points: number;
  nextLevelRewardPoints: number | null;
  currentProgress: number;
  minimumAmountForNextLevel: number | null;
  titleProgress: string;
  titleTask: string;
  descriptionTask: string;
  imageName: string;
};

export type CategoryValues = {
  [key: string]: number;
};

export type CategoryPoints = {
  liquidityProvision: number;
  VXORHoldings: number;
  referralRewards: number;
  depositVolumeBridges: number;
  networkFeeSpent: number;
  XORBurned: number;
  XORHoldings: number;
  governanceLockedXOR: number;
  kensetsuVolumeRepaid: number;
  orderbookVolume: number;
  nativeXorStaking: number;
  KUSDHoldings: number;
  firstTxAccount: number;
};

export interface AccountPointsCalculation {
  fees: {
    amount: FPNumber;
    amountUSD: FPNumber;
  };
  burned: {
    amount: FPNumber;
    amountUSD: FPNumber;
  };
  kensetsu: {
    created: FPNumber;
    closed: FPNumber;
    amountUSD: FPNumber;
  };
  staking: {
    amount: FPNumber;
    amountUSD: FPNumber;
  };
  orderBook: {
    created: FPNumber;
    closed: FPNumber;
    amountUSD: FPNumber;
  };
  governance: {
    votes: FPNumber;
    amount: FPNumber;
    amountUSD: FPNumber;
  };
  bridge: {
    incomingUSD: FPNumber;
    outgoingUSD: FPNumber;
  };
}

export interface AccountPointsVersioned extends AccountPointsCalculation {
  version: number;
  startedAtBlock: number;
}

export interface AccountPointSystems {
  /** Indexer ownership identity; required by the recovery-aware page reader. */
  accountId?: string;
  recoveryPolicyHash?: string | null;
  /** Exact recovery-owned historical referral total; never taken from the live referral store. */
  recoveryReferralRewards?: FPNumber;
  createdAt: {
    timestamp: number;
    block: number;
  };
  points: AccountPointsVersioned[];
}
