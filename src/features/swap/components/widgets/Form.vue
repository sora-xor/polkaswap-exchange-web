<template>
  <base-widget class="swap-widget" :title="t('exchange.Swap')" v-bind="$attrs">
    <template #filters>
      <swap-status-action-badge>
        <template #label>{{ t('marketText') }}:</template>
        <template #value>{{ swapMarketAlgorithm }}</template>
        <template #action>
          <s-button
            class="el-button--settings"
            type="action"
            icon="basic-settings-24"
            :aria-label="t('headerMenu.settings')"
            @click="openSettingsDialog"
          ></s-button>
        </template>
      </swap-status-action-badge>
    </template>

    <div class="swap-form">
      <token-input
        data-test-name="swapFrom"
        is-select-available
        :balance="getTokenBalance(tokenFrom)"
        :is-max-available="isMaxSwapAvailable"
        :title="t('transfers.from')"
        :token="tokenFrom"
        :model-value="fromValue"
        @update:model-value="handleInputFieldFrom"
        @focus="handleFocusField(false)"
        @max="handleMaxValue"
        @select="openSelectTokenDialog(true)"
      ></token-input>

      <s-button
        class="el-button--switch-tokens"
        data-test-name="switchToken"
        type="action"
        icon="arrows-swap-90-24"
        :disabled="!areTokensSelected"
        :aria-label="t('exchange.Swap')"
        @click="handleSwitchTokens"
      ></s-button>

      <token-input
        data-test-name="swapTo"
        is-select-available
        :balance="getTokenBalance(tokenTo)"
        :title="t('transfers.to')"
        :token="tokenTo"
        :model-value="toValue"
        @update:model-value="handleInputFieldTo"
        @focus="handleFocusField(true)"
        @select="openSelectTokenDialog(false)"
      >
        <template #fiat-amount-append v-if="tokenTo">
          <value-status-wrapper :value="fiatDifference" badge class="price-difference__value">
            <formatted-amount :value="fiatDifferenceFormatted">%</formatted-amount>
          </value-status-wrapper>
        </template>
      </token-input>

      <slippage-tolerance class="slippage-tolerance-settings"></slippage-tolerance>

      <div v-if="isPairNotCreated" class="swap-form-status swap-form-status--error" data-test-name="swapPairStatus">
        <s-icon name="notifications-alert-triangle-24" size="14"></s-icon>
        <span>{{ t('pairIsNotCreated') }}</span>
      </div>

      <s-button
        v-if="!isLoggedIn"
        type="primary"
        class="action-button s-typography-button--large"
        @click="connectSoraWallet"
      >
        {{ t('connectWalletText') }}
      </s-button>
      <s-button
        v-else
        class="action-button s-typography-button--large"
        data-test-name="confirmSwap"
        type="primary"
        :disabled="isSwapActionDisabled"
        :loading="loading || quoteLoading || pathAvailabilityLoading || isSelectAssetLoading"
        @click="handleSwapClick"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="areZeroAmounts">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientLiquidity">
          {{ t('swap.insufficientLiquidity') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: tokenFromSymbol }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR }) }}
        </template>
        <template v-else>
          <s-icon
            v-if="isErrorFiatDifferenceStatus"
            name="notifications-alert-triangle-24"
            size="18"
            class="action-button-icon"
          ></s-icon>
          {{ t('exchange.Swap') }}
        </template>
      </s-button>

      <swap-transaction-details :disabled="!areTokensSelected || hasZeroAmount" inline class="swap-details">
        <template #reference>
          <info-line
            :label="t('networkFeeText')"
            :label-tooltip="t('networkFeeTooltipText')"
            :value="networkFeeFormatted"
            :asset-symbol="xorSymbol"
            :fiat-value="getFiatAmountByCodecString(networkFee)"
            is-formatted
            class="swap-details-info-line"
          ></info-line>
        </template>
      </swap-transaction-details>

      <select-token
        v-model:visible="showSelectTokenDialog"
        :connected="isLoggedIn"
        :asset="isTokenFromSelected ? tokenTo : tokenFrom"
        @select="handleSelectToken"
      ></select-token>
      <swap-loss-warning-dialog
        v-model:visible="lossWarningVisibility"
        :value="fiatDifferenceFormatted"
        @confirm="handleConfirm"
      ></swap-loss-warning-dialog>
      <swap-confirm
        v-model:visible="confirmDialogVisible"
        :is-insufficient-balance="isInsufficientBalance"
        @confirm="exchangeTokens"
      ></swap-confirm>
      <swap-settings v-model:visible="showSettings"></swap-settings>
    </div>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { KnownSymbols, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTokenSelect } from '@/composables/useTokenSelect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { MarketAlgorithms } from '@/consts';
