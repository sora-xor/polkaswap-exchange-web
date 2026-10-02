<template>
  <base-widget class="swap-widget" :title="t('exchange.Swap')" v-bind="$attrs">
    <template #filters>
      <slot name="header-actions" />
      <swap-status-action-badge>
        <template #label>{{ t('marketText') }}:</template>
        <template #value>{{ swapMarketAlgorithm }}</template>
        <template #action>
          <s-button
            class="el-button--settings"
            type="action"
            alternative
            icon="basic-settings-24"
            :aria-label="t('headerMenu.settings')"
            :title="t('headerMenu.settings')"
            @click="openSettingsDialog"
          ></s-button>
        </template>
      </swap-status-action-badge>
    </template>

    <div class="swap-form">
      <token-input
        data-test-name="swapFrom"
        :is-select-available="!fixedPair"
        :balance="getTokenBalance(tokenFrom)"
        :is-max-available="isMaxSwapAvailable"
        :title="t('transfers.from')"
        :aria-label="t('ux.swap.sellAmount', { symbol: tokenFrom?.symbol || '' })"
        :disabled="submitting"
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
        :disabled="fixedPair || !areTokensSelected || submitting"
        :aria-label="t('ux.swap.reverseTokens')"
        @click="handleSwitchTokens"
      ></s-button>

      <token-input
        data-test-name="swapTo"
        :is-select-available="!fixedPair"
        :balance="getTokenBalance(tokenTo)"
        :title="t('transfers.to')"
        :aria-label="t('ux.swap.receiveAmount', { symbol: tokenTo?.symbol || '' })"
        :disabled="submitting"
        :token="tokenTo"
        :model-value="toValue"
        @update:model-value="handleInputFieldTo"
        @focus="handleFocusField(true)"
        @select="openSelectTokenDialog(false)"
      ></token-input>

      <div class="swap-protection" data-test-name="swapProtection">
        <info-line
          :label="t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`)"
          :value="validTradeDetails ? minMaxFormatted : '—'"
          :asset-symbol="validTradeDetails ? protectionSymbol : ''"
          :is-formatted="validTradeDetails"
        />
        <info-line :label="t('swap.priceImpact')" :label-tooltip="t('swap.priceImpactTooltip')">
          <value-status-wrapper v-if="validTradeDetails" :value="priceImpact" class="price-difference__value">
            <formatted-amount :value="priceImpactFormatted">%</formatted-amount>
          </value-status-wrapper>
          <span v-else>—</span>
        </info-line>
      </div>
      <slippage-tolerance class="slippage-tolerance-settings"></slippage-tolerance>
      <div v-if="statusMessage" class="swap-form-status" data-test-name="swapStatus" role="status" aria-live="polite">
        <p>{{ statusMessage }}</p>
        <div class="swap-status-actions">
          <s-button v-if="!readiness.ready && readiness.retryable" size="small" :loading="retrying" @click="retryQuote">
            {{ t('ux.swap.retryQuote') }}
          </s-button>
          <s-button v-if="feeCanReduce" size="small" @click="handleMaxValue">{{ t('ux.swap.useMaximum') }}</s-button>
          <s-button v-if="showFeeRecovery" size="small" @click="showReceiveXor = true">{{
            t('ux.swap.receiveXor')
          }}</s-button>
        </div>
      </div>

      <s-button
        v-if="!isLoggedIn"
        type="primary"
        class="action-button s-typography-button--large"
        :loading="isSoraAccountDialogVisible"
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
        :loading="
          submitting || retrying || (!readiness.ready && readiness.reason === 'checking') || isSelectAssetLoading
        "
        @click="handleSwapClick"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="areZeroAmounts">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          <s-icon
            v-if="isErrorPriceImpactStatus"
            name="notifications-alert-triangle-24"
            size="18"
            class="action-button-icon"
          ></s-icon>
          {{ t('exchange.Swap') }}
        </template>
      </s-button>

      <h3 v-if="detailsAlwaysVisible" class="swap-details-title">{{ t('ux.swap.feesDetails') }}</h3>
      <swap-transaction-details
        :disabled="!validTradeDetails"
        :expanded="detailsAlwaysVisible"
        full
        inline
        class="swap-details"
        :class="{ 'swap-details--expanded': detailsAlwaysVisible }"
      >
        <template #reference
          ><span>{{ t('ux.swap.feesDetails') }}</span></template
        >
      </swap-transaction-details>
      <receive-xor-dialog v-model:visible="showReceiveXor" />

      <select-token
        v-model:visible="showSelectTokenDialog"
        :connected="isLoggedIn"
        :asset="isTokenFromSelected ? tokenTo : tokenFrom"
        @select="handleSelectToken"
      ></select-token>
      <swap-loss-warning-dialog
        v-model:visible="lossWarningVisibility"
        :value="priceImpactFormatted"
        @confirm="handleConfirm"
      ></swap-loss-warning-dialog>
      <swap-confirm
        v-model:visible="confirmDialogVisible"
        :review="review"
        :readiness="confirmationReadiness"
        :submitting="submitting"
        :status-message="confirmationMessage"
        :can-fund-fee="showFeeRecovery"
        @retry="retryQuote"
        @refresh="refreshReview"
        @fund-fee="showReceiveXor = true"
        @confirm="exchangeTokens"
      ></swap-confirm>
      <swap-settings v-model:visible="showSettings"></swap-settings>
    </div>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber, Operation, type CodecString, type NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTokenSelect } from '@/composables/useTokenSelect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { Breakpoint } from '@/consts/layout';
