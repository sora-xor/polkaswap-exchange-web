<template>
  <aside class="trade-ticket">
    <header class="trade-ticket__header">
      <h2>{{ t('polkamarkt.ticket.title') }}</h2>
      <p v-if="!market">{{ t('polkamarkt.ticket.selectMarket') }}</p>
      <p v-else>{{ t('polkamarkt.ticket.dpmSubtitle') }}</p>
    </header>

    <div class="trade-ticket__tabs" role="group" :aria-label="t('polkamarkt.ticket.title')">
      <button
        v-for="item in modes"
        :key="item"
        type="button"
        :aria-pressed="mode === item"
        :class="{ active: mode === item }"
        @click="mode = item"
      >
        {{ modeLabel(item) }}
      </button>
    </div>

    <template v-if="market">
      <div v-if="isTradeMode || isReportMode" class="trade-ticket__outcomes">
        <button
          type="button"
          :aria-pressed="outcome === 'YES'"
          :class="{ active: outcome === 'YES' }"
          data-testid="trade-ticket-outcome-yes"
          @click="outcome = 'YES'"
        >
          <strong>{{ t('polkamarkt.outcomes.yes') }}</strong>
          <span>{{ yesPriceFormatted }}</span>
          <small v-if="yesProbabilityFormatted !== '-'">
            {{ t('polkamarkt.ticket.impliedProbabilityShort', { value: yesProbabilityFormatted }) }}
          </small>
        </button>
        <button
          type="button"
          :aria-pressed="outcome === 'NO'"
          :class="{ active: outcome === 'NO' }"
          data-testid="trade-ticket-outcome-no"
          @click="outcome = 'NO'"
        >
          <strong>{{ t('polkamarkt.outcomes.no') }}</strong>
          <span>{{ noPriceFormatted }}</span>
          <small v-if="noProbabilityFormatted !== '-'">
            {{ t('polkamarkt.ticket.impliedProbabilityShort', { value: noProbabilityFormatted }) }}
          </small>
        </button>
      </div>

      <div v-if="isTradeMode" class="trade-ticket__form">
        <label v-if="mode === 'buy'" class="trade-field">
          <span>{{ t('polkamarkt.ticket.collateralIn', { symbol: collateralSymbol }) }}</span>
          <input
            v-model="collateralAmount"
            class="polkamarkt-input"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="t('polkamarkt.ticket.amountPlaceholder')"
          />
        </label>
        <label v-else class="trade-field">
          <span>{{ t('polkamarkt.ticket.sharesToSell') }}</span>
          <input
            v-model="shares"
            class="polkamarkt-input"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="t('polkamarkt.ticket.amountPlaceholder')"
          />
        </label>
        <details class="trade-ticket__settings" data-testid="trade-settings">
          <summary>{{ t('polkamarkt.ticket.settings') }}</summary>
          <label class="trade-field">
            <span>{{ t('polkamarkt.ticket.slippage') }}</span>
            <input
              v-model="slippage"
              class="polkamarkt-input"
              inputmode="decimal"
              autocomplete="off"
              :aria-invalid="!isSlippageValid"
            />
          </label>
        </details>
      </div>

      <div v-if="isReportMode" class="trade-ticket__form">
        <label class="trade-field">
          <span>{{ t('polkamarkt.ticket.evidenceUri') }}</span>
          <input
            v-model="reportEvidenceUri"
            class="polkamarkt-input"
            autocomplete="off"
            placeholder="https://..."
            data-testid="early-report-evidence-uri"
          />
        </label>
        <label class="trade-field">
          <span>{{ t('polkamarkt.ticket.evidenceHash') }}</span>
          <input
            v-model="reportEvidenceHash"
            class="polkamarkt-input"
            autocomplete="off"
            placeholder="0x..."
            data-testid="early-report-evidence-hash"
          />
        </label>
      </div>

      <div class="trade-ticket__quote">
        <div class="trade-ticket__quote-primary">
          <span>{{ quotePrimaryLabel }}</span>
          <strong>{{ quotePrimaryValue }}</strong>
        </div>
        <div v-if="isTradeMode">
          <span>{{ t('polkamarkt.ticket.takerFee') }}</span>
          <strong>{{ takerFeeFormatted }}</strong>
        </div>
        <div>
          <span>
            {{ t('networkFeeText') }}
            <template v-if="mode === 'claim'"> · {{ t('polkamarkt.actions.claimTraderPayout') }}</template>
          </span>
          <strong>{{ networkFeeFormatted }}</strong>
        </div>
        <div v-if="mode === 'claim' && isPositiveCodec(claimable?.creatorFees)">
          <span>{{ t('networkFeeText') }} · {{ t('polkamarkt.actions.claimCreatorFees') }}</span>
          <strong>{{ creatorClaimNetworkFeeFormatted }}</strong>
        </div>
        <div v-if="mode === 'claim'">
          <span>{{ t('polkamarkt.ticket.claimable') }}</span>
          <strong
            >{{ formatCodec(claimable?.claimablePayout ?? claimable?.traderPayout) }} {{ collateralSymbol }}</strong
          >
        </div>
      </div>

      <div
        v-if="receipt"
        :class="['trade-ticket__receipt', `trade-ticket__receipt--${receipt.status}`]"
        data-testid="polkamarkt-ticket-receipt"
      >
        <span>{{ receiptStatusLabel }}</span>
        <strong>{{ receiptSummary }}</strong>
        <p>{{ receiptHint }}</p>
        <small v-if="receipt.transactionId">
          {{ t('polkamarkt.ticket.transactionId', { id: receipt.transactionId }) }}
        </small>
      </div>

      <p v-if="error" class="trade-ticket__error">{{ error }}</p>
      <p v-else-if="quoteLoading" class="trade-ticket__hint">{{ t('polkamarkt.ticket.refreshingQuote') }}</p>

      <template v-if="mode === 'claim'">
        <div class="trade-ticket__claim-grid">
          <div>
            <s-button
              type="primary"
              :disabled="!canClaimTrader || isLoading"
              :loading="isLoading"
              @click="submitClaim('market')"
            >
              {{ t('polkamarkt.actions.claimTraderPayout') }}
            </s-button>
            <p
              v-if="isPositiveCodec(claimable?.claimablePayout ?? claimable?.traderPayout) && networkFeeReason"
              class="trade-ticket__hint"
            >
              {{ networkFeeReason }}
            </p>
          </div>
          <div>
            <s-button
              type="secondary"
              :disabled="!canClaimCreatorFees || isLoading"
              :loading="isLoading"
              @click="submitClaim('fees')"
            >
              {{ t('polkamarkt.actions.claimCreatorFees') }}
            </s-button>
            <p
              v-if="isPositiveCodec(claimable?.creatorFees) && creatorClaimNetworkFeeReason"
              class="trade-ticket__hint"
            >
              {{ creatorClaimNetworkFeeReason }}
            </p>
          </div>
        </div>
      </template>

      <s-button
        v-else
        type="primary"
        class="trade-ticket__submit"
        :disabled="submitDisabled"
        :loading="isLoading"
        :data-testid="isReportMode ? 'early-report-submit' : undefined"
        @click="submit"
      >
        {{ submitLabel }}
      </s-button>

      <div v-if="isDpm" class="trade-ticket__curve-helper" data-testid="pricing-curve-ticket-helper">
        <pricing-curve-position-chart :market="market" compact />
        <details class="trade-ticket__curve-panel">
          <summary>{{ t('polkamarkt.curve.howPricesMove') }}</summary>
          <section class="trade-ticket__curve-explainer">
            <ol>
              <li v-for="(step, index) in pricingCurveSteps" :key="step">
                <span>{{ index + 1 }}</span>
                <p>{{ step }}</p>
              </li>
            </ol>
          </section>
        </details>
      </div>

      <details class="trade-ticket__holdings" :open="mode === 'sell' || mode === 'claim'">
        <summary>{{ t('polkamarkt.ticket.yourShares') }}</summary>
        <div class="trade-ticket__balances">
          <div>
            <span>{{ t('polkamarkt.ticket.walletYes') }}</span>
            <strong>{{ yesSharesDisplay }}</strong>
          </div>
          <div>
            <span>{{ t('polkamarkt.ticket.walletNo') }}</span>
            <strong>{{ noSharesDisplay }}</strong>
          </div>
          <p v-if="shareBalanceStatus" class="trade-ticket__balance-status">{{ shareBalanceStatus }}</p>
          <p v-if="indexedPositionSummary" class="trade-ticket__balance-status trade-ticket__balance-status--secondary">
            {{ indexedPositionSummary }}
          </p>
        </div>
      </details>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useNotification } from '@/composables/useNotification';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { api } from '@/lib/soraneo-wallet/src/api';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import { Operation, TransactionStatus } from '@/lib/substrate/sdk/types';