import { useSwapAmounts } from '@/features/swap/composables/useSwapAmounts';
import { useSwapStore } from '@/features/swap/stores/useSwapStore';
import { DexId } from '@/lib/substrate/sdk/dex/consts';
import { createAsyncComponent } from '@/shared/ui/async';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';
import { isSelectableAsset } from '@/components/shared/SelectAsset/utils';
import {
  asZeroValue,
  debouncedInputHandler,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  isMaxButtonAvailable,
} from '@/utils';
import { DifferenceStatus, calcFiatDifference, getDifferenceStatus, getVisibleSwapTokenBalance } from '@/utils/swap';

import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { SwapQuoteData } from '@sora-substrate/sdk/build/swap/types';
import type { Subscription } from 'rxjs';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

const BaseWidget = createAsyncComponent(() => import('@/components/shared/Widget/Base.vue'));
const SwapSettings = createAsyncComponent(() => import('@/features/swap/components/settings/Settings.vue'));
const SwapConfirm = createAsyncComponent(() => import('@/features/swap/components/Confirm.vue'));
const SwapStatusActionBadge = createAsyncComponent(() => import('@/shared/ui/StatusActionBadge.vue'));
const SwapTransactionDetails = createAsyncComponent(() => import('@/features/swap/components/TransactionDetails.vue'));
const SwapLossWarningDialog = createAsyncComponent(() => import('@/features/swap/components/LossWarningDialog.vue'));
const SlippageTolerance = createAsyncComponent(() => import('@/components/shared/Settings/SlippageTolerance.vue'));
const TokenInput = createAsyncComponent(() => import('@/components/shared/Input/TokenInput.vue'));
const ValueStatusWrapper = createAsyncComponent(() => import('@/components/shared/ValueStatusWrapper.vue'));
const FormattedAmount = WalletComponentFormattedAmount;
const InfoLine = WalletComponentInfoLine;

defineOptions({
  name: 'SwapFormWidget',
});

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const { t } = useTranslation();
const swapStore = useSwapStore();
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();
const {
  tokenFrom,
  tokenTo,
  fromValue,
  toValue,
  areTokensSelected,
  hasZeroAmount,
  areZeroAmounts,
  isZeroFromAmount,
  isZeroToAmount,
  setTokenFromAddress,
  setTokenToAddress,
  setFromValue,
  setToValue,
} = useSwapAmounts();
const { isLoggedIn, connectSoraWallet } = useInternalConnect();
const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();
const { loading, withApi, withChainApi, withNotifications } = useTransaction({
  parentLoading: computed(() => props.parentLoading),
});
const {
  getFPNumber,
  getFPNumberFromCodec,
  formatCodecNumber,
  formatStringValue,
  getFiatAmountByCodecString,
  getFPNumberFiatAmountByFPNumber,
} = useFormattedAmount();