import { useSwapAmounts } from '@/features/swap/composables/useSwapAmounts';
import { useSwapStore } from '@/features/swap/stores/useSwapStore';
import { DexId } from '@/lib/substrate/sdk/dex/consts';
import { createAsyncComponent } from '@/shared/ui/async';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { AppError } from '@/util';
import { assessSwapFee, getSwapExecutionAmounts } from '../../services/feeAssessment';
import { isSwapPriceImpactAllowed } from '../../services/priceImpactLimit';
import {
  resolveSwapPathStatus,
  resolveSwapReadiness,
  type SwapPathStatus,
  type SwapQuoteStatus,
  type SwapReadiness,
} from '../../services/readiness';
import { swapReviewKey, type SwapReview } from '../../types/review';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
import { isDefiniteGetTsSwapRejection } from '@/features/misc/lib/getTsSwapDraft';
import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';
import { isSelectableAsset } from '@/components/shared/SelectAsset/utils';
import { asZeroValue, debouncedInputHandler, getMaxValue, hasInsufficientBalance, isMaxButtonAvailable } from '@/utils';
import { DifferenceStatus, getDifferenceStatus, getVisibleSwapTokenBalance } from '@/utils/swap';

import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { SwapQuoteData } from '@sora-substrate/sdk/build/swap/types';
import type { Subscription } from 'rxjs';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

const ReceiveXorDialog = createAsyncComponent(() => import('../ReceiveXorDialog.vue'));
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
    fixedPair?: boolean;
    maxPriceImpact?: string;
    compactDetails?: boolean;
    purchasePurpose?: GetTsPurpose;
  }>(),
  {
    parentLoading: false,
    fixedPair: false,
  }
);

/** A submission event carries only review context and an actual chain hash, never an inferred receipt. */
const emit = defineEmits<{
  submitted: [result: { expectedXor: string; transactionHash?: string }];
  preparing: [active: boolean];
}>();

const { t } = useTranslation();
const swapStore = useSwapStore();
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
/** Desktop keeps every fee and trade detail visible; smaller viewports retain the inline disclosure. */
const detailsAlwaysVisible = computed(() => !props.compactDetails && settingsStore.windowWidth > Breakpoint.Desktop);
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
const { isLoggedIn, isSoraAccountDialogVisible, connectSoraWallet } = useInternalConnect();
const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();
const { loading, withApi, withChainApi, withNotifications } = useTransaction({
  parentLoading: computed(() => props.parentLoading),
});
const { getFPNumberFromCodec, formatCodecNumber, formatStringValue } = useFormattedAmount();

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
const hasQuote = computed(() => Boolean(swapStore.swapQuote));
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
const pathStatus = ref<SwapPathStatus>('idle');
const quoteStatus = ref<SwapQuoteStatus>('idle');
const retrying = ref(false);
const submitting = ref(false);
const showReceiveXor = ref(false);
const review = ref<SwapReview | null>(null);
const submissionError = ref('');
const QUOTE_TIMEOUT_MS = 15_000;
let lifecycleGeneration = 0;
let calculationGeneration = 0;
let quoteTimer: ReturnType<typeof setTimeout> | undefined;
const pendingTimeouts = new Map<ReturnType<typeof setTimeout>, () => void>();
const isDisposed = ref(false);

