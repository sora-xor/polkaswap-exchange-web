<template>
  <div class="points__container">
    <s-card
      border-radius="small"
      shadow="always"
      size="medium"
      pressed
      :class="['points', { 'points-loading': loading }]"
    >
      <template #header>
        <div class="points__header">
          <div class="points__header-heading">
            <h2>{{ t('points.title') }}</h2>
            <h3 v-if="!loading && isLoggedIn">{{ formattedTotalPoints }}</h3>
          </div>
          <p>{{ t('points.airdrop') }}</p>
        </div>
      </template>
      <div class="points__main s-flex-row">
        <div v-if="!isLoggedIn" class="points__connect s-flex-column">
          <span class="points__connect-title d2">{{ t('points.loginText') }}</span>
          <s-button
            class="points__connect-action s-typography-button--medium"
            type="primary"
            @click="connectSoraWallet"
          >
            {{ t('connectWalletText') }}
          </s-button>
        </div>
        <div v-else v-loading="loading" :class="['points__content', { 'points__content--loading': loading }]">
          <s-tabs v-model="categoryPoints" type="rounded" class="points__tabs">
            <s-tab :label="t('points.yourTasks').toUpperCase()" name="tasks">
              <s-scrollbar
                class="points__cards-scrollbar"
                :wrap-style="{ padding: '0', margin: '0', overflowY: 'auto' }"
              >
                <div class="points__task-list">
                  <a
                    class="points__soratopia s-flex"
                    rel="nofollow noopener"
                    target="_blank"
                    href="https://t.me/soratopia_bot/app"
                  >
                    <div class="points__soratopia-container s-flex">
                      <button class="points__soratopia-action">{{ t('points.openTelegram') }}</button>
                      <span class="points__soratopia-text">{{ t('points.toEarnPoints') }}</span>
                    </div>
                  </a>
                  <task-card
                    v-for="(pointsForCategory, categoryName) in pointsForCards"
                    :key="categoryName"
                    :points-for-category="pointsForCategory"
                    :category-name="categoryName"
                    class="points__card-task"
                  ></task-card>
                </div>
              </s-scrollbar>
            </s-tab>
            <s-tab :label="t('points.progress').toUpperCase()" name="progress">
              <s-scrollbar
                class="points__cards-scrollbar"
                :wrap-style="{ padding: '0', margin: '0', overflowY: 'auto' }"
              >
                <div class="points__card-grid">
                  <point-card
                    v-for="[categoryName, pointsForCategory] in Object.entries(pointsForCards ?? {}).slice(0, -1)"
                    :key="categoryName"
                    :points-for-category="pointsForCategory"
                    :category-name="categoryName"
                    class="points__card"
                  ></point-card>
                  <first-tx-card
                    v-if="firstTxTimestamp"
                    class="points__first-tx-card"
                    :date="firstTxTimestamp"
                  ></first-tx-card>
                </div>
              </s-scrollbar>
            </s-tab>
          </s-tabs>
        </div>
      </div>
    </s-card>
  </div>
</template>

<script lang="ts" setup>
import { BalanceType, XOR, KUSD, VXOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, onMounted, ref, watch } from 'vue';

import { pointSystemCategory } from '@/consts/pointSystem';
import { fetchAccountMeta } from '@/indexer/queries/pointSystem';
import type { ReferrerRewards } from '@/indexer/queries/referrals';
import { LogoSize } from '@/lib/soraneo-wallet/src/consts';
import { useAssetsStore } from '@/stores/assets';
import { usePoolStore } from '@/stores/pool';
import { useReferralsStore } from '@/stores/referrals';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { AccountPointSystems, CalculateCategoryPointResult, CategoryPoints } from '@/types/pointSystem';
import { convertFPNumberToNumber } from '@/utils';
import { pointsService } from '@/utils/pointSystem';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import FirstTxCard from '@/features/rewards/components/point-system/FirstTxCard.vue';
import PointCard from '@/features/rewards/components/point-system/PointCard.vue';
import TaskCard from '@/features/rewards/components/point-system/TaskCard.vue';

