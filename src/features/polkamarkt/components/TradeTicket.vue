<template>
  <aside class="trade-ticket">
    <header class="trade-ticket__header">
      <h2>{{ t('polkamarkt.ticket.title') }}</h2>
      <p v-if="!market">{{ t('polkamarkt.ticket.selectMarket') }}</p>
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
        {{ t(`polkamarkt.modes.${item}`) }}
      </button>
    </div>

    <template v-if="market">
      <div v-if="mode !== 'liquidity' && mode !== 'claim'" class="trade-ticket__outcomes">
        <button
          type="button"
          :aria-pressed="outcome === 'YES'"
          :class="{ active: outcome === 'YES' }"
          data-testid="trade-ticket-outcome-yes"
          @click="outcome = 'YES'"
        >
          <span class="trade-ticket__outcome-heading">
            <strong>{{ t('polkamarkt.outcomes.yes') }}</strong>
            <span>{{ yesSplitFormatted }}</span>
          </span>
          <span class="trade-ticket__outcome-stat">
            <span>{{ t('transaction.price') }}</span>
            <strong>{{ yesPriceFormatted }}</strong>
          </span>
          <span class="trade-ticket__outcome-stat">
            <span>{{ t('polkamarkt.ticket.split') }}</span>
            <strong>{{ yesSplitFormatted }}</strong>
          </span>
        </button>
        <button
          type="button"
          :aria-pressed="outcome === 'NO'"
          :class="{ active: outcome === 'NO' }"
          data-testid="trade-ticket-outcome-no"
          @click="outcome = 'NO'"
        >
          <span class="trade-ticket__outcome-heading">
            <strong>{{ t('polkamarkt.outcomes.no') }}</strong>
            <span>{{ noSplitFormatted }}</span>
          </span>
          <span class="trade-ticket__outcome-stat">
            <span>{{ t('transaction.price') }}</span>
            <strong>{{ noPriceFormatted }}</strong>
          </span>
          <span class="trade-ticket__outcome-stat">
            <span>{{ t('polkamarkt.ticket.split') }}</span>
            <strong>{{ noSplitFormatted }}</strong>
          </span>
        </button>
        <div class="trade-ticket__split" :aria-label="outcomeSplitLabel">
          <span class="trade-ticket__split-yes" :style="{ width: yesSplitWidth }" />
          <span class="trade-ticket__split-no" :style="{ width: noSplitWidth }" />
        </div>
      </div>

      <div v-if="mode !== 'claim'" class="trade-ticket__form">
        <label class="trade-field trade-field--amount">
          <span>{{ amountLabel }}</span>
          <input
            v-model="amount"
            class="polkamarkt-input"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="t('polkamarkt.ticket.amountPlaceholder')"
          />
        </label>

        <label class="trade-field trade-field--slippage">
          <span>{{ t('polkamarkt.ticket.slippage') }}</span>
          <input v-model="slippage" class="polkamarkt-input" inputmode="decimal" autocomplete="off" />
        </label>
      </div>

      <div class="trade-ticket__quote">
        <div>
          <span>{{ quotePrimaryLabel }}</span>
          <strong>{{ quotePrimaryValue }}</strong>
        </div>
        <div>
          <span>{{ t('networkFeeText') }}</span>
          <strong>{{ networkFeeFormatted }}</strong>
        </div>
        <div v-if="mode === 'claim' && claimable">
          <span>{{ t('polkamarkt.ticket.claimable') }}</span>
          <strong>{{ formatCodec(claimable.traderPayout) }} {{ collateralSymbol }}</strong>
        </div>
      </div>

      <p v-if="error" class="trade-ticket__error">{{ error }}</p>
      <p v-else-if="quoteLoading" class="trade-ticket__hint">{{ t('polkamarkt.ticket.refreshingQuote') }}</p>

      <template v-if="mode === 'claim'">
        <div class="trade-ticket__claim-grid">
          <s-button type="primary" :disabled="!canClaimTrader" :loading="loading" @click="submitClaim('market')">
            {{ t('polkamarkt.actions.claimTraderPayout') }}
          </s-button>
          <s-button type="secondary" :disabled="!canClaimCreatorFees" :loading="loading" @click="submitClaim('fees')">
            {{ t('polkamarkt.actions.claimCreatorFees') }}
          </s-button>
          <s-button
            type="secondary"
            :disabled="!canClaimCreatorLiquidity"
            :loading="loading"
            @click="submitClaim('creatorLiquidity')"
          >
            {{ t('polkamarkt.actions.claimCreatorLiquidity') }}
          </s-button>
          <s-button type="secondary" :disabled="!canClaimLp" :loading="loading" @click="submitClaim('lp')">
            {{ t('polkamarkt.actions.claimLpResidual') }}
          </s-button>
        </div>
      </template>

      <s-button
        v-else
        type="primary"
        class="trade-ticket__submit"
        :disabled="submitDisabled"
        :loading="loading"
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
import { isClaimableMarketStatus, yesNoPricesFromProbability } from '../lib/markets';

