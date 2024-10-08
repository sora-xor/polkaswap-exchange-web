import { FPNumber } from '@sora-substrate/math';

interface Level {
  threshold: number;
  multiplier: number;
}

export interface Category {
  maxPercentage: number;
  levels: Level[];
}

export type CalculateCategoryPointResult = {
  levelCurrent: number;
  threshold: number;
  points: number;
  nextLevelRewardPoints: number | null;
  currentProgress: number;
  minimumAmountForNextLevel: number | null;
};

export type CategoryValues = {
  [key: string]: number;
};

export type CategoryPoints = {
  liquidityProvision: number;
  referralRewards: number;
  depositVolumeBridges: number;
  networkFeeSpent: number;
  XORBurned: number;
  XORHoldings: number;
  kensetsuVolumeRepaid: number;
  kensetsuHold: number;
  orderbookVolume: number;
  governanceLockedXOR: number;
  nativeXorStaking: number;
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
  createdAt: { timestamp: number; block: number }; // Здесь число
}