const swapPathDexIds = [DexId.XOR, DexId.XSTUSD, DexId.KUSD, DexId.VXOR] as const;

const priceImpact = computed(() => swapStore.priceImpact);
const isPriceImpactAllowed = computed(() => {
  if (props.maxPriceImpact !== undefined && !/^[1-9]\d{0,77}$/.test(swapStore.amountWithoutImpact)) return false;
  return isSwapPriceImpactAllowed(priceImpact.value, props.maxPriceImpact);
});
const priceImpactFormatted = computed(() => formatStringValue(priceImpact.value ?? '0'));
const isErrorPriceImpactStatus = computed(
  () => getDifferenceStatus(Number(priceImpact.value) || 0) === DifferenceStatus.Error
);

const tokenFromSymbol = computed(() => tokenFrom.value?.symbol ?? '');
const isXorOutputSwap = computed(() => tokenTo.value?.address === XOR.address);
const preparedForSwap = computed(() => isLoggedIn.value && areTokensSelected.value);
const isMaxSwapAvailable = computed(() => {
  if (!preparedForSwap.value || !tokenFrom.value) return false;

  return isMaxButtonAvailable(tokenFrom.value, fromValue.value, networkFee.value, xor.value, isXorOutputSwap.value);
});

const hasQuoteError = computed(
  () =>
    swapStore.quoteError ||
    (isPathAvailable.value &&
      preparedForSwap.value &&
      !areZeroAmounts.value &&
      !quoteLoading.value &&
      !pathAvailabilityLoading.value &&
      !hasQuote.value)
);
const executionAmounts = computed(() =>
  getSwapExecutionAmounts({
    fromValue: fromValue.value,
    toValue: toValue.value,
    minMaxReceived: swapStore.minMaxReceived,
    isExchangeB: isExchangeB.value,
    fromDecimals: tokenFrom.value?.decimals ?? 18,
    toDecimals: tokenTo.value?.decimals ?? 18,
  })
);
const isInsufficientBalance = computed(() => {
  if (!tokenFrom.value) return false;
  return (
    preparedForSwap.value &&
    hasInsufficientBalance(tokenFrom.value, executionAmounts.value.inputAmount, networkFee.value)
  );
});
const feeAssessment = computed(() =>
  assessSwapFee({
    balanceCodec: xor.value?.balance?.transferable,
    feeCodec: networkFee.value,
    decimals: xor.value?.decimals,
    spendsXor: tokenFrom.value?.address === XOR.address,
    receivesXor: isXorOutputSwap.value,
    inputAmount: executionAmounts.value.inputAmount,
    outputAmount: executionAmounts.value.outputAmount,
  })
);
const readiness = computed(() =>
  resolveSwapReadiness({
    connected: nodeIsConnected.value,
    tokensSelected: areTokensSelected.value,
    path: pathStatus.value,
    quote: hasQuoteError.value ? 'error' : quoteStatus.value,
    hasAmount: !areZeroAmounts.value,
    hasOutput: !hasZeroAmount.value,
    loggedIn: isLoggedIn.value,
    insufficientToken: isInsufficientBalance.value,
    fee: feeAssessment.value.status,
  })
);
const isConfirmSwapDisabled = computed(
  () => !isLoggedIn.value || !readiness.value.ready || !isPriceImpactAllowed.value
);
const isSwapActionDisabled = computed(
  () => submitting.value || (areTokensSelected.value && isConfirmSwapDisabled.value)
);
const validTradeDetails = computed(() => quoteStatus.value === 'ready' && !hasQuoteError.value && !hasZeroAmount.value);
const protectionSymbol = computed(() => (isExchangeB.value ? tokenFrom.value : tokenTo.value)?.symbol || '');
const minMaxFormatted = computed(() =>
  formatCodecNumber(swapStore.minMaxReceived, (isExchangeB.value ? tokenFrom.value : tokenTo.value)?.decimals)
);
const showFeeRecovery = computed(() => !readiness.value.ready && readiness.value.reason === 'insufficientFee');
const feeCanReduce = computed(
  () =>
    showFeeRecovery.value &&
    feeAssessment.value.status === 'shortfall' &&
    feeAssessment.value.canReduceInput &&
    !walletStore.shouldBalanceBeHidden
);
const statusMessage = computed(() => {
  if (readiness.value.ready && !isPriceImpactAllowed.value && !areZeroAmounts.value)
    return /^[1-9]\d{0,77}$/.test(swapStore.amountWithoutImpact)
      ? t('getTs.swapImpactBlocked', { limit: props.maxPriceImpact })
      : t('ux.swap.status.quoteError');
  if (readiness.value.ready || ['selectTokens', 'enterAmount'].includes(readiness.value.reason)) return '';
  if (readiness.value.reason === 'insufficientToken')
    return t('insufficientBalanceText', { tokenSymbol: tokenFromSymbol.value });
  if (readiness.value.reason === 'insufficientFee' && feeAssessment.value.status === 'shortfall') {
    if (feeAssessment.value.paidFromOutput) return t('ux.swap.outputFeeShortfall');
    if (walletStore.shouldBalanceBeHidden) return t('ux.swap.feeShortfallHidden');
    return t('ux.swap.feeShortfall', {
      amount: formatCodecNumber(feeAssessment.value.shortfallCodec, xor.value?.decimals),
    });
  }
  return t(`ux.swap.status.${readiness.value.reason}`);
});
const confirmationReadiness = computed<SwapReadiness>(() => {
  if (!readiness.value.ready) return readiness.value;
  const current = captureReview();
  if (!review.value || !current || swapReviewKey(review.value) !== swapReviewKey(current)) {
    return { ready: false, reason: 'reviewChanged', retryable: false };
  }
  return readiness.value;
});
const confirmationMessage = computed(
  () =>
    submissionError.value ||
    (!confirmationReadiness.value.ready && confirmationReadiness.value.reason === 'reviewChanged'
      ? t('ux.swap.status.reviewChanged')
      : statusMessage.value)
);

