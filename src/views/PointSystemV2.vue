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
                <a class="points__sora-card s-flex" rel="nofollow noopener" target="_blank" href="https://soracard.com">
                  <div class="points__sora-card-container s-flex">
                    <button class="points__sora-card-action">{{ t('points.soraCard') }}</button>
                    <span class="points__sora-card-text">{{ t('points.toEarnPoints') }}</span>
                  </div>
                </a>
                <task-card
                  v-for="(pointsForCategory, categoryName) in pointsForCards"
                  :key="categoryName"
                  :points-for-category="pointsForCategory"
                  :category-name="categoryName"
                  class="points__card-task"
                />
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
                  />
                  <first-tx-card
                    class="points__first-tx-card"
                    :date="pointsForCards?.firstTxAccount?.currentProgress ?? 0"
                  />
                </div>
              </s-scrollbar>
            </s-tab>
          </s-tabs>
        </div>
      </div>
    </s-card>
  </div>
</template>

<script lang="ts">
import { XOR, KUSD, VXOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins, WALLET_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { Components } from '@/consts';
import { pointSystemCategory } from '@/consts/pointSystem';
import { fetchAccountMeta } from '@/indexer/queries/pointSystem';
import type { ReferrerRewards } from '@/indexer/queries/referrals';
import { lazyComponent } from '@/router';
import { action, getter, state } from '@/store/decorators';
import { AccountPointsCalculation, CalculateCategoryPointResult, CategoryPoints } from '@/types/pointSystem';
import { convertFPNumberToNumber } from '@/utils';
import { pointsService } from '@/utils/pointSystem';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
    PointCard: lazyComponent(Components.PointCard),
    TaskCard: lazyComponent(Components.TaskCard),
    FirstTxCard: lazyComponent(Components.FirstTxCard),
    SettingsTabs: lazyComponent(Components.SettingsTabs),
  },
})
export default class PointSystemV2 extends Mixins(
  mixins.LoadingMixin,
  mixins.FormattedAmountMixin,
  InternalConnectMixin
) {
  readonly LogoSize = WALLET_CONSTS.LogoSize;

  @state.referrals.referralRewards private referralRewards!: Nullable<ReferrerRewards>;
  @state.wallet.settings.blockNumber private blockNumber!: number;
  @state.wallet.account.accountAssets private accountAssets!: Array<AccountAsset>;
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  @getter.wallet.account.account private account!: WALLET_TYPES.PolkadotJsAccount;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @action.referrals.getAccountReferralRewards private getAccountReferralRewards!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityList private subscribeOnList!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnUpdates!: AsyncFnWithoutArgs;

  readonly pointSystemCategory = pointSystemCategory;

  categoryPoints: string = this.pointSystemCategory.tasks;

  pointsForCards: { [key: string]: CalculateCategoryPointResult } | null = null;
  @Watch('isLoggedIn')
  private updateSubscriptions(value: boolean): void {
    if (value) {
      this.withLoading(this.initData);
    }
  }

  get totalPoints(): number {
    if (!this.pointsForCards) {
      return 0;
    }
    return Object.values(this.pointsForCards).reduce((sum, category) => {
      return sum + (category.points || 0);
    }, 0);
  }

  getTotalLiquidityFiatValue(): number {
    let totalFiatValue = 0;
    this.accountLiquidity.forEach((liquidity) => {
      const firstAsset = this.getAsset(liquidity.firstAddress) as AccountAsset;
      const secondAsset = this.getAsset(liquidity.secondAddress) as AccountAsset;
      const firstAssetFiatValue = parseFloat(
        this.getFiatAmountByCodecString(liquidity.firstBalance, firstAsset)?.replace(',', '.') || '0'
      );
      const secondAssetFiatValue = parseFloat(
        this.getFiatAmountByCodecString(liquidity.secondBalance, secondAsset)?.replace(',', '.') || '0'
      );
      totalFiatValue += firstAssetFiatValue + secondAssetFiatValue;
    });
    return totalFiatValue;
  }

  getCurrentFiatBalanceForToken(assetSymbol: string): number {
    const fiatBalanceString =
      this.getFiatBalance(this.accountAssets.find((asset) => asset.symbol === assetSymbol)) ?? '0';
    const fiatBalanceFloat = parseFloat(fiatBalanceString.replace(',', '.'));
    return fiatBalanceFloat;
  }

  getPointsForCategories(accountDataForPointsCalculation: AccountPointsCalculation): CategoryPoints {
    const liquidityProvision = this.getTotalLiquidityFiatValue();
    const VXORHoldings = this.getCurrentFiatBalanceForToken(VXOR.symbol);
    const referralRewards = convertFPNumberToNumber(this.referralRewards?.rewards ?? this.Zero);
    const depositVolumeBridges =
      convertFPNumberToNumber(accountDataForPointsCalculation?.bridge.incomingUSD ?? this.Zero) +
      convertFPNumberToNumber(accountDataForPointsCalculation?.bridge.outgoingUSD ?? this.Zero);
    const networkFeeSpent = convertFPNumberToNumber(accountDataForPointsCalculation?.fees.amountUSD ?? this.Zero);
    const XORBurned = convertFPNumberToNumber(accountDataForPointsCalculation?.burned.amountUSD ?? this.Zero);
    const XORHoldings = this.getCurrentFiatBalanceForToken(XOR.symbol);
    const kensetsuVolumeRepaid = convertFPNumberToNumber(
      accountDataForPointsCalculation?.kensetsu.amountUSD ?? this.Zero
    );
    const KUSDHoldings = this.getCurrentFiatBalanceForToken(KUSD.symbol);
    const orderbookVolume = convertFPNumberToNumber(accountDataForPointsCalculation?.orderBook.amountUSD ?? this.Zero);
    const governanceLockedXOR = convertFPNumberToNumber(
      accountDataForPointsCalculation?.governance.amountUSD ?? this.Zero
    );
    const nativeXorStaking = convertFPNumberToNumber(accountDataForPointsCalculation?.staking.amountUSD ?? this.Zero);
    const firstTxAccount = accountDataForPointsCalculation?.createdAt.timestamp ?? 0;

    const pointsForCategories = {
      liquidityProvision,
      VXORHoldings,
      referralRewards,
      depositVolumeBridges,
      networkFeeSpent,
      XORBurned,
      XORHoldings,
      governanceLockedXOR,
      kensetsuVolumeRepaid,
      orderbookVolume,
      nativeXorStaking,
      KUSDHoldings,
      firstTxAccount,
    };
    return pointsForCategories;
  }

  private async initData(): Promise<void> {
    if (this.isLoggedIn) {
      // Referral rewards
      await this.getAccountReferralRewards();
      const account = this.account.address;
      const end = this.blockNumber;
      if (!(account && end)) return;

      const accountMeta = await fetchAccountMeta(account);
      if (accountMeta) {
        this.pointsForCards = pointsService.calculateCategoryPoints(this.getPointsForCategories(accountMeta));
      }
    }
  }

  created(): void {
    this.withApi(async () => {
      this.subscribeOnList();
      this.subscribeOnUpdates();
      await this.initData();
    });
  }
}
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
.s-tabs .el-tabs__header .el-tabs__item {
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

.s-card {
  box-shadow: unset !important;
  padding: $inner-spacing-small !important;
  padding-bottom: unset !important;
}
.points {
  &.points-loading {
    background-color: unset;
  }
  background-image: url('~@/assets/img/points/header.png');
  background-repeat: no-repeat;
  background-position: top;
  background-color: var(--s-color-base-disabled);
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
  &__sora-card {
    min-height: 102px;
    background-image: url('~@/assets/img/points/soratopia.png');
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
  &__sora-card {
    background-image: url('~@/assets/img/points/sora-card.png');
    &-action {
      background-color: white;
      color: #ee2233;
      border: unset;
    }
  }
}
</style>
