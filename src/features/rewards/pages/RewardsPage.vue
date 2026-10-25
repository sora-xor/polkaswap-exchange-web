<template>
  <div :class="['rewards', `rewards--${heroState}`, libraryTheme]">
    <div class="rewards-content" v-loading="viewLoading">
      <rewards-gradient-box class="rewards-hero" :symbol="gradientSymbol" :state="heroState">
        <div class="rewards-hero__layout">
          <div class="rewards-hero__main">
            <span :class="['rewards-status', `rewards-status--${heroState}`]" role="status">
              <i class="rewards-status__dot" aria-hidden="true"></i>
              {{ statusText }}
            </span>
            <template v-if="heroState === 'connect'">
              <h2 class="rewards-hero__title">{{ t('rewards.hero.connectTitle') }}</h2>
              <p class="rewards-hero__hint">{{ t('rewards.hint.connectAccounts') }}</p>
              <s-button
                v-if="showActionButton"
                class="rewards-action-button rewards-action-button--hero s-typography-button--large"
                data-test-name="LoginAndGet"
                type="primary"
                @click="handleAction"
                :loading="actionButtonLoading"
                :disabled="actionButtonDisabled"
              >
                {{ actionButtonText }}
              </s-button>
            </template>
            <template v-else>
              <rewards-amount-header :items="rewardsAmountHeaderItems"></rewards-amount-header>
              <dl v-if="showStats" class="rewards-stats">
                <div class="rewards-stat">
                  <dt>{{ t('rewards.stats.unlocked') }}</dt>
                  <dd>{{ formatShare(unlocked.share) }}</dd>
                </div>
                <div v-if="unlocked.lockedFiat && unlocked.lockedFiat.isGtZero()" class="rewards-stat">
                  <dt>{{ t('rewards.stats.locked') }}</dt>
                  <dd>
                    <formatted-amount
                      is-fiat-value
                      value-can-be-hidden
                      :value="unlocked.lockedFiat.toLocaleString()"
                    ></formatted-amount>
                  </dd>
                </div>
              </dl>
              <div v-if="claimingInProgressOrFinished" class="rewards-progress" aria-live="polite">
                <rewards-claim-steps
                  :total="transactionStepsCount"
                  :current="transactionStep"
                  :status="stepsStatus"
                  :label="t('rewards.action.signAndClaim')"
                ></rewards-claim-steps>
                <div v-if="claimingStatusMessage" class="rewards-claiming-text">
                  {{ claimingStatusMessage }}
                </div>
                <div class="rewards-claiming-text--transaction">
                  {{ transactionStatusMessage }}
                </div>
              </div>
            </template>
          </div>
          <rewards-reactor
            class="rewards-hero__reactor"
            :tokens="reactorTokens"
            :progress="unlocked.share"
            :active="heroState === 'ready'"
            :label="`${t('rewards.stats.unlocked')} ${formatShare(unlocked.share)}`"
          ></rewards-reactor>
        </div>
        <rewards-burst :active="rewardsReceived"></rewards-burst>
      </rewards-gradient-box>

      <div :class="['rewards-grid', { 'rewards-grid--solo': !hasClaimColumn }]">
        <section v-if="!claimingInProgressOrFinished" class="rw-card rewards-claim" :style="{ '--rw-i': 0 }">
          <header class="rw-card__head">
            <h3 class="rw-card__title">
              {{ isLoggedIn ? t('rewards.claimSection.title') : t('rewards.howTo.title') }}
            </h3>
          </header>
          <ol v-if="!isLoggedIn" class="rewards-howto">
            <li>{{ t('rewards.howTo.connect') }}</li>
            <li>{{ t('rewards.howTo.choose') }}</li>
            <li>{{ t('rewards.action.signAndClaim') }}</li>
          </ol>
          <div v-else class="rewards-amount">
            <rewards-amount-table
              class="rewards-table"
              v-if="internalRewards"
              v-model="selectedInternalRewardsModel"
              source="liquidity"
              :title="t('rewards.events.LiquidityProvision')"
              :items="[internalRewards]"
              :theme="libraryTheme"
              is-codec-string
            ></rewards-amount-table>
            <rewards-amount-table
              class="rewards-table"
              v-model="selectedVestedRewardsModel"
              source="strategic"
              :title="t('rewards.groups.strategic')"
              :items="vestedRewadsGroupItems"
              :theme="libraryTheme"
              is-codec-string
            ></rewards-amount-table>
            <rewards-amount-table
              class="rewards-table"
              v-if="Object.keys(crowdloanRewards).length"
              v-model="selectedCrowdloanRewardsModel"
              source="crowdloan"
              :title="t('rewards.groups.crowdloan')"
              :items="crowdloanRewardsGroupItems"
              :theme="libraryTheme"
              is-codec-string
            ></rewards-amount-table>
            <rewards-amount-table
              class="rewards-table"
              v-model="selectedExternalRewardsModel"
              source="external"
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
                    <span v-if="changeWalletEvm" v-button class="rewards-account-btn" @click="connectEvmWallet()">
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
                <s-button v-else class="rewards-connect-button" type="tertiary" @click="connectEvmWallet()">
                  {{ t('rewards.action.connectExternalWallet') }}
                </s-button>
                <div v-if="externalRewardsHintText" class="rewards-footer-hint">{{ externalRewardsHintText }}</div>
              </div>
            </rewards-amount-table>
            <div v-if="fee && rewardsAvailable" class="rewards-fee-block">
              <info-line
                v-bind="feeInfo"
                :class="['rewards-fee', libraryTheme]"
                :fiat-value="getFiatAmountByCodecString(fee)"
                is-formatted
              ></info-line>
              <p v-if="feePercent" class="rewards-fee-share">
                {{ t('rewards.analytics.feeShare', { percent: formatPercent(feePercent) }) }}
              </p>
            </div>
          </div>
          <div v-if="isLoggedIn && hintText" class="rewards-hint">
            {{ hintText }}
          </div>
          <s-button
            v-if="isLoggedIn && showActionButton"
            class="rewards-action-button s-typography-button--large"
            data-test-name="LoginAndGet"
            type="primary"
            @click="handleAction"
            :loading="actionButtonLoading"
            :disabled="actionButtonDisabled"
          >
            {{ actionButtonText }}
          </s-button>
        </section>
        <section
          v-else-if="showActionButton"
          class="rw-card rewards-claim rewards-claim--retry"
          :style="{ '--rw-i': 0 }"
        >
          <s-button
            class="rewards-action-button s-typography-button--large"
            data-test-name="LoginAndGet"
            type="primary"
            @click="handleAction"
            :loading="actionButtonLoading"
            :disabled="actionButtonDisabled"
          >
            {{ actionButtonText }}
          </s-button>
        </section>

        <div class="rewards-insights">
          <rewards-breakdown :breakdown="breakdown" :connected="isLoggedIn" :index="1"></rewards-breakdown>
          <rewards-vesting :vesting="vesting" :connected="isLoggedIn" :index="2"></rewards-vesting>
          <rewards-market :assets="marketAssets" :index="3"></rewards-market>
        </div>
      </div>
    </div>
    <select-provider-dialog></select-provider-dialog>
  </div>
