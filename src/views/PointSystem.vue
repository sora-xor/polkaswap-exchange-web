<template>
  <div class="points__container">
    <s-card border-radius="small" shadow="always" size="medium" pressed class="points">
      <template #header>
        <h3 class="points__header">{{ t('points.title') }}</h3>
      </template>
      <div class="points__main s-flex-column">
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
        <div v-else v-loading="loading">
          <div class="points__card points__card-bridge" :style="bridgeCardStyles">
            <div class="points__card-header s-flex-column">
              <span class="points__card-title">{{ t('points.bridgeVolume') }}</span>
              <formatted-amount
                class="points__card-value"
                :font-weight-rate="FontWeightRate.MEDIUM"
                :font-size-rate="FontSizeRate.MEDIUM"
                :value="totalBridgeVolume.amount"
                :asset-symbol="totalBridgeVolume.suffix"
                symbol-as-decimal
              >
                <template #prefix>{{ currencySymbol }}</template>
              </formatted-amount>
            </div>
          </div>
          <div class="points__card points__card-xor">
            <div class="item s-flex">
              <span class="item-title">{{ t('points.feesSpent') }}</span>
              <div class="item-value s-flex">
                <div class="s-flex-column">
                  <formatted-amount class="item-value__tokens" :value="feesSpent.amount">
                    <template #prefix>{{ xorSymbol }}</template>
                    {{ feesSpent.suffix }}
                  </formatted-amount>
                  <formatted-amount
                    class="item-value__fiat"
                    is-fiat-value
                    fiat-default-rounding
                    value-can-be-hidden
                    :font-size-rate="FontSizeRate.MEDIUM"
                    :value="feesSpentFiat"
                    is-formatted
                  />
                </div>
                <token-logo class="item-value__icon" :token="xor" :size="LogoSize.SMALL" />
              </div>
            </div>
            <s-divider class="points__card-divider" />
            <div class="item s-flex">
              <span class="item-title">{{ t('points.xorBurned') }}</span>
              <div class="item-value s-flex">
                <div class="s-flex-column">
                  <formatted-amount class="item-value__tokens" :value="xorBurned.amount">
                    <template #prefix>{{ xorSymbol }}</template>
                    {{ xorBurned.suffix }}
                  </formatted-amount>
                  <formatted-amount
                    class="item-value__fiat"
                    is-fiat-value
                    fiat-default-rounding
                    value-can-be-hidden
                    :font-size-rate="FontSizeRate.MEDIUM"
                    :value="xorBurnedFiat"
                    is-formatted
                  />
                </div>
                <token-logo class="item-value__icon" :token="xor" :size="LogoSize.SMALL" />
              </div>
            </div>
          </div>
          <div class="points__txs s-flex">
            <div class="points__block swap s-flex-column">
              <span class="points__block-header">SWAP TXNS</span>
              <span class="points__block-value">{{ totalSwapTxs }}</span>
            </div>
            <div class="points__block bridge s-flex-column">
              <span class="points__block-header">BRIDGE TXNS</span>
              <span class="points__block-value">{{ totalBridgeTxs }}</span>
            </div>
            <div class="points__block pool s-flex-column">
              <span class="points__block-header">POOL TXNS</span>
              <span class="points__block-value">{{ totalPoolTxs }}</span>
            </div>
          </div>
          <div class="points__card points__card-referrals" :style="referralsCardStyles">
            <div class="points__card-header s-flex-column">
              <span class="points__card-title">{{ t('points.yourReferrals') }}</span>
              <span class="points__card-value s-flex">
                <span class="account-icon" />
                {{ t('points.accountsText', { amount: totalReferrals }) }}
              </span>
            </div>
            <s-divider class="points__card-divider" />
            <div class="item s-flex">
              <span class="item-title">{{ t('points.yourRewards') }}</span>
              <div class="item-value s-flex">
                <div class="s-flex-column">
                  <formatted-amount class="item-value__tokens" :value="totalReferralRewards.amount">
                    <template #prefix>{{ xorSymbol }}</template>
                    {{ totalReferralRewards.suffix }}
                  </formatted-amount>
                  <formatted-amount
                    class="item-value__fiat"
                    is-fiat-value
                    fiat-default-rounding
                    value-can-be-hidden
                    :font-size-rate="FontSizeRate.MEDIUM"
                    :value="totalReferralRewardsFiat"
                    is-formatted
                  />
                </div>
                <token-logo class="item-value__icon" :token="xor" :size="LogoSize.SMALL" />
              </div>
            </div>
          </div>
        </div>
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
      </div>
    </s-card>
  </div>
</template>

