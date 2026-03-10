<template>
  <div class="rewards">
    <div class="rewards-content" v-loading="viewLoading">
      <rewards-gradient-box class="rewards-block" :symbol="gradientSymbol">
        <div :class="['rewards-box', libraryTheme]">
          <tokens-row :assets="rewardTokens"></tokens-row>
          <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text">
            {{ claimingStatusMessage }}
          </div>
          <div v-if="isLoggedIn" class="rewards-amount">
            <rewards-amount-header :items="rewardsAmountHeaderItems"></rewards-amount-header>
            <template v-if="!claimingInProgressOrFinished">
              <rewards-amount-table
                class="rewards-table"
                v-if="internalRewards"
                v-model="selectedInternalRewardsModel"
                :title="t('rewards.events.LiquidityProvision')"
                :items="[internalRewards]"
                :theme="libraryTheme"
                is-codec-string
              ></rewards-amount-table>
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedVestedRewardsModel"
                :title="t('rewards.groups.strategic')"
                :items="vestedRewadsGroupItems"
                :theme="libraryTheme"
                is-codec-string
              ></rewards-amount-table>
              <rewards-amount-table
                v-if="Object.keys(crowdloanRewards).length"
                class="rewards-table"
                v-model="selectedCrowdloanRewardsModel"
                :title="t('rewards.groups.crowdloan')"
                :items="crowdloanRewardsGroupItems"
                :theme="libraryTheme"
                is-codec-string
              ></rewards-amount-table>
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedExternalRewardsModel"
                :title="t('rewards.groups.external')"
                :items="externalRewardsGroupItems"
                :show-table="!!externalRewards.length"
                :theme="libraryTheme"
                simple-group
              >
                <div class="rewards-footer">
                  <s-divider></s-divider>
                  <div v-if="evmAddress" class="rewards-account">
                    <div class="rewards-account-group">
                      <img
                        v-if="evmProvider"
                        :src="getEvmProviderIcon(evmProvider)"
                        :alt="evmProvider"
                        class="rewards-account-logo"
                      />
                      <formatted-address :value="evmAddress" :symbols="8"></formatted-address>
                    </div>
                    <div class="rewards-account-group">
                      <span v-if="changeWalletEvm" v-button class="rewards-account-btn" @click="connectEvmWallet">
                        {{ t('changeAccountText') }}
                      </span>
                      <span v-else>{{ t('connectedText') }}</span>
                      <span
                        v-if="changeWalletEvm"
                        v-button
                        class="rewards-account-btn disconnect"
                        @click="disconnectEvmWallet"
                      >
                        {{ t('disconnectWalletText') }}
                      </span>
                    </div>
                  </div>
                  <s-button v-else class="rewards-connect-button" type="tertiary" @click="connectEvmWallet">
                    {{ t('rewards.action.connectExternalWallet') }}
                  </s-button>
                  <div v-if="externalRewardsHintText" class="rewards-footer-hint">{{ externalRewardsHintText }}</div>
                </div>
              </rewards-amount-table>
              <info-line
                v-if="fee && isLoggedIn && rewardsAvailable && !claimingInProgressOrFinished"
                v-bind="feeInfo"
                :class="['rewards-fee', libraryTheme]"
                :fiat-value="getFiatAmountByCodecString(fee)"
                is-formatted
              ></info-line>
            </template>
          </div>
          <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text--transaction">
            {{ transactionStatusMessage }}
          </div>
        </div>
      </rewards-gradient-box>
      <div
        v-if="!claimingInProgressOrFinished && (hintText || !(rewardsReceived || loading))"
        class="rewards-empty-state"
      >
        <div v-if="hintText" class="rewards-block rewards-hint">
          {{ hintText }}
        </div>
        <s-button
          v-if="!(rewardsReceived || loading)"
          class="rewards-block rewards-action-button s-typography-button--large"
          data-test-name="LoginAndGet"
          type="primary"
          @click="handleAction"
          :loading="actionButtonLoading"
          :disabled="actionButtonDisabled"
        >
          {{ actionButtonText }}
        </s-button>
      </div>
    </div>
    <select-provider-dialog></select-provider-dialog>
  </div>