import { useWalletStore } from '@/stores/wallet';
import {
  applySlippageMinimum,
  formatPolkamarktCodec,
  isPositiveCodec,
  isValidPolkamarktSlippage,
  parsePolkamarktAmount,
} from '../lib/amounts';
import {
  getMarketDisplayStatus,
  isClaimableMarketStatus,
  isFinalizedMarket,
  yesNoPricesFromProbability,
} from '../lib/markets';
import { isDpmMarket } from '../lib/pricingCurve';
import PricingCurvePositionChart from './PricingCurvePositionChart.vue';

import type { CodecString } from '@sora-substrate/sdk';
import type { AccountPosition, PolkamarktMarket, TicketOutcome, TradeMode } from '../types';
import type { BuyQuote, ClaimableInfo, PolkamarktOutcome, SellQuote } from '@/lib/substrate/sdk/polkamarkt';
import type { HistoryItem } from '@/lib/substrate/sdk/types';

const props = defineProps<{
  market?: PolkamarktMarket;
  accountPosition?: AccountPosition;
  currentBlock?: number;
}>();

const emit = defineEmits<{
  (event: 'submitted'): void;
}>();

const { t } = useTranslation();
const walletStore = useWalletStore();
const { isLoggedIn, soraAddress, connectSoraWallet } = useInternalConnect();
const { loading, withNotifications } = useTransaction();
const { getErrorMessage } = useNotification();

type MaybeValue<T> = T | { value: T };
type TicketReceiptStatus = 'submitting' | 'submitted' | 'confirmed' | 'failed';
type TicketReceiptAction = TradeMode | 'claimMarket' | 'claimCreatorFees';
type TicketReceipt = {
  status: TicketReceiptStatus;
  action: TicketReceiptAction;
  outcome?: TicketOutcome;
  amount?: string;
  amountSymbol?: string;
  output?: string;
  outputSymbol?: string;
  submittedAt?: number;
  historyId?: string;
  transactionId?: string;
  error?: string;
};

const ZERO_CODEC = '0';
const EMPTY_ESTIMATE = '—';
const EARLY_REPORT_BOND_CODEC = parsePolkamarktAmount('100');
const dpmBaseModes: TradeMode[] = ['buy', 'sell', 'report'];
const mode = ref<TradeMode>('buy');
const outcome = ref<TicketOutcome>('YES');
const shares = ref('');
const collateralAmount = ref('');
const slippage = ref('0.5');
const reportEvidenceUri = ref('');
const reportEvidenceHash = ref('');
const quoteLoading = ref(false);
const error = ref('');
const dpmQuote = ref<BuyQuote | SellQuote | null>(null);
const dpmQuoteKey = ref<string | null>(null);
const claimable = ref<ClaimableInfo | null>(null);
const claimableLoading = ref(false);
const claimableError = ref('');
const networkFee = ref<CodecString | null>(null);
const creatorClaimNetworkFee = ref<CodecString | null>(null);
const receipt = ref<TicketReceipt | null>(null);