import type { CodecString } from '@sora-substrate/sdk';
import type { AccountPosition, PolkamarktMarket, TicketOutcome, TradeMode } from '../types';
import type {
  BuyQuote,
  ClaimableInfo,
  FlipQuote,
  LiquidityQuote,
  PolkamarktOutcome,
  SellQuote,
} from '@/lib/substrate/sdk/polkamarkt';

const props = defineProps<{
  market?: PolkamarktMarket;
  accountPosition?: AccountPosition;
}>();

const emit = defineEmits<{
  (event: 'submitted'): void;
}>();

const { t } = useTranslation();
const walletStore = useWalletStore();
const { isLoggedIn, soraAddress, connectSoraWallet } = useInternalConnect();
const { loading, withNotifications } = useTransaction();

const baseModes: TradeMode[] = ['buy', 'sell', 'flip', 'liquidity'];
const mode = ref<TradeMode>('buy');
const outcome = ref<TicketOutcome>('YES');
const amount = ref('');
const slippage = ref('0.5');
const quoteLoading = ref(false);
const error = ref('');
type TradeQuote = BuyQuote | SellQuote | FlipQuote | LiquidityQuote;
type TradeMinimums =
  | { mode: 'buy'; minSharesOut: CodecString }
  | { mode: 'sell'; minCollateralOut: CodecString }
  | { mode: 'flip'; minCollateralOut: CodecString; minSharesOut: CodecString }
  | { mode: 'liquidity'; minLpShares: CodecString };

const quote = ref<TradeQuote | null>(null);
const activeQuoteKey = ref('');
const claimable = ref<ClaimableInfo | null>(null);
const networkFee = ref<CodecString | null>(null);

type MaybeValue<T> = T | { value: T };

const isConnectedSource = isLoggedIn as unknown as MaybeValue<boolean>;
const accountAddressSource = soraAddress as unknown as MaybeValue<string | undefined>;
const isConnected = computed(() =>
  Boolean(typeof isConnectedSource === 'object' ? isConnectedSource.value : isConnectedSource)
);
const accountAddress = computed(() =>
  String(typeof accountAddressSource === 'object' ? (accountAddressSource.value ?? '') : (accountAddressSource ?? ''))
);
const collateralSymbol = KUSD.symbol;
const marketId = computed(() => props.market?.chainId);
const amountCodec = computed(() => {
  try {
    return parsePolkamarktAmount(amount.value || '0');
  } catch {
    return '0';
  }
});
const runtimeOutcome = computed<PolkamarktOutcome>(() => (outcome.value === 'YES' ? 'Yes' : 'No'));
const accountKusd = computed(() => walletStore.accountAssetsAddressTable?.[KUSD.address]);
const accountXor = computed(() => walletStore.accountAssetsAddressTable?.[XOR.address]);
const prices = computed(() => yesNoPricesFromProbability(props.market?.probability));
const yesSplit = computed(() =>
  Number.isFinite(props.market?.probability)
    ? Math.max(0, Math.min(100, Math.round(props.market?.probability ?? 0)))
    : undefined
);
const noSplit = computed(() => (yesSplit.value === undefined ? undefined : 100 - yesSplit.value));
const yesSplitWidth = computed(() => `${yesSplit.value ?? 50}%`);
const noSplitWidth = computed(() => `${noSplit.value ?? 50}%`);
const isClaimModeAvailable = computed(
  () =>
    isClaimableMarketStatus(props.market?.status) ||
    isClaimableMarketStatus(props.accountPosition?.status) ||
    isClaimableMarketStatus(claimable.value?.status)
);
const modes = computed<TradeMode[]>(() => (isClaimModeAvailable.value ? ['claim'] : [...baseModes]));
const currentQuoteKey = computed(() => {
  if (mode.value === 'claim') return '';
  if (!marketId.value && marketId.value !== 0) return '';
  if (!amount.value || !isPositiveCodec(amountCodec.value)) return '';

  return [mode.value, marketId.value, runtimeOutcome.value, amountCodec.value, slippage.value.trim()].join(':');
});
const hasCurrentQuote = computed(() => Boolean(quote.value && activeQuoteKey.value === currentQuoteKey.value));