const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
const networkFee = computed(() => networkFees.value[Operation.Swap]);
// Avoid name collision with the <slippage-tolerance> component tag in the template.
const slippageToleranceValue = computed(() => settingsStore.slippageTolerance);
const appConnection = computed(() => settingsStore.appConnection);
const xor = computed(() => assetsStore.assetDataByAddress(XOR.address) as AccountAsset);
const liquiditySource = computed(() => swapStore.swapLiquiditySource);
const debugEnabled = computed(() => Boolean(settingsStore.debugEnabled));
const nodeIsConnected = computed(() => Boolean(settingsStore.nodeIsConnected));
const swapMarketAlgorithm = computed(() => swapStore.swapMarketAlgorithm);
const isPathAvailable = computed(() => swapStore.isPathAvailable);
const allowLossPopup = computed(() => swapStore.allowLossPopup);
const isExchangeB = computed(() => swapStore.isExchangeB);
const selectedDexId = computed(() => swapStore.selectedDexId);

const showSettings = ref(false);
const showSelectTokenDialog = ref(false);
const lossWarningVisibility = ref(false);
const isTokenFromSelected = ref(false);
const quoteSubscription = ref<Subscription | null>(null);
const quoteLoading = ref(false);
const pathAvailabilityLoading = ref(false);
const pathAvailabilityRequestId = ref(0);

const delimiters = FPNumber.DELIMITERS_CONFIG;
const xorSymbol = ` ${XOR.symbol}`;
const swapPathDexIds = [DexId.XOR, DexId.XSTUSD, DexId.KUSD, DexId.VXOR] as const;

const fiatDifference = computed(() => calcFiatDifference(fromFiatAmount.value, toFiatAmount.value).toFixed(2));

const fiatDifferenceFormatted = computed(() => formatStringValue(fiatDifference.value));
const isErrorFiatDifferenceStatus = computed(
  () => getDifferenceStatus(Number(fiatDifference.value) || 0) === DifferenceStatus.Error
);

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const tokenFromSymbol = computed(() => tokenFrom.value?.symbol ?? '');
const isXorOutputSwap = computed(() => tokenTo.value?.address === XOR.address);
const preparedForSwap = computed(() => isLoggedIn.value && areTokensSelected.value);
const fromFiatAmount = computed(() => {
  if (!tokenFrom.value || !fromValue.value) return FPNumber.ZERO;
  return getFPNumberFiatAmountByFPNumber(new FPNumber(fromValue.value), tokenFrom.value) ?? FPNumber.ZERO;
});
const toFiatAmount = computed(() => {
  if (!tokenTo.value || !toValue.value) return FPNumber.ZERO;
  return getFPNumberFiatAmountByFPNumber(new FPNumber(toValue.value), tokenTo.value) ?? FPNumber.ZERO;
});

const isMaxSwapAvailable = computed(() => {
  if (!preparedForSwap.value || !tokenFrom.value) return false;

  return isMaxButtonAvailable(tokenFrom.value, fromValue.value, networkFee.value, xor.value, isXorOutputSwap.value);
});

const isInsufficientLiquidity = computed(
  () => isPathAvailable.value && preparedForSwap.value && !areZeroAmounts.value && hasZeroAmount.value
);
const isPairNotCreated = computed(
  () => nodeIsConnected.value && areTokensSelected.value && !pathAvailabilityLoading.value && !isPathAvailable.value
);
const isInsufficientBalance = computed(() => {
  if (!tokenFrom.value) return false;
  return preparedForSwap.value && hasInsufficientBalance(tokenFrom.value, fromValue.value, networkFee.value);
});
const isInsufficientXorForFee = computed(() => {
  const result = preparedForSwap.value && hasInsufficientXorForFee(xor.value, networkFee.value, isXorOutputSwap.value);
  if (result || !isXorOutputSwap.value) {
    return result;
  }
  const xorBalance = getFPNumberFromCodec(xor.value.balance?.transferable ?? '0', xor.value.decimals);
  const fpNetworkFee = getFPNumberFromCodec(networkFee.value, xor.value.decimals).sub(xorBalance);
  const fpAmount = getFPNumber(toValue.value || '0', xor.value.decimals).sub(
    FPNumber.gt(fpNetworkFee, FPNumber.ZERO) ? fpNetworkFee : FPNumber.ZERO
  );
  return FPNumber.lte(fpAmount, FPNumber.ZERO);
});

