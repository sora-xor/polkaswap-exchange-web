import { KUSD, XOR, VXOR } from '@sora-substrate/sdk/build/assets/consts';
import { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

import messages from '@/lang/messages';
import store from '@/store';
import { Category } from '@/types/pointSystem';

export const MAX_LEVEL = 6;
export const POINTS_PER_PERCENT = 1000;

// 50%, 60%, 70%, 80%, 90%, 100%
const defaultMultipliers = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

// Volume 0-100$, 100-500$ e.t.c
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

const getAsset = (imageName: string): AccountAsset | null => {
  if (!isTokenImage(imageName)) {
    return null;
  }
  const getAssetFromStore = store.getters.assets.assetDataByAddress;
  const asset = getAssetFromStore(imageName);
  return asset ?? null;
};

export const isTokenImage = (imageName: string): boolean => {
  return imageName.startsWith('0x');
};

export const getImageSrc = (imageName: string): AccountAsset | string => {
  const asset = getAsset(imageName);
  if (asset) {
    return asset;
  }
  return `/point-system/${imageName}.svg`;
};

export const categoriesPointSystem: { [key: string]: Category } = {
  liquidityProvision: {
    maxPercentage: 10,
    levels: generateLevels(progressZero25K),
    titleProgress: messages.points.liquidityProvision.titleProgress,
    titleTask: messages.points.liquidityProvision.titleTask,
    descriptionTask: messages.points.liquidityProvision.descriptionTask,
    imageName: 'liquidity',
  },
  VXORHoldings: {
    maxPercentage: 10,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.VXORHoldings.titleProgress,
    titleTask: messages.points.VXORHoldings.titleTask,
    descriptionTask: messages.points.VXORHoldings.descriptionTask,
    imageName: VXOR.address,
  },
  referralRewards: {
    maxPercentage: 6,
    levels: generateLevels([0, 10, 50, 100, 250, 1001]),
    titleProgress: messages.points.referralRewards.titleProgress,
    titleTask: messages.points.referralRewards.titleTask,
    descriptionTask: messages.points.referralRewards.descriptionTask,
    imageName: 'referral_rewards',
  },
  depositVolumeBridges: {
    maxPercentage: 6,
    levels: generateLevels(progressZero25K),
    titleProgress: messages.points.depositVolumeBridges.titleProgress,
    titleTask: messages.points.depositVolumeBridges.titleTask,
    descriptionTask: messages.points.depositVolumeBridges.descriptionTask,
    imageName: 'bridges',
  },
  networkFeeSpent: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.networkFeeSpent.titleProgress,
    titleTask: messages.points.networkFeeSpent.titleTask,
    descriptionTask: messages.points.networkFeeSpent.descriptionTask,
    imageName: 'network_fee',
  },
  XORBurned: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.XORBurned.titleProgress,
    titleTask: messages.points.XORBurned.titleTask,
    descriptionTask: messages.points.XORBurned.descriptionTask,
    imageName: 'xor_burned',
  },
  XORHoldings: {
    maxPercentage: 4,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.XORHoldings.titleProgress,
    titleTask: messages.points.XORHoldings.titleTask,
    descriptionTask: messages.points.XORHoldings.descriptionTask,
    imageName: XOR.address,
  },
  governanceLockedXOR: {
    maxPercentage: 4,
    levels: generateLevels(progressZero25K),
    titleProgress: messages.points.governanceLockedXOR.titleProgress,
    titleTask: messages.points.governanceLockedXOR.titleTask,
    descriptionTask: messages.points.governanceLockedXOR.descriptionTask,
    imageName: 'governance',
  },
  kensetsuVolumeRepaid: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.kensetsuVolumeRepaid.titleProgress,
    titleTask: messages.points.kensetsuVolumeRepaid.titleTask,
    descriptionTask: messages.points.kensetsuVolumeRepaid.descriptionTask,
    imageName: 'kensetsu',
  },
  orderbookVolume: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.orderbookVolume.titleProgress,
    titleTask: messages.points.orderbookVolume.titleTask,
    descriptionTask: messages.points.orderbookVolume.descriptionTask,
    imageName: 'orderbook',
  },
  nativeXorStaking: {
    maxPercentage: 2.5,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.nativeXorStaking.titleProgress,
    titleTask: messages.points.nativeXorStaking.titleTask,
    descriptionTask: messages.points.nativeXorStaking.descriptionTask,
    imageName: 'staking',
  },
  KUSDHoldings: {
    maxPercentage: 1,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.KUSDHoldings.titleProgress,
    titleTask: messages.points.KUSDHoldings.titleTask,
    descriptionTask: messages.points.KUSDHoldings.descriptionTask,
    imageName: KUSD.address,
  },
  firstTxAccount: {
    maxPercentage: 0.5,
    levels: generateLevels(timestampThresholds, [1.0, 0.9, 0.75, 0.5, 0]),
    titleProgress: messages.points.firstTxAccount.titleProgress,
    titleTask: messages.points.firstTxAccount.titleTask,
    descriptionTask: messages.points.firstTxAccount.descriptionTask,
    imageName: 'liquidity',
  },
};

export enum pointSystemCategory {
  tasks = 'tasks',
  progress = 'progress',
}