const amountLabel = computed(() => {
  if (mode.value === 'buy' || mode.value === 'liquidity')
    return t('polkamarkt.ticket.collateralAmount', { symbol: collateralSymbol });
  return t('polkamarkt.ticket.sharesAmount');
});

const hasEnoughKusd = computed(() => {
  if (mode.value !== 'buy' && mode.value !== 'liquidity') return true;
  const balance = accountKusd.value?.balance?.transferable ?? '0';
  return BigInt(balance) >= BigInt(amountCodec.value || '0');
});

const hasEnoughXor = computed(() => {
  const fee = BigInt(networkFee.value || '0');
  if (fee <= 0n) return true;
  const balance = accountXor.value?.balance?.transferable ?? '0';
  return BigInt(balance) >= fee;
});

const disabledReason = computed(() => {
  if (!marketId.value && marketId.value !== 0) return t('polkamarkt.ticket.noChainMarket');
  if (amount.value && !/^\d+(\.\d+)?$/.test(amount.value.trim())) return t('polkamarkt.ticket.invalidAmount');
  if (!amount.value || !isPositiveCodec(amountCodec.value)) return t('polkamarkt.ticket.enterAmount');
  if (!hasEnoughKusd.value) return t('polkamarkt.ticket.insufficientKusd', { symbol: collateralSymbol });
  if (!hasEnoughXor.value) return t('polkamarkt.ticket.insufficientXor');
  if (error.value) return error.value;
  if (currentQuoteKey.value && !hasCurrentQuote.value) return t('polkamarkt.ticket.refreshingQuote');
  return '';
});

const submitDisabled = computed(
  () => isConnected.value && (Boolean(disabledReason.value) || loading.value || quoteLoading.value)
);
const submitLabel = computed(() => {
  if (!isConnected.value) return t('connectWalletText');
  return disabledReason.value || t(`polkamarkt.actions.${mode.value}`);
});

const quotePrimaryLabel = computed(() => {
  if (mode.value === 'buy') return t('polkamarkt.ticket.sharesOut');
  if (mode.value === 'sell') return t('polkamarkt.ticket.collateralOut');
  if (mode.value === 'flip') return t('polkamarkt.ticket.flippedShares');
  if (mode.value === 'liquidity') return t('polkamarkt.ticket.lpSharesOut');
  return t('polkamarkt.ticket.claimStatus');
});

const quotePrimaryValue = computed(() => {
  if (!hasCurrentQuote.value)
    return mode.value === 'claim' ? claimable.value?.status || t('polkamarkt.notIndexed') : t('polkamarkt.notIndexed');
  if (!quote.value) return t('polkamarkt.notIndexed');
  if ('sharesOut' in quote.value) return `${formatCodec(quote.value.sharesOut)} ${t('polkamarkt.units.shares')}`;
  if ('collateralOut' in quote.value) return `${formatCodec(quote.value.collateralOut)} ${collateralSymbol}`;
  if ('lpSharesOut' in quote.value) return `${formatCodec(quote.value.lpSharesOut)} LP`;
  return t('polkamarkt.notIndexed');
});

const networkFeeFormatted = computed(() => {
  if (quoteLoading.value) return t('calculatingText');
  if (!networkFee.value) return t('polkamarkt.notIndexed');
  return `${formatCodec(networkFee.value)} ${XOR.symbol}`;
});
const formatOutcomePrice = (value?: number): string =>
  Number.isFinite(value) ? `${(value ?? 0).toFixed(2)} ${collateralSymbol}` : t('polkamarkt.notIndexed');