const isConnectedSource = isLoggedIn as unknown as MaybeValue<boolean>;
const accountAddressSource = soraAddress as unknown as MaybeValue<string | undefined>;
const isConnected = computed(() =>
  Boolean(typeof isConnectedSource === 'object' ? isConnectedSource.value : isConnectedSource)
);
const isLoading = computed(() => Boolean(typeof loading === 'object' ? loading.value : loading));
const accountAddress = computed(() =>
  String(typeof accountAddressSource === 'object' ? (accountAddressSource.value ?? '') : (accountAddressSource ?? ''))
);
const soraNetwork = computed(() => walletStore.soraNetwork);
const receiptTransaction = computed<HistoryItem | undefined>(() => {
  const history = (walletStore.history ?? {}) as Record<string, HistoryItem>;
  const currentReceipt = receipt.value;
  const historyId = currentReceipt?.historyId;
  if (historyId) return history[historyId];

  const submittedAt = currentReceipt?.submittedAt;
  if (!currentReceipt || !submittedAt || currentReceipt.status !== 'submitted') return undefined;

  return Object.values(history)
    .filter(
      (transaction) =>
        Number(transaction?.startTime ?? 0) > submittedAt &&
        isMatchingPolkamarktReceiptTransaction(transaction, currentReceipt)
    )
    .sort((left, right) => Number(left.startTime ?? 0) - Number(right.startTime ?? 0))[0];
});
const collateralSymbol = KUSD.symbol;
const marketId = computed(() => props.market?.chainId);
const runtimeOutcome = computed<PolkamarktOutcome>(() => (outcome.value === 'YES' ? 'Yes' : 'No'));
const isTradeMode = computed(() => mode.value === 'buy' || mode.value === 'sell');
const isReportMode = computed(() => mode.value === 'report');
const isDpm = computed(() => isDpmMarket(props.market));
const prices = computed(() => yesNoPricesFromProbability(props.market?.probability));
const marketStatus = computed(() => {
  const status = getMarketDisplayStatus(props.market, props.currentBlock);
  if (status?.toLowerCase() === 'closed') return t('polkamarkt.status.closed');
  if (status?.toLowerCase() === 'early report locked') return t('polkamarkt.status.earlyReportLocked');
  return status || t('polkamarkt.status.active');
});
const yesPriceFormatted = computed(() =>
  formatOutcomePrice(dpmSharePrice(props.market?.marginalYesPriceBps) ?? prices.value.yes)
);
const noPriceFormatted = computed(() =>
  formatOutcomePrice(dpmSharePrice(props.market?.marginalNoPriceBps) ?? prices.value.no)
);
const yesProbabilityFormatted = computed(() => formatProbabilityBps(props.market?.impliedYesProbabilityBps));
const noProbabilityFormatted = computed(() => formatProbabilityBps(props.market?.impliedNoProbabilityBps));
const accountKusd = computed(() => walletStore.accountAssetsAddressTable?.[KUSD.address]);
const accountXor = computed(() => walletStore.accountAssetsAddressTable?.[XOR.address]);
const sharesCodec = computed(() => parseAmount(shares.value));
const collateralCodec = computed(() => parseAmount(collateralAmount.value));
const dpmInputCodec = computed(() => (mode.value === 'buy' ? collateralCodec.value : sharesCodec.value));
const isSlippageValid = computed(() => isValidPolkamarktSlippage(slippage.value));
const hasPendingEarlyReport = computed(() => Boolean(props.market?.earlyResolutionOutcome));
const reportEvidence = computed(() => ({
  uri: reportEvidenceUri.value.trim(),
  hash: reportEvidenceHash.value.trim() || undefined,
}));
const isReportHashValid = computed(() => {
  const hash = reportEvidenceHash.value.trim();
  return !hash || /^(0x)?[0-9a-fA-F]{64}$/.test(hash);
});
const isClaimModeAvailable = computed(
  () =>
    isClaimableMarketStatus(props.market?.status) ||
    isClaimableMarketStatus(props.accountPosition?.status) ||
    isClaimableMarketStatus(claimable.value?.status)
);
const modes = computed<TradeMode[]>(() => (isClaimModeAvailable.value ? ['claim'] : [...dpmBaseModes]));
const isTradingFinalized = computed(() =>
  props.market ? isFinalizedMarket(props.market, props.currentBlock) && !isClaimModeAvailable.value : false
);
const selectedShares = computed(
  () => (outcome.value === 'YES' ? claimable.value?.yesShares : claimable.value?.noShares) ?? '0'
);
const yesSharesDisplay = computed(() => formatShareBalance(claimable.value?.yesShares));
const noSharesDisplay = computed(() => formatShareBalance(claimable.value?.noShares));
const shareBalanceStatus = computed(() => {
  if (!isConnected.value) return t('polkamarkt.ticket.connectForBalances');
  if (claimableLoading.value) return t('polkamarkt.ticket.refreshingBalances');
  if (claimableError.value) return claimableError.value;
  if (!claimable.value) return t('polkamarkt.ticket.balanceUnavailable');
  return '';
});
const indexedPositionSummary = computed(() => {
  const position = props.accountPosition;
  if (!position) return '';

  return t('polkamarkt.ticket.indexedPosition', {
    yes: formatIndexedShareAmount(position.yesShares ?? 0),
    no: formatIndexedShareAmount(position.noShares ?? 0),
  });
});
const buyEscrow = computed(() => collateralCodec.value);
const requiredKusd = computed(() => {
  if (mode.value === 'buy') return buyEscrow.value;
  if (isReportMode.value) return EARLY_REPORT_BOND_CODEC;
  return ZERO_CODEC;
});
const hasEnoughKusd = computed(() => {
  const needed = requiredKusd.value;
  if (BigInt(needed || '0') <= 0n) return true;
  const balance = accountKusd.value?.balance?.transferable ?? '0';
  return BigInt(balance) >= BigInt(needed || '0');
});
const hasEnoughShares = computed(() => {
  if (mode.value !== 'sell') return true;
  const available = selectedShares.value;
  return BigInt(available || '0') >= BigInt(sharesCodec.value || '0');
});
/** Distinguishes an unavailable estimate from an exact, known XOR shortfall. */
function getNetworkFeeReason(fee: CodecString | null): string {
  if (!isPositiveCodec(fee)) return unavailableValue(t('networkFeeText'));
  try {
    const balance = BigInt(accountXor.value?.balance?.transferable ?? '0');
    return balance >= BigInt(fee!) ? '' : t('polkamarkt.ticket.insufficientXor');
  } catch {
    return unavailableValue(XOR.symbol);
  }
}
const networkFeeReason = computed(() => getNetworkFeeReason(networkFee.value));
const creatorClaimNetworkFeeReason = computed(() => getNetworkFeeReason(creatorClaimNetworkFee.value));
const pricingCurveSteps = computed(() => [
  t('polkamarkt.curve.steps.buy'),
  t('polkamarkt.curve.steps.moveQuote'),
  t('polkamarkt.curve.steps.sellBack'),
  t('polkamarkt.curve.steps.claim'),
]);
const receiptStatusLabel = computed(() =>
  receipt.value ? t(`polkamarkt.ticket.txStatus.${receipt.value.status}`) : ''
);
const receiptSummary = computed(() => {
  const currentReceipt = receipt.value;
  if (!currentReceipt) return '';

  if (currentReceipt.error) return currentReceipt.error;

  if (currentReceipt.action === 'buy') {
    return t('polkamarkt.ticket.buyReceipt', {
      outcome: outcomeText(currentReceipt.outcome),
      amount: currentReceipt.amount,
      symbol: currentReceipt.amountSymbol,
      shares: currentReceipt.output,
    });
  }

  if (currentReceipt.action === 'sell') {
    return t('polkamarkt.ticket.sellReceipt', {
      outcome: outcomeText(currentReceipt.outcome),
      shares: currentReceipt.amount,
      amount: currentReceipt.output,
      symbol: currentReceipt.outputSymbol,
    });
  }

  if (currentReceipt.action === 'report') {
    return t('polkamarkt.ticket.reportReceipt', { outcome: outcomeText(currentReceipt.outcome) });
  }

  if (currentReceipt.action === 'claimCreatorFees') {
    return t('polkamarkt.ticket.claimFeesReceipt');
  }

  return t('polkamarkt.ticket.claimMarketReceipt');
});
const receiptHint = computed(() => (receipt.value ? t(`polkamarkt.ticket.txHint.${receipt.value.status}`) : ''));