</template>

<script lang="ts" setup>
import { CodecString, FPNumber } from '@sora-substrate/sdk';
import { KnownAssets, KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { RewardType } from '@sora-substrate/sdk/build/rewards/consts';
import { components, groupRewardsByAssetsList } from '@wallet';
import { computed, onBeforeUnmount, onMounted, onUnmounted, toRef, watch } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useNotification } from '@/composables/useNotification';
import { useSubscriptions } from '@/composables/useSubscriptions';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { useWalletConnect } from '@/composables/useWalletConnect';
import { Components } from '@/consts';
import { Theme } from '@/consts/theme';
import { lazyComponent } from '@/router';
import store from '@/store';
import type { ClaimRewardsParams } from '@/store/rewards/types';
import type { Nullable } from '@/types/common';
import type { RewardsAmountHeaderItem, RewardInfoGroup, SelectedRewards } from '@/types/rewards';
import { hasInsufficientXorForFee } from '@/utils';
import { resolveLibraryTheme } from '@/utils/resolveLibraryTheme';
import ethersUtil from '@/utils/ethers-util';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';

defineOptions({
  name: 'Rewards',
  components: {
    RewardsGradientBox: lazyComponent(Components.RewardsGradientBox),
    RewardsAmountHeader: lazyComponent(Components.RewardsAmountHeader),
    RewardsAmountTable: lazyComponent(Components.RewardsAmountTable),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokensRow: lazyComponent(Components.TokensRow),
    SelectProviderDialog: lazyComponent(Components.SelectProviderDialog),
    InfoLine: components.InfoLine,
    FormattedAddress: components.FormattedAddress,
  },
});

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const parentLoadingRef = toRef(props, 'parentLoading');