const formatOutcomeSplit = (value?: number): string =>
  Number.isFinite(value) ? `${value}%` : t('polkamarkt.notIndexed');
const yesPriceFormatted = computed(() => formatOutcomePrice(prices.value.yes));
const noPriceFormatted = computed(() => formatOutcomePrice(prices.value.no));
const yesSplitFormatted = computed(() => formatOutcomeSplit(yesSplit.value));
const noSplitFormatted = computed(() => formatOutcomeSplit(noSplit.value));
const outcomeSplitLabel = computed(
  () =>
    `${t('polkamarkt.outcomes.yes')} ${yesSplitFormatted.value}, ${t('polkamarkt.outcomes.no')} ${noSplitFormatted.value}`
);
const canClaimTrader = computed(
  () => isClaimModeAvailable.value && isConnected.value && isPositiveCodec(claimable.value?.traderPayout)
);
const canClaimCreatorFees = computed(
  () => isClaimModeAvailable.value && isConnected.value && isPositiveCodec(claimable.value?.creatorFees)
);
const canClaimCreatorLiquidity = computed(
  () => isClaimModeAvailable.value && isConnected.value && isPositiveCodec(claimable.value?.creatorLiquidity)
);
const canClaimLp = computed(() =>
  Boolean(
    isClaimModeAvailable.value &&
    isConnected.value &&
    props.accountPosition?.lpShares &&
    props.accountPosition.lpShares > 0
  )
);

let quoteRequestId = 0;

function formatCodec(value?: CodecString): string {
  return formatPolkamarktCodec(value || '0');
}

function clearTradeQuoteState(): void {
  quoteRequestId += 1;
  quote.value = null;
  activeQuoteKey.value = '';
  networkFee.value = null;
  error.value = '';
  quoteLoading.value = Boolean(currentQuoteKey.value);
}

function isCurrentQuoteRequest(requestId: number, quoteKey: string): boolean {
  return requestId === quoteRequestId && quoteKey === currentQuoteKey.value;
}

function setQuoteFailed(): void {
  error.value = t('polkamarkt.ticket.quoteFailed');
}

function positiveQuoteOutput(value?: CodecString): CodecString | null {
  if (isPositiveCodec(value)) return value as CodecString;
  setQuoteFailed();
  return null;
}

function acceptQuote(
  requestId: number,
  quoteKey: string,
  nextQuote: TradeQuote | null,
  outputs: Array<CodecString | undefined>
): boolean {
  if (!isCurrentQuoteRequest(requestId, quoteKey)) return false;
  if (!nextQuote || outputs.some((value) => !isPositiveCodec(value))) {
    setQuoteFailed();
    return false;
  }

  quote.value = nextQuote;
  activeQuoteKey.value = quoteKey;
  return true;
}

function buildTradeMinimums(): TradeMinimums | null {
  if (!hasCurrentQuote.value || !quote.value) {
    setQuoteFailed();
    return null;
  }

  if (mode.value === 'buy') {
    const sharesOut = positiveQuoteOutput((quote.value as BuyQuote).sharesOut);
    return sharesOut ? { mode: 'buy', minSharesOut: applySlippageMinimum(sharesOut, slippage.value) } : null;
  }

  if (mode.value === 'sell') {
    const collateralOut = positiveQuoteOutput((quote.value as SellQuote).collateralOut);
    return collateralOut
      ? { mode: 'sell', minCollateralOut: applySlippageMinimum(collateralOut, slippage.value) }
      : null;
  }

  if (mode.value === 'flip') {
    const flipQuote = quote.value as FlipQuote;
    const collateralReinvested = positiveQuoteOutput(flipQuote.collateralReinvested);
    const sharesOut = positiveQuoteOutput(flipQuote.sharesOut);
    return collateralReinvested && sharesOut
      ? {
          mode: 'flip',
          minCollateralOut: applySlippageMinimum(collateralReinvested, slippage.value),
          minSharesOut: applySlippageMinimum(sharesOut, slippage.value),
        }
      : null;
  }

  if (mode.value === 'liquidity') {
    const lpSharesOut = positiveQuoteOutput((quote.value as LiquidityQuote).lpSharesOut);
    return lpSharesOut ? { mode: 'liquidity', minLpShares: applySlippageMinimum(lpSharesOut, slippage.value) } : null;
  }

  return null;
}