/**
 * Identifies the exact user inputs that made the currently displayed DPM quote safe to submit.
 */
function currentDpmQuoteKey(): string | null {
  if (!isTradeMode.value || (!marketId.value && marketId.value !== 0)) return null;
  if (!isSlippageValid.value) return null;
  const amount = dpmInputCodec.value;
  if (!isPositiveCodec(amount)) return null;
  return [marketId.value, mode.value, runtimeOutcome.value, amount, slippage.value.trim()].join(':');
}

const activeDpmQuote = computed(() => {
  const key = currentDpmQuoteKey();
  return key && dpmQuoteKey.value === key ? dpmQuote.value : null;
});

const disabledReason = computed(() => {
  if (!marketId.value && marketId.value !== 0) return t('polkamarkt.ticket.noChainMarket');
  if (hasPendingEarlyReport.value) {
    return isReportMode.value
      ? t('polkamarkt.ticket.earlyReportAlreadyExists')
      : t('polkamarkt.ticket.earlyReportPending');
  }
  if (isTradingFinalized.value) return marketStatus.value;
  if (isReportMode.value && !reportEvidence.value.uri) return t('polkamarkt.ticket.enterEvidenceUri');
  if (isReportMode.value && !isReportHashValid.value) return t('polkamarkt.ticket.invalidEvidenceHash');
  if (isTradeMode.value && !isSlippageValid.value) return t('dexSettings.slippageToleranceValidation.error');
  if (isTradeMode.value && !isPositiveCodec(dpmInputCodec.value)) return t('polkamarkt.ticket.enterAmount');
  if (mode.value === 'sell' && claimableLoading.value) return t('polkamarkt.ticket.refreshingBalances');
  if (mode.value === 'sell' && (!claimable.value || claimableError.value))
    return t('polkamarkt.ticket.balanceUnavailable');
  if (isTradeMode.value && isPositiveCodec(dpmInputCodec.value) && !activeDpmQuote.value && !quoteLoading.value)
    return t('polkamarkt.ticket.quoteUnavailable');
  if (!hasEnoughKusd.value) return t('polkamarkt.ticket.insufficientKusd', { symbol: collateralSymbol });
  if (!hasEnoughShares.value) return t('polkamarkt.ticket.insufficientShares');
  if (networkFeeReason.value) return networkFeeReason.value;
  if (error.value) return error.value;
  return '';
});
const submitDisabled = computed(
  () => isConnected.value && (Boolean(disabledReason.value) || isLoading.value || quoteLoading.value)
);
const submitLabel = computed(() => {
  if (!isConnected.value) return t('connectWalletText');
  if (isReportMode.value) return disabledReason.value || t('polkamarkt.actions.reportEarlyResolution');
  return disabledReason.value || t(`polkamarkt.actions.${mode.value}`);
});
const quotePrimaryLabel = computed(() => {
  if (mode.value === 'buy') return t('polkamarkt.ticket.sharesOut');
  if (mode.value === 'sell') return t('polkamarkt.ticket.collateralOut');
  if (isReportMode.value) return t('polkamarkt.ticket.reportBond');
  return t('polkamarkt.ticket.claimStatus');
});
const quotePrimaryValue = computed(() => {
  if (mode.value === 'buy') {
    const quote = activeDpmQuote.value;
    return quote && 'sharesOut' in quote
      ? `${formatCodec(quote.sharesOut)} ${t('polkamarkt.units.shares')}`
      : EMPTY_ESTIMATE;
  }
  if (mode.value === 'sell') {
    const quote = activeDpmQuote.value;
    return quote && 'collateralOut' in quote
      ? `${formatCodec(quote.collateralOut)} ${collateralSymbol}`
      : EMPTY_ESTIMATE;
  }
  if (isReportMode.value) return `100 ${collateralSymbol}`;
  return claimable.value?.status || t('polkamarkt.notIndexed');
});
const takerFeeFormatted = computed(() => {
  if (!isTradeMode.value) return '-';
  return activeDpmQuote.value ? `${formatCodec(activeDpmQuote.value.feeAmount)} ${collateralSymbol}` : EMPTY_ESTIMATE;
});
/** Formats each claim action's own estimate without displaying missing fees as zero. */
function formatNetworkFee(fee: CodecString | null): string {
  if (quoteLoading.value) return t('calculatingText');
  if (!isPositiveCodec(fee)) return EMPTY_ESTIMATE;
  return `${formatCodec(fee!)} ${XOR.symbol}`;
}
const networkFeeFormatted = computed(() => formatNetworkFee(networkFee.value));
const creatorClaimNetworkFeeFormatted = computed(() => formatNetworkFee(creatorClaimNetworkFee.value));
const canClaimTrader = computed(
  () =>
    isClaimModeAvailable.value &&
    isConnected.value &&
    !claimableLoading.value &&
    !claimableError.value &&
    !networkFeeReason.value &&
    isPositiveCodec(claimable.value?.claimablePayout ?? claimable.value?.traderPayout)
);
const canClaimCreatorFees = computed(
  () =>
    isClaimModeAvailable.value &&
    isConnected.value &&
    !claimableLoading.value &&
    !claimableError.value &&
    !creatorClaimNetworkFeeReason.value &&
    isPositiveCodec(claimable.value?.creatorFees)
);

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshRequestId = 0;
let claimableRequestId = 0;
let isDisposed = false;

/** Captures account, market, quote and input terms before asynchronous wallet preparation. */
function captureSubmissionTerms() {
  return {
    account: accountAddress.value,
    network: soraNetwork.value,
    marketId: marketId.value,
    mode: mode.value,
    outcome: runtimeOutcome.value,
    collateralIn: collateralCodec.value,
    sharesIn: sharesCodec.value,
    slippage: slippage.value.trim(),
    evidence: { ...reportEvidence.value },
    quote: activeDpmQuote.value ? { ...activeDpmQuote.value } : null,
    fee: networkFee.value,
    creatorClaimFee: creatorClaimNetworkFee.value,
    generation: refreshRequestId,
  };
}

