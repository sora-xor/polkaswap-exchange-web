<template>
  <aside class="trade-ticket">
    <header class="trade-ticket__header">
      <h2>{{ t('polkamarkt.ticket.title') }}</h2>
      <p v-if="!market">{{ t('polkamarkt.ticket.selectMarket') }}</p>
      <p v-else>{{ t('polkamarkt.ticket.dpmSubtitle') }}</p>
    </header>

    <div class="trade-ticket__tabs" role="tablist">
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
          <small>{{ t('polkamarkt.ticket.impliedProbabilityShort', { value: yesProbabilityFormatted }) }}</small>
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
          <small>{{ t('polkamarkt.ticket.impliedProbabilityShort', { value: noProbabilityFormatted }) }}</small>
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
        <label class="trade-field">
          <span>{{ t('polkamarkt.ticket.slippage') }}</span>
          <input v-model="slippage" class="polkamarkt-input" inputmode="decimal" autocomplete="off" />
        </label>
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

      <div class="trade-ticket__balances">
        <div>
          <span>{{ t('polkamarkt.ticket.walletYes') }}</span>
          <strong>{{ formatCodec(claimable?.yesShares) }}</strong>
        </div>
        <div>
          <span>{{ t('polkamarkt.ticket.walletNo') }}</span>
          <strong>{{ formatCodec(claimable?.noShares) }}</strong>
        </div>
      </div>

      <div class="trade-ticket__quote">
        <div>
          <span>{{ quotePrimaryLabel }}</span>
          <strong>{{ quotePrimaryValue }}</strong>
        </div>
        <div>
          <span>{{ t('polkamarkt.ticket.takerFee') }}</span>
          <strong>{{ takerFeeFormatted }}</strong>
        </div>
        <div>
          <span>{{ t('networkFeeText') }}</span>
          <strong>{{ networkFeeFormatted }}</strong>
        </div>
        <div v-if="mode === 'claim'">
          <span>{{ t('polkamarkt.ticket.claimable') }}</span>
          <strong
            >{{ formatCodec(claimable?.claimablePayout ?? claimable?.traderPayout) }} {{ collateralSymbol }}</strong
          >
        </div>
      </div>

      <p v-if="error" class="trade-ticket__error">{{ error }}</p>
      <p v-else-if="quoteLoading" class="trade-ticket__hint">{{ t('polkamarkt.ticket.refreshingQuote') }}</p>

      <template v-if="mode === 'claim'">
        <div class="trade-ticket__claim-grid">
          <s-button type="primary" :disabled="!canClaimTrader" :loading="isLoading" @click="submitClaim('market')">
            {{ t('polkamarkt.actions.claimTraderPayout') }}
          </s-button>
          <s-button type="secondary" :disabled="!canClaimCreatorFees" :loading="isLoading" @click="submitClaim('fees')">
            {{ t('polkamarkt.actions.claimCreatorFees') }}
          </s-button>
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
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { api } from '@/lib/soraneo-wallet/src/api';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import { useWalletStore } from '@/stores/wallet';
import { applySlippageMinimum, formatPolkamarktCodec, isPositiveCodec, parsePolkamarktAmount } from '../lib/amounts';
import {
  getMarketDisplayStatus,
  isClaimableMarketStatus,
  isFinalizedMarket,
  yesNoPricesFromProbability,
} from '../lib/markets';

import type { CodecString } from '@sora-substrate/sdk';
import type { AccountPosition, PolkamarktMarket, TicketOutcome, TradeMode } from '../types';
import type { BuyQuote, ClaimableInfo, PolkamarktOutcome, SellQuote } from '@/lib/substrate/sdk/polkamarkt';

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

type MaybeValue<T> = T | { value: T };

const ZERO_CODEC = '0';
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
const claimable = ref<ClaimableInfo | null>(null);
const networkFee = ref<CodecString | null>(null);

