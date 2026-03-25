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
                  ></formatted-amount>
                </div>
                <token-logo class="item-value__icon" :token="xor" :size="LogoSize.SMALL"></token-logo>
              </div>
            </div>
            <s-divider class="points__card-divider"></s-divider>
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
                  ></formatted-amount>
                </div>
                <token-logo class="item-value__icon" :token="xor" :size="LogoSize.SMALL"></token-logo>
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
                <span class="account-icon"></span>
                {{ t('points.accountsText', { amount: totalReferrals }) }}
              </span>
            </div>
            <s-divider class="points__card-divider"></s-divider>
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
                  ></formatted-amount>
                </div>
                <token-logo class="item-value__icon" :token="xor" :size="LogoSize.SMALL"></token-logo>
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

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@/shims/wallet-components';
import { computed, onMounted, ref, watch } from 'vue';

import { ZeroStringValue } from '@/consts';
import { Theme } from '@/consts/theme';
import { fetchData as fetchBurnXorData } from '@/indexer/queries/burnXor';
import { CountType, type BridgeData, fetchBridgeData, fetchCount } from '@/indexer/queries/pointSystem';
import type { ReferrerRewards } from '@/indexer/queries/referrals';
import { FontSizeRate, FontWeightRate, LogoSize } from '@/shims/wallet-consts';
import { useAssetsStore } from '@/stores/assets';
import { usePoolStore } from '@/stores/pool';
import { useReferralsStore } from '@/stores/referrals';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import type { AmountWithSuffix } from '@/types/formats';
import { formatAmountWithSuffix } from '@/utils';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';