/** Rejects changed terms or depleted funds immediately before entering the signing API. */
function assertCurrentSubmission(
  terms: ReturnType<typeof captureSubmissionTerms>,
  claimAction?: 'market' | 'fees'
): void {
  const unavailable = claimAction
    ? !(claimAction === 'market' ? canClaimTrader.value : canClaimCreatorFees.value)
    : Boolean(disabledReason.value) || quoteLoading.value;
  if (
    isDisposed ||
    !isConnected.value ||
    !terms.account ||
    unavailable ||
    JSON.stringify(terms) !== JSON.stringify(captureSubmissionTerms())
  ) {
    throw new Error(t('polkamarkt.ticket.quoteUnavailable'));
  }
}

/**
 * Clears stale quote-derived values and cancels in-flight quote updates after input changes.
 */
function invalidateDpmQuote(): void {
  refreshRequestId += 1;
  quoteLoading.value = false;
  dpmQuote.value = null;
  dpmQuoteKey.value = null;
  networkFee.value = null;
  creatorClaimNetworkFee.value = null;
  error.value = '';
}

function parseAmount(value: string): CodecString {
  try {
    return parsePolkamarktAmount(value || '0');
  } catch {
    return '0';
  }
}

function formatCodec(value?: CodecString): string {
  return formatPolkamarktCodec(value || '0');
}

function formatOutcomePrice(value?: number): string {
  return Number.isFinite(value) ? `${(value ?? 0).toFixed(2)} ${collateralSymbol}` : t('polkamarkt.notIndexed');
}

function dpmSharePrice(value?: number): number | undefined {
  return Number.isFinite(value) ? Math.max(0, Number(value) / 10_000) : undefined;
}

function formatProbabilityBps(value?: number): string {
  if (Number.isFinite(value)) return `${(Number(value) / 100).toFixed(2)}%`;
  return '-';
}

function unavailableValue(name: string): string {
  return t('provider.messages.notAvailable', { name });
}

function modeLabel(value: TradeMode): string {
  return t(`polkamarkt.modes.${value}`);
}

/**
 * Formats the selected binary outcome for transaction receipts.
 */
function outcomeText(value?: TicketOutcome): string {
  if (value === 'NO') return t('polkamarkt.outcomes.no');
  return t('polkamarkt.outcomes.yes');
}

function runtimeOutcomeFromTicket(value?: TicketOutcome): PolkamarktOutcome {
  return value === 'NO' ? 'No' : 'Yes';
}

function receiptOperation(action: TicketReceiptAction): Operation {
  switch (action) {
    case 'buy':
      return Operation.PolkamarktBuy;
    case 'sell':
      return Operation.PolkamarktSell;
    case 'report':
      return Operation.PolkamarktReportEarlyResolution;
    case 'claimCreatorFees':
      return Operation.PolkamarktClaimCreatorFees;
    case 'claimMarket':
      return Operation.PolkamarktClaimMarket;
  }
}

function historyPayload(transaction: HistoryItem): Record<string, unknown> {
  const payload = (transaction as { payload?: unknown }).payload;
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
}

/**
 * Narrows timeout recovery to the Polkamarkt transaction that matches this receipt.
 */
function isMatchingPolkamarktReceiptTransaction(transaction: HistoryItem, receiptState: TicketReceipt): boolean {
  if ((transaction as { type?: Operation }).type !== receiptOperation(receiptState.action)) return false;

  const payload = historyPayload(transaction);
  if (Number(payload.marketId) !== marketId.value) return false;

  if (receiptState.action === 'buy' || receiptState.action === 'sell' || receiptState.action === 'report') {
    return String(payload.outcome ?? '').toLowerCase() === runtimeOutcomeFromTicket(receiptState.outcome).toLowerCase();
  }

  return true;
}

/**
 * Renders runtime share balances without implying zero when data is unavailable.
 */
function formatShareBalance(value?: CodecString): string {
  if (!isConnected.value) return '-';
  if (claimableLoading.value) return '...';
  if (!claimable.value || claimableError.value) return '-';
  return formatCodec(value);
}

/**
 * Formats indexer-provided share amounts used as secondary position context.
 */
function formatIndexedShareAmount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value || 0);
}

/**
 * Produces a compact transaction identifier for the inline receipt.
 */
function receiptTransactionId(transaction?: HistoryItem): string | undefined {
  const id = String(transaction?.txId ?? transaction?.id ?? '').trim();
  if (!id) return undefined;
  return id.length > 18 ? `${id.slice(0, 10)}...${id.slice(-6)}` : id;
}

/**
 * Maps wallet history statuses to the smaller status set shown by the trade ticket.
 */
function receiptStatusFromTransaction(transaction?: HistoryItem): TicketReceiptStatus {
  const status = transaction?.status as TransactionStatus | undefined;
  const failedStatuses = [TransactionStatus.Error, TransactionStatus.Invalid, TransactionStatus.Usurped];
  const confirmedStatuses = [TransactionStatus.InBlock, TransactionStatus.Finalized];

  if (status && failedStatuses.includes(status)) {
    return 'failed';
  }

  if (status && confirmedStatuses.includes(status)) {
    return 'confirmed';
  }

  return 'submitted';
}

/**
 * Builds a receipt for buy, sell, and report actions before wallet signing starts.
 */
function buildTradeReceipt(
  action: Extract<TradeMode, 'buy' | 'sell' | 'report'>,
  status: TicketReceiptStatus,
  options: Partial<TicketReceipt> = {}
): TicketReceipt {
  return {
    status,
    action,
    outcome: outcome.value,
    ...options,
  };
}

/**
 * Builds a receipt for claim actions before wallet signing starts.
 */
function buildClaimReceipt(action: 'market' | 'fees', status: TicketReceiptStatus): TicketReceipt {
  return {
    status,
    action: action === 'market' ? 'claimMarket' : 'claimCreatorFees',
  };
}

/**
 * Attaches wallet history identity and current status to an existing receipt.
 */
function withSubmittedTransaction(receiptState: TicketReceipt, transaction?: HistoryItem): TicketReceipt {
  return {
    ...receiptState,
    status: receiptStatusFromTransaction(transaction),
    submittedAt: receiptState.submittedAt,
    historyId: String(transaction?.id ?? receiptState.historyId ?? '').trim() || undefined,
    transactionId: receiptTransactionId(transaction) ?? receiptState.transactionId,
  };
}

/**
 * Marks a receipt as failed and normalizes the displayed error message.
 */
function withFailedReceipt(receiptState: TicketReceipt, error?: unknown): TicketReceipt {
  return {
    ...receiptState,
    status: 'failed',
    error: error ? getErrorMessage(error) : t('polkamarkt.ticket.transactionFailed'),
  };
}

/**
 * Clears only the fields that belong to the confirmed action.
 */