async function refreshQuote(): Promise<void> {
  const requestId = quoteRequestId;
  const requestQuoteKey = currentQuoteKey.value;

  quote.value = null;
  activeQuoteKey.value = '';
  error.value = '';
  networkFee.value = null;

  if (!marketId.value && marketId.value !== 0) return;

  if (mode.value === 'claim') {
    if (!isClaimModeAvailable.value) return;
    await refreshClaimable(true);
    return;
  }

  if (!amount.value || !isPositiveCodec(amountCodec.value)) return;

  quoteLoading.value = true;
  try {
    if (mode.value === 'buy') {
      const nextQuote = await api.polkamarkt.quoteBuyTrade({
        marketId: marketId.value,
        outcome: runtimeOutcome.value,
        collateralIn: amountCodec.value,
      });
      if (!nextQuote) {
        if (isCurrentQuoteRequest(requestId, requestQuoteKey)) setQuoteFailed();
        return;
      }
      if (!acceptQuote(requestId, requestQuoteKey, nextQuote, [nextQuote.sharesOut])) return;
      const fee = await api.polkamarkt.estimateBuyTradeNetworkFee({
        marketId: marketId.value,
        outcome: runtimeOutcome.value,
        collateralIn: amountCodec.value,
        minSharesOut: applySlippageMinimum(nextQuote.sharesOut, slippage.value),
      });
      if (!isCurrentQuoteRequest(requestId, requestQuoteKey)) return;
      networkFee.value = isPositiveCodec(fee) ? fee : null;
    } else if (mode.value === 'sell') {
      const nextQuote = await api.polkamarkt.quoteSellTrade({
        marketId: marketId.value,
        outcome: runtimeOutcome.value,
        sharesIn: amountCodec.value,
      });
      if (!nextQuote) {
        if (isCurrentQuoteRequest(requestId, requestQuoteKey)) setQuoteFailed();
        return;
      }
      if (!acceptQuote(requestId, requestQuoteKey, nextQuote, [nextQuote.collateralOut])) return;
      const fee = await api.polkamarkt.estimateSellTradeNetworkFee({
        marketId: marketId.value,
        outcome: runtimeOutcome.value,
        sharesIn: amountCodec.value,
        minCollateralOut: applySlippageMinimum(nextQuote.collateralOut, slippage.value),
      });
      if (!isCurrentQuoteRequest(requestId, requestQuoteKey)) return;
      networkFee.value = isPositiveCodec(fee) ? fee : null;
    } else if (mode.value === 'flip') {
      const nextQuote = await api.polkamarkt.quoteFlipPosition({
        marketId: marketId.value,
        fromOutcome: runtimeOutcome.value,
        sharesIn: amountCodec.value,
      });
      if (!nextQuote) {
        if (isCurrentQuoteRequest(requestId, requestQuoteKey)) setQuoteFailed();
        return;
      }
      if (!acceptQuote(requestId, requestQuoteKey, nextQuote, [nextQuote.collateralReinvested, nextQuote.sharesOut]))
        return;
      const fee = await api.polkamarkt.estimateFlipNetworkFee({
        marketId: marketId.value,
        fromOutcome: runtimeOutcome.value,
        sharesIn: amountCodec.value,
        minCollateralOut: applySlippageMinimum(nextQuote.collateralReinvested, slippage.value),
        minSharesOut: applySlippageMinimum(nextQuote.sharesOut, slippage.value),
      });
      if (!isCurrentQuoteRequest(requestId, requestQuoteKey)) return;
      networkFee.value = isPositiveCodec(fee) ? fee : null;
    } else if (mode.value === 'liquidity') {
      const nextQuote = await api.polkamarkt.quoteAddLiquidity({
        marketId: marketId.value,
        collateralAmount: amountCodec.value,
      });
      if (!nextQuote) {
        if (isCurrentQuoteRequest(requestId, requestQuoteKey)) setQuoteFailed();
        return;
      }
      if (!acceptQuote(requestId, requestQuoteKey, nextQuote, [nextQuote.lpSharesOut])) return;
      const fee = await api.polkamarkt.estimateAddLiquidityNetworkFee({
        marketId: marketId.value,
        collateralAmount: amountCodec.value,
        minLpShares: applySlippageMinimum(nextQuote.lpSharesOut, slippage.value),
      });
      if (!isCurrentQuoteRequest(requestId, requestQuoteKey)) return;
      networkFee.value = isPositiveCodec(fee) ? fee : null;
    }
  } catch (err) {
    if (isCurrentQuoteRequest(requestId, requestQuoteKey)) {
      error.value = err instanceof Error ? err.message : t('polkamarkt.ticket.quoteFailed');
    }
  } finally {
    if (isCurrentQuoteRequest(requestId, requestQuoteKey)) {
      quoteLoading.value = false;
    }
  }
}