import type { NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

type PolkadotJsAccount = {
  address: string;
};

defineOptions({
  components: {
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
  },
});

const { t } = useTranslation();
const { loading, withApi, withLoading } = useLoading();
const { Zero, getFPNumberFromCodec, getFiatAmountByFPNumber, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
const { connectSoraWallet, isLoggedIn } = useInternalConnect();
const settingsStore = useSettingsStore();
const poolStore = usePoolStore();
const referralsStore = useReferralsStore();
const walletStore = useWalletStore();
const assetsStore = useAssetsStore();

const referralRewards = computed(() => referralsStore.referralRewards as Nullable<ReferrerRewards>);
const blockNumber = computed(() => settingsStore.blockNumber);
const networkFees = computed(() => settingsStore.networkFees as Nullable<NetworkFeesObject>);
const libraryTheme = computed(() => (settingsStore.libraryTheme ?? Theme.LIGHT) as Theme);
const account = computed(() => walletStore.account as Nullable<PolkadotJsAccount>);
const xor = computed(() => assetsStore.xor as Nullable<AccountAsset>);
const currencySymbol = computed(() => walletStore.currencySymbol);
const accountAssets = computed(() => walletStore.accountAssets as Array<AccountAsset>);
const accountLiquidity = computed(() => poolStore.accountLiquidity as Array<AccountLiquidity>);
const getAsset = (address?: string) => assetsStore.assetDataByAddress(address) as Nullable<AccountAsset>;

const burnData = ref<Nullable<FPNumber>>(null);
const bridgeData = ref<BridgeData[]>([]);
const poolDepositCount = ref(0);
const poolWithdrawCount = ref(0);
const totalSwapTxs = ref(0);

const xorSymbol = XOR.symbol;

const referralsCardStyles = computed(() => ({
  backgroundImage: `url('/points/${libraryTheme.value}/referrals.png')`,
}));

const bridgeCardStyles = computed(() => ({
  backgroundImage: `url('/points/${libraryTheme.value}/bridge.png')`,
}));

const totalReferrals = computed(() =>
  referralRewards.value ? Object.keys(referralRewards.value.invitedUserRewards).length : 0
);

const bridgeVolume = computed(() =>
  bridgeData.value.reduce((acc, { amount, assetId }) => {
    const fiat = getFPNumberFiatAmountByFPNumber(amount, { address: assetId } as Asset);
    return fiat ? acc.add(fiat) : acc;
  }, Zero)
);

const totalBridgeVolume = computed<AmountWithSuffix>(() => formatAmountWithSuffix(bridgeVolume.value));

const xorBurned = computed<AmountWithSuffix>(() => formatAmountWithSuffix(burnData.value ?? Zero));

const xorBurnedFiat = computed(() =>
  burnData.value ? getFiatAmountByFPNumber(burnData.value) || ZeroStringValue : ZeroStringValue
);

const totalBridgeTxs = computed(() => bridgeData.value.length);
const totalPoolTxs = computed(() => poolDepositCount.value + poolWithdrawCount.value);
const totalOutgoingBridgeTxs = computed(() => bridgeData.value.filter(({ type }) => type === 'outgoing').length);

const totalFees = computed(() => {
  let fees = Zero;
  const currentFees = networkFees.value;
  if (!currentFees) return fees;

  if (totalSwapTxs.value && currentFees.Swap) {
    fees = fees.add(getFPNumberFromCodec(currentFees.Swap).mul(totalSwapTxs.value));
  }
  if (totalOutgoingBridgeTxs.value && currentFees.EthBridgeOutgoing) {
    fees = fees.add(getFPNumberFromCodec(currentFees.EthBridgeOutgoing).mul(totalOutgoingBridgeTxs.value));
  }
  if (poolDepositCount.value && currentFees.AddLiquidity) {
    fees = fees.add(getFPNumberFromCodec(currentFees.AddLiquidity).mul(poolDepositCount.value));
  }
  if (poolWithdrawCount.value && currentFees.RemoveLiquidity) {
    fees = fees.add(getFPNumberFromCodec(currentFees.RemoveLiquidity).mul(poolWithdrawCount.value));
  }
  return fees;
});

const feesSpent = computed<AmountWithSuffix>(() => formatAmountWithSuffix(totalFees.value));

const feesSpentFiat = computed(() => getFiatAmountByFPNumber(totalFees.value) || ZeroStringValue);

const totalReferralRewards = computed<AmountWithSuffix>(() =>
  formatAmountWithSuffix(referralRewards.value?.rewards ?? Zero)
);

const totalReferralRewardsFiat = computed(() => {
  const rewards = referralRewards.value?.rewards;
  return rewards ? getFiatAmountByFPNumber(rewards) || ZeroStringValue : ZeroStringValue;
});

const resetStats = () => {
  burnData.value = null;
  bridgeData.value = [];
  poolDepositCount.value = 0;
  poolWithdrawCount.value = 0;
  totalSwapTxs.value = 0;
};

/**
 * Fetches the point system metrics for the connected wallet.
 */
const initData = async () => {
  if (!isLoggedIn.value) {
    resetStats();
    return;
  }

  await referralsStore.getAccountReferralRewards();

  const accountAddress = account.value?.address;
  const endBlock = blockNumber.value;

  if (!accountAddress || !endBlock) {
    resetStats();
    return;
  }

  const burnEntries = await fetchBurnXorData(0, endBlock, accountAddress);
  burnData.value = burnEntries.reduce((acc, { amount }) => acc.add(amount), Zero);

  bridgeData.value = await fetchBridgeData(0, endBlock, accountAddress);
  totalSwapTxs.value = await fetchCount(0, endBlock, accountAddress, CountType.Swap);
  poolDepositCount.value = await fetchCount(0, endBlock, accountAddress, CountType.PoolDeposit);
  poolWithdrawCount.value = await fetchCount(0, endBlock, accountAddress, CountType.PoolWithdraw);
};

onMounted(() => {
  void withApi(initData);
});

watch(isLoggedIn, async (value) => {
  if (!value) {
    resetStats();
    return;
  }

  await withLoading(initData);
});
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
  padding: $inner-spacing-small;
  background-image: url('@/assets/img/points/header.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: top;
  :deep(.el-card__header),
  :deep(.el-card__body) {
    padding: 0;
  }
  &__header {
    color: white;
    margin: 0;
    font-size: var(--s-heading3-font-size);
    line-height: 1.3;
    font-weight: 300;
    letter-spacing: -0.48px;
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
        background: var(--s-color-base-content-tertiary) url('@/assets/img/invited-users.svg') 50% 50% no-repeat;
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
    background-image: url('@/assets/img/points/soratopia.png');
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