function clearInputsForReceipt(receiptState: TicketReceipt): void {
  if (receiptState.action === 'buy') {
    collateralAmount.value = '';
  } else if (receiptState.action === 'sell') {
    shares.value = '';
  } else if (receiptState.action === 'report') {
    reportEvidenceUri.value = '';
    reportEvidenceHash.value = '';
  }
}

let confirmedReceiptHistoryId: string | undefined;

/**
 * Refreshes market/account data once a submitted transaction reaches an accepted chain state.
 */
async function handleConfirmedReceipt(receiptState: TicketReceipt): Promise<void> {
  const receiptKey = receiptState.historyId ?? receiptState.transactionId ?? String(receiptState.submittedAt ?? '');
  if (receiptKey && confirmedReceiptHistoryId === receiptKey) return;

  confirmedReceiptHistoryId = receiptKey;
  clearInputsForReceipt(receiptState);
  emit('submitted');
  await refreshQuote();
}

/**
 * Keeps the inline receipt in sync with the wallet history item for the submitted transaction.
 */
function syncReceiptWithTransaction(transaction?: HistoryItem): void {
  if (!receipt.value || !transaction) return;

  const nextReceipt = withSubmittedTransaction(receipt.value, transaction);
  receipt.value = nextReceipt;

  if (nextReceipt.status === 'confirmed') {
    void handleConfirmedReceipt(nextReceipt);
  } else if (nextReceipt.status === 'failed') {
    receipt.value = withFailedReceipt(nextReceipt);
  }
}

async function refreshClaimable(estimateNetworkFee = false): Promise<void> {
  const requestId = ++claimableRequestId;

  if (!isConnected.value || !accountAddress.value || (!marketId.value && marketId.value !== 0)) {
    claimable.value = null;
    claimableError.value = '';
    claimableLoading.value = false;
    return;
  }

  claimableLoading.value = true;
  claimableError.value = '';
  if (estimateNetworkFee) quoteLoading.value = true;
  try {
    const nextClaimable = await api.polkamarkt.getClaimableInfo(accountAddress.value, marketId.value);
    if (requestId !== claimableRequestId) return;

    claimable.value = nextClaimable;
    claimableError.value = nextClaimable ? '' : t('polkamarkt.ticket.balanceUnavailable');

    if (estimateNetworkFee) {
      const claimMarketId = marketId.value;
      // Runtime action discovery can throw before returning a promise; isolate each estimate.
      const [traderFee, creatorFee] = await Promise.allSettled([
        Promise.resolve().then(() => api.polkamarkt.estimateClaimMarketNetworkFee(claimMarketId)),
        Promise.resolve().then(() => api.polkamarkt.estimateClaimCreatorFeesNetworkFee(claimMarketId)),
      ]);
      if (requestId === claimableRequestId) {
        networkFee.value =
          traderFee.status === 'fulfilled' && isPositiveCodec(traderFee.value) ? traderFee.value : null;
        creatorClaimNetworkFee.value =
          creatorFee.status === 'fulfilled' && isPositiveCodec(creatorFee.value) ? creatorFee.value : null;
      }
    }
  } catch (err) {
    if (requestId !== claimableRequestId) return;

    claimable.value = null;
    claimableError.value = err instanceof Error ? err.message : t('polkamarkt.ticket.balanceUnavailable');
    if (estimateNetworkFee) error.value = claimableError.value || t('polkamarkt.ticket.claimableFailed');
  } finally {
    if (requestId === claimableRequestId) {
      claimableLoading.value = false;
      if (estimateNetworkFee) quoteLoading.value = false;
    }
  }
}

async function refreshQuote(): Promise<void> {
  const requestId = ++refreshRequestId;
  dpmQuote.value = null;
  dpmQuoteKey.value = null;
  networkFee.value = null;
  creatorClaimNetworkFee.value = null;
  error.value = '';

  if (!marketId.value && marketId.value !== 0) return;

  if (mode.value === 'claim') {
    await refreshClaimable(true);
    return;
  }

  if (mode.value === 'sell') {
    await refreshClaimable(false);
    if (requestId !== refreshRequestId) return;
    if (!claimable.value || claimableError.value) return;
  } else if (!claimable.value && isConnected.value && accountAddress.value) {
    void refreshClaimable(false);
  }

  if (isTradingFinalized.value || hasPendingEarlyReport.value) return;

  if (isReportMode.value) {
    if (!reportEvidence.value.uri || !isReportHashValid.value) return;

    quoteLoading.value = true;
    try {
      const fee = await api.polkamarkt.estimateReportEarlyResolutionNetworkFee({
        marketId: marketId.value,
        outcome: runtimeOutcome.value,
        evidence: reportEvidence.value,
      });
      if (requestId === refreshRequestId) networkFee.value = isPositiveCodec(fee) ? fee : null;
    } catch (err) {
      if (requestId === refreshRequestId)
        error.value = err instanceof Error ? err.message : t('polkamarkt.ticket.earlyReportFeeFailed');
    } finally {
      if (requestId === refreshRequestId) quoteLoading.value = false;
    }
    return;
  }

  if (isTradeMode.value) {
    const amount = dpmInputCodec.value;
    const quoteKey = currentDpmQuoteKey();
    if (!isPositiveCodec(amount)) return;
    if (!quoteKey) return;

    quoteLoading.value = true;
    try {
      if (mode.value === 'buy') {
        const nextQuote = await api.polkamarkt.quoteBuyTrade({
          marketId: marketId.value,
          outcome: runtimeOutcome.value,
          collateralIn: collateralCodec.value,
        });
        if (requestId !== refreshRequestId) return;
        dpmQuote.value = nextQuote;
        dpmQuoteKey.value = nextQuote ? quoteKey : null;
        if (!nextQuote) return;

        const fee = await api.polkamarkt.estimateBuyTradeNetworkFee({
          marketId: marketId.value,
          outcome: runtimeOutcome.value,
          collateralIn: collateralCodec.value,
          minSharesOut: applySlippageMinimum(nextQuote.sharesOut, slippage.value),
        });
        if (requestId === refreshRequestId) networkFee.value = isPositiveCodec(fee) ? fee : null;
      } else {
        const nextQuote = await api.polkamarkt.quoteSellTrade({
          marketId: marketId.value,
          outcome: runtimeOutcome.value,
          sharesIn: sharesCodec.value,
        });
        if (requestId !== refreshRequestId) return;
        dpmQuote.value = nextQuote;
        dpmQuoteKey.value = nextQuote ? quoteKey : null;
        if (!nextQuote) return;

        const fee = await api.polkamarkt.estimateSellTradeNetworkFee({
          marketId: marketId.value,
          outcome: runtimeOutcome.value,
          sharesIn: sharesCodec.value,
          minCollateralOut: applySlippageMinimum(nextQuote.collateralOut, slippage.value),
        });
        if (requestId === refreshRequestId) networkFee.value = isPositiveCodec(fee) ? fee : null;
      }
    } catch (err) {
      if (requestId === refreshRequestId)
        error.value = err instanceof Error ? err.message : t('polkamarkt.ticket.quoteFailed');
    } finally {
      if (requestId === refreshRequestId) quoteLoading.value = false;
    }
    return;
  }
}