const isConfirmSwapDisabled = computed(
  () =>
    !areTokensSelected.value ||
    !isPathAvailable.value ||
    areZeroAmounts.value ||
    isInsufficientLiquidity.value ||
    isInsufficientBalance.value ||
    isInsufficientXorForFee.value
);
const isSwapActionDisabled = computed(() => areTokensSelected.value && isConfirmSwapDisabled.value);

const recountSwapValues = debouncedInputHandler(async () => {
  await runRecountSwapValues();
}, 100);

function getTokenBalance(token: Nullable<AccountAsset>): Nullable<CodecString> {
  return getVisibleSwapTokenBalance(token, isLoggedIn.value);
}

function resetFieldFrom() {
  setFromValue('');
}

function resetFieldTo() {
  setToValue('');
}

async function handleInputFieldFrom(value: string) {
  swapStore.setExchangeB(false);

  if (!areTokensSelected.value || asZeroValue(value)) {
    resetFieldTo();
  }

  if (value === fromValue.value) return;

  setFromValue(value);
  recountSwapValues();
}

async function handleInputFieldTo(value: string) {
  swapStore.setExchangeB(true);

  if (!areTokensSelected.value || asZeroValue(value)) {
    resetFieldFrom();
  }

  if (value === toValue.value) return;

  setToValue(value);
  recountSwapValues();
}

async function runRecountSwapValues() {
  const value = isExchangeB.value ? toValue.value : fromValue.value;

  const quote = swapStore.swapQuote;

  if (!areTokensSelected.value || asZeroValue(value) || !quote) {
    swapStore.setAmountWithoutImpact();
    swapStore.setLiquidityProviderFee();
    swapStore.setRewards();
    swapStore.setRoute();
    swapStore.setDistribution();
    swapStore.selectDexId();
    return;
  }

  const setOppositeValue = isExchangeB.value ? setFromValue : setToValue;
  const resetOppositeValue = isExchangeB.value ? resetFieldFrom : resetFieldTo;
  const oppositeToken = (isExchangeB.value ? tokenFrom.value : tokenTo.value) as AccountAsset;

  try {
    const {
      dexId,
      result: { amount, amountWithoutImpact, fee, rewards, route, distribution },
    } = quote(
      (tokenFrom.value as Asset).address,
      (tokenTo.value as Asset).address,
      value,
      isExchangeB.value,
      [liquiditySource.value].filter(Boolean) as Array<LiquiditySourceTypes>
    );

    if (debugEnabled.value) {
      const rpcResult = await api.swap.getResultRpc(
        (tokenFrom.value as Asset).address,
        (tokenTo.value as Asset).address,
        value,
        isExchangeB.value,
        liquiditySource.value ?? undefined
      );

      console.table({
        frontend: amount,
        backend: rpcResult.amount,
        difference: +amount - +rpcResult.amount,
      });
    }

    setOppositeValue(getFPNumberFromCodec(amount, oppositeToken.decimals).toString());
    swapStore.setAmountWithoutImpact(amountWithoutImpact as string);
    swapStore.setLiquidityProviderFee(fee as CodecString);
    swapStore.setRewards(rewards as Array<LPRewardsInfo>);
    swapStore.setRoute(route as string[]);
    swapStore.setDistribution(distribution as Distribution[][]);
    swapStore.selectDexId(dexId as DexId);
  } catch (error) {
    console.error(error);
    resetOppositeValue();
  }
}

function resetQuoteSubscription() {
  quoteSubscription.value?.unsubscribe();
  quoteSubscription.value = null;
}

function getSwapPathDexIds(): DexId[] {
  const publicDexIds = api.dex?.publicDexes?.map(({ dexId }) => dexId as DexId) ?? [];
  return [...new Set([...publicDexIds, ...swapPathDexIds])];
}