const { t, tc, tOrdinal } = useTranslation();
const { formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
const { connectSoraWallet, isLoggedIn, soraAddress } = useInternalConnect();
const {
  evmProvider,
  evmAddress,
  connectEvmWallet,
  disconnectEvmWallet,
  disconnectExternalNetwork,
  getEvmProviderIcon,
} = useWalletConnect();
const { showAppNotification } = useNotification();
const { loading, withNotifications } = useTransaction({ parentLoading: parentLoadingRef });

const subscribeOnRewardsAction = () => store.dispatch.rewards.subscribeOnRewards();
const unsubscribeFromRewardsAction = () => store.dispatch.rewards.unsubscribeFromRewards();

const { subscriptionsDataLoading, withApi: withSubscriptionsApi } = useSubscriptions({
  parentLoading: parentLoadingRef,
  startSubscriptions: [subscribeOnRewardsAction],
  resetSubscriptions: [unsubscribeFromRewardsAction],
});

const feeFetching = computed(() => store.state.rewards.feeFetching);
const rewardsFetching = computed(() => store.state.rewards.rewardsFetching);
const rewardsClaiming = computed(() => store.state.rewards.rewardsClaiming);
const transactionError = computed(() => store.state.rewards.transactionError);
const transactionStep = computed(() => store.state.rewards.transactionStep);
const receivedRewards = computed(() => store.state.rewards.receivedRewards as RewardsAmountHeaderItem[]);
const fee = computed(() => store.state.rewards.fee as CodecString);

const vestedRewards = computed(() => store.state.rewards.vestedRewards as Nullable<RewardsInfo>);
const crowdloanRewards = computed(() => store.state.rewards.crowdloanRewards as Record<string, RewardInfo[]>);
const internalRewards = computed(() => store.state.rewards.internalRewards as Nullable<RewardInfo>);
const externalRewards = computed(() => store.state.rewards.externalRewards as RewardInfo[]);

const selectedVestedRewards = computed(() => store.state.rewards.selectedVested as Nullable<RewardsInfo>);
const selectedInternalRewards = computed(() => store.state.rewards.selectedInternal as Nullable<RewardInfo>);
const selectedExternalRewards = computed(() => store.state.rewards.selectedExternal as RewardInfo[]);
const selectedCrowdloanRewards = computed(() => store.state.rewards.selectedCrowdloan as Record<string, RewardInfo[]>);

const xor = computed(() => store.getters.assets.xor as AccountAsset);
const rewardsAvailable = computed(() => store.getters.rewards.rewardsAvailable as boolean);
const externalRewardsAvailable = computed(() => store.getters.rewards.externalRewardsAvailable as boolean);
const externalRewardsSelected = computed(() => store.getters.rewards.externalRewardsSelected as boolean);
const internalRewardsAvailable = computed(() => store.getters.rewards.internalRewardsAvailable as boolean);
const vestedRewardsAvailable = computed(() => store.getters.rewards.vestedRewardsAvailable as boolean);
const rewardsByAssetsList = computed(() => store.getters.rewards.rewardsByAssetsList as RewardsAmountHeaderItem[]);
const libraryTheme = computed(() => resolveLibraryTheme(store) as Theme);

const setSelectedRewardsAction = (payload: SelectedRewards) => store.dispatch.rewards.setSelectedRewards(payload);
const getExternalRewardsAction = (address: string) => store.dispatch.rewards.getExternalRewards(address);
const claimRewardsAction = (payload: ClaimRewardsParams) => store.dispatch.rewards.claimRewards(payload);
const resetRewards = () => store.commit.rewards.reset();

const transactionStepsCount = computed(() => (externalRewardsSelected.value ? 2 : 1));
const rewardsReceivedFlag = computed(() => receivedRewards.value.length !== 0);
const rewardsReceived = rewardsReceivedFlag;

const rewardsAmountHeaderItems = computed<RewardsAmountHeaderItem[]>(() =>
  rewardsReceivedFlag.value ? receivedRewards.value : rewardsByAssetsList.value
);

const rewardTokens = computed<Asset[]>(() => rewardsAmountHeaderItems.value.map((item) => item.asset));
const rewardTokenSymbols = computed<Array<KnownSymbols>>(() =>
  rewardTokens.value.map((item) => item.symbol as KnownSymbols)
);
const gradientSymbol = computed(() => (rewardTokenSymbols.value.length === 1 ? rewardTokenSymbols.value[0] : ''));

const externalRewardsGroupItems = computed<RewardInfoGroup[]>(() => [
  {
    type: [RewardType.External, t('rewards.groups.external')],
    limit: groupRewardsByAssetsList(externalRewards.value),
    rewards: externalRewards.value,
  },
]);

const vestedRewadsGroupItems = computed<RewardInfoGroup[]>(() => {
  const rewards = vestedRewards.value?.rewards ?? [];
  const pswap = KnownAssets.get(KnownSymbols.PSWAP);

  return [
    {
      type: [RewardType.Strategic, t('rewards.groups.strategic')],
      title: t('rewards.claimableAmountDoneVesting'),
      limit: [
        {
          amount: FPNumber.fromCodecValue(vestedRewards.value?.limit ?? 0, pswap.decimals).toCodecString(),
          asset: pswap,
        },
      ],
      total: {
        amount: FPNumber.fromCodecValue(vestedRewards.value?.total ?? 0, pswap.decimals).toLocaleString(),
        asset: pswap,
      },
      rewards,
    },
  ];
});

const crowdloanRewardsGroupItems = computed<RewardInfoGroup[]>(() =>
  Object.entries(crowdloanRewards.value).map(([tag, rewards]) => ({
    type: [RewardType.Crowdloan, tag],
    title: tag,
    limit: rewards.map((item) => ({
      ...item,
      total: {
        amount: FPNumber.fromCodecValue(item.total ?? 0, item.asset.decimals).toLocaleString(),
        asset: item.asset,
      },
    })),
  }))
);

const selectedInternalRewardsModel = computed<boolean>({
  get: () => internalRewardsAvailable.value && selectedInternalRewards.value !== null,
  set(flag) {
    const selectedInternal = flag ? internalRewards.value : null;
    void setSelectedRewardsAction({ selectedInternal });
  },
});

const selectedExternalRewardsModel = computed<boolean>({
  get: () => selectedExternalRewards.value.length !== 0,
  set(flag) {
    const selectedExternal = flag ? externalRewards.value : [];
    void setSelectedRewardsAction({ selectedExternal });
  },
});

const selectedVestedRewardsModel = computed<boolean>({
  get: () => vestedRewardsAvailable.value && selectedVestedRewards.value !== null,
  set(flag) {
    const selectedVested = flag ? vestedRewards.value : null;
    void setSelectedRewardsAction({ selectedVested });
  },
});

const selectedCrowdloanRewardsModel = computed<string[]>({
  get: () => Object.keys(selectedCrowdloanRewards.value),
  set(value) {
    const selectedCrowdloan = value.reduce<Record<string, RewardInfo[]>>((buffer, tag) => {
      const rewards = crowdloanRewards.value[tag];
      if (rewards) buffer[tag] = rewards;
      return buffer;
    }, {});

    void setSelectedRewardsAction({ selectedCrowdloan });
  },
});

const isInsufficientBalance = computed(() => hasInsufficientXorForFee(xor.value, fee.value));

const feeInfo = computed(() => ({
  label: t('networkFeeText'),
  labelTooltip: t('networkFeeTooltipText'),
  value: formatCodecNumber(fee.value),
  assetSymbol: KnownSymbols.XOR,
}));

const claimingInProgressOrFinished = computed(
  () => rewardsClaiming.value || transactionError.value || rewardsReceivedFlag.value
);

const claimingStatusMessage = computed(() =>
  rewardsReceivedFlag.value ? t('rewards.claiming.success') : t('rewards.claiming.pending')
);

const transactionStatusMessage = computed(() => {
  if (rewardsReceivedFlag.value) {
    return t('rewards.transactions.success');
  }

  const order = tOrdinal(transactionStep.value);
  const translationKey = transactionError.value ? 'rewards.transactions.failed' : 'rewards.transactions.confimation';

  return t(translationKey, { order, total: transactionStepsCount.value });
});

const hintText = computed(() => {
  if (!isLoggedIn.value) return t('rewards.hint.connectAccounts');
  if (rewardsAvailable.value) {
    const symbols = rewardTokenSymbols.value.join(` ${t('rewards.andText')} `);
    const transactions = tc('transactionText', transactionStepsCount.value);
    const count = transactionStepsCount.value > 1 ? transactionStepsCount.value : '';
    const destination =
      transactionStepsCount.value > 1 ? t('rewards.signing.accounts') : t('rewards.signing.extension');

    return t('rewards.hint.howToClaimRewards', { symbols, transactions, count, destination });
  }

  return '';
});

const externalRewardsHintText = computed(() => {
  if (!evmAddress.value) return t('rewards.hint.connectExternalAccount');
  if (!externalRewardsAvailable.value) return t('rewards.hint.connectAnotherAccount');
  return '';
});

const actionButtonLoading = computed(() => rewardsFetching.value || feeFetching.value);

const actionButtonText = computed(() => {
  if (actionButtonLoading.value) return '';
  if (!isLoggedIn.value) return t('connectWalletText');
  if (transactionError.value) return t('retryText');
  if (isInsufficientBalance.value) {
    return t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR });
  }
  if (!rewardsClaiming.value) return t('rewards.action.signAndClaim');
  if (externalRewardsAvailable.value && transactionStep.value === 1) {
    return t('rewards.action.pendingExternal');
  }
  if (!externalRewardsAvailable.value || transactionStep.value === 2) {
    return t('rewards.action.pendingInternal');
  }
  return '';
});