const isConnectedSource = isLoggedIn as unknown as MaybeValue<boolean>;
const accountAddressSource = soraAddress as unknown as MaybeValue<string | undefined>;
const isConnected = computed(() =>
  Boolean(typeof isConnectedSource === 'object' ? isConnectedSource.value : isConnectedSource)
);
const isLoading = computed(() => Boolean(typeof loading === 'object' ? loading.value : loading));
const accountAddress = computed(() =>
  String(typeof accountAddressSource === 'object' ? (accountAddressSource.value ?? '') : (accountAddressSource ?? ''))
);
const collateralSymbol = KUSD.symbol;
const marketId = computed(() => props.market?.chainId);
const runtimeOutcome = computed<PolkamarktOutcome>(() => (outcome.value === 'YES' ? 'Yes' : 'No'));
const isTradeMode = computed(() => mode.value === 'buy' || mode.value === 'sell');
const isReportMode = computed(() => mode.value === 'report');
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
const yesProbabilityFormatted = computed(() =>
  formatProbabilityBps(props.market?.impliedYesProbabilityBps, props.market?.probability)
);
const noProbabilityFormatted = computed(() =>
  formatProbabilityBps(
    props.market?.impliedNoProbabilityBps,
    props.market?.probability === undefined ? undefined : 100 - props.market.probability
  )
);
const accountKusd = computed(() => walletStore.accountAssetsAddressTable?.[KUSD.address]);
const accountXor = computed(() => walletStore.accountAssetsAddressTable?.[XOR.address]);
const sharesCodec = computed(() => parseAmount(shares.value));
const collateralCodec = computed(() => parseAmount(collateralAmount.value));
const dpmInputCodec = computed(() => (mode.value === 'buy' ? collateralCodec.value : sharesCodec.value));
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
const hasEnoughXor = computed(() => {
  const fee = BigInt(networkFee.value || '0');
  if (fee <= 0n) return true;
  const balance = accountXor.value?.balance?.transferable ?? '0';
  return BigInt(balance) >= fee;
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
  if (isTradeMode.value && !isPositiveCodec(dpmInputCodec.value)) return t('polkamarkt.ticket.enterAmount');
  if (isTradeMode.value && isPositiveCodec(dpmInputCodec.value) && !dpmQuote.value && !quoteLoading.value)
    return t('polkamarkt.ticket.quoteUnavailable');
  if (!hasEnoughKusd.value) return t('polkamarkt.ticket.insufficientKusd', { symbol: collateralSymbol });
  if (!hasEnoughShares.value) return t('polkamarkt.ticket.insufficientShares');
  if (!hasEnoughXor.value) return t('polkamarkt.ticket.insufficientXor');
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
    return dpmQuote.value && 'sharesOut' in dpmQuote.value
      ? `${formatCodec(dpmQuote.value.sharesOut)} ${t('polkamarkt.units.shares')}`
      : unavailableValue(t('polkamarkt.ticket.sharesOut'));
  }
  if (mode.value === 'sell') {
    return dpmQuote.value && 'collateralOut' in dpmQuote.value
      ? `${formatCodec(dpmQuote.value.collateralOut)} ${collateralSymbol}`
      : unavailableValue(t('polkamarkt.ticket.collateralOut'));
  }
  if (isReportMode.value) return `100 ${collateralSymbol}`;
  return claimable.value?.status || t('polkamarkt.notIndexed');
});
const takerFeeFormatted = computed(() => {
  if (!isTradeMode.value) return '-';
  return dpmQuote.value
    ? `${formatCodec(dpmQuote.value.feeAmount)} ${collateralSymbol}`
    : unavailableValue(t('polkamarkt.ticket.takerFee'));
});
const networkFeeFormatted = computed(() => {
  if (quoteLoading.value) return t('calculatingText');
  if (!networkFee.value) return t('polkamarkt.notIndexed');
  return `${formatCodec(networkFee.value)} ${XOR.symbol}`;
});
const canClaimTrader = computed(
  () =>
    isClaimModeAvailable.value &&
    isConnected.value &&
    isPositiveCodec(claimable.value?.claimablePayout ?? claimable.value?.traderPayout)
);
const canClaimCreatorFees = computed(
  () => isClaimModeAvailable.value && isConnected.value && isPositiveCodec(claimable.value?.creatorFees)
);

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshRequestId = 0;

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

function formatProbabilityBps(value?: number, fallbackPercent?: number): string {
  if (Number.isFinite(value)) return `${(Number(value) / 100).toFixed(2)}%`;
  if (Number.isFinite(fallbackPercent)) return `${Number(fallbackPercent).toFixed(2)}%`;
  return '-';
}

function unavailableValue(name: string): string {
  return t('provider.messages.notAvailable', { name });
}

function modeLabel(value: TradeMode): string {
  return t(`polkamarkt.modes.${value}`);
}

