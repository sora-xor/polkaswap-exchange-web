import { Category } from '@/types/pointSystem';

export const POINTS_PER_PERCENT = 1000;

const defaultMultipliers = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const thresholdLevelZero25K = [0, 100, 500, 1000, 5000, 25000];
const thresholdLevelZero10K = [0, 50, 100, 500, 1000, 10000];

const timestampThresholds = [
  1667260800, // Nov 1, 2022
  1672531200, // Jan 1, 2023
  1685603802, // Jun 1, 2023
  1704067200, // Jan 1, 2024
  1717226202, // Jun 1, 2024
];

const generateLevels = (thresholds: number[], multipliers: number[] = defaultMultipliers) => {
  return thresholds.map((threshold, index) => ({
    threshold,
    multiplier: multipliers[index] ?? multipliers[multipliers.length - 1],
  }));
};
// Константа категорий
export const categoriesPointSystem: { [key: string]: Category } = {
  liquidityProvision: {
    maxPercentage: 10,
    levels: generateLevels(thresholdLevelZero25K),
  },
  referralSystem: {
    maxPercentage: 7,
    levels: generateLevels([0, 10, 50, 100, 250, 1000]),
  },
  depositVolumeBridges: {
    maxPercentage: 6,
    levels: generateLevels(thresholdLevelZero25K),
  },
  networkFeeSpent: {
    maxPercentage: 5,
    levels: generateLevels(thresholdLevelZero10K),
  },
  XORBurned: {
    maxPercentage: 5,
    levels: generateLevels(thresholdLevelZero10K),
  },
  XORHoldings: {
    maxPercentage: 5,
    levels: generateLevels(thresholdLevelZero10K),
  },
  kensetsuVolumeRepaid: {
    maxPercentage: 5,
    levels: generateLevels(thresholdLevelZero10K),
  },
  kensetsuHold: {
    maxPercentage: 5,
    levels: generateLevels(thresholdLevelZero10K),
  },
  orderbookVolume: {
    maxPercentage: 5,
    levels: generateLevels(thresholdLevelZero10K),
  },
  governanceLockedXOR: {
    maxPercentage: 4,
    levels: generateLevels(thresholdLevelZero25K),
  },
  nativeXorStaking: {
    maxPercentage: 2.5,
    levels: generateLevels(thresholdLevelZero10K),
  },
  firstTxAccount: {
    maxPercentage: 0.5,
    levels: generateLevels(timestampThresholds, [1.0, 0.9, 0.75, 0.5, 0]),
  },
};