/** Submits reviewed trade/report terms only while their account, quote and funds remain current. */
async function submit(): Promise<void> {
  if (!isConnected.value) {
    connectSoraWallet();
    return;
  }
  if (submitDisabled.value || (!marketId.value && marketId.value !== 0)) return;

  const buyQuote =
    mode.value === 'buy' && activeDpmQuote.value && 'sharesOut' in activeDpmQuote.value ? activeDpmQuote.value : null;
  const sellQuote =
    mode.value === 'sell' && activeDpmQuote.value && 'collateralOut' in activeDpmQuote.value
      ? activeDpmQuote.value
      : null;
  if ((mode.value === 'buy' && !buyQuote) || (mode.value === 'sell' && !sellQuote)) {
    error.value = t('polkamarkt.ticket.quoteUnavailable');
    return;
  }
  const terms = captureSubmissionTerms();

  const pendingReceipt =
    mode.value === 'buy'
      ? buildTradeReceipt('buy', 'submitting', {
          amount: formatCodec(collateralCodec.value),
          amountSymbol: collateralSymbol,
          output: formatCodec(applySlippageMinimum(buyQuote!.sharesOut, slippage.value)),
          outputSymbol: t('polkamarkt.units.shares'),
        })
      : mode.value === 'sell'
        ? buildTradeReceipt('sell', 'submitting', {
            amount: formatCodec(sharesCodec.value),
            amountSymbol: t('polkamarkt.units.shares'),
            output: formatCodec(applySlippageMinimum(sellQuote!.collateralOut, slippage.value)),
            outputSymbol: collateralSymbol,
          })
        : buildTradeReceipt('report', 'submitting');

  receipt.value = pendingReceipt;
  confirmedReceiptHistoryId = undefined;

  const result = await withNotifications(async () => {
    assertCurrentSubmission(terms);
    if (terms.mode === 'buy') {
      await api.polkamarkt.submitBuyTrade({
        marketId: terms.marketId!,
        outcome: terms.outcome,
        collateralIn: terms.collateralIn,
        minSharesOut: applySlippageMinimum(buyQuote!.sharesOut, terms.slippage),
      });
    } else if (terms.mode === 'sell') {
      await api.polkamarkt.submitSellTrade({
        marketId: terms.marketId!,
        outcome: terms.outcome,
        sharesIn: terms.sharesIn,
        minCollateralOut: applySlippageMinimum(sellQuote!.collateralOut, terms.slippage),
      });
    } else if (terms.mode === 'report') {
      await api.polkamarkt.reportEarlyResolution({
        marketId: terms.marketId!,
        outcome: terms.outcome,
        evidence: terms.evidence,
      });
    }
  });

  if (
    isDisposed ||
    terms.account !== accountAddress.value ||
    terms.marketId !== marketId.value ||
    terms.network !== soraNetwork.value
  )
    return;

  if (!result.submitted) {
    receipt.value = withFailedReceipt(pendingReceipt, result.error);
    return;
  }

  const submittedReceipt = withSubmittedTransaction(
    { ...pendingReceipt, submittedAt: result.submittedAt },
    result.transaction
  );
  receipt.value = submittedReceipt;

  if (submittedReceipt.status === 'confirmed') {
    await handleConfirmedReceipt(submittedReceipt);
  }
}

/** Keeps claims bound to the account and market that initiated wallet preparation. */
async function submitClaim(action: 'market' | 'fees'): Promise<void> {
  if (!isConnected.value) {
    connectSoraWallet();
    return;
  }
  if (!isClaimModeAvailable.value || (!marketId.value && marketId.value !== 0)) return;
  if (isLoading.value || !(action === 'market' ? canClaimTrader.value : canClaimCreatorFees.value)) return;
  const terms = captureSubmissionTerms();

  const pendingReceipt = buildClaimReceipt(action, 'submitting');
  receipt.value = pendingReceipt;
  confirmedReceiptHistoryId = undefined;

  const result = await withNotifications(async () => {
    assertCurrentSubmission(terms, action);
    if (action === 'market') {
      await api.polkamarkt.claimMarket(terms.marketId!);
    } else {
      await api.polkamarkt.claimCreatorFees(terms.marketId!);
    }
  });

  if (
    isDisposed ||
    terms.account !== accountAddress.value ||
    terms.marketId !== marketId.value ||
    terms.network !== soraNetwork.value
  )
    return;

  if (!result.submitted) {
    receipt.value = withFailedReceipt(pendingReceipt, result.error);
    return;
  }

  const submittedReceipt = withSubmittedTransaction(
    { ...pendingReceipt, submittedAt: result.submittedAt },
    result.transaction
  );
  receipt.value = submittedReceipt;

  if (submittedReceipt.status === 'confirmed') {
    await handleConfirmedReceipt(submittedReceipt);
  }
}

watch(
  [mode, isClaimModeAvailable],
  () => {
    if (isClaimModeAvailable.value && mode.value !== 'claim') {
      mode.value = 'claim';
    } else if (mode.value === 'claim' && !isClaimModeAvailable.value) {
      mode.value = 'buy';
    }
  },
  { immediate: true }
);

watch(
  modes,
  (nextModes) => {
    if (!nextModes.includes(mode.value)) {
      mode.value = nextModes[0] ?? 'buy';
    }
  },
  { immediate: true }
);

// Invalidate the owner before debounced reads can reuse or publish another account's funds.
watch(
  [accountAddress, marketId, isConnected, soraNetwork],
  () => {
    invalidateDpmQuote();
    claimableRequestId += 1;
    claimable.value = null;
    claimableError.value = '';
    claimableLoading.value = false;
    receipt.value = null;
    confirmedReceiptHistoryId = undefined;
  },
  { flush: 'sync' }
);

watch(
  [
    marketId,
    mode,
    outcome,
    shares,
    collateralAmount,
    slippage,
    reportEvidenceUri,
    reportEvidenceHash,
    isConnected,
    accountAddress,
    soraNetwork,
  ],
  () => {
    invalidateDpmQuote();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refreshQuote(), 250);
  },
  { immediate: true }
);

watch(receiptTransaction, (transaction) => syncReceiptWithTransaction(transaction), { deep: true });