const debouncedRecountSwapValues = debouncedInputHandler(async () => {
  await runRecountSwapValues();
}, 100);

/** Invalidates the displayed quote synchronously, before its debounced calculation starts. */
function recountSwapValues() {
  calculationGeneration += 1;
  if (swapStore.swapQuote) {
    quoteStatus.value = 'loading';
    swapStore.setQuoteError(false);
  }
  return debouncedRecountSwapValues();
}

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
  if (value === fromValue.value || submitting.value) return;
  swapStore.setExchangeB(false);

  if (!areTokensSelected.value || asZeroValue(value)) {
    resetFieldTo();
  }

  setFromValue(value);
  recountSwapValues();
}

async function handleInputFieldTo(value: string) {
  if (value === toValue.value || submitting.value) return;
  swapStore.setExchangeB(true);

  if (!areTokensSelected.value || asZeroValue(value)) {
    resetFieldFrom();
  }

  setToValue(value);
  recountSwapValues();
}

async function runRecountSwapValues() {
  if (isDisposed.value) return;
  const generation = lifecycleGeneration;
  const revision = ++calculationGeneration;
  const exchangeByOutput = isExchangeB.value;
  const source = liquiditySource.value;
  const value = isExchangeB.value ? toValue.value : fromValue.value;

  const quote = swapStore.swapQuote;

  if (!areTokensSelected.value || asZeroValue(value) || !quote) {
    if (quote) quoteStatus.value = 'ready';
    swapStore.setAmountWithoutImpact();
    swapStore.setLiquidityProviderFee();
    swapStore.setRewards();
    swapStore.setRoute();
    swapStore.setDistribution();
    swapStore.selectDexId();
    return;
  }

  quoteStatus.value = 'loading';
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

    if (
      generation !== lifecycleGeneration ||
      revision !== calculationGeneration ||
      exchangeByOutput !== isExchangeB.value ||
      source !== liquiditySource.value ||
      quote !== swapStore.swapQuote ||
      value !== (isExchangeB.value ? toValue.value : fromValue.value)
    )
      return;
    swapStore.setQuoteError(false);
    setOppositeValue(getFPNumberFromCodec(amount, oppositeToken.decimals).toString());
    swapStore.setAmountWithoutImpact(amountWithoutImpact as string);
    swapStore.setLiquidityProviderFee(fee as CodecString);
    swapStore.setRewards(rewards as Array<LPRewardsInfo>);
    swapStore.setRoute(route as string[]);
    swapStore.setDistribution(distribution as Distribution[][]);
    swapStore.selectDexId(dexId as DexId);
    quoteStatus.value = 'ready';
  } catch (error) {
    if (
      generation !== lifecycleGeneration ||
      revision !== calculationGeneration ||
      exchangeByOutput !== isExchangeB.value ||
      source !== liquiditySource.value
    )
      return;
    console.error(error);
    quoteStatus.value = 'error';
    swapStore.setQuoteError(true);
    resetOppositeValue();
  }
}