</template>

<script lang="ts" setup>
import { CodecString, FPNumber } from '@sora-substrate/sdk';
import { KnownAssets, KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { RewardType } from '@sora-substrate/sdk/build/rewards/consts';
import { computed, onBeforeUnmount, onMounted, onUnmounted, toRef, watch } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useNotification } from '@/composables/useNotification';
import { useSubscriptions } from '@/composables/useSubscriptions';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { useWalletConnect } from '@/composables/useWalletConnect';
import { groupRewardsByAssetsList } from '@/lib/soraneo-wallet/src/util';
import { Theme } from '@/consts/theme';
import { useAssetsStore } from '@/stores/assets';
import { useRewardsStore } from '@/stores/rewards';
import type { ClaimRewardsParams } from '@/stores/rewards/types';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import type { RewardsAmountHeaderItem, RewardInfoGroup, SelectedRewards } from '@/types/rewards';
import { useRewardsAnalytics } from '@/features/rewards/composables/useRewardsAnalytics';
import { formatPercent, formatShare } from '@/features/rewards/utils/analytics';
import { getMissingRewardFiatPriceAssets } from '@/features/rewards/utils/fiat';
import { hasInsufficientXorForFee } from '@/utils';
import ethersUtil from '@/utils/ethers-util';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import WalletComponentFormattedAddress from '@/lib/soraneo-wallet/src/components/shared/FormattedAddress.vue';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import RewardsAmountHeader from '@/features/rewards/components/rewards/AmountHeader.vue';
import RewardsAmountTable from '@/features/rewards/components/rewards/AmountTable.vue';
import RewardsBreakdown from '@/features/rewards/components/rewards/RewardsBreakdown.vue';
import RewardsBurst from '@/features/rewards/components/rewards/RewardsBurst.vue';
import RewardsClaimSteps from '@/features/rewards/components/rewards/RewardsClaimSteps.vue';
import RewardsGradientBox from '@/features/rewards/components/rewards/GradientBox.vue';
import RewardsMarket from '@/features/rewards/components/rewards/RewardsMarket.vue';
import RewardsReactor from '@/features/rewards/components/rewards/RewardsReactor.vue';
import RewardsVesting from '@/features/rewards/components/rewards/RewardsVesting.vue';
import SelectProviderDialog from '@/components/shared/Dialog/SelectProvider.vue';