<script lang="ts">
import { XOR, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins, WALLET_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { ZeroStringValue } from '@/consts';
import { categoriesPointSystem } from '@/consts/pointSystem';
import { fetchData as fetchBurnXorData } from '@/indexer/queries/burnXor';
import {
  type BridgeData,
  fetchBridgeData,
  fetchCount,
  fetchAccountMeta,
  CountType,
} from '@/indexer/queries/pointSystem';
import type { ReferrerRewards } from '@/indexer/queries/referrals';
import { action, getter, state } from '@/store/decorators';
import type { AmountWithSuffix } from '@/types/formats';
import { formatAmountWithSuffix, convertFPNumberToNumber } from '@/utils';
import { pointsService } from '@/utils/pointSystem';

import type { NetworkFeesObject, FPNumber } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

/*
1. Liquidity provision - Видимо нету
2. Referral System: volume of rewards - getAccountReferralRewards видимо
3. Deposit volum bridge - в pointSystem.ts
4. Networks fee spent: xorFees.amountUSD
5. XOR burned: xorBurned.amountUSD
6. Xor current holdings - считаем сейчас
7. Kensetsu volume - vault в pointSystem.ts ???
8. Kensetsu HOLD KUSD/KGOLD - текущее ???
9. Orderbook volume - orderBook в pointSystem.ts
10. Governance participating - governance в pointSystem.ts
11. Native XOR staking - xorStakingValRewards  в pointSystem.ts
12. First tx of account - createdAt - в AccountMetaData

*/

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
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

  getPointsForCategories(accountMeta: any): any {
    const liquidityProvision = this.getTotalLiquidityFiatValue();
    const referralRewards = convertFPNumberToNumber(this.referralRewards?.rewards ?? this.Zero);
    const depositVolumeBridges =
      convertFPNumberToNumber(accountMeta?.bridge.incomingUSD ?? this.Zero) +
      convertFPNumberToNumber(accountMeta?.bridge.outgoingUSD ?? this.Zero);
    const networkFeeSpent = convertFPNumberToNumber(accountMeta?.fees.amountUSD ?? this.Zero);
    const XORBurned = convertFPNumberToNumber(accountMeta?.burned.amountUSD ?? this.Zero);
    const XORHoldings = this.getCurrentFiatBalanceForToken(this.xorSymbol);
    const kensetsuVolumeRepaid = convertFPNumberToNumber(accountMeta?.kensetsu.amountUSD ?? this.Zero);
    const kensetsuHold = this.getCurrentFiatBalanceForToken(KUSD.symbol);
    const orderbookVolume = convertFPNumberToNumber(accountMeta?.orderBook.amountUSD ?? this.Zero);
    const governanceLockedXOR = convertFPNumberToNumber(accountMeta?.governance.amountUSD ?? this.Zero);
    const nativeXorStaking = convertFPNumberToNumber(accountMeta?.staking.amountUSD ?? this.Zero);
    const firstTxAccount = accountMeta?.createdAt.timestamp ?? 0;

    // Тут составим объект который передадим в utils для подсчета поинтов
    // Пример использования:
    const pointsForCategories = {
      liquidityProvision,
      referralRewards,
      depositVolumeBridges,
      networkFeeSpent,
      XORBurned,
      XORHoldings,
      kensetsuVolumeRepaid,
      kensetsuHold,
      orderbookVolume,
      governanceLockedXOR,
      nativeXorStaking,
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
      const accountMeta = await fetchAccountMeta(account);

      console.info(pointsService.calculateCategoryPoints(this.getPointsForCategories(accountMeta)));
      console.info('AccountMeta', accountMeta);
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
  border-radius: var(--s-border-radius-mini);
  margin-left: -$inner-spacing-mini;
  width: calc(100% + $inner-spacing-medium);
  height: calc(100% - $inner-spacing-mini);
}
</style>

<style lang="scss" scoped>
.points {
  background-image: url('~@/assets/img/points/header.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: top;
  &__header {
    color: white;
  }
  &__main {
    padding-top: $inner-spacing-small;
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
  &__card {
    background-color: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    border-radius: var(--s-border-radius-mini);
    padding: $inner-spacing-medium;
    margin-bottom: $inner-spacing-mini;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: top right;
    text-transform: uppercase;
    &-title {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
      font-weight: 800;
      margin-bottom: $inner-spacing-mini;
    }
    &-value {
      align-items: center;
      font-size: var(--s-font-size-medium);
      font-weight: 800;
    }
    &-divider {
      margin: $inner-spacing-mini 0;
    }
    &-referrals {
      background-size: 90px;
      .account-icon {
        background: var(--s-color-base-content-tertiary) url('~@/assets/img/invited-users.svg') 50% 50% no-repeat;
        border-radius: 50%;
        width: var(--s-size-small);
        height: var(--s-size-small);
        margin-right: $inner-spacing-mini;
      }
    }
  }
  &__txs {
    justify-content: space-between;
    margin-bottom: $inner-spacing-mini;
    gap: $inner-spacing-mini;
  }
  &__block {
    background-color: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    border-radius: var(--s-border-radius-mini);
    padding: $inner-spacing-medium;
    font-weight: 800;
    &-header {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
      margin-bottom: $inner-spacing-mini;
    }
    &-value {
      font-size: var(--s-font-size-medium);
    }
  }
  &__soratopia {
    min-height: 102px;
    box-shadow: var(--s-shadow-element-pressed);
    background-image: url('~@/assets/img/points/soratopia.png');
    background-repeat: no-repeat;
    background-size: cover;
    text-decoration: none;
    color: var(--s-color-base-on-accent);
    border-radius: var(--s-border-radius-mini);
    align-items: flex-end;
    @include focus-outline;
    &-container {
      align-items: center;
      gap: $inner-spacing-medium;
      margin: $inner-spacing-medium;
    }
    &-action {
      background-color: #52a1e3;
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
.item {
  align-items: center;
  font-size: var(--s-font-size-small);
  font-weight: 700;
  &-title {
    flex: 1;
    margin-right: $inner-spacing-mini;
    color: var(--s-color-base-content-secondary);
    text-transform: uppercase;
  }
  &-value {
    align-items: center;
    & > div {
      align-items: flex-end;
    }
    &__icon {
      margin-left: $inner-spacing-mini;
    }
  }
}
</style>
