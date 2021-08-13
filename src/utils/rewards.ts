import { FPNumber, KnownAssets, RewardInfo, RewardsInfo } from '@sora-substrate/util'
import { RewardsAmountHeaderItem } from '@/types/rewards'

export const groupRewardsByAssetsList = (rewards: Array<RewardInfo | RewardsInfo>): Array<RewardsAmountHeaderItem> => {
  const rewardsHash = rewards.reduce((result, item) => {
    const isRewardsInfo = 'rewards' in item

    if (isRewardsInfo && !(item as RewardsInfo).rewards.length) return result

    const { address, decimals } = isRewardsInfo ? (item as RewardsInfo).rewards[0].asset : (item as RewardInfo).asset
    const amount = isRewardsInfo ? (item as RewardsInfo).limit : (item as RewardInfo).amount
    const current = result[address] || new FPNumber(0, decimals)
    const addValue = FPNumber.fromCodecValue(amount, decimals)
    result[address] = current.add(addValue)
    return result
  }, {})

  return Object.entries(rewardsHash).reduce((total: Array<RewardsAmountHeaderItem>, [address, amount]) => {
    if ((amount as FPNumber).isZero()) return total

    const item = {
      asset: KnownAssets.get(address),
      amount: (amount as FPNumber).toString()
    } as RewardsAmountHeaderItem

    total.push(item)

    return total
  }, [])
}