/** Releases quote resources and invalidates all work from the previous pair or retry. */
function resetQuoteSubscription() {
  lifecycleGeneration += 1;
  calculationGeneration += 1;
  debouncedRecountSwapValues.cancel?.();
  quoteSubscription.value?.unsubscribe();
  quoteSubscription.value = null;
  clearTimeout(quoteTimer);
  quoteTimer = undefined;
  for (const cancel of pendingTimeouts.values()) cancel();
  pendingTimeouts.clear();
}

/** Bounds metadata and route requests even when their underlying RPC promise never settles. */
function withQuoteTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingTimeouts.delete(timer);
      reject(new Error('Quote request timed out'));
    }, QUOTE_TIMEOUT_MS);
    const cancel = () => {
      clearTimeout(timer);
      reject(new Error('Quote request superseded'));
    };
    pendingTimeouts.set(timer, cancel);
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      pendingTimeouts.delete(timer);
    });
  });
}

function getSwapPathDexIds(): DexId[] {
  const publicDexIds = api.dex?.publicDexes?.map(({ dexId }) => dexId as DexId) ?? [];
  return [...new Set([...publicDexIds, ...swapPathDexIds])];
}

/** Distinguishes verified absence of a route from incomplete RPC evidence. */
async function updateSwapPathAvailability() {
  const requestId = ++pathAvailabilityRequestId.value;
  const generation = lifecycleGeneration;
  if (!areTokensSelected.value || !nodeIsConnected.value) {
    pathAvailabilityLoading.value = false;
    pathStatus.value = 'idle';
    swapStore.setPathAvailability(false);
    return;
  }
  const fromAddress = tokenFrom.value!.address;
  const toAddress = tokenTo.value!.address;
  pathAvailabilityLoading.value = true;
  pathStatus.value = 'loading';
  try {
    const results = await Promise.allSettled(
      getSwapPathDexIds().map((dexId) =>
        withQuoteTimeout(Promise.resolve().then(() => api.swap.checkSwap(fromAddress, toAddress, dexId)))
      )
    );
    if (generation !== lifecycleGeneration || requestId !== pathAvailabilityRequestId.value || isDisposed.value) return;
    pathStatus.value = resolveSwapPathStatus(results);
    swapStore.setPathAvailability(pathStatus.value === 'available');
  } finally {
    if (generation === lifecycleGeneration && requestId === pathAvailabilityRequestId.value)
      pathAvailabilityLoading.value = false;
  }
}

async function refreshSwapQuotesConfiguration() {
  const generation = lifecycleGeneration;
  const results = await Promise.allSettled([withQuoteTimeout(api.dex.update()), withQuoteTimeout(api.swap.update())]);
  if (generation !== lifecycleGeneration || isDisposed.value) return;
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

  if (failures.length) {
    console.warn(
      '[swap] quote configuration refresh partially failed',
      failures.map(({ reason }) => reason)
    );
  }
}