async function updateSwapPathAvailability() {
  const requestId = ++pathAvailabilityRequestId.value;

  if (!areTokensSelected.value || !nodeIsConnected.value) {
    pathAvailabilityLoading.value = false;
    swapStore.setPathAvailability(false);
    return;
  }

  const fromAddress = (tokenFrom.value as AccountAsset).address;
  const toAddress = (tokenTo.value as AccountAsset).address;

  pathAvailabilityLoading.value = true;

  try {
    const availability = await Promise.all(
      getSwapPathDexIds().map((dexId) =>
        api.swap.checkSwap(fromAddress, toAddress, dexId).catch((error) => {
          console.warn('[swap] path availability check failed for dex', dexId, error);
          return false;
        })
      )
    );

    if (
      requestId !== pathAvailabilityRequestId.value ||
      tokenFrom.value?.address !== fromAddress ||
      tokenTo.value?.address !== toAddress
    ) {
      return;
    }

    swapStore.setPathAvailability(availability.some(Boolean));
  } finally {
    if (requestId === pathAvailabilityRequestId.value) {
      pathAvailabilityLoading.value = false;
    }
  }
}

async function refreshSwapQuotesConfiguration() {
  try {
    await api.swap.update();
  } catch (error) {
    console.warn('[swap] api.swap.update skipped', error);
  }
}

async function subscribeOnQuote() {
  resetQuoteSubscription();

  if (!areTokensSelected.value) {
    quoteLoading.value = false;
    swapStore.setSubscriptionPayload();
    await runRecountSwapValues();
    return;
  }

  quoteLoading.value = true;
  swapStore.setPathAvailability(false);
  void updateSwapPathAvailability();

  const observableQuote = api.swap.getDexesSwapQuoteObservable(
    (tokenFrom.value as AccountAsset).address,
    (tokenTo.value as AccountAsset).address
  );

  if (observableQuote) {
    quoteSubscription.value = observableQuote.subscribe({
      next: (quoteData: SwapQuoteData) => {
        const { quote, isAvailable, liquiditySources } = quoteData;
        swapStore.setSubscriptionPayload({ quote, isAvailable, liquiditySources });
        recountSwapValues();
        quoteLoading.value = false;
      },
      error: (error) => {
        console.error('[swap] quote subscription failed', error);
        const currentPathAvailability = swapStore.isPathAvailable;
        swapStore.setSubscriptionPayload();
        swapStore.setPathAvailability(currentPathAvailability);
        quoteLoading.value = false;
        void runRecountSwapValues();
      },
      complete: () => {
        quoteLoading.value = false;
      },
    });
  } else {
    swapStore.setSubscriptionPayload();
    quoteLoading.value = false;
    await runRecountSwapValues();
  }
}

async function enableSwapSubscriptions(withApiRefresh = false) {
  if (withApiRefresh) {
    await refreshSwapQuotesConfiguration();
  }
  swapStore.updateSubscriptions();
  await subscribeOnQuote();
}

function resetSwapSubscriptions() {
  pathAvailabilityRequestId.value += 1;
  pathAvailabilityLoading.value = false;
  swapStore.resetSubscriptions();
  resetQuoteSubscription();
  quoteLoading.value = false;
  swapStore.setSubscriptionPayload();
  void runRecountSwapValues();
}

function openSelectTokenDialog(isFrom: boolean) {
  isTokenFromSelected.value = isFrom;
  showSelectTokenDialog.value = true;
}

/**
 * Opens the selector for the first incomplete side of the swap pair.
 */
function openMissingTokenDialog() {
  openSelectTokenDialog(!tokenFrom.value);
}

async function handleSelectToken(token: AccountAsset) {
  if (!isSelectableAsset(token)) return;

  await withSelectAssetLoading(async () => {
    if (isTokenFromSelected.value) {
      await setTokenFromAddress(token.address);
    } else {
      await setTokenToAddress(token.address);
    }
  });
}