watch(
  () => props.market?.id,
  () => {
    shares.value = '';
    collateralAmount.value = '';
    reportEvidenceUri.value = '';
    reportEvidenceHash.value = '';
    invalidateDpmQuote();
    claimable.value = null;
    claimableError.value = '';
    claimableLoading.value = false;
    receipt.value = null;
    confirmedReceiptHistoryId = undefined;
  }
);

onBeforeUnmount(() => {
  isDisposed = true;
  refreshRequestId += 1;
  claimableRequestId += 1;
  clearTimeout(refreshTimer);
});
</script>

<style lang="scss" scoped>
.trade-ticket {
  display: flex;
  flex-direction: column;
  gap: $inner-spacing-medium;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: 20px;
  background: var(--s-color-utility-surface);
  padding: $inner-spacing-medium;

  &__header {
    h2 {
      margin: 0;
      font-size: var(--s-heading5-font-size);
      line-height: var(--s-line-height-medium);
    }

    p {
      margin: $inner-spacing-tiny 0 0;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
    }
  }

  &__tabs {
    display: flex;
    min-width: 0;
    overflow-x: auto;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);
    padding: 2px;

    button {
      flex: 1 0 auto;
      min-height: 32px;
      min-width: 56px;
      border: 0;
      border-radius: var(--s-border-radius-mini);
      background: transparent;
      color: var(--s-color-base-content-secondary);
      cursor: pointer;
      font: inherit;
      font-size: var(--s-font-size-small);
      font-weight: 600;
      padding: 0 $inner-spacing-mini;

      &.active {
        background: var(--s-color-theme-accent);
        color: var(--s-color-base-on-accent);
      }

      &:focus-visible {
        outline: 2px solid var(--s-color-theme-accent);
        outline-offset: 2px;
      }
    }
  }

  &__outcomes {
    display: grid;
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    gap: $inner-spacing-mini;

    button {
      display: grid;
      gap: 2px;
      min-width: 0;
      border: 1px solid var(--s-color-base-border-secondary);
      border-radius: var(--s-border-radius-mini);
      background: var(--s-color-utility-surface);
      color: var(--s-color-base-content-primary);
      cursor: pointer;
      padding: $inner-spacing-small;
      text-align: start;
      transition:
        border-color 160ms ease,
        background-color 160ms ease;

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }

      &.active {
        border-color: var(--s-color-theme-accent);
        background: var(--s-color-theme-accent);
        color: var(--s-color-base-on-accent);
      }

      &:focus-visible {
        outline: 2px solid var(--s-color-theme-accent);
        outline-offset: 2px;
      }

      small {
        color: inherit;
        font-size: var(--s-font-size-mini);
        line-height: var(--s-line-height-mini);
        opacity: 0.78;
      }
    }
  }

  &__form {
    display: grid;
    gap: $inner-spacing-small;
  }

  &__settings,
  &__holdings,
  &__curve-panel {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);

    summary {
      cursor: pointer;
      min-height: 44px;
      align-content: center;

      &:focus-visible {
        outline: 2px solid var(--s-color-theme-accent);
        outline-offset: 2px;
      }
    }

    &[open] summary {
      margin-bottom: $inner-spacing-mini;
    }
  }

  &__settings .trade-field {
    max-width: 180px;
  }

  &__balances {
    display: grid;
    grid-template-columns: repeat(auto-fit, #{'minmax(120px, 1fr)'});
    gap: $inner-spacing-small;

    span {
      display: block;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
    }

    strong {
      display: block;
      margin-top: 2px;
      overflow-wrap: anywhere;
    }
  }

  &__quote {
    display: grid;
    gap: $inner-spacing-mini;
    border-top: 1px solid var(--s-color-base-border-secondary);
    padding-top: $inner-spacing-small;

    > div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: $inner-spacing-mini;
      font-size: var(--s-font-size-small);
    }

    span {
      color: var(--s-color-base-content-secondary);
    }

    strong {
      text-align: end;
      overflow-wrap: anywhere;
      font-weight: 500;
    }

    .trade-ticket__quote-primary {
      margin-bottom: $inner-spacing-mini;

      strong {
        font-size: var(--s-heading5-font-size);
        font-weight: 700;
      }
    }
  }

  &__balance-status {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-mini);

    &--secondary {
      color: var(--s-color-theme-accent);
    }
  }

  &__receipt {
    display: grid;
    gap: $inner-spacing-tiny;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);
    padding: $inner-spacing-small;

    span {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      font-weight: 700;
      line-height: var(--s-line-height-mini);
      text-transform: uppercase;
    }

    strong,
    p,
    small {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    p,
    small {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-small);
    }

    &--confirmed {
      border-color: var(--s-color-status-success);
    }

    &--failed {
      border-color: var(--s-color-status-error);
    }
  }

  &__curve-helper {
    display: grid;
    gap: $inner-spacing-small;
    min-width: 0;
    border-top: 1px solid var(--s-color-base-border-secondary);
    padding-top: $inner-spacing-mini;
  }

  &__curve-panel {
    min-width: 0;
  }

  &__curve-explainer {
    display: grid;
    gap: $inner-spacing-small;
    min-width: 0;

    h3 {
      margin: 0;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-mini);
      text-transform: uppercase;
    }

    ol {
      display: grid;
      gap: $inner-spacing-tiny;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      gap: $inner-spacing-small;
      min-width: 0;
      border: 1px solid var(--s-color-base-border-secondary);
      border-radius: var(--s-border-radius-mini);
      background: var(--s-color-utility-surface);
      padding: $inner-spacing-small;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-small);

      span {
        display: inline-flex;
        flex: 0 0 22px;
        width: 22px;
        height: 22px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--s-color-theme-accent);
        border-radius: 50%;
        color: var(--s-color-theme-accent);
        font-size: var(--s-font-size-mini);
        font-weight: 700;
      }

      p {
        margin: 0;
        min-width: 0;
      }
    }
  }

  &__claim-grid {
    display: grid;
    gap: $inner-spacing-mini;
    grid-template-columns: 1fr 1fr;

    @include tablet(true) {
      grid-template-columns: 1fr;
    }
  }

  &__submit {
    width: 100%;
  }

  &__error {
    color: var(--s-color-status-error);
    margin: 0;
  }

  &__hint {
    color: var(--s-color-base-content-secondary);
    margin: 0;
  }
}

.trade-field {
  display: grid;
  gap: $inner-spacing-tiny;

  span {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
  }
}

.polkamarkt-input {
  min-height: 48px;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-surface);
  color: var(--s-color-base-content-primary);
  padding: 0 $inner-spacing-small;
  width: 100%;
  box-sizing: border-box;
}
</style>
