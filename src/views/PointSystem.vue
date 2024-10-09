<template>
  <div class="points__container">
    <s-card border-radius="small" shadow="always" size="medium" pressed class="points" :class="{ loading: loading }">
      <template #header>
        <h3 class="points__header">{{ t('points.title') }}</h3>
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
        <div v-else v-loading="loading" class="points__cards s-flex-row">
          <point-card
            v-for="(pointsForCategory, categoryName) in pointsForCards"
            :key="categoryName"
            :points-for-category="pointsForCategory"
            :category-name="categoryName"
            class="points__card"
          />
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

  private burnData: Nullable<FPNumber> = null;
  private bridgeData: BridgeData[] = [];
  private poolDepositCount = 0;
  private poolWithdrawCount = 0;
  totalSwapTxs = 0;
  dummyPoints: { [key: string]: CalculateCategoryPointResult } = {
    liquidityProvision: {
      currentProgress: 50,
      levelCurrent: 2,
      minimumAmountForNextLevel: 100,
      nextLevelRewardPoints: 150,
      points: 500,
      threshold: 0,
    },
    referralRewards: {
      currentProgress: 20,
      levelCurrent: 1,
      minimumAmountForNextLevel: 50,
      nextLevelRewardPoints: 100,
      points: 300,
      threshold: 0,
    },
    depositVolumeBridges: {
      currentProgress: 70,
      levelCurrent: 3,
      minimumAmountForNextLevel: 150,
      nextLevelRewardPoints: 200,
      points: 600,
      threshold: 0,
    },
    networkFeeSpent: {
      currentProgress: 30,
      levelCurrent: 1,
      minimumAmountForNextLevel: 60,
      nextLevelRewardPoints: 120,
      points: 400,
      threshold: 0,
    },
    XORBurned: {
      currentProgress: 10,
      levelCurrent: 1,
      minimumAmountForNextLevel: 40,
      nextLevelRewardPoints: 80,
      points: 200,
      threshold: 0,
    },
    XORHoldings: {
      currentProgress: 90,
      levelCurrent: 4,
      minimumAmountForNextLevel: 180,
      nextLevelRewardPoints: 250,
      points: 800,
      threshold: 0,
    },
    kensetsuVolumeRepaid: {
      currentProgress: 0,
      levelCurrent: 1,
      minimumAmountForNextLevel: 30,
      nextLevelRewardPoints: 60,
      points: 100,
      threshold: 0,
    },
    kensetsuHold: {
      currentProgress: 25,
      levelCurrent: 1,
      minimumAmountForNextLevel: 50,
      nextLevelRewardPoints: 100,
      points: 300,
      threshold: 0,
    },
    orderbookVolume: {
      currentProgress: 60,
      levelCurrent: 3,
      minimumAmountForNextLevel: 120,
      nextLevelRewardPoints: 240,
      points: 700,
      threshold: 0,
    },
    governanceLockedXOR: {
      currentProgress: 15,
      levelCurrent: 1,
      minimumAmountForNextLevel: 45,
      nextLevelRewardPoints: 90,
      points: 250,
      threshold: 0,
    },
    nativeXorStaking: {
      currentProgress: 35,
      levelCurrent: 2,
      minimumAmountForNextLevel: 75,
      nextLevelRewardPoints: 150,
      points: 450,
      threshold: 0,
    },
    firstTxAccount: {
      currentProgress: 0,
      levelCurrent: 1,
      minimumAmountForNextLevel: null,
      nextLevelRewardPoints: null,
      points: 0,
      threshold: 0,
    },
  };

  // Использование dummy-данных в компоненте
  pointsForCards: { [key: string]: CalculateCategoryPointResult } | null = this.dummyPoints;
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
      // const accountMeta = await fetchAccountMeta(account);

      // if (accountMeta) {
      //   this.pointsForCards = pointsService.calculateCategoryPoints(this.getPointsForCategories(accountMeta));
      //   console.info(this.pointsForCards);
      //   console.info('AccountMeta:', accountMeta);
      // } else {
      //   console.info('No AccountMeta data');
      // }
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

<style lang="scss" scoped>
// .loading {
//   background-size: cover !important;
//   width: 100%;
//   height: 150px;
// }
.points {
  background-image: url('~@/assets/img/points/header.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: top;
  width: 100%;
  &__container {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  &__header {
    color: white;
  }
  &_main {
    display: flex;
    flex-wrap: wrap; // Ensure elements can wrap
    justify-content: space-between; // Space out elements evenly
    align-items: flex-start; // Align items at the start of each row
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
    width: 100%;
  }
  &__card {
    width: $sidebar-max-width;
    height: calc($sidebar-max-width - $inner-spacing-mini);
    background-color: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    border-radius: var(--s-border-radius-mini);
    padding: $inner-spacing-medium;
    margin-bottom: $inner-spacing-mini;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: top right;
    box-sizing: border-box;
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