function handleSwapClick() {
  if (!areTokensSelected.value) {
    openMissingTokenDialog();
    return;
  }

  if (isErrorFiatDifferenceStatus.value && allowLossPopup.value) {
    lossWarningVisibility.value = true;
  } else {
    handleConfirm();
  }
}

function handleConfirm() {
  confirmOrExecute(exchangeTokens);
}

async function exchangeTokens() {
  if (isConfirmSwapDisabled.value) return;

  await withNotifications(async () => {
    await api.swap.execute(
      tokenFrom.value as AccountAsset,
      tokenTo.value as AccountAsset,
      fromValue.value,
      toValue.value,
      slippageToleranceValue.value,
      isExchangeB.value,
      liquiditySource.value as LiquiditySourceTypes,
      selectedDexId.value
    );

    resetFieldFrom();
    resetFieldTo();
    swapStore.setExchangeB(false);
  });
}

function handleFocusField(exchangeB = false) {
  const isZeroValue = exchangeB ? isZeroToAmount.value : isZeroFromAmount.value;
  const previous = isExchangeB.value;

  swapStore.setExchangeB(exchangeB);

  if (isZeroValue) {
    resetFieldFrom();
    resetFieldTo();
  }

  if (previous !== isExchangeB.value) {
    recountSwapValues();
  }
}

async function handleSwitchTokens() {
  if (!areTokensSelected.value) return;

  await swapStore.switchTokens();
  await subscribeOnQuote();
  recountSwapValues();
}

function handleMaxValue() {
  if (!tokenFrom.value) return;

  swapStore.setExchangeB(false);
  const max = getMaxValue(tokenFrom.value, networkFee.value);
  handleInputFieldFrom(max);
}

function openSettingsDialog() {
  showSettings.value = true;
}

watch(
  [() => tokenFrom.value?.address ?? '', () => tokenTo.value?.address ?? ''],
  ([fromAddress, toAddress], [prevFromAddress, prevToAddress]) => {
    if (fromAddress === prevFromAddress && toAddress === prevToAddress) return;

    void subscribeOnQuote();
  }
);

watch(liquiditySource, () => {
  runRecountSwapValues();
});

watch(nodeIsConnected, async (connected) => {
  if (connected) {
    await enableSwapSubscriptions(true);
  } else {
    resetSwapSubscriptions();
  }
});

watch(isLoggedIn, (loggedIn, previous) => {
  if (loggedIn === previous || !nodeIsConnected.value) return;

  if (loggedIn) {
    swapStore.updateSubscriptions();
  } else {
    swapStore.resetSubscriptions();
  }
});

onMounted(async () => {
  if (!nodeIsConnected.value) return;

  await withApi(async () => {
    await withChainApi(appConnection.value.connection, async () => {
      await enableSwapSubscriptions(true);
    });
  });
});

onBeforeUnmount(() => {
  resetSwapSubscriptions();
  swapStore.reset();
});
</script>

<style lang="scss" scoped>
.swap-widget {
  @include buttons;
  @include full-width-button('action-button');
  @include full-width-button('swap-details', 0);
  @include vertical-divider('el-button--switch-tokens', $inner-spacing-medium);

  :deep(button.el-button.neumorphic.s-action.el-button--settings:not(.s-primary)) {
    display: inline-block;
    line-height: 14px;
    text-align: center;

    .s-button__icon {
      line-height: 14px !important;
    }

    .s-icon,
    [class*='s-icon-'] {
      vertical-align: baseline !important;
    }
  }
}

.el-button.neumorphic.s-action:disabled {
  &,
  &:hover {
    &.el-button--switch-tokens.loading {
      border-color: transparent;
      box-shadow: var(--s-shadow-element-pressed);
    }
  }
}