async function refreshClaimable(estimateNetworkFee = false): Promise<void> {
  claimable.value = null;
  if (estimateNetworkFee) {
    networkFee.value = null;
  }
  if (!isConnected.value || !accountAddress.value || (!marketId.value && marketId.value !== 0)) return;

  if (estimateNetworkFee) {
    quoteLoading.value = true;
  }
  try {
    claimable.value = await api.polkamarkt.getClaimableInfo(accountAddress.value, marketId.value);
    if (estimateNetworkFee) {
      const fee = await api.polkamarkt.estimateClaimMarketNetworkFee(marketId.value);
      networkFee.value = isPositiveCodec(fee) ? fee : null;
    }
  } catch (err) {
    if (estimateNetworkFee) {
      error.value = err instanceof Error ? err.message : t('polkamarkt.ticket.claimableFailed');
    }
  } finally {
    if (estimateNetworkFee) {
      quoteLoading.value = false;
    }
  }
}

async function submit(): Promise<void> {
  if (!isConnected.value) {
    connectSoraWallet();
    return;
  }
  if (submitDisabled.value || (!marketId.value && marketId.value !== 0)) return;

  const minimums = buildTradeMinimums();
  if (!minimums) return;

  await withNotifications(async () => {
    if (minimums.mode === 'buy') {
      await api.polkamarkt.submitBuyTrade({
        marketId: marketId.value!,
        outcome: runtimeOutcome.value,
        collateralIn: amountCodec.value,
        minSharesOut: minimums.minSharesOut,
      });
    } else if (minimums.mode === 'sell') {
      await api.polkamarkt.submitSellTrade({
        marketId: marketId.value!,
        outcome: runtimeOutcome.value,
        sharesIn: amountCodec.value,
        minCollateralOut: minimums.minCollateralOut,
      });
    } else if (minimums.mode === 'flip') {
      await api.polkamarkt.flipPosition({
        marketId: marketId.value!,
        fromOutcome: runtimeOutcome.value,
        sharesIn: amountCodec.value,
        minCollateralOut: minimums.minCollateralOut,
        minSharesOut: minimums.minSharesOut,
      });
    } else if (minimums.mode === 'liquidity') {
      await api.polkamarkt.addLiquidity({
        marketId: marketId.value!,
        collateralAmount: amountCodec.value,
        minLpShares: minimums.minLpShares,
      });
    }
  });

  amount.value = '';
  emit('submitted');
}

async function submitClaim(action: 'market' | 'fees' | 'creatorLiquidity' | 'lp'): Promise<void> {
  if (!isConnected.value) {
    connectSoraWallet();
    return;
  }
  if (!isClaimModeAvailable.value || (!marketId.value && marketId.value !== 0)) return;

  await withNotifications(async () => {
    if (action === 'market') {
      await api.polkamarkt.claimMarket(marketId.value!);
    } else if (action === 'fees') {
      await api.polkamarkt.claimCreatorFees(marketId.value!);
    } else if (action === 'creatorLiquidity') {
      await api.polkamarkt.claimCreatorLiquidity(marketId.value!);
    } else {
      const lpShares = parsePolkamarktAmount(String(props.accountPosition?.lpShares ?? '0'));
      await api.polkamarkt.claimLiquidity(marketId.value!, lpShares);
    }
  });

  emit('submitted');
  await refreshClaimable(true);
}

