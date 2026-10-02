<template>
  <details class="conversion-recovery">
    <summary>{{ t('getTs.replacementTitle') }}</summary>
    <p>{{ t('getTs.replacementDescription') }}</p>
    <label :for="inputId">{{ t('bridgeTransaction.transactionHash') }}</label>
    <input :id="inputId" v-model="replacement" autocomplete="off" spellcheck="false" maxlength="66" />
    <button type="button" :disabled="!canCheck || checking" @click="check">
      {{ t('getTs.checkStatus') }}
    </button>
    <p v-if="state" role="status">{{ t(`getTs.conversionProgress.${state}`) }}</p>
  </details>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Store } from '@/stores/web3';
import ethersUtil from '@/utils/ethers-util';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import type { GetTsConversionProgress } from '@/features/misc/lib/getTsConversionProgress';
import { isGetTsTransactionReference } from '@/features/misc/lib/getTsPlan';
import { verifyGetTsConversionReplacement } from '@/features/misc/lib/getTsConversionRecovery';

/** Explicit, read-only recovery of a sped-up conversion; canonical receipt verification precedes any rebinding. */
const props = withDefaults(defineProps<{ reference: string; purpose?: GetTsPurpose }>(), { purpose: 'ts' });
const emit = defineEmits<{ verified: [progress: GetTsConversionProgress] }>();
const { t } = useTranslation();
const web3 = useWeb3Store();
const inputId = `get-ts-replacement-${useId()}`;
const replacement = ref('');
const checking = ref(false);
const state = ref('');
const context = computed(() =>
  JSON.stringify([
    props.reference,
    props.purpose,
    replacement.value,
    web3.evmAddress,
    web3.evmProviderNetwork,
    web3.evmProvider?.uuid,
  ])
);
const canCheck = computed(
  () =>
    isGetTsTransactionReference(props.reference) &&
    isGetTsTransactionReference(replacement.value) &&
    props.reference.toLowerCase() !== replacement.value.toLowerCase() &&
    !!web3.evmAddress &&
    web3.evmProviderNetwork === 1
);
let generation = 0;
let disposed = false;
watch(
  context,
  () => {
    generation++;
    checking.value = false;
    state.value = '';
  },
  { flush: 'sync' }
);

/** The current wallet, original hash, input hash and provider must remain unchanged throughout the read. */
async function check(): Promise<void> {
  if (!canCheck.value || checking.value) return;
  const request = ++generation;
  const captured = context.value;
  checking.value = true;
  state.value = '';
  try {
    const provider = ethersUtil.getEthersInstance();
    const current = () =>
      !disposed && request === generation && context.value === captured && ethersUtil.getEthersInstance() === provider;
    const result = await verifyGetTsConversionReplacement(
      provider,
      props.reference,
      replacement.value,
      web3.evmAddress,
      props.purpose,
      current
    );
    if (!current()) return;
    if (
      ['received', 'failed'].includes(result.state) &&
      result.reference?.toLowerCase() === replacement.value.toLowerCase()
    )
      emit('verified', result);
    else state.value = result.state === 'pending' ? 'pending' : 'unavailable';
  } catch {
    if (!disposed && request === generation && context.value === captured) state.value = 'unavailable';
  } finally {
    if (request === generation) checking.value = false;
  }
}
onBeforeUnmount(() => {
  disposed = true;
  generation++;
});
</script>
<style scoped lang="scss">
.conversion-recovery {
  margin-top: 16px;
  summary {
    cursor: pointer;
  }
  label {
    display: block;
    margin: 12px 0 8px;
  }
  input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 12px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    color: var(--s-color-base-content-primary);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    font: inherit;
  }
  button {
    margin-top: 12px;
    padding: 10px 16px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    color: var(--s-color-theme-accent);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element);
    font: inherit;
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
}
</style>
