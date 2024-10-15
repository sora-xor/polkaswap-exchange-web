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
          <p>Complete SORA Ecosystem-related tasks in order to qualify for a $3m AIRDROP</p>
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
            <s-tab label="YOUR TASKS" name="tasks">
              <s-scrollbar
                class="points__cards-scrollbar"
                :wrap-style="{ padding: '0', margin: '0', overflowY: 'auto' }"
              >
                <task-card
                  v-for="(pointsForCategory, categoryName) in this.pointsForCards"
                  :key="categoryName"
                  :points-for-category="pointsForCategory"
                  :category-name="categoryName"
                  class="points__card-task"
                />
              </s-scrollbar>
            </s-tab>
            <s-tab label="PROGRESS" name="progress">
              <s-scrollbar
                class="points__cards-scrollbar"
                :wrap-style="{ padding: '0', margin: '0', overflowY: 'auto' }"
              >
                <div class="points__cards">
                  <point-card
                    v-for="[categoryName, pointsForCategory] in Object.entries(this.pointsForCards ?? {}).slice(0, -1)"
                    :key="categoryName"
                    :points-for-category="pointsForCategory"
                    class="points__card"
                  />
                  <first-tx-card
                    class="points__first-tx-card"
                    :date="this.pointsForCards?.firstTxAccount?.currentProgress ?? 0"
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
import { XOR, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins, WALLET_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { ZeroStringValue, Components } from '@/consts';
import { pointSysemCategory } from '@/consts/pointSystem';
import { fetchData as fetchBurnXorData } from '@/indexer/queries/burnXor';
import {
  type BridgeData,
  fetchBridgeData,
  fetchCount,
  fetchAccountMeta,
  CountType,
} from '@/indexer/queries/pointSystem';
import type { ReferrerRewards } from '@/indexer/queries/referrals';
import { lazyComponent } from '@/router';
import { action, getter, state } from '@/store/decorators';
import type { AmountWithSuffix } from '@/types/formats';
import { AccountPointsCalculation, CalculateCategoryPointResult, CategoryPoints } from '@/types/pointSystem';
import { formatAmountWithSuffix, convertFPNumberToNumber } from '@/utils';
import { pointsService } from '@/utils/pointSystem';

import type { NetworkFeesObject, FPNumber } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

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
export default class PointSystem extends Mixins(
  mixins.LoadingMixin,
  mixins.FormattedAmountMixin,
  InternalConnectMixin
) {
  readonly LogoSize = WALLET_CONSTS.LogoSize;

  @state.referrals.referralRewards private referralRewards!: Nullable<ReferrerRewards>;
  @state.settings.blockNumber private blockNumber!: number;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.wallet.account.accountAssets private accountAssets!: Array<AccountAsset>;
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  @getter.libraryTheme private libraryTheme!: Theme;
  @getter.wallet.account.account private account!: WALLET_TYPES.PolkadotJsAccount;
  @getter.assets.xor xor!: Nullable<AccountAsset>;
  @getter.wallet.settings.currencySymbol currencySymbol!: string;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @action.referrals.getAccountReferralRewards private getAccountReferralRewards!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityList private subscribeOnList!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnUpdates!: AsyncFnWithoutArgs;

  readonly pointSysemCategory = pointSysemCategory;
  private burnData: Nullable<FPNumber> = null;
  private bridgeData: BridgeData[] = [];
  private poolDepositCount = 0;
  private poolWithdrawCount = 0;
  totalSwapTxs = 0;
  categoryPoints: string = this.pointSysemCategory.tasks;

  pointsForCards: { [key: string]: CalculateCategoryPointResult } | null = null;
  @Watch('isLoggedIn')
  private updateSubscriptions(value: boolean): void {
    if (value) {
      this.withLoading(this.initData);
    } else {
      this.burnData = null;
      this.bridgeData = [];
      this.poolDepositCount = 0;
      this.poolWithdrawCount = 0;
      this.totalSwapTxs = 0;
    }
  }

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get referralsCardStyles() {
    return { backgroundImage: `url('/points/${this.libraryTheme}/referrals.png')` };
  }

  get bridgeCardStyles() {
    return { backgroundImage: `url('/points/${this.libraryTheme}/bridge.png')` };
  }

  get totalReferrals(): number {
    if (!this.referralRewards) {
      return 0;
    }
    return Object.keys(this.referralRewards.invitedUserRewards).length;
  }

  private get bridgeVolume(): FPNumber {
    return this.bridgeData.reduce((acc, { amount, assetId }) => {
      const fiat = this.getFPNumberFiatAmountByFPNumber(amount, { address: assetId } as Asset);
      if (fiat) {
        return acc.add(fiat);
      }
      return acc;
    }, this.Zero);
  }

  get totalBridgeVolume(): AmountWithSuffix {
    return formatAmountWithSuffix(this.bridgeVolume);
  }

  get xorBurned(): AmountWithSuffix {
    return formatAmountWithSuffix(this.burnData ?? this.Zero);
  }

  get xorBurnedFiat(): string {
    if (!this.burnData) return ZeroStringValue;
    return this.getFiatAmountByFPNumber(this.burnData) || ZeroStringValue;
  }

  private get totalOutgoingBridgeTxs(): number {
    return this.bridgeData.filter(({ type }) => type === 'outgoing').length;
  }

  get totalBridgeTxs(): number {
    return this.bridgeData.length;
  }

  get totalPoolTxs(): number {
    return this.poolDepositCount + this.poolWithdrawCount;
  }

  private get totalFees(): FPNumber {
    let fees = this.Zero;
    if (this.totalSwapTxs && this.networkFees.Swap) {
      fees = fees.add(this.getFPNumberFromCodec(this.networkFees.Swap).mul(this.totalSwapTxs));
    }
    if (this.totalOutgoingBridgeTxs && this.networkFees.EthBridgeOutgoing) {
      fees = fees.add(this.getFPNumberFromCodec(this.networkFees.EthBridgeOutgoing).mul(this.totalOutgoingBridgeTxs));
    }
    if (this.poolDepositCount && this.networkFees.AddLiquidity) {
      fees = fees.add(this.getFPNumberFromCodec(this.networkFees.AddLiquidity).mul(this.poolDepositCount));
    }
    if (this.poolWithdrawCount && this.networkFees.RemoveLiquidity) {
      fees = fees.add(this.getFPNumberFromCodec(this.networkFees.RemoveLiquidity).mul(this.poolWithdrawCount));
    }
    return fees;
  }

  get feesSpent(): AmountWithSuffix {
    return formatAmountWithSuffix(this.totalFees);
  }

  get feesSpentFiat(): string {
    return this.getFiatAmountByFPNumber(this.totalFees) || ZeroStringValue;
  }

  get totalReferralRewards(): AmountWithSuffix {
    return formatAmountWithSuffix(this.referralRewards?.rewards ?? this.Zero);
  }

  get totalReferralRewardsFiat(): string {
    if (!this.referralRewards?.rewards) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.referralRewards.rewards) || ZeroStringValue;
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
      console.info(firstAssetFiatValue);
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
    const VXORHoldings = this.getCurrentFiatBalanceForToken('VXOR');
    const referralRewards = convertFPNumberToNumber(this.referralRewards?.rewards ?? this.Zero);
    const depositVolumeBridges =
      convertFPNumberToNumber(accountDataForPointsCalculation?.bridge.incomingUSD ?? this.Zero) +
      convertFPNumberToNumber(accountDataForPointsCalculation?.bridge.outgoingUSD ?? this.Zero);
    const networkFeeSpent = convertFPNumberToNumber(accountDataForPointsCalculation?.fees.amountUSD ?? this.Zero);
    const XORBurned = convertFPNumberToNumber(accountDataForPointsCalculation?.burned.amountUSD ?? this.Zero);
    const XORHoldings = this.getCurrentFiatBalanceForToken(this.xorSymbol);
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
      // await new Promise((resolve) => setTimeout(resolve, 6000000)); // 10 minutes
      // Referral rewards
      await this.getAccountReferralRewards();
      const account = this.account.address;
      const end = this.blockNumber;
      if (!(account && end)) return;
      // Burned XOR
      const burnData = await fetchBurnXorData(0, end, account);
      this.burnData = burnData.reduce((acc, { amount }) => acc.add(amount), this.Zero);
      // Bridge data
      this.bridgeData = await fetchBridgeData(0, end, account);
      // Swap, pool deposit and withdraw txs count
      this.totalSwapTxs = await fetchCount(0, end, account, CountType.Swap);
      this.poolDepositCount = await fetchCount(0, end, account, CountType.PoolDeposit);
      this.poolWithdrawCount = await fetchCount(0, end, account, CountType.PoolWithdraw);
      const accountMeta = await fetchAccountMeta(account);
      if (accountMeta) {
        this.pointsForCards = pointsService.calculateCategoryPoints(this.getPointsForCategories(accountMeta));
      } else {
        console.info('No AccountMeta data');
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

  // TODO not sure we need it
  // &__soratopia {
  //   min-height: 102px;
  //   box-shadow: var(--s-shadow-element-pressed);
  //   background-image: url('~@/assets/img/points/soratopia.png');
  //   background-repeat: no-repeat;
  //   background-size: cover;
  //   text-decoration: none;
  //   color: var(--s-color-base-on-accent);
  //   border-radius: var(--s-border-radius-mini);
  //   align-items: flex-end;
  //   @include focus-outline;
  //   &-container {
  //     align-items: center;
  //     gap: $inner-spacing-medium;
  //     margin: $inner-spacing-medium;
  //   }
  //   &-action {
  //     background-color: #52a1e3;
  //     border-radius: var(--s-border-radius-small);
  //     color: var(--s-color-base-on-accent);
  //     font-size: var(--s-font-size-small);
  //     font-weight: 500;
  //     white-space: nowrap;
  //     padding: $inner-spacing-mini $inner-spacing-medium;
  //     cursor: pointer;
  //     @include focus-outline;
  //   }
  //   &-text {
  //     flex: 1;
  //     text-transform: uppercase;
  //     opacity: 0.8;
  //     color: white;
  //     font-size: var(--s-font-size-mini);
  //     font-weight: 700;
  //   }
  //   @include large-mobile(true) {
  //     background-repeat: round;
  //     &-container {
  //       margin: $inner-spacing-small;
  //     }
  //     &-action {
  //       font-size: var(--s-font-size-mini);
  //     }
  //   }
  // }
}
</style>