.swap-form {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;

  // `swap-details` is rendered inside a nested child slot tree, so scoped
  // selectors from this component do not reach it without `:deep`.
  :deep(.swap-details) {
    margin-top: 0;
    width: 100%;
  }

  :deep(button.el-button.neumorphic.s-action.el-button--switch-tokens:not(.s-primary)) {
    display: block;
    width: 42px;
    height: 42px;
    min-width: 42px;
    min-height: 42px;
    padding: 0;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    border-color: transparent;
    color: var(--s-color-base-content-tertiary);
    line-height: 14px;
    box-shadow: var(--s-shadow-element-pressed) !important;
    transition:
      box-shadow 0.12s ease,
      color 0.12s ease;

    .s-icon,
    [class*='s-icon-'] {
      font-size: 24px !important;
      line-height: 24px !important;
      width: 24px !important;
      height: 24px !important;
      display: inline-block !important;
      vertical-align: baseline !important;
      color: var(--s-color-base-content-tertiary);
    }

    .s-button__icon {
      width: auto !important;
      height: auto !important;
      line-height: 14px !important;
      display: inline !important;
    }

    &:not(.is-disabled):not(:disabled):active {
      box-shadow: var(--s-shadow-element) !important;
      color: var(--s-color-theme-accent);
    }

    &.is-disabled,
    &:disabled {
      box-shadow: var(--s-shadow-element) !important;
      border-color: var(--s-color-utility-body);
    }
  }
}

.swap-form-status {
  width: 100%;
  display: flex;
  align-items: center;
  gap: $inner-spacing-mini;
  margin: $inner-spacing-small 0 0;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-big);

  &--error {
    color: var(--s-color-status-error);
  }
}

.price-difference {
  &__value {
    font-weight: 600;
    font-size: var(--s-font-size-small);
    white-space: nowrap;

    & > span {
      padding-right: 2px;
    }
  }
}

:deep(button.el-button.action-button.s-typography-button--large) {
  height: auto !important;
  min-height: 42px !important;
  white-space: normal !important;
}

:deep(button.el-button.action-button.s-typography-button--large > .s-button__text) {
  display: block !important;
  width: 100%;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  text-align: center;
  text-transform: uppercase;
}

:global(.swap-form button.el-button.neumorphic.action-button.s-primary) {
  border-color: #ede4e7 !important;
  box-shadow:
    1px 1px 5px #fff,
    -1px -1px 5px #fff !important;
  color: var(--s-color-base-on-accent) !important;
}

:global(.swap-form button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):focus),
:global(.swap-form button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):hover) {
  background-color: #f82088 !important;
  border-color: #f2eaed !important;
  box-shadow:
    1px 1px 5px rgba(255, 255, 255, 0.9),
    -1px -1px 5px #fff,
    0 0 6.42111px rgba(247, 84, 163, 0.16) !important;
  color: var(--s-color-base-on-accent) !important;
}

:global([design-system-theme='dark'] .swap-form button.el-button.neumorphic.action-button.s-primary) {
  border-color: #693d81 !important;
  box-shadow:
    1px 1px 5px #391057,
    -1px -1px 5px #9b6fa5 !important;
  color: #391057 !important;
}

:global(
  [design-system-theme='dark']
    .swap-form
    button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):focus
),
:global(
  [design-system-theme='dark']
    .swap-form
    button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):hover
) {
  background-color: #f754a3 !important;
  border-color: #592d71 !important;
  box-shadow:
    1px 1px 5px #391057,
    -1px -1px 5px #9b6fa5 !important;
  color: #391057 !important;
}

.swap-details-info-line {
  :deep(.info-line) {
    min-width: 0;
  }

  :deep(.el-tooltip) {
    margin-right: 4px !important;
  }

  :deep(.info-line-content) {
    min-width: auto;
    max-width: none;
    gap: 4px;
  }

  :deep(.info-line-value) {
    max-width: none;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

i.action-button-icon[class*=' s-icon-'] {
  margin-right: $inner-spacing-mini;
  &,
  &:hover {
    color: inherit;
  }
}
</style>
