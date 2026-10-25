import { KnownAssets, KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { computed, type Ref } from 'vue';

import {
  buildBreakdown,
  buildRewardSources,
  buildUnlocked,
  buildVesting,
  getFeePercent,
  getFiatValue,
  parseAmount,
  rankAssetsByValue,
  type RewardAmount,
  type RewardsSnapshot,
} from '@/features/rewards/utils/analytics';
import { useRewardsStore } from '@/stores/rewards';
import { useWalletStore } from '@/stores/wallet';

import type { RewardsAmountHeaderItem } from '@/types/rewards';

/**
 * Everything the rewards dashboard charts, derived from the rewards store and the wallet's prices.
 *
 * `selectedItems` is the list shown in the hero (what the next claim would pay out, or what was just received); the
 * rest comes straight from the store, so unticking a source updates every card at once.
 */
export function useRewardsAnalytics(selectedItems: Ref<readonly RewardsAmountHeaderItem[]>) {
  const rewardsStore = useRewardsStore();
  const walletStore = useWalletStore();

  const prices = computed(() => walletStore.fiatPriceObject);

  const snapshot = computed<RewardsSnapshot>(() => ({
    internal: rewardsStore.internalRewards,
    vested: rewardsStore.vestedRewards,
    vestedAsset: KnownAssets.get(KnownSymbols.PSWAP),
    crowdloan: rewardsStore.crowdloanRewards,
    external: rewardsStore.externalRewards,
    selectedInternal: rewardsStore.selectedInternal !== null && rewardsStore.internalRewardsAvailable,
    selectedVested: rewardsStore.selectedVested !== null && rewardsStore.vestedRewardsAvailable,
    selectedCrowdloanTags: Object.keys(rewardsStore.selectedCrowdloan ?? {}),
    selectedExternal: (rewardsStore.selectedExternal ?? []).length > 0,
  }));

  const sources = computed(() => buildRewardSources(snapshot.value));
  const breakdown = computed(() => buildBreakdown(sources.value, prices.value));
  const vesting = computed(() => buildVesting(sources.value, prices.value));
  const unlocked = computed(() => buildUnlocked(sources.value, prices.value));

  /** Tokens of the selected rewards, the most valuable first. */
  const rankedAssets = computed(() => rankAssetsByValue(selectedItems.value, prices.value));

  /** Fiat value of the selected rewards, or null when any of them has no price or no known token yet. */
  const claimFiat = computed(() => {
    const amounts: RewardAmount[] = [];

    for (const item of selectedItems.value) {
      const amount = parseAmount(item.amount);

      if (!amount?.isGtZero()) continue;
      // An amount whose token is not resolved yet cannot be priced, so the total would be understated.
      if (!item.asset) return null;

      amounts.push({ asset: item.asset, amount });
    }

    if (!amounts.length) return null;

    const fiat = getFiatValue(amounts, prices.value);

    return fiat.complete ? fiat.value : null;
  });

  /** Network fee as a share of the selected claim, in percent. */
  const feePercent = computed(() =>
    getFeePercent(rewardsStore.fee, KnownAssets.get(KnownSymbols.XOR), claimFiat.value, prices.value)
  );

  return { sources, breakdown, vesting, unlocked, rankedAssets, claimFiat, feePercent };
}