type PolkadotJsAccount = {
  address: string;
};

defineOptions({
  name: 'PointSystemV2Page',
  components: {
    FormattedAmount: WalletComponentFormattedAmount,
    TokenLogo: WalletComponentTokenLogo,
    PointCard,
    TaskCard,
    FirstTxCard,
  },
});
const categoryPoints = ref(pointSystemCategory.tasks);
const pointsForCards = ref<Record<string, CalculateCategoryPointResult> | null>(null);
const accountPointSystems = ref<AccountPointSystems | null>(null);

const { t } = useTranslation();
const { loading, withApi, withLoading } = useLoading();
const { getFPNumberFromCodec, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
const { connectSoraWallet, isLoggedIn } = useInternalConnect();
const poolStore = usePoolStore();
const referralsStore = useReferralsStore();
const walletStore = useWalletStore();
const assetsStore = useAssetsStore();

const referralRewards = computed(() => referralsStore.referralRewards as Nullable<ReferrerRewards>);
const accountAssets = computed(() => walletStore.accountAssets as Array<AccountAsset>);
const accountLiquidity = computed(() => poolStore.accountLiquidity as Array<AccountLiquidity>);
const account = computed(() => walletStore.account as Nullable<PolkadotJsAccount>);
const getAsset = (addr?: string) => assetsStore.assetDataByAddress(addr) as Nullable<AccountAsset>;

const totalPoints = computed(() => {
  if (!pointsForCards.value) return 0;
  return Object.values(pointsForCards.value).reduce((sum, category) => sum + (category.points || 0), 0);
});
const firstTxTimestamp = computed(() => pointsForCards.value?.firstTxAccount?.currentProgress || null);
const formattedTotalPoints = computed(() =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(totalPoints.value)
);

const getFiatNumberByCodec = (amount: Nullable<string>, asset: Nullable<AccountAsset>): number => {
  if (!amount || !asset) return 0;

  const amountValue = getFPNumberFromCodec(amount, asset.decimals);
  return getFPNumberFiatAmountByFPNumber(amountValue, asset)?.toNumber() ?? 0;
};

const getTotalLiquidityFiatValue = (): number =>
  accountLiquidity.value.reduce((total, liquidity) => {
    const firstAsset = getAsset(liquidity.firstAddress);
    const secondAsset = getAsset(liquidity.secondAddress);

    const firstValue = getFiatNumberByCodec(liquidity.firstBalance, firstAsset);
    const secondValue = getFiatNumberByCodec(liquidity.secondBalance, secondAsset);

    return total + firstValue + secondValue;
  }, 0);

const getCurrentFiatBalanceForToken = (assetSymbol: string): number => {
  const asset = accountAssets.value.find((value) => value.symbol === assetSymbol);
  return getFiatNumberByCodec(asset?.balance?.[BalanceType.Transferable] ?? null, asset ?? null);
};

/**
 * Builds the numeric snapshot used to calculate category points.
 */
const getPointsForCategories = (pointSystems: AccountPointSystems): CategoryPoints => {
  const firstTxAccount = pointSystems.createdAt.timestamp ?? 0;

  const liquidityProvision = getTotalLiquidityFiatValue();
  const XORHoldings = getCurrentFiatBalanceForToken(XOR.symbol);
  const VXORHoldings = getCurrentFiatBalanceForToken(VXOR.symbol);
  const KUSDHoldings = getCurrentFiatBalanceForToken(KUSD.symbol);
  const referralRewardsValue = convertFPNumberToNumber(referralRewards.value?.rewards);

  const points = pointSystems.points.reduce(
    (acc, era) => {
      const eraCoefficient = pointsService.getEraCoefficient(era.version);

      const depositVolumeBridges =
        convertFPNumberToNumber(era.bridge.incomingUSD) + convertFPNumberToNumber(era.bridge.outgoingUSD);
      const networkFeeSpent = convertFPNumberToNumber(era.fees.amountUSD);
      const XORBurned = convertFPNumberToNumber(era.burned.amountUSD);
      const kensetsuVolumeRepaid = convertFPNumberToNumber(era.kensetsu.amountUSD);
      const orderbookVolume = convertFPNumberToNumber(era.orderBook.amountUSD);
      const governanceLockedXOR = convertFPNumberToNumber(era.governance.amountUSD);
      const nativeXorStaking = convertFPNumberToNumber(era.staking.amountUSD);

      acc.depositVolumeBridges += depositVolumeBridges * eraCoefficient;
      acc.networkFeeSpent += networkFeeSpent * eraCoefficient;
      acc.XORBurned += XORBurned * eraCoefficient;
      acc.kensetsuVolumeRepaid += kensetsuVolumeRepaid * eraCoefficient;
      acc.orderbookVolume += orderbookVolume * eraCoefficient;
      acc.governanceLockedXOR += governanceLockedXOR * eraCoefficient;
      acc.nativeXorStaking += nativeXorStaking * eraCoefficient;

      return acc;
    },
    {
      depositVolumeBridges: 0,
      networkFeeSpent: 0,
      XORBurned: 0,
      kensetsuVolumeRepaid: 0,
      orderbookVolume: 0,
      governanceLockedXOR: 0,
      nativeXorStaking: 0,
    }
  );

  return {
    firstTxAccount,
    liquidityProvision,
    XORHoldings,
    VXORHoldings,
    KUSDHoldings,
    referralRewards: referralRewardsValue,
    ...points,
  };
};

/**
 * Clears cached point metadata and rendered cards when the active account is unavailable.
 */
const resetPointData = (): void => {
  accountPointSystems.value = null;
  pointsForCards.value = null;
};

/**
 * Recalculates visible cards from the current account metadata and wallet snapshots.
 */
const updatePointsForCards = (): void => {
  if (!accountPointSystems.value || !isLoggedIn.value) {
    pointsForCards.value = null;
    return;
  }

  pointsForCards.value = pointsService.calculateCategoryPoints(getPointsForCategories(accountPointSystems.value));
};

/**
 * Loads the point system snapshot for the active account.
 */
const initData = async (): Promise<void> => {
  if (!isLoggedIn.value) {
    resetPointData();
    return;
  }

  await referralsStore.getAccountReferralRewards();

  const accountAddress = account.value?.address;
  if (!accountAddress) {
    resetPointData();
    return;
  }

  accountPointSystems.value = await fetchAccountMeta(accountAddress);

  updatePointsForCards();
};

/**
 * Starts long-lived liquidity subscriptions without holding the page-level loading overlay open.
 */
const subscribeAccountLiquidity = async (): Promise<void> => {
  await poolStore.subscribeOnAccountLiquidityList();
  await poolStore.subscribeOnAccountLiquidityUpdates();
};

onMounted(() => {
  void subscribeAccountLiquidity().catch(console.error);
  void withApi(initData);
});

watch(isLoggedIn, async (value) => {
  if (!value) {
    resetPointData();
    return;
  }

  await withLoading(initData);
});

watch(accountLiquidity, updatePointsForCards, { deep: true });
</script>

<style lang="scss">
.container .points .el-loading-mask {
  backdrop-filter: blur(2px);
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: inherit;
  margin-left: calc(0px - $inner-spacing-small);
  width: calc(100% + $inner-spacing-big);
}

.points__tabs {
  .el-tabs__header {
    margin-bottom: $inner-spacing-small;
    width: 100% !important;
  }
  .el-tabs__nav {
    background-color: var(--s-color-utility-surface);
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    box-sizing: border-box;
    box-shadow: var(--s-shadow-element-pressed);
    display: flex;
    gap: $inner-spacing-tiny;
    justify-content: center;
    padding: $inner-spacing-tiny;
    width: 100%;
  }
  .el-tabs__item {
    border: 1px solid transparent;
    border-radius: var(--s-border-radius-mini) !important;
    color: var(--s-color-base-content-secondary);
    flex: 1 1 0;
    height: 40px;
    line-height: 40px;
    min-width: 0;
    overflow: hidden;
    padding: 0 $inner-spacing-medium !important;
    text-align: center;
    text-overflow: ellipsis;
    transition: var(--s-transition-default);
    white-space: nowrap;

    &:hover,
    &:focus {
      color: var(--s-color-theme-accent);
    }

    &.is-active {
      background-color: var(--s-color-theme-accent) !important;
      border-color: var(--s-color-theme-accent) !important;
      box-shadow: var(--s-shadow-element);
      color: var(--s-color-base-on-accent) !important;
    }

    @include mobile(true) {
      padding: 0 $inner-spacing-small !important;
    }
  }
}
.points__tabs.s-tabs .el-tabs__header .el-tabs__item {
  font-size: var(--s-font-size-small);
  font-weight: 700 !important;
}

.points__cards-scrollbar {
  scrollbar-width: none;
  padding: 0;
}
</style>

<style lang="scss" scoped>
$card-height: calc($sidebar-max-width - $inner-spacing-mini);
$scrollbar-loader-height: calc($card-height * 2.6);
$max-asset-size: calc($select-asset-item-height * 2);
$points-card-min-width: 258px;

.points.s-card {
  overflow: hidden;
  padding: 0 !important;
}

.points {
  &.points-loading {
    background-color: var(--s-color-base-background);
    min-height: calc(214px + $scrollbar-loader-height);
  }
  background-image: url('@/assets/img/points/header.png');
  background-repeat: no-repeat;
  background-position: top right;
  background-size: auto 214px;
  background-color: var(--s-color-base-background);
  border: 1px solid var(--s-color-base-border-secondary);
  width: 100%;
  &__cards-scrollbar {
    max-height: $scrollbar-loader-height;
    overflow-y: auto;
    padding-right: $inner-spacing-mini;
  }
  &__main {
    margin-top: 0;
    padding: 0 $inner-spacing-medium $inner-spacing-medium;
  }
  &__row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }
  &__container {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-medium;
  }
  &__first-cards {
    display: flex;
    flex-direction: column;
  }
  &__header {
    display: flex;
    flex-direction: column;
    gap: $inner-spacing-medium;
    justify-content: center;
    margin: 0;
    min-height: 214px;
    padding: $inner-spacing-big $inner-spacing-medium calc($inner-spacing-big + $inner-spacing-mini);
    &-heading {
      align-items: center;
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      color: #230735;
      gap: $inner-spacing-medium;
      h3 {
        font-variant-numeric: tabular-nums;
        font-size: var(--s-heading0-font-size);
        font-weight: 300;
        line-height: 1;
        overflow-wrap: anywhere;
        text-align: right;
      }
      h2 {
        color: #230735;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.15;
        text-align: left;
        max-width: $max-asset-size;
      }
    }
    p {
      color: rgba(35, 7, 53, 0.66);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
      max-width: calc($explore-search-input-max-width + $inner-spacing-large);
      text-shadow: 0 1px 1px rgba(255, 255, 255, 0.16);
    }
  }
  &__content {
    min-width: 0;
    width: 100%;

    &--loading {
      min-height: $scrollbar-loader-height;
    }
  }
  &__task-list {
    display: flex;
    flex-direction: column;
    gap: $inner-spacing-small;
    padding-bottom: $inner-spacing-mini;
  }
  &__card-grid {
    display: grid;
    gap: $inner-spacing-small;
    grid-template-columns: repeat(auto-fit, minmax($points-card-min-width, 1fr));
    padding-bottom: $inner-spacing-mini;
    width: 100%;
  }
  &__card-grid,
  &__task-list {
    box-sizing: border-box;
  }
  &_main {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
  }
  &__connect {
    align-items: center;
    background-color: var(--s-color-utility-surface);
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    box-sizing: border-box;
    box-shadow: var(--s-shadow-element-pressed);
    gap: $inner-spacing-medium;
    min-height: 264px;
    padding: $inner-spacing-big $inner-spacing-medium;
    justify-content: center;
    width: 100%;
    &-title {
      color: var(--s-color-base-content-primary);
      font-size: 22px;
      font-weight: 300;
      line-height: 1.18;
      max-width: calc($select-asset-item-height * 4);
      text-align: center;
    }
    &-action {
      box-shadow: 0 12px 28px rgba(239, 3, 126, 0.24);
      min-width: calc($select-asset-item-height * 3);
      margin: 0;
    }
  }

  &__card,
  &__card-task,
  &__first-tx-card {
    background-color: var(--s-color-utility-surface);
    background-position: top right;
    background-repeat: no-repeat;
    background-size: contain;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-element-pressed);
    box-sizing: border-box;
    height: auto;
    margin-bottom: 0;
    min-height: $card-height;
    padding: $inner-spacing-medium;
    width: 100%;
  }
  &__first-tx-card {
    min-height: calc($basic-spacing * 3);
    padding: $basic-spacing-small $basic-spacing;
  }
  &__card-task {
    min-height: unset;
    padding: $basic-spacing;
  }

  @include mobile(true) {
    background-size: auto 196px;

    &__main {
      padding: 0 $inner-spacing-small $inner-spacing-small;
    }

    &__header {
      min-height: 196px;
      padding: $inner-spacing-medium $inner-spacing-small;

      &-heading {
        align-items: center;
        flex-direction: row;
        gap: $inner-spacing-small;

        h2 {
          max-width: calc(100% - $inner-spacing-large * 2);
        }

        h3 {
          font-size: var(--s-heading1-font-size);
          text-align: right;
        }
      }

      p {
        max-width: 100%;
      }
    }

    &__card-grid {
      grid-template-columns: 1fr;
    }

    &__connect {
      min-height: 252px;
      padding: $inner-spacing-big $inner-spacing-small;

      &-title {
        font-size: 20px;
        max-width: calc($select-asset-item-height * 3.4);
      }

      &-action {
        min-width: calc($select-asset-item-height * 2.6);
      }
    }
  }

  &__soratopia {
    min-height: 102px;
    background-image: url('@/assets/img/points/soratopia.png');
    background-repeat: no-repeat;
    background-size: cover;
    text-decoration: none;
    color: var(--s-color-base-on-accent);
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-element-pressed);
    align-items: flex-end;
    @include focus-outline;
    &-container {
      align-items: center;
      flex-wrap: wrap;
      gap: $inner-spacing-medium;
      margin: $inner-spacing-medium;
    }
    &-action {
      background-color: var(--s-color-status-info);
      border-radius: var(--s-border-radius-small);
      color: var(--s-color-base-on-accent);
      font-size: var(--s-font-size-small);
      font-weight: 500;
      white-space: nowrap;
      padding: $inner-spacing-mini $inner-spacing-medium;
      cursor: pointer;
      transition:
        box-shadow 0.2s ease,
        transform 0.2s ease;
      @include focus-outline;

      &:hover,
      &:focus {
        box-shadow: 0 8px 18px rgba(82, 185, 255, 0.24);
        transform: translateY(-1px);
      }
    }
    &-text {
      flex: 1;
      text-transform: uppercase;
      opacity: 0.8;
      color: white;
      font-size: var(--s-font-size-mini);
      font-weight: 700;
    }
    @include large-mobile(true) {
      background-repeat: round;
      &-container {
        margin: $inner-spacing-small;
      }
      &-action {
        font-size: var(--s-font-size-mini);
      }
    }
  }
}
</style>
