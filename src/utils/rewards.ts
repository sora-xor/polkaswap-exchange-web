import { FPNumber, KnownAssets, RewardInfo } from '@sora-substrate/util'
import { RewardsAmountHeaderItem } from '@/types/rewards'

export const findClaimableRewards = (rewards: Array<RewardInfo>): Array<RewardInfo> =>
  rewards.reduce((claimableList: Array<RewardInfo>, item: RewardInfo) => {
    if (FPNumber.fromCodecValue(item.amount, item.asset.decimals).isZero()) return claimableList

    claimableList.push(item)

    return claimableList
  }, [])

export const groupRewardsByAssetsList = (rewards: Array<RewardInfo>): Array<RewardsAmountHeaderItem> => {
  const rewardsHash = rewards.reduce((result, { asset, amount }: RewardInfo) => {
    const { address, decimals } = asset
    const current = result[address] || new FPNumber(0, decimals)
    const addValue = FPNumber.fromCodecValue(amount, decimals)

    result[address] = current.add(addValue)

    return result
  }, {})

  return Object.entries(rewardsHash).reduce((total: Array<RewardsAmountHeaderItem>, [address, amount]) => {
    if ((amount as FPNumber).isZero()) return total

    const item = {
      symbol: KnownAssets.get(address).symbol,
      amount: (amount as FPNumber).format()
    } as RewardsAmountHeaderItem

    total.push(item)

    return total
  }, [])
}
