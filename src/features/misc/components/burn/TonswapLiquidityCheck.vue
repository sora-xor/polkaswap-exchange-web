<template>
  <section class="liquidity-check" :class="{ 'liquidity-check--compact': compact }" :aria-labelledby="titleId">
    <h3 :id="titleId" :class="{ 'visually-hidden': compact }">{{ t('getTs.liquidity.title') }}</h3>
    <p v-if="!compact">{{ t('getTs.liquidity.description') }}</p>
    <template v-if="amount === undefined">
      <label :for="inputId">{{ t('getTs.liquidity.amount') }}</label>
      <input :id="inputId" v-model="input" inputmode="decimal" autocomplete="off" :disabled="paused" />
    </template>
    <div role="status" aria-live="polite">
      <p v-if="busy">{{ t('getTs.liquidity.checking') }}</p>
      <template v-else-if="result">
        <p v-if="result.allowed" class="liquidity-check__ready">
          {{
            t(`${purpose === 'xor' ? 'buyXor' : 'getTs'}.liquidity.ready`, {
              xor: display(result.spendableXor ?? result.burnableXor ?? result.xor),
            })
          }}
        </p>
        <p v-else class="blocked">{{ t(resultMessage) }}</p>
        <details>
          <summary>{{ t('getTs.liquidity.details') }}</summary>
          <p>
            {{
              t('getTs.liquidity.quote', {
                amount: display(result.amount),
                xor: display(result.xor),
                impact: display(result.impact, 2),
              })
            }}
          </p>
          <p v-if="result.feeReserve !== undefined">
            {{
              t(`${purpose === 'xor' ? 'buyXor' : 'getTs'}.liquidity.feeReserve`, {
                fees: display(result.feeReserve),
                burnable: display(result.burnableXor ?? '0'),
                spendable: display(result.spendableXor ?? '0'),
              })
            }}
          </p>
          <p v-if="result.allowed">{{ t(resultMessage) }}</p>
        </details>
      </template>
      <p v-else-if="failed" class="blocked">{{ t('getTs.liquidity.unavailable') }}</p>
      <p v-else-if="expired">{{ t('getTs.liquidity.expired') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { FPNumber } from '@sora-substrate/sdk';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { Operation } from '@sora-substrate/sdk/build/types';
import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { api } from '@/lib/soraneo-wallet/src/api';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import {
  evaluateTonswapLiquidity,
  isTonswapFundingAmount,
  TONSWAP_LIQUIDITY_TTL_MS,
  SORA_FUNDING_MAINNET_GENESIS,
  type TonswapLiquidityCheck,
} from '@/features/misc/lib/tonswapLiquidity';

/** Mainnet read-only preflight. Never signs, persists quotes, or guarantees later conversion output. */
const props = withDefaults(
  defineProps<{ amount?: string; compact?: boolean; paused?: boolean; purpose?: GetTsPurpose }>(),
  { purpose: 'ts' }
);
const emit = defineEmits<{ checked: [result: TonswapLiquidityCheck] }>();
const { t } = useTranslation();
const settings = useSettingsStore();
const instanceId = useId();
const titleId = `liquidity-check-title-${instanceId}`;
const inputId = `get-ts-dai-check-${instanceId}`;
const input = ref(props.amount ?? '10');
const result = ref<TonswapLiquidityCheck | null>(null);
const busy = ref(false);
const failed = ref(false);
const expired = ref(false);
const validAmount = computed(() => isTonswapFundingAmount(input.value));
const feeEvidence = computed(() => ({
  swapFeeCodec: settings.networkFees?.[Operation.Swap],
  burnFeeCodec: props.purpose === 'ts' ? settings.networkFees?.[Operation.BurnWithRemark] : undefined,
  slippageTolerance: settings.slippageTolerance,
}));
const resultMessage = computed(() => {
  const prefix = props.purpose === 'xor' ? 'buyXor' : 'getTs';
  if (result.value?.allowed) return `${prefix}.liquidity.allowed`;
  if (result.value?.reason === 'fees-unavailable') return `${prefix}.liquidity.feesUnavailable`;
  if (result.value?.reason === 'fees-insufficient') return `${prefix}.liquidity.feesInsufficient`;
  return 'getTs.liquidity.blocked';
});
let generation = 0;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let autoTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;

/** Rounds display only; all checks and emitted amounts retain full on-chain precision. */
function display(value: string, decimals = 6): string {
  const exact = new FPNumber(value);
  const rounded = exact.dp(decimals, 3);
  return exact.gt(FPNumber.ZERO) && rounded.isZero()
    ? `<${new FPNumber('1').div(new FPNumber('10').pow(decimals)).toString()}`
    : rounded.toString();
}

/** Debounces read-only checks and never refreshes during an explicit wallet interaction. */
function schedule(delay = 650): void {
  clearTimeout(autoTimer);
  if (disposed || props.paused || !validAmount.value || !settings.nodeIsConnected) return;
  autoTimer = setTimeout(() => void check(), delay);
}

/** Edits revoke old evidence synchronously before a replacement read is scheduled. */
function restart(): void {
  invalidate();
  failed.value = false;
  expired.value = false;
  schedule();
}

/** Revokes an earlier result immediately, including while a newer RPC is pending. */
function invalidate(): void {
  generation += 1;
  clearTimeout(expiryTimer);
  clearTimeout(autoTimer);
  result.value = null;
  busy.value = false;
  emit('checked', { allowed: false, amount: input.value, xor: '', impact: '', expiresAt: 0 });
}

/** Requests the verified DAI/XOR SMART sources from the connected SORA mainnet node. */
async function check(): Promise<void> {
  if (disposed || props.paused) return;
  invalidate();
  failed.value = false;
  expired.value = false;
  if (!validAmount.value) return;
  const request = generation;
  const requestedAmount = input.value;
  const requestedFees = { ...feeEvidence.value };
  const requestedPurpose = props.purpose;
  const requestedAt = Date.now();
  busy.value = true;
  try {
    const chain = api.connection?.api;
    if (!chain?.isConnected || chain.genesisHash?.toString().toLowerCase() !== SORA_FUNDING_MAINNET_GENESIS)
      throw new Error('Unavailable network');
    const quote = await chain.rpc.liquidityProxy.quote(
      0,
      DAI.address,
      XOR.address,
      new FPNumber(requestedAmount).toCodecString(),
      'WithDesiredInput',
      ['XYKPool', 'OrderBook'],
      'AllowSelected'
    );
    if (request !== generation) return;
    if (
      !chain.isConnected ||
      Date.now() >= requestedAt + TONSWAP_LIQUIDITY_TTL_MS ||
      api.connection?.api !== chain ||
      chain.genesisHash.toString().toLowerCase() !== SORA_FUNDING_MAINNET_GENESIS
    )
      throw new Error('Changed network');
    const output = quote.unwrap();
    const checked = evaluateTonswapLiquidity(
      requestedAmount,
      output.amount.toString(),
      output.amountWithoutImpact.toString(),
      requestedFees,
      requestedAt,
      requestedPurpose
    );
    result.value = checked;
    emit('checked', checked);
    expiryTimer = setTimeout(
      () => {
        invalidate();
        expired.value = true;
        schedule(0);
      },
      Math.max(0, checked.expiresAt - Date.now())
    );
  } catch {
    if (request === generation) {
      invalidate();
      failed.value = true;
      schedule(15_000);
    }
  } finally {
    if (request === generation) busy.value = false;
  }
}
watch(
  () => props.amount,
  (value) => {
    input.value = value ?? '10';
  },
  { flush: 'sync' }
);
watch([input, feeEvidence, () => props.purpose, () => settings.nodeIsConnected, () => settings.soraNetwork], restart, {
  immediate: true,
  flush: 'sync',
});
watch(
  () => props.paused,
  (paused) => {
    clearTimeout(autoTimer);
    if (paused) {
      if (busy.value) invalidate();
    } else if (!result.value || result.value.expiresAt <= Date.now()) {
      schedule(0);
    }
  },
  { flush: 'sync' }
);
onBeforeUnmount(() => {
  disposed = true;
  invalidate();
});
</script>

<style scoped lang="scss">
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
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
.liquidity-check__ready {
  color: var(--s-color-status-success-text);
  font-weight: 500;
}
.liquidity-check {
  box-sizing: border-box;
  min-width: 0;
  padding: 20px;
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-body);
  box-shadow: var(--s-shadow-element-pressed);
  line-height: 1.5;
}
.liquidity-check--compact {
  padding: 4px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
h3 {
  margin: 0 0 8px;
  font-size: 17px;
}
p {
  margin: 8px 0;
  color: var(--s-color-base-content-secondary);
}
label {
  display: block;
  margin: 12px 0 6px;
  color: var(--s-color-base-content-secondary);
  font-size: 13px;
  font-weight: 500;
}
input {
  box-sizing: border-box;
  min-height: 52px;
  max-width: 100%;
  width: 180px;
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
input:disabled {
  color: var(--s-color-base-content-secondary);
  cursor: not-allowed;
}
input:focus-visible {
  border-color: var(--s-color-focus-ring);
}
.blocked {
  color: var(--s-color-status-error-text);
}
:is(input, summary):focus-visible {
  outline: 2px solid var(--s-color-focus-ring);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  input {
    transition: none;
  }
}
</style>
