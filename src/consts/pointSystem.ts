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
    titleProgress: 'Liquidity provision',
    titleTask: ' Provide Liquidity',
    descriptionTask: 'Provide liquidity across pools',
    imageName: 'governance',
  },
  VXORHoldings: {
    maxPercentage: 10,
    levels: generateLevels(progressZero10K),
    titleProgress: 'VXOR holdings',
    titleTask: 'Hold VXOR',
    descriptionTask: 'Hold your current VXOR holdings',
    imageName: 'governance',
  },
  referralRewards: {
    maxPercentage: 6,
    levels: generateLevels([0, 10, 50, 100, 250, 1001]),
    titleProgress: 'Referral Sytem',
    titleTask: 'Refer accounts',
    descriptionTask: 'Refer accounts through the referral system',
    imageName: 'governance',
  },
  depositVolumeBridges: {
    maxPercentage: 6,
    levels: generateLevels(progressZero25K),
    titleProgress: 'Deposit volume',
    titleTask: 'Deposit & Withdraw ',
    descriptionTask: 'Deposit & withdraw via Bridges, bitget, 1x, gateio',
    imageName: 'governance',
  },
  networkFeeSpent: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
    titleProgress: 'Network fees',
    titleTask: 'Spend XOR on Network Fees',
    descriptionTask: 'Spend XOR in network fees across multiple on-chain transactions',
    imageName: 'governance',
  },
  XORBurned: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
    titleProgress: 'XOR Burned',
    titleTask: 'Burn XOR',
    descriptionTask: 'Burn XOR and convert to $ value',
    imageName: 'governance',
  },
  XORHoldings: {
    maxPercentage: 4,
    levels: generateLevels(progressZero10K),
    titleProgress: 'XOR Hold',
    titleTask: 'Hold XOR',
    descriptionTask: 'Hold your current XOR holdings',
    imageName: 'governance',
  },
  governanceLockedXOR: {
    maxPercentage: 4,
    levels: generateLevels(progressZero25K),
    titleProgress: 'Governance',
    titleTask: 'Lock XOR in Governance Voting',
    descriptionTask: 'Lock XOR by participating in governance voting events',
    imageName: 'governance',
  },
  kensetsuVolumeRepaid: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
    titleProgress: 'Kensetsu volume',
    titleTask: 'Repay KUSD Debt',
    descriptionTask: 'Repay KUSD debt during liquidations or closing positions',
    imageName: 'governance',
  },
  orderbookVolume: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
    titleProgress: 'Orderbook',
    titleTask: 'Create Limit Orders',
    descriptionTask: 'Create limit orders in the orderbook',
    imageName: 'governance',
  },
  nativeXorStaking: {
    maxPercentage: 2.5,
    levels: generateLevels(progressZero10K),
    titleProgress: 'XOR Staking',
    titleTask: 'Stake XOR',
    descriptionTask: 'Stake XOR and earn VAL rewards',
    imageName: 'governance',
  },
  KUSDHoldings: {
    maxPercentage: 1,
    levels: generateLevels(progressZero10K),
    titleProgress: 'KUSD Hold',
    titleTask: 'Hold Kusd',
    descriptionTask: 'Hold your current KUSD holdings',
    imageName: 'governance',
  },
  firstTxAccount: {
    maxPercentage: 0.5,
    levels: generateLevels(timestampThresholds, [1.0, 0.9, 0.75, 0.5, 0]),
    titleProgress: 'First Trx',
    titleTask: 'Do your first transaction',
    descriptionTask: 'Complete your first XOR transaction ever and receive the reward',
    imageName: 'governance',
  },
};

export enum pointSysemCategory {
  tasks = 'tasks',
  progress = 'progress',
}