async function subscribeOnQuote() {
  resetQuoteSubscription();
  const generation = lifecycleGeneration;

  if (!areTokensSelected.value || !nodeIsConnected.value) {
    quoteLoading.value = false;
    quoteStatus.value = 'idle';
    pathStatus.value = 'idle';
    swapStore.setQuoteError(false);
    swapStore.setSubscriptionPayload();
    swapStore.setPathAvailability(false);
    await runRecountSwapValues();
    return;
  }

  quoteLoading.value = true;
  quoteStatus.value = 'loading';
  pathStatus.value = 'loading';
  swapStore.setSubscriptionPayload();
  swapStore.setQuoteError(false);
  swapStore.setPathAvailability(false);
  if (!areZeroAmounts.value) {
    if (isExchangeB.value) {
      resetFieldFrom();
    } else {
      resetFieldTo();
    }
  }
  await runRecountSwapValues();
  if (generation !== lifecycleGeneration || isDisposed.value) return;
  void updateSwapPathAvailability();

  let quoteTerminated = false;
  const failQuote = () => {
    if (generation !== lifecycleGeneration || isDisposed.value) return;
    quoteTerminated = true;
    clearTimeout(quoteTimer);
    quoteStatus.value = 'error';
    quoteLoading.value = false;
    const currentPath = swapStore.isPathAvailable;
    swapStore.setSubscriptionPayload();
    swapStore.setPathAvailability(currentPath);
    swapStore.setQuoteError(true);
    if (isExchangeB.value) resetFieldFrom();
    else resetFieldTo();
  };
  try {
    const observableQuote = api.swap.getDexesSwapQuoteObservable(tokenFrom.value!.address, tokenTo.value!.address);
    if (!observableQuote) {
      failQuote();
      return;
    }
    let hasQuoteEmission = false;
    quoteTimer = setTimeout(() => {
      failQuote();
      quoteSubscription.value?.unsubscribe();
    }, QUOTE_TIMEOUT_MS);
    quoteSubscription.value = observableQuote.subscribe({
      next: (quoteData: SwapQuoteData) => {
        if (quoteTerminated || generation !== lifecycleGeneration || isDisposed.value) return;
        hasQuoteEmission = true;
        clearTimeout(quoteTimer);
        const { quote, isAvailable, liquiditySources } = quoteData;
        swapStore.setSubscriptionPayload({ quote, isAvailable, liquiditySources });
        quoteStatus.value = quote ? 'loading' : 'error';
        swapStore.setQuoteError(!quote);
        quoteLoading.value = false;
        recountSwapValues();
      },
      error: failQuote,
      complete: () => {
        if (generation !== lifecycleGeneration || isDisposed.value) return;
        if (!hasQuoteEmission) failQuote();
        quoteLoading.value = false;
      },
    });
  } catch {
    failQuote();
  }
}

async function enableSwapSubscriptions(withApiRefresh = false) {
  resetQuoteSubscription();
  const generation = lifecycleGeneration;
  if (withApiRefresh) await refreshSwapQuotesConfiguration();
  if (generation !== lifecycleGeneration || isDisposed.value || !nodeIsConnected.value) return;
  swapStore.updateSubscriptions();
  await subscribeOnQuote();
}

/** Retries read-only quote discovery while preserving the user's edited side and pair. */
async function retryQuote(): Promise<void> {
  if (retrying.value || submitting.value || !nodeIsConnected.value) return;
  retrying.value = true;
  submissionError.value = '';
  quoteStatus.value = 'loading';
  pathStatus.value = 'loading';
  try {
    await enableSwapSubscriptions(true);
  } finally {
    retrying.value = false;
  }
}

function resetSwapSubscriptions() {
  pathAvailabilityRequestId.value += 1;
  pathAvailabilityLoading.value = false;
  swapStore.resetSubscriptions();
  resetQuoteSubscription();
  quoteLoading.value = false;
  quoteStatus.value = 'idle';
  pathStatus.value = 'idle';
  swapStore.setQuoteError(false);
  swapStore.setSubscriptionPayload();
  void runRecountSwapValues();
}

function openSelectTokenDialog(isFrom: boolean) {
  if (submitting.value || props.fixedPair) return;
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
  if (props.fixedPair || !isSelectableAsset(token)) return;

  await withSelectAssetLoading(async () => {
    if (isTokenFromSelected.value) {
      await setTokenFromAddress(token.address);
    } else {
      await setTokenToAddress(token.address);
    }
  });
}

function handleSwapClick() {
  if (!isPriceImpactAllowed.value) return;
  if (!areTokensSelected.value) {
    openMissingTokenDialog();
    return;
  }

  if (isErrorPriceImpactStatus.value && allowLossPopup.value) {
    lossWarningVisibility.value = true;
  } else {
    handleConfirm();
  }
}

/** Captures terms and signing identity so later reactive changes cannot alter the reviewed trade. */
function captureReview(): SwapReview | null {
  if (!tokenFrom.value || !tokenTo.value) return null;
  let network = '';
  try {
    network = api.api.genesisHash.toString();
  } catch {
    /* Unavailable identity blocks submission below. */
  }
  return {
    tokenFrom: { ...tokenFrom.value },
    tokenTo: { ...tokenTo.value },
    fromValue: fromValue.value,
    toValue: toValue.value,
    isExchangeB: isExchangeB.value,
    slippage: slippageToleranceValue.value,
    liquiditySource: liquiditySource.value,
    dexId: selectedDexId.value,
    minMaxReceived: swapStore.minMaxReceived,
    networkFee: networkFee.value,
    liquidityProviderFee: swapStore.liquidityProviderFee,
    priceImpact: priceImpact.value,
    price: swapStore.price,
    priceReversed: swapStore.priceReversed,
    route: [...swapStore.route],
    rewards: [...swapStore.rewards],
    account: walletStore.address || '',
    network,
  };
}