let quoteTimer: ReturnType<typeof setTimeout> | undefined;
let claimableTimer: ReturnType<typeof setTimeout> | undefined;
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
  [marketId, isConnected, accountAddress],
  () => {
    clearTimeout(claimableTimer);
    claimable.value = null;
    if (!isConnected.value || !accountAddress.value || (!marketId.value && marketId.value !== 0)) return;

    claimableTimer = setTimeout(() => void refreshClaimable(false), 250);
  },
  { immediate: true }
);

watch(
  [marketId, mode, outcome, amount, slippage, isConnected, accountAddress],
  () => {
    clearTimeout(quoteTimer);
    clearTradeQuoteState();
    quoteTimer = setTimeout(() => void refreshQuote(), 250);
  },
  { immediate: true }
);

watch(
  () => props.market?.id,
  () => {
    amount.value = '';
    quote.value = null;
    activeQuoteKey.value = '';
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
      min-width: 56px;
    }
  }

  &__outcomes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $inner-spacing-tiny;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);
    padding: 2px;

    button {
      display: grid;
      align-content: start;
      gap: $inner-spacing-tiny;
      min-height: 88px;
      min-width: 0;
      text-align: left;
      white-space: normal;

      &.active {
        .trade-ticket__outcome-heading,
        .trade-ticket__outcome-heading span,
        .trade-ticket__outcome-heading strong,
        .trade-ticket__outcome-stat,
        .trade-ticket__outcome-stat span,
        .trade-ticket__outcome-stat strong {
          color: var(--s-color-base-on-accent);
        }
      }
    }
  }

  &__tabs,
  &__outcomes {
    button {
      min-height: 32px;
      border: 0;
      border-radius: var(--s-border-radius-mini);
      background: transparent;
      color: var(--s-color-base-content-secondary);
      cursor: pointer;
      font: inherit;
      font-size: var(--s-font-size-small);
      font-weight: 600;
      padding: 0 $inner-spacing-mini;
      transition:
        background 0.15s ease,
        color 0.15s ease;

      &.active {
        background: var(--s-color-theme-accent);
        color: var(--s-color-base-on-accent);
      }
    }
  }

  &__outcomes {
    button {
      min-height: 88px;
      padding: $inner-spacing-mini;
    }
  }

  &__outcome-heading,
  &__outcome-stat {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $inner-spacing-mini;
    min-width: 0;
  }

  &__outcome-heading {
    color: var(--s-color-base-content-primary);

    strong {
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-small);
    }

    span {
      flex: 0 0 auto;
      font-weight: 700;
      color: var(--s-color-theme-accent);
    }
  }

  &__outcome-stat {
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-small);

    span {
      color: var(--s-color-base-content-secondary);
      font-weight: 500;
    }

    strong {
      overflow-wrap: anywhere;
      text-align: right;
      color: var(--s-color-base-content-primary);
      font-weight: 700;
    }
  }

  &__split {
    grid-column: 1 / -1;
    display: flex;
    min-height: 6px;
    overflow: hidden;
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-base-border-secondary);
  }

  &__split-yes,
  &__split-no {
    min-width: 0;
    transition: width 0.15s ease;
  }

  &__split-yes {
    background: var(--s-color-theme-accent);
  }

  &__split-no {
    background: var(--s-color-base-content-secondary);
  }

  &__form {
    display: grid;
    grid-template-columns: 1fr 112px;
    gap: $inner-spacing-mini;

    @include tablet(true) {
      grid-template-columns: 1fr;
    }
  }

  &__quote {
    display: grid;
    gap: $inner-spacing-small;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);
    padding: $inner-spacing-small;

    div {
      display: flex;
      justify-content: space-between;
      gap: $inner-spacing-mini;
      min-width: 0;
    }

    span {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
    }

    strong {
      overflow-wrap: anywhere;
      text-align: right;
      font-size: var(--s-font-size-small);
    }
  }

  &__error {
    color: var(--s-color-status-error);
    font-size: var(--s-font-size-small);
    margin: 0;
  }

  &__hint {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    margin: 0;
  }

  &__submit {
    width: 100%;
  }

  &__claim-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $inner-spacing-small;

    @include tablet(true) {
      grid-template-columns: 1fr;
    }
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
  min-height: 42px;
  width: 100%;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-body);
  color: var(--s-color-base-content-primary);
  padding: 0 $inner-spacing-mini;
  font: inherit;
}
</style>
