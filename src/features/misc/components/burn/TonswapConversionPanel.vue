<template>
  <section class="conversion">
    <h3>{{ t(isTon ? 'getTs.conversion.tonTitle' : 'getTs.conversion.ethereumTitle') }}</h3>
    <template v-if="isTon">
      <p>{{ t('getTs.conversion.tonRoute') }}</p>
      <details>
        <summary>{{ t('getTs.conversion.nativeTonHelp') }}</summary>
        <p>
          {{ t('getTs.conversion.nativeTon') }}
          <a href="https://app.ston.fi/swap" target="_blank" rel="noopener noreferrer">STON.fi ↗</a>
        </p>
      </details>
      <button type="button" :disabled="signing" @click="connectTon">
        {{ t(ton.address.value ? 'getTs.conversion.changeTon' : 'getTs.conversion.connectTon') }}
      </button>
      <p v-if="ton.chain.value && ton.chain.value !== '-239'" role="alert">{{ t('getTs.conversion.tonMainnet') }}</p>
    </template>
    <div class="conversion__payment">
      <div v-if="!isTon">
        <label :for="sourceId">{{ t('getTs.conversion.payWith') }}</label>
        <select :id="sourceId" v-model="evmSource" :disabled="signing">
          <option value="eth">ETH</option>
          <option value="usdt-ethereum">USDT</option>
        </select>
      </div>
      <div>
        <label :for="amountId">{{ t('getTs.conversion.amount', { symbol: sourceSymbol }) }}</label>
        <input :id="amountId" v-model="amount" inputmode="decimal" autocomplete="off" :disabled="signing" />
      </div>
    </div>
    <button
      v-if="!isTon && evmSource === 'eth'"
      class="conversion__budget"
      type="button"
      :disabled="signing || budgeting || !evmAddress"
      @click="useAvailableEth"
    >
      {{ t(budgeting ? 'getTs.conversion.calculatingBudget' : 'getTs.conversion.useAvailableEth') }}
    </button>
    <p v-if="budgetEstimated">{{ t('getTs.conversion.budgetEstimated') }}</p>
    <p v-if="quoting" role="status">{{ t('getTs.conversion.quoting') }}</p>
    <button v-if="wrongEthereumNetwork" type="button" :disabled="signing" @click="switchEthereum">
      {{ t('getTs.conversion.switchEthereum') }}
    </button>

    <div v-if="quote" class="conversion__quote" aria-live="polite">
      <p class="conversion__receive">
        {{ t('getTs.conversion.receive') }}:
        <strong>{{ display(quote.outputAmount, quote.outputDecimals) }} {{ targetSymbol }}</strong>
      </p>
      <tonswap-liquidity-check
        :key="quote.quotedAt"
        compact
        :paused="signing"
        :purpose="purpose"
        :amount="liquidityAmount"
        @checked="liquidity = $event"
      />
      <p v-if="isTon">{{ t('getTs.conversion.tonLiquidity') }}</p>
      <details>
        <summary>{{ t('getTs.conversion.details') }}</summary>
        <p>
          {{ t('getTs.conversion.destination') }} <code>{{ evmAddress }}</code>
        </p>
        <dl>
          <div>
            <dt>{{ t('getTs.conversion.minimum') }}</dt>
            <dd>{{ display(quote.minOutputAmount, quote.outputDecimals) }} {{ targetSymbol }}</dd>
          </div>
          <div>
            <dt>{{ t('getTs.conversion.impact') }}</dt>
            <dd>{{ rounded(quote.priceImpactPercent, 2) }}%</dd>
          </div>
          <div>
            <dt>{{ t('getTs.conversion.nativeAttachment') }}</dt>
            <dd>{{ display(quote.nativeValue, isTon ? 9 : 18) }} {{ isTon ? 'TON' : 'ETH' }}</dd>
          </div>
          <div v-for="(fee, index) in quote.fees" :key="index">
            <dt>{{ t('getTs.conversion.providerFee') }}</dt>
            <dd>{{ display(fee.amount, fee.decimals) }} {{ fee.symbol }}</dd>
          </div>
          <div v-if="bridgeGasReserve !== null">
            <dt>{{ t('getTs.conversion.bridgeReserve') }}</dt>
            <dd>{{ display(bridgeGasReserve, 18) }} ETH</dd>
          </div>
        </dl>
        <p>{{ t('getTs.conversion.gas') }}</p>
        <p>{{ t('getTs.conversion.feeNote') }}</p>
        <p v-if="bridgeGasReserve !== null">{{ t('getTs.conversion.bridgeReserveNote') }}</p>
      </details>
      <p v-if="!fresh" role="status">{{ t('getTs.conversion.expired') }}</p>
      <p v-if="!conversionImpactAllowed" class="conversion__error" role="alert">
        {{ t('getTs.preview.reason.conversion-impact') }}
      </p>
      <button
        v-if="quote.executionEnabled"
        class="conversion__primary"
        type="button"
        :disabled="!canExecute"
        @click="execute"
      >
        {{ t(signing ? 'getTs.conversion.signing' : 'getTs.conversion.reviewWallet') }}
      </button>
      <template v-else>
        <p>{{ t('getTs.conversion.providerStep') }}</p>
        <a
          v-if="fundingAllowed"
          class="conversion__provider"
          :href="TONSWAP_CONVERSION_APP_URL"
          target="_blank"
          rel="noopener noreferrer"
          >{{ t('getTs.conversion.openProvider') }} ↗</a
        >
      </template>
    </div>
    <p v-if="error" class="conversion__error" role="alert">{{ t(`getTs.conversion.errors.${error}`) }}</p>
    <p v-if="submitted" role="status">
      {{ t('getTs.conversion.submitted') }}
      <a v-if="transactionUrl" :href="transactionUrl" target="_blank" rel="noopener noreferrer"
        >{{ t('getTs.conversion.viewTransaction') }} ↗</a
      >
    </p>
    <button v-if="isTon" type="button" :disabled="signing" @click="useEthereumFunds">
      {{ t('getTs.conversion.continueEthereum') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { FPNumber } from '@sora-substrate/sdk';
import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Store } from '@/stores/web3';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { getTonswapTonWallet, useTonswapTonWallet } from '@/features/misc/composables/useTonswapTonWallet';
import TonswapLiquidityCheck from '@/features/misc/components/burn/TonswapLiquidityCheck.vue';
import type { TonswapLiquidityCheck as LiquidityResult } from '@/features/misc/lib/tonswapLiquidity';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { isSwapPriceImpactAllowed } from '@/features/swap/services/priceImpactLimit';
import { isGetTsTransactionReference } from '@/features/misc/lib/getTsPlan';
import { readGetTsConversionProgress } from '@/features/misc/lib/getTsConversionProgress';
import {
  TONSWAP_CONVERSION_APP_URL,
  TonswapConversionError,
  requestTonswapConversionQuote,
  executeTonswapConversionQuote,
  estimateTonswapBridgeGasReserve,
  isTonswapConversionQuoteFresh,
  tonswapConversionAmountToCodec,
  type TonswapConversionQuote,
  type TonswapConversionSource,
} from '@/features/misc/lib/tonswapConversion';
import ethersUtil from '@/utils/ethers-util';

/** Wallet-owned funding conversion. Quote, approval, transaction, and receipt are separate user-visible stages. */
const props = withDefaults(
  defineProps<{
    purpose?: GetTsPurpose;
    source: 'ethereum' | 'ton';
    paymentAsset?: 'eth' | 'usdt-ethereum';
    paymentAmount?: string;
    daiIntent?: string;
    /** Optional gross ETH budget for the explicit after-fees amount suggestion. */
    ethBudget?: string;
  }>(),
  { purpose: 'ts' }
);
const emit = defineEmits<{
  'update:paymentAsset': [asset: 'eth' | 'usdt-ethereum'];
  'update:paymentAmount': [amount: string];
  'phase-change': [phase: 'ton' | 'ethereum'];
  submitted: [result: { transactionHash: string }];
  preparing: [value: boolean];
  completed: [result: { receivedAsset: 'DAI' | 'ETH'; amount: string; transactionHash: string }];
}>();
const { t } = useTranslation();
const { evmAddress } = useWeb3Connection();
const web3 = useWeb3Store();
const instanceId = useId();
const sourceId = `get-ts-conversion-source-${instanceId}`;
const amountId = `get-ts-conversion-amount-${instanceId}`;
const ton = useTonswapTonWallet();
const ethereumPhase = ref(false);
const evmSource = ref<'eth' | 'usdt-ethereum'>(props.paymentAsset ?? 'eth');
const amount = ref(props.paymentAmount ?? '');
const quote = ref<TonswapConversionQuote | null>(null);
const downstreamQuote = ref<TonswapConversionQuote | null>(null);
const bridgeGasReserve = ref<string | null>(null);
const liquidity = ref<LiquidityResult | null>(null);
const quoting = ref(false);
const signing = ref(false);
const budgeting = ref(false);
const budgetEstimated = ref(false);
const error = ref('');
const submitted = ref(false);
const transactionUrl = ref('');
const wrongEthereumNetwork = ref(false);
const now = ref(Date.now());
const clock = setInterval(() => {
  now.value = Date.now();
  if (quote.value && !fresh.value && !signing.value && !quoting.value) scheduleQuote(0);
}, 1_000);
let generation = 0;
let controller: AbortController | undefined;
let autoTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
const isTon = computed(() => props.source === 'ton' && !ethereumPhase.value);
const conversionSource = computed<TonswapConversionSource>(() => (isTon.value ? 'usdt-ton' : evmSource.value));
const sourceSymbol = computed(() => (conversionSource.value === 'eth' ? 'ETH' : 'USDT'));
const targetSymbol = computed(() => (isTon.value ? 'ETH' : 'DAI'));
const busy = computed(() => quoting.value || signing.value || budgeting.value);
const canQuote = computed(() => {
  if (!evmAddress.value || (isTon.value && (!ton.address.value || ton.chain.value !== '-239'))) return false;
  try {
    tonswapConversionAmountToCodec(amount.value, conversionSource.value === 'eth' ? 18 : 6);
    return true;
  } catch {
    return false;
  }
});
const fresh = computed(
  () =>
    !!quote.value &&
    isTonswapConversionQuoteFresh(quote.value, now.value) &&
    (!isTon.value || (!!downstreamQuote.value && isTonswapConversionQuoteFresh(downstreamQuote.value, now.value)))
);
const liquidityAmount = computed(() =>
  isTon.value
    ? downstreamQuote.value
      ? natural(downstreamQuote.value.outputAmount, downstreamQuote.value.outputDecimals)
      : undefined
    : quote.value
      ? natural(quote.value.outputAmount, quote.value.outputDecimals)
      : undefined
);
const conversionImpactAllowed = computed(
  () =>
    isSwapPriceImpactAllowed(quote.value?.priceImpactPercent, '5') &&
    (!isTon.value || isSwapPriceImpactAllowed(downstreamQuote.value?.priceImpactPercent, '5'))
);
const fundingAllowed = computed(
  () =>
    fresh.value &&
    !!liquidity.value?.allowed &&
    (liquidityAmount.value === undefined || liquidity.value.amount === liquidityAmount.value) &&
    liquidity.value.expiresAt > now.value &&
    conversionImpactAllowed.value
);
const canExecute = computed(() => !busy.value && fundingAllowed.value && !!quote.value?.executionEnabled);

/** Formats codec strings exactly; no token amount passes through a floating-point number. */
function natural(value: string, decimals: number): string {
  return FPNumber.fromCodecValue(value, decimals).toString();
}
/** Rounded display never changes the exact amounts sent to an adapter or downstream check. */
function rounded(value: string, decimals = 6): string {
  const exact = new FPNumber(value);
  const shortened = exact.dp(decimals, 3);
  return exact.gt(FPNumber.ZERO) && shortened.isZero()
    ? `<${new FPNumber('1').div(new FPNumber('10').pow(decimals)).toString()}`
    : shortened.toString();
}
/** Formats a codec amount for display while retaining exact quote values internally. */
function display(value: string, decimals: number): string {
  return rounded(natural(value, decimals));
}
/** Schedules read-only quotes; an explicit wallet action freezes the reviewed quote. */
function scheduleQuote(delay = 650): void {
  clearTimeout(autoTimer);
  if (disposed || signing.value || budgeting.value || submitted.value || !canQuote.value) return;
  autoTimer = setTimeout(() => void getQuote(), delay);
}
/** Revokes old consent and debounces the replacement quote after an edit. */
function restart(): void {
  invalidate();
  scheduleQuote();
}
/** Clears stale terms on any amount, account, chain, source, or step change. */
function invalidate(clearBudget = true): void {
  generation += 1;
  controller?.abort();
  clearTimeout(autoTimer);
  quote.value = null;
  downstreamQuote.value = null;
  bridgeGasReserve.value = null;
  liquidity.value = null;
  if (clearBudget) budgetEstimated.value = false;
  quoting.value = false;
  error.value = '';
  submitted.value = false;
  transactionUrl.value = '';
}
/**
 * Explicit read-only amount suggestion capped by the observed wallet balance and optional ETH budget.
 * A half-budget probe supplies current route gas; retain twice that gas, the bridge reserve and provider fee.
 * This is an estimate, so the resulting full-size quote and final adapter gas checks still run independently.
 */
async function useAvailableEth(): Promise<void> {
  if (signing.value || budgeting.value || isTon.value || evmSource.value !== 'eth' || !evmAddress.value) return;
  invalidate();
  const request = generation;
  const account = evmAddress.value;
  budgeting.value = true;
  let applied = false;
  try {
    const limit = props.ethBudget === undefined ? null : BigInt(tonswapConversionAmountToCodec(props.ethBudget, 18));
    const provider = ethersUtil.getEthersInstance();
    const [network, initialBalance] = await Promise.all([provider.getNetwork(), provider.getBalance(account)]);
    if (request !== generation) return;
    if (network.chainId !== 1n) throw new TonswapConversionError('WALLET_MISMATCH');
    const initialCap = limit !== null && limit < initialBalance ? limit : initialBalance;
    if (initialCap < 2n) throw new TonswapConversionError('INSUFFICIENT_GAS');
    const probe = await requestTonswapConversionQuote({
      source: 'eth',
      target: 'dai',
      amount: natural((initialCap / 2n).toString(), 18),
      fromAddress: account,
      toAddress: account,
    });
    if (request !== generation) return;
    if (!probe.executionEnabled || probe.transaction.type !== 'evm' || !isTonswapConversionQuoteFresh(probe))
      throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
    const signer = await ethersUtil.getSigner();
    const transaction = probe.transaction;
    const [gas, feeData, balance, signerAddress, currentNetwork] = await Promise.all([
      signer.estimateGas({ chainId: 1, to: transaction.to, data: transaction.data, value: BigInt(transaction.value) }),
      provider.getFeeData(),
      provider.getBalance(account),
      signer.getAddress(),
      provider.getNetwork(),
    ]);
    if (request !== generation) return;
    if (!isTonswapConversionQuoteFresh(probe)) throw new TonswapConversionError('EXPIRED');
    if (currentNetwork.chainId !== 1n || signerAddress.toLowerCase() !== account.toLowerCase())
      throw new TonswapConversionError('WALLET_MISMATCH');
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const bridgeReserve = estimateTonswapBridgeGasReserve(gasPrice);
    if (gas <= 0n) throw new TonswapConversionError('INSUFFICIENT_GAS');
    const reserve = bridgeReserve + gas * 2n * gasPrice + BigInt(probe.nativeFee);
    const cap = limit !== null && limit < balance ? limit : balance;
    if (cap <= reserve) throw new TonswapConversionError('INSUFFICIENT_GAS');
    amount.value = natural((cap - reserve).toString(), 18);
    budgetEstimated.value = true;
    applied = true;
  } catch (cause) {
    if (request === generation)
      error.value =
        cause instanceof TonswapConversionError
          ? ((
              { WALLET_MISMATCH: 'walletChanged', INSUFFICIENT_GAS: 'gas', NO_ROUTE: 'noRoute' } as Record<
                string,
                string
              >
            )[cause.code] ?? 'quote')
          : cause && typeof cause === 'object' && 'code' in cause && cause.code === 'INSUFFICIENT_FUNDS'
            ? 'gas'
            : 'quote';
  } finally {
    budgeting.value = false;
    if (applied || request !== generation) scheduleQuote(0);
  }
}
/** Opens TON Connect only after the user requests it. */
async function connectTon(): Promise<void> {
  try {
    if (ton.address.value) await ton.disconnect();
    await ton.connect();
  } catch {
    error.value = 'wallet';
  }
}
/** Wallet network changes are explicit and restricted to Ethereum mainnet. */
async function switchEthereum(): Promise<void> {
  invalidate();
  try {
    await ethersUtil.getEthersInstance().send('wallet_switchEthereumChain', [{ chainId: '0x1' }]);
    wrongEthereumNetwork.value = false;
    scheduleQuote(0);
  } catch {
    error.value = 'wallet';
  }
}
/** Quotes the fixed supported pair for the currently connected recipient, with cancellation on edits. */
async function getQuote(): Promise<void> {
  if (disposed || signing.value || budgeting.value || submitted.value) return;
  invalidate(false);
  if (!canQuote.value) return;
  const request = generation;
  quoting.value = true;
  const pendingController = new AbortController();
  controller = pendingController;
  const requested = {
    source: conversionSource.value,
    target: isTon.value ? ('eth' as const) : ('dai' as const),
    amount: amount.value,
    fromAddress: isTon.value ? ton.address.value : evmAddress.value,
    toAddress: evmAddress.value,
  };
  try {
    const network = await ethersUtil.getEthersInstance().getNetwork();
    if (network.chainId !== 1n) {
      wrongEthereumNetwork.value = true;
      throw new TonswapConversionError('INVALID_REQUEST');
    }
    wrongEthereumNetwork.value = false;
    if (request !== generation) return;
    const result = await requestTonswapConversionQuote(requested, { signal: pendingController.signal });
    if (request !== generation) return;
    let downstream: TonswapConversionQuote | null = null;
    if (requested.source === 'usdt-ton') {
      // The original plan may be missing or edited. Bind the preflight to this route's current minimum ETH.
      downstream = await requestTonswapConversionQuote(
        {
          source: 'eth',
          target: 'dai',
          amount: natural(result.minOutputAmount, result.outputDecimals),
          fromAddress: requested.toAddress,
          toAddress: requested.toAddress,
        },
        { signal: pendingController.signal }
      );
      if (request !== generation) return;
    }
    let reserve: string | null = null;
    if (result.transaction.type === 'evm') {
      const feeData = await ethersUtil.getEthersInstance().getFeeData();
      reserve = estimateTonswapBridgeGasReserve(feeData.maxFeePerGas ?? feeData.gasPrice).toString();
    }
    if (request === generation) {
      if (!isTonswapConversionQuoteFresh(result) || (downstream && !isTonswapConversionQuoteFresh(downstream)))
        throw new TonswapConversionError('EXPIRED');
      now.value = Date.now();
      bridgeGasReserve.value = reserve;
      downstreamQuote.value = downstream;
      quote.value = result;
    }
  } catch (cause) {
    if (request === generation)
      error.value = cause instanceof TonswapConversionError && cause.code === 'NO_ROUTE' ? 'noRoute' : 'quote';
  } finally {
    if (request === generation) {
      quoting.value = false;
      if (!quote.value) scheduleQuote(15_000);
    }
  }
}
/** Persists the submitted hash before waiting; completion uses only the exact canonical transaction receipt. */
async function execute(): Promise<void> {
  if (
    !canExecute.value ||
    !quote.value ||
    !isTonswapConversionQuoteFresh(quote.value) ||
    !liquidity.value ||
    liquidity.value.expiresAt <= Date.now()
  )
    return;
  const reviewed = quote.value;
  const reviewedLiquidity = liquidity.value;
  const request = generation;
  signing.value = true;
  emit('preparing', true);
  clearTimeout(autoTimer);
  error.value = '';
  try {
    const provider = ethersUtil.getEthersInstance();
    const current = () =>
      !disposed &&
      request === generation &&
      evmAddress.value.toLowerCase() === reviewed.request.toAddress.toLowerCase() &&
      web3.evmProviderNetwork === 1 &&
      ethersUtil.getEthersInstance() === provider;
    const hash = await executeTonswapConversionQuote(reviewed, {
      canContinue: () =>
        request === generation &&
        quote.value === reviewed &&
        liquidity.value === reviewedLiquidity &&
        !!liquidity.value?.allowed &&
        liquidity.value.expiresAt > Date.now(),
      evm: { getSigner: () => ethersUtil.getSigner() },
      ton: {
        getAddress: async () => ton.address.value,
        getChain: async () => (await getTonswapTonWallet()).account?.chain ?? '-3',
        sendTransaction: async (transaction) => {
          const result = await (
            await getTonswapTonWallet()
          ).sendTransaction({ validUntil: transaction.validUntil, messages: transaction.messages, network: '-239' });
          return result.boc;
        },
      },
    });
    if (reviewed.transaction.type !== 'evm' || !isGetTsTransactionReference(hash))
      throw new Error('Invalid submitted transaction');
    // The reviewed send may succeed while the wallet switches accounts. Retain
    // its hash before suppressing stale-context confirmation, so it cannot be retried blindly.
    submitted.value = true;
    quote.value = null;
    liquidity.value = null;
    transactionUrl.value = `https://etherscan.io/tx/${hash}`;
    emit('submitted', { transactionHash: hash });
    await nextTick();
    if (!current()) return;
    await provider.waitForTransaction(hash, 1, 180_000);
    if (!current()) return;
    const progress = await readGetTsConversionProgress(provider, hash, reviewed.request.toAddress, current);
    if (!current()) return;
    if (progress.state === 'received' && progress.amount)
      emit('completed', { receivedAsset: 'DAI', amount: progress.amount, transactionHash: hash });
    else if (progress.state === 'failed' || progress.state === 'unavailable') error.value = 'transaction';
  } catch (cause) {
    if (request === generation)
      error.value =
        cause instanceof TonswapConversionError
          ? ((
              { EXPIRED: 'refresh', WALLET_MISMATCH: 'walletChanged', INSUFFICIENT_GAS: 'gas' } as Record<
                string,
                string
              >
            )[cause.code] ?? 'transaction')
          : 'transaction';
  } finally {
    signing.value = false;
    emit('preparing', false);
    if (!submitted.value) scheduleQuote(0);
  }
}
/** Continues from observed Ethereum funds without claiming that a cross-chain transfer completed. */
function useEthereumFunds(): void {
  emit('phase-change', 'ethereum');
  ethereumPhase.value = true;
  if (evmSource.value === 'eth') emit('update:paymentAsset', 'eth');
  else evmSource.value = 'eth';
  if (amount.value === '') emit('update:paymentAmount', '');
  else amount.value = '';
  invalidate();
}
watch(
  () => props.paymentAsset,
  (value) => {
    if (value) evmSource.value = value;
  },
  { flush: 'sync' }
);
watch(
  () => props.paymentAmount,
  (value) => {
    if (value !== undefined) amount.value = value;
  },
  { flush: 'sync' }
);
watch(evmSource, (value) => emit('update:paymentAsset', value), { flush: 'sync' });
watch(amount, (value) => emit('update:paymentAmount', value), { flush: 'sync' });
watch(
  [
    amount,
    conversionSource,
    evmAddress,
    ton.address,
    ton.chain,
    () => web3.evmProviderNetwork,
    () => web3.evmProvider,
    () => props.daiIntent,
    () => props.ethBudget,
    () => props.purpose,
  ],
  restart,
  { immediate: true, flush: 'sync' }
);
watch(
  () => props.source,
  (source) => {
    emit('phase-change', source === 'ton' ? 'ton' : 'ethereum');
    ethereumPhase.value = false;
    restart();
  },
  { immediate: true, flush: 'sync' }
);
onBeforeUnmount(() => {
  disposed = true;
  invalidate();
  clearInterval(clock);
});
</script>

<style scoped lang="scss">
.conversion__payment {
  display: grid;
  grid-template-columns: #{'minmax(112px, 1fr) minmax(0, 3fr)'};
  gap: 12px;
  > div {
    min-width: 0;
  }
}
.conversion__payment > div:only-child {
  grid-column: 1 / -1;
}
summary {
  box-sizing: border-box;
  min-height: 44px;
  padding-block: 12px;
  cursor: pointer;
  color: var(--s-color-base-content-secondary);
  font-size: 13px;
  font-weight: 500;
}
details {
  margin: 12px 0;
}
.conversion__receive {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 0;
  font-size: 14px;
  strong {
    color: var(--s-color-base-content-primary);
    font-size: 21px;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
}
.conversion {
  margin-top: 24px;
  min-width: 0;
  line-height: 1.5;
  color: var(--s-color-base-content-primary);
}
h3 {
  font-size: 20px;
  margin: 0 0 12px;
}
p {
  color: var(--s-color-base-content-secondary);
  margin: 10px 0;
}
label {
  display: block;
  margin: 16px 0 6px;
  color: var(--s-color-base-content-secondary);
  font-size: 13px;
  font-weight: 500;
}
input,
select {
  box-sizing: border-box;
  min-height: 52px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  padding: 12px 16px;
  border: 1px solid transparent;
  border-radius: var(--s-border-radius-base);
  background: var(--s-color-utility-body);
  box-shadow: var(--s-shadow-element);
  color: var(--s-color-base-content-primary);
  font: inherit;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.125s ease-in-out;
}
input:focus-visible,
select:focus-visible {
  border-color: var(--s-color-focus-ring);
}
button {
  box-sizing: border-box;
  min-height: 44px;
  max-width: 100%;
  padding: 12px 16px;
  margin-block: 12px;
  margin-inline: 0 10px;
  border-radius: var(--s-border-radius-small);
  border: 1px solid transparent;
  background: var(--s-color-utility-surface);
  box-shadow: var(--s-shadow-element-pressed);
  color: var(--s-color-base-content-primary);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.125s ease-in-out,
    box-shadow 0.125s ease-in-out;
}
button:hover:not(:disabled) {
  background: var(--s-color-utility-body);
}
button:active:not(:disabled) {
  box-shadow: var(--s-shadow-element);
}
button:disabled {
  color: var(--s-color-on-action-disabled);
  background: var(--s-color-action-disabled-fill);
  box-shadow: var(--s-shadow-element);
  cursor: not-allowed;
}
input:disabled,
select:disabled {
  color: var(--s-color-base-content-secondary);
  cursor: not-allowed;
}
code {
  display: block;
  overflow-wrap: anywhere;
  font-size: 12px;
}
a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--s-color-action-text);
  text-underline-offset: 3px;
}
dl div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 0;
}
dd {
  min-width: 0;
  margin: 0;
  text-align: end;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.conversion__quote {
  margin: 20px 0;
  padding: 20px;
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-body);
  box-shadow: var(--s-shadow-element-pressed);
  dl {
    margin: 12px 0;
    font-size: 13px;
  }
}
.conversion__primary,
.conversion__provider {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  width: 100%;
  margin: 16px 0 0;
  padding: 14px 20px;
  border: 1px solid transparent;
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-action-fill);
  box-shadow: var(--s-shadow-element-pressed);
  color: var(--s-color-on-action);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition:
    background-color 0.125s ease-in-out,
    box-shadow 0.125s ease-in-out;
}
.conversion__primary:hover:not(:disabled),
.conversion__provider:hover {
  background: var(--s-color-action-fill-hover);
}
.conversion__provider:active {
  box-shadow: var(--s-shadow-element);
}
.conversion__primary:disabled {
  color: var(--s-color-on-action-disabled);
  background: var(--s-color-action-disabled-fill);
  box-shadow: var(--s-shadow-element);
}
.conversion > p[role='status'] {
  padding: 14px 16px;
  border-radius: var(--s-border-radius-base);
  background: var(--s-color-utility-body);
  box-shadow: var(--s-shadow-element);
}
.conversion__error {
  color: var(--s-color-status-error-text);
}
:is(input, select, button, a, summary):focus-visible {
  outline: 2px solid var(--s-color-focus-ring);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  input,
  select,
  button,
  .conversion__provider {
    transition: none;
  }
}
</style>
