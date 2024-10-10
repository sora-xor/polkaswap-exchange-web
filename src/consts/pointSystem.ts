import { Category } from '@/types/pointSystem';

export const POINTS_PER_PERCENT = 1000;

const defaultMultipliers = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const progressZero25K = [0, 100, 500, 1000, 5000, 25000];
const progressZero10K = [0, 50, 100, 500, 1000, 10000];

const timestampThresholds = [
  1667260800000, // Nov 1, 2022
  1672531200000, // Jan 1, 2023
  1685603802000, // Jun 1, 2023
  1704067200000, // Jan 1, 2024
  1717226202000, // Jun 1, 2024
];

const generateLevels = (thresholds: number[], multipliers: number[] = defaultMultipliers) => {
  return thresholds.map((threshold, index) => ({
    threshold,
    multiplier: multipliers[index] ?? multipliers[multipliers.length - 1],
  }));
};

export const categoriesPointSystem: { [key: string]: Category } = {
  liquidityProvision: {
    maxPercentage: 10,
    levels: generateLevels(progressZero25K),
  },
  VXORHoldings: {
    maxPercentage: 10,
    levels: generateLevels(progressZero10K),
  },
  referralRewards: {
    maxPercentage: 6,
    levels: generateLevels([0, 10, 50, 100, 250, 1001]),
  },
  depositVolumeBridges: {
    maxPercentage: 6,
    levels: generateLevels(progressZero25K),
  },
  networkFeeSpent: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
  },
  XORBurned: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
  },
  XORHoldings: {
    maxPercentage: 4,
    levels: generateLevels(progressZero10K),
  },
  governanceLockedXOR: {
    maxPercentage: 4,
    levels: generateLevels(progressZero25K),
  },
  kensetsuVolumeRepaid: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
  },
  orderbookVolume: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
  },
  nativeXorStaking: {
    maxPercentage: 2.5,
    levels: generateLevels(progressZero10K),
  },
  KUSDHoldings: {
    maxPercentage: 1,
    levels: generateLevels(progressZero10K),
  },
  firstTxAccount: {
    maxPercentage: 0.5,
    levels: generateLevels(timestampThresholds, [1.0, 0.9, 0.75, 0.5, 0]),
  },
};

export enum pointSysemCategory {
  tasks = 'tasks',
  progress = 'progress',
}