import '@/features/rewards/styles/rewards.scss';

defineOptions({
  name: 'RewardsPage',
  components: {
    RewardsGradientBox,
    RewardsAmountHeader,
    RewardsAmountTable,
    RewardsBreakdown,
    RewardsBurst,
    RewardsClaimSteps,
    RewardsMarket,
    RewardsReactor,
    RewardsVesting,
    SelectProviderDialog,
    InfoLine: WalletComponentInfoLine,
    FormattedAddress: WalletComponentFormattedAddress,
    FormattedAmount: WalletComponentFormattedAmount,
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
const assetsStore = useAssetsStore();
const rewardsStore = useRewardsStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const subscribeOnRewardsAction = () => rewardsStore.subscribeOnRewards();
const unsubscribeFromRewardsAction = () => rewardsStore.unsubscribeFromRewards();

const { subscriptionsDataLoading, withApi: withSubscriptionsApi } = useSubscriptions({
  parentLoading: parentLoadingRef,
  startSubscriptions: [subscribeOnRewardsAction],
  resetSubscriptions: [unsubscribeFromRewardsAction],
});

const feeFetching = computed(() => rewardsStore.feeFetching);
const rewardsFetching = computed(() => rewardsStore.rewardsFetching);
const rewardsClaiming = computed(() => rewardsStore.rewardsClaiming);
const transactionError = computed(() => rewardsStore.transactionError);
const transactionStep = computed(() => rewardsStore.transactionStep);
const receivedRewards = computed(() => rewardsStore.receivedRewards as RewardsAmountHeaderItem[]);
const fee = computed(() => rewardsStore.fee as CodecString);

const vestedRewards = computed(() => rewardsStore.vestedRewards as Nullable<RewardsInfo>);
const crowdloanRewards = computed(() => rewardsStore.crowdloanRewards as Record<string, RewardInfo[]>);
const internalRewards = computed(() => rewardsStore.internalRewards as Nullable<RewardInfo>);
const externalRewards = computed(() => rewardsStore.externalRewards as RewardInfo[]);

const selectedVestedRewards = computed(() => rewardsStore.selectedVested as Nullable<RewardsInfo>);
const selectedInternalRewards = computed(() => rewardsStore.selectedInternal as Nullable<RewardInfo>);
const selectedExternalRewards = computed(() => rewardsStore.selectedExternal as RewardInfo[]);
const selectedCrowdloanRewards = computed(() => rewardsStore.selectedCrowdloan as Record<string, RewardInfo[]>);

const xor = computed(() => assetsStore.xor as AccountAsset);
const rewardsAvailable = computed(() => rewardsStore.rewardsAvailable);
const externalRewardsAvailable = computed(() => rewardsStore.externalRewardsAvailable);
const externalRewardsSelected = computed(() => rewardsStore.externalRewardsSelected);
const internalRewardsAvailable = computed(() => rewardsStore.internalRewardsAvailable);
const vestedRewardsAvailable = computed(() => rewardsStore.vestedRewardsAvailable);
const rewardsByAssetsList = computed(() => rewardsStore.rewardsByAssetsList as RewardsAmountHeaderItem[]);
const libraryTheme = computed(() => (settingsStore.libraryTheme ?? Theme.LIGHT) as Theme);

const setSelectedRewardsAction = (payload: SelectedRewards) => rewardsStore.setSelectedRewards(payload);
const getExternalRewardsAction = (address: string) => rewardsStore.getExternalRewards(address);
const claimRewardsAction = (payload: ClaimRewardsParams) => rewardsStore.claimRewards(payload);
const resetRewards = () => rewardsStore.reset();

const transactionStepsCount = computed(() => (externalRewardsSelected.value ? 2 : 1));
const rewardsReceivedFlag = computed(() => receivedRewards.value.length !== 0);
const rewardsReceived = rewardsReceivedFlag;

const rewardsAmountHeaderItems = computed<RewardsAmountHeaderItem[]>(() =>
  rewardsReceivedFlag.value ? receivedRewards.value : rewardsByAssetsList.value
);

const rewardTokens = computed<Asset[]>(() => rewardsAmountHeaderItems.value.map((item) => item.asset));
const rewardAssetsMissingFiatPrices = computed<Asset[]>(() =>
  getMissingRewardFiatPriceAssets(rewardsAmountHeaderItems.value, walletStore.fiatPriceObject)
);
const rewardAssetsMissingFiatPriceKey = computed(() =>
  rewardAssetsMissingFiatPrices.value.map((asset) => asset.address).join('|')
);
const activeIndexerEndpoint = computed(() => {
  const indexerType = walletStore.indexerType;

  return indexerType ? walletStore.indexers?.[indexerType]?.endpoint : '';
});
const rewardTokenSymbols = computed<Array<KnownSymbols>>(() =>
  rewardTokens.value.map((item) => item.symbol as KnownSymbols)
);
const gradientSymbol = computed(() => (rewardTokenSymbols.value.length === 1 ? rewardTokenSymbols.value[0] : ''));

const { sources, breakdown, vesting, unlocked, rankedAssets, feePercent } =
  useRewardsAnalytics(rewardsAmountHeaderItems);

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

type HeroState = 'connect' | 'empty' | 'ready' | 'claiming' | 'success' | 'error';

/** One word for what the page is doing, used for the status pill and to tint the hero. */
const heroState = computed<HeroState>(() => {
  if (rewardsReceivedFlag.value) return 'success';
  if (rewardsClaiming.value) return 'claiming';
  if (transactionError.value) return 'error';
  if (!isLoggedIn.value) return 'connect';

  return rewardsAvailable.value ? 'ready' : 'empty';
});

const statusText = computed(() => {
  switch (heroState.value) {
    case 'success':
      return t('rewards.claiming.success');
    case 'claiming':
      return t('rewards.claiming.pending');
    case 'error':
      return t('rewards.status.failed');
    case 'connect':
      return t('rewards.status.connect');
    case 'ready':
      return t('rewards.status.ready');
    default:
      return t('rewards.status.empty');
  }
});

const stepsStatus = computed(() => {
  if (rewardsReceivedFlag.value) return 'done';

  return transactionError.value ? 'error' : 'pending';
});

const showStats = computed(
  () => isLoggedIn.value && !claimingInProgressOrFinished.value && unlocked.value.share !== null
);

/** The action stays available after a failed claim so the user can retry; it is hidden while a claim is running. */
const showActionButton = computed(() => !rewardsClaiming.value && !rewardsReceivedFlag.value && !loading.value);

/** The claim list, or the retry card after a failure, fills the first column. While claiming and after success it is gone. */
const hasClaimColumn = computed(() => !claimingInProgressOrFinished.value || showActionButton.value);

/** Tokens in the reactor, the most valuable of the selected rewards first. */
const reactorTokens = computed<Asset[]>(() => rankedAssets.value);

/** Tokens in the price card: everything claimable, then PSWAP and VAL so the card is useful without rewards too. */
const marketAssets = computed<Asset[]>(() => {
  const owned = sources.value.flatMap((source) => source.claimable.map(({ asset }) => asset));
  const defaults = [KnownAssets.get(KnownSymbols.PSWAP), KnownAssets.get(KnownSymbols.VAL)];
  const seen = new Set<string>();

  return [...owned, ...defaults].filter((asset) => {
    if (!asset?.address || seen.has(asset.address)) return false;

    seen.add(asset.address);
    return true;
  });
});

/** The headline of the claim progress. After a failure only the failure message is shown, not "Claiming...". */
const claimingStatusMessage = computed(() => {
  if (rewardsReceivedFlag.value) return t('rewards.claiming.success');

  return transactionError.value ? '' : t('rewards.claiming.pending');
});

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

let lastRewardFiatPriceRefreshKey = '';

const ensureRewardFiatPrices = async (): Promise<void> => {
  const missingPricesKey = rewardAssetsMissingFiatPriceKey.value;

  if (
    !isLoggedIn.value ||
    !activeIndexerEndpoint.value ||
    !missingPricesKey ||
    missingPricesKey === lastRewardFiatPriceRefreshKey
  ) {
    return;
  }

  lastRewardFiatPriceRefreshKey = missingPricesKey;

  try {
    await walletStore.subscribeOnFiatPrice();
  } catch (error) {
    lastRewardFiatPriceRefreshKey = '';
    console.error(error);
  }
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

watch(
  [isLoggedIn, rewardAssetsMissingFiatPriceKey, activeIndexerEndpoint],
  () => {
    void ensureRewardFiatPrices();
  },
  { flush: 'post', immediate: true }
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
// Layout and hero details of the rewards page. The shared tokens and card look live in `styles/rewards.scss`.
.rewards {
  width: 100%;
}

// The query container is the content wrapper, not the page root: the root also holds the provider dialog, and a
// container would become the containing block of anything fixed inside it.
.rewards-content {
  position: relative;
  display: grid;
  gap: 20px;
  width: 100%;
  container-type: inline-size;
  container-name: rewards;

  .el-loading-mask {
    border-radius: var(--s-border-radius-medium);
  }
}

.rewards-hero {
  &__layout {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: 28px;
    text-align: center;
  }

  &__main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    width: 100%;
    min-width: 0;
  }
}

@container rw-hero (min-width: 620px) {
  .rewards-hero {
    &__layout {
      flex-direction: row;
      justify-content: space-between;
      gap: 32px;
      padding-block: 8px;
      text-align: start;
    }

    &__main {
      flex: 1 1 auto;
      align-items: flex-start;
      width: auto;
    }
  }

  .rewards-progress {
    justify-items: start;

    .rw-steps {
      justify-content: flex-start;
    }
  }
}

.rewards-hero {
  &__title {
    margin: 0;
    color: var(--rw-hero-ink, #fff);
    font-size: clamp(1.6rem, 4.2vw, 2.4rem);
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.12;
    text-wrap: balance;
  }

  &__hint {
    max-width: 46ch;
    margin: 0;
    color: var(--rw-hero-muted, #cdb9e8);
    font-size: var(--s-font-size-small);
    line-height: 1.6;
  }
}

// Status pill. The dot pulses with a ring that only changes transform and opacity.
.rewards-status {
  --rw-dot: #a78bfa;

  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  padding-inline: 12px 14px;
  border: 1px solid var(--rw-hero-line, rgba(255, 255, 255, 0.16));
  border-radius: 999px;
  background: var(--rw-hero-glass, rgba(255, 255, 255, 0.07));
  color: var(--rw-hero-ink, #fff);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.3;

  &__dot {
    position: relative;
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--rw-dot);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: var(--rw-dot);
      opacity: 0;
      animation: rw-dot-pulse 2.2s ease-out infinite;
      will-change: transform, opacity;
    }
  }

  &--ready {
    --rw-dot: #34d399;
  }

  &--claiming {
    --rw-dot: #fbbf24;

    .rewards-status__dot::after {
      animation-duration: 1.1s;
    }
  }

  &--success {
    --rw-dot: #34d399;
  }

  &--error {
    --rw-dot: #ff8a8a;
  }

  &--success &__dot::after,
  &--error &__dot::after,
  &--empty &__dot::after {
    animation: none;
  }
}

.rewards-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: inherit;
  gap: 10px;
  margin: 0;
}

// Stat tiles: label, then a value in proportional figures.
.rewards-stat {
  min-width: 112px;
  padding: 10px 16px 11px;
  border: 1px solid var(--rw-hero-line, rgba(255, 255, 255, 0.16));
  border-radius: 16px;
  background: var(--rw-hero-glass, rgba(255, 255, 255, 0.07));
  text-align: start;

  dt {
    color: var(--rw-hero-muted, #cdb9e8);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    line-height: 1.4;
    text-transform: uppercase;
  }

  dd {
    margin: 2px 0 0;
    color: var(--rw-hero-ink, #fff);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.25;
  }

  dd .formatted-amount--fiat-value {
    color: inherit;
    font-weight: inherit;
    line-height: inherit;
  }
}

.rewards-progress {
  display: grid;
  justify-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 4px;
}

.rewards-claiming-text {
  font-size: var(--s-heading5-font-size);
  font-weight: 600;
  line-height: var(--s-line-height-big);

  &--transaction {
    color: var(--rw-hero-muted, #cdb9e8);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
  }
}

.rewards-grid {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'};
  gap: 20px;
  align-items: start;
}

@container rewards (min-width: 860px) {
  .rewards-grid {
    grid-template-columns: #{'minmax(0, 1.1fr) minmax(0, 1fr)'};
  }

  // Without the claim column the analytics use the full width: two cards side by side, the price card below them.
  .rewards-grid--solo .rewards-insights {
    grid-column: 1 / -1;
    grid-template-columns: #{'minmax(0, 1fr) minmax(0, 1fr)'};

    > :last-child {
      grid-column: 1 / -1;
    }
  }
}

.rewards-insights {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'};
  gap: 20px;
  min-width: 0;
}

.rewards-claim {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'};
  gap: 14px;
  align-content: start;

  .rw-card__head {
    margin-bottom: 0;
  }

  &--retry {
    padding: 14px;
  }
}

.rewards-howto {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: rewards-step;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid var(--rw-line, #ede4e7);
    border-radius: 16px;
    background: color-mix(in srgb, var(--rw-ink, #2a171f) 3%, transparent);
    color: var(--rw-ink, #2a171f);
    font-size: var(--s-font-size-small);
    font-weight: 600;
    counter-increment: rewards-step;

    &::before {
      content: counter(rewards-step);
      flex: none;
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--rw-accent, #d8267a);
      color: var(--rw-on-accent, #fff);
      font-size: 12px;
      font-weight: 700;
    }
  }
}

.rewards-amount {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'};
  gap: 12px;
  width: 100%;

  .el-divider {
    margin: 0;
    opacity: 0.5;
  }
}

.rewards-footer {
  display: grid;
  gap: $inner-spacing-small;
  margin-top: $inner-spacing-mini;

  &-hint {
    padding: 0;
    color: var(--rw-muted, var(--s-color-base-content-secondary));
    font-size: var(--s-font-size-extra-small);
    font-weight: 400;
    line-height: var(--s-line-height-base);
  }
}

.rewards-account {
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  gap: $inner-spacing-mini;
  padding: 0 $inner-spacing-tiny;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-big);

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
      color: var(--s-color-status-error-text, var(--s-color-status-error));
    }
  }
}

.rewards-fee-block {
  padding: 0 $inner-spacing-tiny;
}

.rewards-fee-share {
  margin: 6px 0 0;
  color: var(--rw-muted, var(--s-color-base-content-secondary));
  font-size: var(--s-font-size-extra-small);
  line-height: 1.5;
}

.rewards-hint {
  margin: 0;
  padding: 0 $inner-spacing-tiny;
  color: var(--rw-muted, var(--s-color-base-content-secondary));
  font-size: var(--s-font-size-extra-small);
  font-weight: 400;
  line-height: 1.55;
  text-align: start;
}

.rewards-action-button i {
  top: $inner-spacing-mini;
}

.rewards-action-button {
  width: 100%;

  // In the hero the button is as wide as its text needs (but never narrower than a comfortable target).
  &--hero {
    width: auto;
    min-width: min(100%, 260px);
    margin-top: 6px;
  }
}

// The main button gets a slow highlight that sweeps across it. The sweep is a transform animation, so it is cheap,
// and it stops while the button is disabled or loading.
.rewards-action-button.el-button.s-primary:not(.is-disabled):not(.is-loading) {
  position: relative;
  overflow: hidden;
  isolation: isolate;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, 0.38) 50%, transparent 62%);
    transform: translate3d(-120%, 0, 0);
    animation: rw-shine 5s ease-in-out 1.5s infinite;
    pointer-events: none;
    will-change: transform;
  }
}

// The app-wide large CTA never wraps and is 42px high. Here the label can be long ("Insufficient XOR balance", longer
// translations), so it wraps onto a second line instead of being cut off, and steps down a size in a narrow column.
button.el-button.s-typography-button--large.rewards-action-button {
  height: auto !important;
  min-height: 42px;
  padding-block: 8px !important;
  white-space: normal !important;
  text-wrap: balance;

  > span,
  .s-button__text {
    justify-content: center;
    overflow: visible !important;
    line-height: 1.15 !important;
    text-align: center;
    text-overflow: clip !important;
    white-space: normal !important;
  }
}

@container rewards (max-width: 480px) {
  button.el-button.s-typography-button--large.rewards-action-button {
    font-size: 20px !important;

    > span,
    .s-button__text {
      font-size: 20px !important;
    }
  }
}

.rewards-connect-button {
  width: 100%;
}

.rewards-connect-button.el-button.neumorphic.s-tertiary {
  [design-system-theme='light'] & {
    box-shadow: none;
  }
}

@keyframes rw-dot-pulse {
  from {
    opacity: 0.7;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(2.8);
  }
}

@keyframes rw-shine {
  0%,
  55% {
    transform: translate3d(-120%, 0, 0);
  }
  100% {
    transform: translate3d(120%, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rewards-status__dot::after,
  .rewards-action-button.el-button.s-primary::after {
    animation: none;
  }
}
</style>
