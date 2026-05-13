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
          <div>
            <h2>{{ t('points.title') }}</h2>
            <h3 v-if="!loading && isLoggedIn">{{ totalPoints }}</h3>
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
                    class="points__first-tx-card"
                    :date="pointsForCards?.firstTxAccount?.currentProgress ?? 0"
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
import { XOR, KUSD, VXOR } from '@sora-substrate/sdk/build/assets/consts';
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

const { t } = useTranslation();
const { loading, withApi, withLoading } = useLoading();
const { getFiatAmountByCodecString, getFiatBalance } = useFormattedAmount();
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

const parseFiat = (value: Nullable<string>): number => {
  if (!value) return 0;
  return parseFloat(value.replace(',', '.'));
};

const getTotalLiquidityFiatValue = (): number =>
  accountLiquidity.value.reduce((total, liquidity) => {
    const firstAsset = getAsset(liquidity.firstAddress);
    const secondAsset = getAsset(liquidity.secondAddress);

    const firstValue =
      firstAsset != null ? parseFiat(getFiatAmountByCodecString(liquidity.firstBalance, firstAsset)) : 0;
    const secondValue =
      secondAsset != null ? parseFiat(getFiatAmountByCodecString(liquidity.secondBalance, secondAsset)) : 0;

    return total + firstValue + secondValue;
  }, 0);

const getCurrentFiatBalanceForToken = (assetSymbol: string): number => {
  const asset = accountAssets.value.find((value) => value.symbol === assetSymbol);
  return parseFiat(getFiatBalance(asset));
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
 * Loads the point system snapshot for the active account.
 */
const initData = async (): Promise<void> => {
  if (!isLoggedIn.value) {
    pointsForCards.value = null;
    return;
  }

  await referralsStore.getAccountReferralRewards();

  const accountAddress = account.value?.address;
  if (!accountAddress) {
    pointsForCards.value = null;
    return;
  }

  const accountMeta = await fetchAccountMeta(accountAddress);

  pointsForCards.value = accountMeta
    ? pointsService.calculateCategoryPoints(getPointsForCategories(accountMeta))
    : null;
};

onMounted(() => {
  void withApi(async () => {
    await poolStore.subscribeOnAccountLiquidityList();
    await poolStore.subscribeOnAccountLiquidityUpdates();
    await initData();
  });
});

watch(isLoggedIn, async (value) => {
  if (!value) {
    pointsForCards.value = null;
    return;
  }

  await withLoading(initData);
});
</script>

<style lang="scss">
.container .points .el-loading-mask {
  margin-left: calc(0px - $inner-spacing-small);
  width: calc(100% + $inner-spacing-big);
}

.points__tabs {
  .el-tabs__header {
    margin-bottom: $inner-spacing-medium;
    width: 100% !important;
  }
  .el-tabs__nav {
    background-color: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--s-border-radius-big);
    box-sizing: border-box;
    display: flex;
    gap: $inner-spacing-mini;
    justify-content: center;
    padding: $inner-spacing-mini;
    width: 100%;
  }
  .el-tabs__item {
    border: 1px solid transparent;
    border-radius: var(--s-border-radius-small) !important;
    flex: 1 1 0;
    height: 44px;
    line-height: 44px;
    min-width: 0;
    overflow: hidden;
    padding: 0 $inner-spacing-medium !important;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.is-active {
      border-color: var(--s-color-status-info);
      box-shadow: 0 0 0 1px rgba(82, 185, 255, 0.28), 0 10px 24px rgba(34, 9, 51, 0.2);
    }

    @include mobile(true) {
      padding: 0 $inner-spacing-small !important;
    }
  }
}
.points__tabs.s-tabs .el-tabs__header .el-tabs__item {
  font-size: 14px;
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
    background-color: unset;
  }
  background-image: url('@/assets/img/points/header.png');
  background-repeat: no-repeat;
  background-position: top center;
  background-size: 100% 214px;
  background-color: var(--s-color-base-background);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
    div {
      align-items: center;
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      color: #230735;
      gap: $inner-spacing-medium;
      h3 {
        font-size: 44px;
        font-weight: 300;
        line-height: 1;
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
    height: 350px;
    padding-top: $inner-spacing-big * 2;
    justify-content: center;
    &-title {
      font-size: var(--s-font-size-large);
      font-weight: 300;
      text-align: center;
      padding: 0 15%;
      margin-bottom: $inner-spacing-medium;
    }
    &-action {
      margin: 0 $basic-spacing-medium;
    }
  }

  &__card,
  &__card-task,
  &__first-tx-card {
    background-color: rgba(255, 255, 255, 0.1);
    background-position: top right;
    background-repeat: no-repeat;
    background-size: contain;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--s-border-radius-small);
    box-shadow: 0 18px 34px rgba(23, 6, 41, 0.18);
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
    background-size: 100% 196px;

    &__main {
      padding: 0 $inner-spacing-small $inner-spacing-small;
    }

    &__header {
      min-height: 196px;
      padding: $inner-spacing-medium $inner-spacing-small;

      div {
        align-items: flex-start;
        flex-direction: column;
        gap: $inner-spacing-small;

        h3 {
          font-size: 38px;
          text-align: left;
        }
      }

      p {
        max-width: 100%;
      }
    }

    &__card-grid {
      grid-template-columns: 1fr;
    }
  }

  &__soratopia,
  &__soratopia {
    min-height: 102px;
    background-image: url('@/assets/img/points/soratopia.png');
    background-repeat: no-repeat;
    background-size: cover;
    text-decoration: none;
    color: var(--s-color-base-on-accent);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--s-border-radius-small);
    box-shadow: 0 16px 30px rgba(23, 6, 41, 0.16);
    align-items: flex-end;
    @include focus-outline;
    &-container {
      align-items: center;
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
      transition: box-shadow 0.2s ease, transform 0.2s ease;
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