async function refreshClaimable(estimateNetworkFee = false): Promise<void> {
  if (!isConnected.value || !accountAddress.value || (!marketId.value && marketId.value !== 0)) {
    claimable.value = null;
    return;
  }

  if (estimateNetworkFee) quoteLoading.value = true;
  try {
    claimable.value = await api.polkamarkt.getClaimableInfo(accountAddress.value, marketId.value);
    if (estimateNetworkFee) {
      const fee = await api.polkamarkt.estimateClaimMarketNetworkFee(marketId.value);
      networkFee.value = isPositiveCodec(fee) ? fee : null;
    }
  } catch (err) {
    if (estimateNetworkFee) error.value = err instanceof Error ? err.message : t('polkamarkt.ticket.claimableFailed');
  } finally {
    if (estimateNetworkFee) quoteLoading.value = false;
  }
}

async function refreshQuote(): Promise<void> {
  const requestId = ++refreshRequestId;
  dpmQuote.value = null;
  networkFee.value = null;
  error.value = '';

  if (!marketId.value && marketId.value !== 0) return;

  try {
    await refreshClaimable(false);
  } catch {
    // Claimable reads are best effort; trade submission remains authoritative.
  }

  if (mode.value === 'claim') {
    await refreshClaimable(true);
    return;
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
    if (!isPositiveCodec(amount)) return;

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

async function submit(): Promise<void> {
  if (!isConnected.value) {
    connectSoraWallet();
    return;
  }
  if (submitDisabled.value || (!marketId.value && marketId.value !== 0)) return;

  await withNotifications(async () => {
    if (mode.value === 'buy') {
      const quote = dpmQuote.value && 'sharesOut' in dpmQuote.value ? dpmQuote.value : null;
      await api.polkamarkt.submitBuyTrade({
        marketId: marketId.value!,
        outcome: runtimeOutcome.value,
        collateralIn: collateralCodec.value,
        minSharesOut: quote ? applySlippageMinimum(quote.sharesOut, slippage.value) : ZERO_CODEC,
      });
    } else if (mode.value === 'sell') {
      const quote = dpmQuote.value && 'collateralOut' in dpmQuote.value ? dpmQuote.value : null;
      await api.polkamarkt.submitSellTrade({
        marketId: marketId.value!,
        outcome: runtimeOutcome.value,
        sharesIn: sharesCodec.value,
        minCollateralOut: quote ? applySlippageMinimum(quote.collateralOut, slippage.value) : ZERO_CODEC,
      });
    } else if (mode.value === 'report') {
      await api.polkamarkt.reportEarlyResolution({
        marketId: marketId.value!,
        outcome: runtimeOutcome.value,
        evidence: reportEvidence.value,
      });
    }
  });

  shares.value = '';
  collateralAmount.value = '';
  reportEvidenceUri.value = '';
  reportEvidenceHash.value = '';
  emit('submitted');
  await refreshQuote();
}

async function submitClaim(action: 'market' | 'fees'): Promise<void> {
  if (!isConnected.value) {
    connectSoraWallet();
    return;
  }
  if (!isClaimModeAvailable.value || (!marketId.value && marketId.value !== 0)) return;

  await withNotifications(async () => {
    if (action === 'market') {
      await api.polkamarkt.claimMarket(marketId.value!);
    } else {
      await api.polkamarkt.claimCreatorFees(marketId.value!);
    }
  });

  emit('submitted');
  await refreshQuote();
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
  ],
  () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refreshQuote(), 250);
  },
  { immediate: true }
);

watch(
  () => props.market?.id,
  () => {
    shares.value = '';
    collateralAmount.value = '';
    reportEvidenceUri.value = '';
    reportEvidenceHash.value = '';
    dpmQuote.value = null;
    claimable.value = null;
    networkFee.value = null;
    error.value = '';
  }
);
</script>

<style lang="scss" scoped>
.trade-ticket {
  display: flex;
  flex-direction: column;
  gap: $inner-spacing-medium;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-surface);
  padding: $inner-spacing-medium;
  box-shadow: var(--s-shadow-element);

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
    }
  }

  &__outcomes,
  &__form,
  &__balances,
  &__quote {
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);
    padding: $inner-spacing-small;
  }

  &__outcomes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
      text-align: left;

      &.active {
        border-color: var(--s-color-theme-accent);
        background: var(--s-color-theme-accent);
        color: var(--s-color-base-on-accent);
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

  &__balances,
  &__quote {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
  min-height: 40px;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-surface);
  color: var(--s-color-base-content-primary);
  padding: 0 $inner-spacing-small;
  width: 100%;
  box-sizing: border-box;
}
</style>
