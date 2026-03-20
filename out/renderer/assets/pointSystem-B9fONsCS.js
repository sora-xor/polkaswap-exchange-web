import { bc as ValidatorsListMode, bd as ValidatorsFilterType, be as RewardingEvents, bf as RewardsTabsItems, bg as PoolPageNames, V as PageNames, bh as VaultPageNames, bi as DashboardPageNames, bj as StakingPageNames, bk as en, T as Theme, s as store, aw as KUSD, X as XOR, bl as VXOR } from "./index-73GArslZ.js";
import { A as AlertFrequencyTabs, a as AlertTypeTabs } from "./tabs-xjDSPYBb.js";
const walletEn = en ?? {};
const messages = {
  // Wallet project keys
  ...walletEn,
  [Theme.LIGHT]: "Light",
  [Theme.DARK]: "Dark",
  pageTitle: {
    [PageNames.Swap]: "Swap",
    [PoolPageNames.Pool]: "Pool",
    [PageNames.Bridge]: "@:bridgeText",
    [PageNames.Sccp]: "@:pageTitle.Sccp",
    [PageNames.Stats]: "Statistics",
    [PageNames.Wallet]: "Wallet",
    [PageNames.AddLiquidity]: "Add Liquidity",
    [PageNames.Rewards]: "Rewards",
    [PageNames.ExploreTokens]: "Tokens",
    [PageNames.ExplorePools]: "Pools",
    [PageNames.ExploreStaking]: "Staking",
    [PageNames.ExploreFarming]: "Farming",
    [PageNames.ExploreBooks]: "@:pageTitle.OrderBook",
    [PageNames.OrderBook]: "Trade",
    [PageNames.Burn]: "Burn",
    [StakingPageNames.Staking]: "Staking",
    [DashboardPageNames.AssetOwner]: "Asset owner",
    [DashboardPageNames.AssetOwnerDetails]: "@:pageTitle.AssetOwner",
    [VaultPageNames.Vaults]: "{Kensetsu}",
    [VaultPageNames.VaultDetails]: "Position Details"
  },
  mainMenu: {
    [PageNames.Swap]: "Swap",
    [PoolPageNames.Pool]: "Pool",
    [PageNames.Bridge]: "@:bridgeText",
    [PageNames.Sccp]: "@:pageTitle.Sccp",
    [PageNames.Farming]: "Farming",
    [PageNames.Wallet]: "Account",
    [PageNames.Rewards]: "Rewards",
    [PageNames.Stats]: "Statistics",
    [PageNames.OrderBook]: "Trade",
    [PageNames.ExploreContainer]: "Explore",
    [PageNames.StakingContainer]: "Staking",
    [PageNames.AssetOwnerContainer]: "@:pageTitle.AssetOwner",
    [VaultPageNames.VaultsContainer]: "@:pageTitle.Vaults"
  },
  alerts: {
    [AlertTypeTabs.Drop]: "Drops below",
    [AlertTypeTabs.Raise]: "Rises above",
    [AlertFrequencyTabs.Once]: "Once",
    [AlertFrequencyTabs.Always]: "Always"
  },
  exchange: {
    [PageNames.Swap]: "Swap",
    [PoolPageNames.Pool]: "Pool"
  },
  rewards: {
    [RewardsTabsItems.PointSystem]: "Points",
    [RewardsTabsItems.Rewards]: "Rewards",
    [RewardsTabsItems.ReferralProgram]: "Referrals",
    events: {
      [RewardingEvents.XorErc20]: "XOR ERC-20",
      [RewardingEvents.SoraFarmHarvest]: "{Sora}.farm harvest",
      [RewardingEvents.NftAirdrop]: "NFT Airdrop",
      [RewardingEvents.LiquidityProvision]: "Fees gained from liquidity provision",
      [RewardingEvents.BuyOnBondingCurve]: "buying from the TBC",
      [RewardingEvents.MarketMakerVolume]: "Market Making",
      [RewardingEvents.LiquidityProvisionFarming]: "Farming"
    }
  },
  points: {
    liquidityProvision: {
      titleProgress: "Liquidity provision",
      titleTask: "Provide Liquidity",
      descriptionTask: "Provide liquidity across pools"
    },
    VXORHoldings: {
      titleProgress: "VXOR holdings",
      titleTask: "Hold VXOR",
      descriptionTask: "Hold your current VXOR holdings"
    },
    referralRewards: {
      titleProgress: "Referral Sytem",
      titleTask: "Refer accounts",
      descriptionTask: "Refer accounts through the referral system"
    },
    depositVolumeBridges: {
      titleProgress: "Deposit volume",
      titleTask: "Deposit & Withdraw",
      descriptionTask: "Deposit & withdraw via Bridges, bitget, 1x, gateio"
    },
    networkFeeSpent: {
      titleProgress: "Network fees",
      titleTask: "Spend XOR on Network Fees",
      descriptionTask: "Spend XOR in network fees across multiple on-chain transactions"
    },
    XORBurned: {
      titleProgress: "XOR Burned",
      titleTask: "Burn XOR",
      descriptionTask: "Burn XOR and convert to $ value"
    },
    XORHoldings: {
      titleProgress: "XOR Hold",
      titleTask: "Hold XOR",
      descriptionTask: "Hold your current XOR holdings"
    },
    governanceLockedXOR: {
      titleProgress: "Governance",
      titleTask: "Lock XOR in Governance Voting",
      descriptionTask: "Lock XOR by participating in governance voting events"
    },
    kensetsuVolumeRepaid: {
      titleProgress: "Kensetsu volume",
      titleTask: "Repay KUSD Debt",
      descriptionTask: "Repay KUSD debt during liquidations or closing positions"
    },
    orderbookVolume: {
      titleProgress: "Orderbook",
      titleTask: "Create Limit Orders",
      descriptionTask: "Create limit orders in the orderbook"
    },
    nativeXorStaking: {
      titleProgress: "XOR Staking",
      titleTask: "Stake XOR",
      descriptionTask: "Stake XOR and earn VAL rewards"
    },
    KUSDHoldings: {
      titleProgress: "KUSD Hold",
      titleTask: "Hold Kusd",
      descriptionTask: "Hold your current KUSD holdings"
    },
    firstTxAccount: {
      titleProgress: "First Trx",
      titleTask: "Do your first transaction",
      descriptionTask: "Complete your first XOR transaction ever and receive the reward"
    }
  },
  soraStaking: {
    validatorsFilterDialog: {
      filters: {
        [ValidatorsFilterType.HAS_IDENTITY]: {},
        [ValidatorsFilterType.NOT_SLASHED]: {},
        [ValidatorsFilterType.NOT_OVERSUBSCRIBED]: {},
        [ValidatorsFilterType.TWO_VALIDATORS_PER_IDENTITY]: {}
      }
    },
    validatorsDialog: {
      tabs: {
        [ValidatorsListMode.USER]: "Yours",
        [ValidatorsListMode.ALL]: "All"
      }
    }
  }
};
const MAX_LEVEL = 6;
const POINTS_PER_PERCENT = 1e3;
const defaultMultipliers = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
const progressZero25K = [0, 100, 500, 1e3, 5e3, 25e3];
const progressZero10K = [0, 50, 100, 500, 1e3, 1e4];
const timestampThresholds = [
  16672608e5,
  // Nov 1, 2022
  16725312e5,
  // Jan 1, 2023
  1685603802e3,
  // Jun 1, 2023
  17040672e5,
  // Jan 1, 2024
  1717226202e3
  // Jun 1, 2024
];
const generateLevels = (thresholds, multipliers = defaultMultipliers) => {
  return thresholds.map((threshold, index) => ({
    threshold,
    multiplier: multipliers[index] ?? multipliers[multipliers.length - 1]
  }));
};
const getAsset = (imageName) => {
  if (!isTokenImage(imageName)) {
    return null;
  }
  const getAssetFromStore = store.getters.assets.assetDataByAddress;
  const asset = getAssetFromStore(imageName);
  return asset ?? null;
};
const isTokenImage = (imageName) => {
  return imageName.startsWith("0x");
};
const getImageSrc = (imageName) => {
  const asset = getAsset(imageName);
  if (asset) {
    return asset;
  }
  return `/point-system/${imageName}.svg`;
};
const categoriesPointSystem = {
  liquidityProvision: {
    maxPercentage: 10,
    levels: generateLevels(progressZero25K),
    titleProgress: messages.points.liquidityProvision.titleProgress,
    titleTask: messages.points.liquidityProvision.titleTask,
    descriptionTask: messages.points.liquidityProvision.descriptionTask,
    imageName: "liquidity"
  },
  VXORHoldings: {
    maxPercentage: 10,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.VXORHoldings.titleProgress,
    titleTask: messages.points.VXORHoldings.titleTask,
    descriptionTask: messages.points.VXORHoldings.descriptionTask,
    imageName: VXOR.address
  },
  referralRewards: {
    maxPercentage: 6,
    levels: generateLevels([0, 10, 50, 100, 250, 1001]),
    titleProgress: messages.points.referralRewards.titleProgress,
    titleTask: messages.points.referralRewards.titleTask,
    descriptionTask: messages.points.referralRewards.descriptionTask,
    imageName: "referral_rewards"
  },
  depositVolumeBridges: {
    maxPercentage: 6,
    levels: generateLevels(progressZero25K),
    titleProgress: messages.points.depositVolumeBridges.titleProgress,
    titleTask: messages.points.depositVolumeBridges.titleTask,
    descriptionTask: messages.points.depositVolumeBridges.descriptionTask,
    imageName: "bridges"
  },
  networkFeeSpent: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.networkFeeSpent.titleProgress,
    titleTask: messages.points.networkFeeSpent.titleTask,
    descriptionTask: messages.points.networkFeeSpent.descriptionTask,
    imageName: "network_fee"
  },
  XORBurned: {
    maxPercentage: 5,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.XORBurned.titleProgress,
    titleTask: messages.points.XORBurned.titleTask,
    descriptionTask: messages.points.XORBurned.descriptionTask,
    imageName: "xor_burned"
  },
  XORHoldings: {
    maxPercentage: 4,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.XORHoldings.titleProgress,
    titleTask: messages.points.XORHoldings.titleTask,
    descriptionTask: messages.points.XORHoldings.descriptionTask,
    imageName: XOR.address
  },
  governanceLockedXOR: {
    maxPercentage: 4,
    levels: generateLevels(progressZero25K),
    titleProgress: messages.points.governanceLockedXOR.titleProgress,
    titleTask: messages.points.governanceLockedXOR.titleTask,
    descriptionTask: messages.points.governanceLockedXOR.descriptionTask,
    imageName: "governance"
  },
  kensetsuVolumeRepaid: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.kensetsuVolumeRepaid.titleProgress,
    titleTask: messages.points.kensetsuVolumeRepaid.titleTask,
    descriptionTask: messages.points.kensetsuVolumeRepaid.descriptionTask,
    imageName: "kensetsu"
  },
  orderbookVolume: {
    maxPercentage: 3,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.orderbookVolume.titleProgress,
    titleTask: messages.points.orderbookVolume.titleTask,
    descriptionTask: messages.points.orderbookVolume.descriptionTask,
    imageName: "orderbook"
  },
  nativeXorStaking: {
    maxPercentage: 2.5,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.nativeXorStaking.titleProgress,
    titleTask: messages.points.nativeXorStaking.titleTask,
    descriptionTask: messages.points.nativeXorStaking.descriptionTask,
    imageName: "staking"
  },
  KUSDHoldings: {
    maxPercentage: 1,
    levels: generateLevels(progressZero10K),
    titleProgress: messages.points.KUSDHoldings.titleProgress,
    titleTask: messages.points.KUSDHoldings.titleTask,
    descriptionTask: messages.points.KUSDHoldings.descriptionTask,
    imageName: KUSD.address
  },
  firstTxAccount: {
    maxPercentage: 0.5,
    levels: generateLevels(timestampThresholds, [1, 0.9, 0.75, 0.5, 0]),
    titleProgress: messages.points.firstTxAccount.titleProgress,
    titleTask: messages.points.firstTxAccount.titleTask,
    descriptionTask: messages.points.firstTxAccount.descriptionTask,
    imageName: "liquidity"
  }
};
var pointSystemCategory = /* @__PURE__ */ ((pointSystemCategory2) => {
  pointSystemCategory2["tasks"] = "tasks";
  pointSystemCategory2["progress"] = "progress";
  return pointSystemCategory2;
})(pointSystemCategory || {});
export {
  MAX_LEVEL as M,
  POINTS_PER_PERCENT as P,
  categoriesPointSystem as c,
  getImageSrc as g,
  isTokenImage as i,
  pointSystemCategory as p
};