const actionButtonDisabled = computed(
  () => rewardsClaiming.value || (isLoggedIn.value && (!rewardsAvailable.value || isInsufficientBalance.value))
);

const changeWalletEvm = computed(() => Boolean(evmProvider.value));

const viewLoading = computed(() => parentLoadingRef.value || subscriptionsDataLoading.value || loading.value);

const checkExternalRewards = async (showNotification = false): Promise<void> => {
  if (!isLoggedIn.value) return;

  await getRewardsProcess(showNotification);
};

const getRewardsProcess = async (showNotification = false): Promise<void> => {
  await getExternalRewardsAction(evmAddress.value);

  if (!rewardsAvailable.value && showNotification) {
    showAppNotification(t('rewards.notification.empty'));
  }
};

const claimRewardsProcess = async (): Promise<void> => {
  const internalAddress = soraAddress.value;
  const externalAddress = evmAddress.value;

  if (!internalAddress) return;

  if (externalAddress && externalRewardsSelected.value) {
    const isConnected = await ethersUtil.checkAccountIsConnected(externalAddress);

    if (!isConnected) return;
  }

  await withNotifications(async () => {
    await claimRewardsAction({ internalAddress, externalAddress });
  });
};

const handleAction = async (): Promise<void> => {
  if (!isLoggedIn.value) {
    connectSoraWallet();
    return;
  }

  if (rewardsAvailable.value) {
    await claimRewardsProcess();
  }
};