/** Explicitly accepts the current quote into review after the prior terms became stale. */
function refreshReview(): void {
  if (!readiness.value.ready || submitting.value || !isPriceImpactAllowed.value) return;
  review.value = captureReview();
  submissionError.value = '';
}

function handleConfirm() {
  if (isConfirmSwapDisabled.value || submitting.value) return;
  refreshReview();
  void confirmOrExecute(exchangeTokens);
}

/** Keeps review open on rejection and rechecks every guard after asynchronous wallet preparation. */
async function exchangeTokens(): Promise<void> {
  if (submitting.value) return;
  if (!review.value || isConfirmSwapDisabled.value || !confirmationReadiness.value.ready) {
    submissionError.value = statusMessage.value || t('ux.swap.status.reviewChanged');
    return;
  }
  const captured = review.value;
  if (!captured.account || !captured.network) {
    submissionError.value = t('ux.swap.accountUnavailable');
    return;
  }
  submitting.value = true;
  submissionError.value = '';
  const purchase = props.purchasePurpose ? useGetTsPlan(props.purchasePurpose) : null;
  let historyId: string | undefined;
  emit('preparing', true);
  try {
    const result = await withNotifications(async () => {
      const current = captureReview();
      if (
        isDisposed.value ||
        isConfirmSwapDisabled.value ||
        !current ||
        swapReviewKey(current) !== swapReviewKey(captured)
      ) {
        throw new AppError({ key: 'ux.swap.status.reviewChanged' });
      }
      if (purchase) {
        historyId = `purchase-swap:${props.purchasePurpose}:${globalThis.crypto.randomUUID()}`;
        if (
          !purchase.rememberSwapDraft(
            {
              id: historyId,
              type: Operation.Swap,
              from: captured.account,
              assetAddress: captured.tokenFrom.address,
              asset2Address: captured.tokenTo.address,
              amount: captured.fromValue,
            },
            captured.network
          )
        )
          throw new AppError({ key: 'ux.swap.submissionFailed' });
      }
      const swapArguments: Parameters<typeof api.swap.execute> = [
        captured.tokenFrom,
        captured.tokenTo,
        captured.fromValue,
        captured.toValue,
        captured.slippage,
        captured.isExchangeB,
        captured.liquiditySource as LiquiditySourceTypes,
        captured.dexId,
      ];
      if (historyId) swapArguments.push(historyId);
      await api.swap.execute(...swapArguments);
    });
    const exactHistory = historyId ? api.getHistory(historyId) : null;
    if (purchase && exactHistory) purchase.trackSwapSubmission(exactHistory, captured.account, captured.network);
    if (result.submitted) {
      const history = purchase ? exactHistory : result.transaction;
      const hash = purchase ? history?.txId : history?.txId || history?.id;
      const expectedXor = new FPNumber(captured.toValue)
        .mul(FPNumber.ONE.sub(new FPNumber(captured.slippage).div(new FPNumber('100'))))
        .toString();
      emit('submitted', {
        expectedXor,
        ...(typeof hash === 'string' && /^0x[0-9a-f]{64}$/i.test(hash) ? { transactionHash: hash } : {}),
      });
      confirmDialogVisible.value = false;
      resetFieldFrom();
      resetFieldTo();
      swapStore.setExchangeB(false);
      review.value = null;
    } else {
      if (purchase && historyId && !exactHistory && isDefiniteGetTsSwapRejection(result.error))
        purchase.abandonSwapDraft(historyId);
      submissionError.value = confirmationReadiness.value.ready ? t('ux.swap.submissionFailed') : '';
    }
  } catch {
    submissionError.value = t('ux.swap.submissionFailed');
  } finally {
    submitting.value = false;
    emit('preparing', false);
  }
}

/** Focusing an empty field never discards a draft or changes the amount being quoted. */
function handleFocusField(exchangeB = false) {
  if (submitting.value || (exchangeB ? isZeroToAmount.value : isZeroFromAmount.value)) return;
  const previous = isExchangeB.value;
  swapStore.setExchangeB(exchangeB);
  if (previous !== exchangeB) recountSwapValues();
}

