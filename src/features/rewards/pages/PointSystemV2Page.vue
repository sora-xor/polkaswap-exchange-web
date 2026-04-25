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
        <div v-else v-loading="loading" :class="['points__cards', 's-flex-column', { loading: loading }]">
          <s-tabs v-model="categoryPoints" type="rounded" class="points__tabs">
            <s-tab :label="t('points.yourTasks').toUpperCase()" name="tasks">
              <s-scrollbar
                class="points__cards-scrollbar"
                :wrap-style="{ padding: '0', margin: '0', overflowY: 'auto' }"
              >
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
              </s-scrollbar>
            </s-tab>
            <s-tab :label="t('points.progress').toUpperCase()" name="progress">
              <s-scrollbar
                class="points__cards-scrollbar"
                :wrap-style="{ padding: '0', margin: '0', overflowY: 'auto' }"
              >
                <div class="points__cards">
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
.el-tabs__header {
  width: 100% !important;
}
.el-tabs__nav {
  width: 100%;
  justify-content: space-between;
}

.points__tabs {
  .el-tabs__item {
    padding: 0 50px !important;
    @include mobile(true) {
      padding: 0 25px !important;
    }
  }
}
.points__tabs.s-tabs .el-tabs__header .el-tabs__item {
  font-weight: 400 !important;
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

.points.s-card {
  padding: $inner-spacing-small !important;
  padding-bottom: unset !important;
}

.points {
  &.points-loading {
    background-color: unset;
  }
  background-image: url('@/assets/img/points/header.png');
  background-repeat: no-repeat;
  background-position: top;
  background-color: var(--s-color-base-background);
  width: 100%;
  &__cards-scrollbar {
    max-height: $scrollbar-loader-height;
    overflow-y: auto;
  }
  &__main {
    margin-top: calc($inner-spacing-medium + $inner-spacing-tiny);
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
    gap: calc($inner-spacing-big + 3px);
    margin-bottom: calc($inner-spacing-small + 2px);
    margin-top: $inner-spacing-small;
    div {
      align-items: center;
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      color: var(--s-color-base-on-accent);
      h3 {
        font-weight: 300;
        font-size: 32px;
      }
      h2 {
        text-align: left;
        max-width: $max-asset-size;
        font-weight: 700;
        font-size: 16px;
      }
    }
    p {
      max-width: $explore-search-input-max-width;
      color: var(--s-color-base-border-primary);
      font-weight: 400;
    }
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
  &__cards {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: calc($basic-spacing-small + 1px);
    &.loading {
      height: $scrollbar-loader-height;
    }
  }

  &__card,
  &__card-task,
  &__first-tx-card {
    width: $sidebar-max-width;
    height: $card-height;
    background-color: var(--s-color-base-border-primary);
    border-radius: var(--s-border-radius-mini);
    padding: $inner-spacing-medium;
    margin-bottom: $inner-spacing-mini;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: top right;
    box-sizing: border-box;
  }
  &__first-tx-card {
    height: calc($basic-spacing * 3);
    width: 100%;
    padding: $basic-spacing-small $basic-spacing;
    margin-bottom: unset;
  }
  &__card-task {
    width: 100%;
    max-height: $max-asset-size;
    padding: $basic-spacing;
  }

  @include mobile(true) {
    &__card {
      width: 100%;
    }
    &__first-tx-card {
      height: unset;
    }
    &__card-task {
      max-height: unset;
      height: unset;
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
    border-radius: var(--s-border-radius-mini);
    align-items: flex-end;
    margin-bottom: 8px;
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
      @include focus-outline;
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