watch(
  evmAddress,
  () => {
    void checkExternalRewards();
  },
  { flush: 'post' }
);

onMounted(async () => {
  await withSubscriptionsApi(async () => {
    await checkExternalRewards();
  });
});

onBeforeUnmount(() => {
  disconnectExternalNetwork();
});

onUnmounted(() => {
  resetRewards();
});
</script>

<style lang="scss">
.rewards {
  &-content {
    width: min(100%, 720px);
    margin: 0 auto;
  }

  &-block {
    width: 100%;
  }

  &-empty-state {
    display: flex;
    flex-direction: column;
    gap: $inner-spacing-medium;
    width: 100%;
  }

  .formatted-amount.formatted-amount--fiat-value {
    color: var(--s-color-rewards);
  }
}
.container.rewards .el-loading-mask {
  border-radius: var(--s-border-radius-small);
}
.rewards-action-button i {
  top: $inner-spacing-mini;
}
.rewards-connect-button.el-button.neumorphic.s-tertiary {
  [design-system-theme='light'] & {
    box-shadow: none;
  }
}
</style>

<style lang="scss" scoped>
.rewards {
  &-block {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }

  &-content {
    position: relative;
  }

  &-box {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    color: var(--s-color-base-on-accent);

    &.dark {
      color: var(--s-color-base-content-primary);
    }

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }
  }

  &-claiming-text {
    font-size: var(--s-heading5-font-size);
    line-height: var(--s-line-height-big);

    &--transaction {
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-big);
    }
  }

  &-amount {
    width: 100%;

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }

    & .el-divider {
      opacity: 0.5;
      margin: 0;
    }
  }

  @include rewards-hint(46px, true);

  &-hint {
    width: 100%;
    border-radius: var(--s-border-radius-small);
    padding: $inner-spacing-medium $inner-spacing-big;
    background: var(--s-color-utility-surface);
    border: 1px solid rgba(42, 23, 31, 0.06);
    box-shadow: var(--s-shadow-dialog);
    text-align: left;
    color: var(--s-color-base-content-secondary);
  }

  &-footer {
    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-small;
    }

    &-hint {
      padding: 0 $inner-spacing-medium;
      font-size: var(--s-font-size-extra-small);
      font-weight: 300;
      line-height: var(--s-line-height-base);
      text-align: center;
    }
  }

  &-account {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
    margin-top: $inner-spacing-small;
    padding: 0 $inner-spacing-tiny;

    &-group {
      display: flex;
      align-items: center;
      gap: $inner-spacing-mini;
    }

    &-logo {
      width: 16px;
      height: 16px;
    }

    &-btn {
      @include copy-address;

      &.disconnect {
        color: var(--s-color-status-error);
      }
    }
  }

  &-fee {
    &.info-line {
      color: var(--s-color-base-on-acccent);
      margin-top: $inner-spacing-medium;
      &.dark {
        border-bottom-color: var(--s-color-base-content-secondary);
      }
    }
  }

  @include full-width-button('rewards-action-button');
  @include full-width-button('rewards-connect-button', 0);
}

:global([design-system-theme='dark']) .rewards-hint {
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 24px 54px rgba(20, 6, 31, 0.28),
    0 1px 0 rgba(255, 255, 255, 0.08) inset;
}
</style>