async function handleSwitchTokens() {
  if (props.fixedPair) return;
  if (!areTokensSelected.value || submitting.value) return;

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

// SDK balance streams capture an account at creation, so a direct account switch must recreate them.
watch([isLoggedIn, () => walletStore.address], ([loggedIn]) => {
  if (!nodeIsConnected.value) return;

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
  isDisposed.value = true;
  resetSwapSubscriptions();
  swapStore.reset();
});
</script>

<style lang="scss" scoped>
.swap-widget {
  container: swap-form-widget / inline-size;

  @include buttons;
  @include full-width-button('action-button');
  @include full-width-button('swap-details', 0);
  @include vertical-divider('el-button--switch-tokens', $inner-spacing-medium);

  :deep(.base-widget-header) {
    flex-wrap: nowrap;
    gap: 8px;
  }

  :deep(.base-widget-title) {
    min-width: 0;
  }

  :deep(.base-widget-filters) {
    gap: 4px;
    flex-shrink: 0;
  }

  :deep(.status-action-badge.s-card) {
    height: 44px;
    min-height: 44px;
    box-shadow: none;
    background: transparent;
  }

  :deep(.status-action-badge__action) {
    background: transparent;
  }

  :deep(button.el-button.neumorphic.s-action.el-button--settings:not(.s-primary)) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    min-width: 44px;
    height: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;

    .s-button__icon {
      line-height: 18px;
    }

    .s-icon,
    [class*='s-icon-'] {
      font-size: 18px;
      line-height: 18px;
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

  .swap-details-title {
    align-self: center;
    margin: $inner-spacing-medium 0 $inner-spacing-small;
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 400;
    text-transform: uppercase;
  }

  // `swap-details` is rendered inside a nested child slot tree, so scoped
  // selectors from this component do not reach it without `:deep`.
  :deep(.swap-details) {
    margin-top: 0;
    width: 100%;
  }

  :deep(.swap-details--expanded) {
    @include popper-content;
    box-sizing: border-box;
    border: 0;
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
      color: var(--s-color-action-text);
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
  align-items: stretch;
  flex-direction: column;
  gap: $inner-spacing-mini;
  margin: $inner-spacing-small 0 0;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-big);

  &--error {
    color: var(--s-color-status-error-text);
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

:global(.swap-form button.el-button.neumorphic.action-button.s-primary:not(:disabled):not(.is-disabled)) {
  border-color: #ede4e7 !important;
  box-shadow:
    1px 1px 5px #fff,
    -1px -1px 5px #fff !important;
  color: var(--s-color-on-action) !important;
}

:global(.swap-form button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):focus),
:global(.swap-form button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):hover) {
  background-color: var(--s-color-action-fill-hover) !important;
  border-color: #f2eaed !important;
  box-shadow:
    1px 1px 5px rgba(255, 255, 255, 0.9),
    -1px -1px 5px #fff,
    0 0 6.42111px rgba(247, 84, 163, 0.16) !important;
  color: var(--s-color-on-action) !important;
}

:global(
  [design-system-theme='dark']
    .swap-form
    button.el-button.neumorphic.action-button.s-primary:not(:disabled):not(.is-disabled)
) {
  border-color: #693d81 !important;
  box-shadow:
    1px 1px 5px #391057,
    -1px -1px 5px #9b6fa5 !important;
  color: var(--s-color-on-action) !important;
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
  color: var(--s-color-on-action) !important;
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

<style lang="scss" scoped>
.swap-protection {
  width: 100%;
  display: grid;
  gap: 8px;
  margin-top: 16px;
}
.swap-form-status {
  font-size: 14px;
  line-height: 1.5;
  color: var(--s-color-base-content-secondary);
}
.swap-form-status p {
  margin: 0;
}
.swap-status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* Dashboard widgets can be narrow even on desktop; adapt to their available space. */
@container swap-form-widget (max-width: 480px) {
  .swap-widget {
    :deep(.base-widget-header) {
      gap: 4px;
    }
    :deep(.base-widget-title) {
      min-width: 0;
      font-size: 20px;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    :deep(.status-action-badge.s-card) {
      width: 44px;
      max-width: 44px;
      padding: 0 !important;
    }
    :deep(.status-action-badge__label),
    :deep(.status-action-badge__value) {
      display: none;
    }
    :deep(.status-action-badge__action) {
      inset-inline-end: 0;
    }
    button.el-button.action-button.s-typography-button--large {
      min-height: 44px;
      height: auto;
      font-size: 16px !important;
      line-height: 1.4 !important;
      padding-block: 10px;

      :deep(.s-button__text) {
        font-size: 16px !important;
        line-height: 1.4 !important;
      }
    }
  }
}
</style>
