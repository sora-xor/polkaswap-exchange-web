<template>
  <section class="claim-wallets" :aria-labelledby="titleId">
    <h2 :id="titleId">{{ t('getTs.walletsTitle') }}</h2>
    <p>{{ t('getTs.onboarding.setupIntroduction') }}</p>
    <div v-if="current === 'ton'" class="claim-wallets__action">
      <h3 ref="currentStepHeading" tabindex="-1">{{ t('getTs.connectTonFirst') }}</h3>
      <p>{{ t('getTs.onboarding.tonPurpose') }}</p>
      <p v-if="ton.address.value && !tonReady" role="alert">{{ t('getTs.conversion.tonMainnet') }}</p>
      <s-button type="primary" native-type="button" :loading="connectingTon" @click="connectTon">{{
        t('getTs.conversion.connectTon')
      }}</s-button>
      <details class="claim-wallets__details">
        <summary>{{ t('getTs.onboarding.tonHelp') }}</summary>
        <p>{{ t('getTs.onboarding.tonHelpText') }}</p>
      </details>
    </div>
    <div v-else-if="current === 'ethereum'" class="claim-wallets__action">
      <h3 ref="currentStepHeading" tabindex="-1">{{ t('getTs.connectEthereum') }}</h3>
      <p>{{ t('getTs.onboarding.ethereumPurpose') }}</p>
      <s-button type="primary" native-type="button" :loading="isConnecting" @click="connectEthereum">{{
        t('getTs.connectEthereum')
      }}</s-button>
      <details class="claim-wallets__details">
        <summary>{{ t('getTs.onboarding.needEthereumWallet') }}</summary>
        <ol class="claim-wallets__instructions">
          <li>{{ t('getTs.onboarding.installEthereum') }}</li>
          <li>{{ t('getTs.onboarding.createEthereum') }}</li>
          <li>{{ t('getTs.onboarding.returnEthereum') }}</li>
        </ol>
        <a href="https://metamask.io/download" target="_blank" rel="noopener noreferrer">
          {{ t('getTs.onboarding.metamaskLink') }}
        </a>
      </details>
    </div>
    <div v-else-if="current === 'sora'" class="claim-wallets__action">
      <h3 ref="currentStepHeading" tabindex="-1">{{ t('getTs.onboarding.soraTitle') }}</h3>
      <p>{{ t(purpose === 'xor' ? 'getTs.onboarding.soraPurposeXor' : 'getTs.onboarding.soraPurposeTs') }}</p>
      <s-button
        v-if="googleWalletAvailable"
        type="primary"
        native-type="button"
        :loading="isSoraAccountDialogVisible"
        @click="connectGoogle"
        >{{ t('getTs.onboarding.googleAction') }}</s-button
      >
      <s-button v-else type="primary" native-type="button" :loading="isSoraAccountDialogVisible" @click="connectSora">{{
        t('getTs.onboarding.chooseSora')
      }}</s-button>
      <p v-if="googleWalletAvailable" class="claim-wallets__help">{{ t('getTs.onboarding.googleSummary') }}</p>
      <details v-if="googleWalletAvailable" class="claim-wallets__details">
        <summary>{{ t('getTs.onboarding.googleHelp') }}</summary>
        <ol class="claim-wallets__instructions">
          <li>{{ t('getTs.onboarding.googleCreate') }}</li>
          <li>{{ t('getTs.onboarding.googleRestore') }}</li>
        </ol>
        <p>{{ t('getTs.onboarding.googleRecovery') }}</p>
      </details>
      <button v-if="googleWalletAvailable" type="button" class="claim-wallets__secondary" @click="connectSora">
        {{ t('getTs.onboarding.otherSora') }}
      </button>
      <details class="claim-wallets__details">
        <summary>{{ t('getTs.onboarding.soraHelp') }}</summary>
        <p>{{ t('getTs.onboarding.soraHelpText') }}</p>
        <a href="https://wiki.sora.org/polkaswap-connect-wallet.html" target="_blank" rel="noopener noreferrer">
          {{ t('getTs.onboarding.soraGuide') }}
        </a>
      </details>
    </div>
    <p v-else ref="currentStepHeading" class="claim-wallets__ready" role="status" tabindex="-1">
      {{ t('getTs.walletsReady') }}
    </p>
    <div v-if="error" role="alert">
      <p>{{ t('getTs.connectionFailed') }}</p>
      <p>{{ t('getTs.onboarding.connectionHelp') }}</p>
    </div>
    <details class="claim-wallets__details claim-wallets__checklist">
      <summary>
        {{ t('getTs.onboarding.walletProgress', { connected: connectedCount, total: requiredWallets.length }) }}
      </summary>
      <ol class="claim-wallets__list">
        <li
          v-for="entry in requiredWallets"
          :key="entry.id"
          :class="{ ready: entry.ready }"
          :aria-current="entry.id === current ? 'step' : undefined"
        >
          <span>{{ t(entry.label) }}</span>
          <span>{{ t(entry.ready ? 'getTs.connected' : 'getTs.required') }}</span>
        </li>
      </ol>
    </details>
    <details v-if="isLoggedIn || evmAddress || ton.address.value" class="claim-wallets__details">
      <summary>{{ t('getTs.walletAddresses') }}</summary>
      <div v-if="source === 'ton' && ton.address.value">
        <strong>{{ t('getTs.tonWallet') }}</strong
        ><code>{{ ton.address.value }}</code
        ><button type="button" @click="connectTon">{{ t('getTs.changeWallet') }}</button>
      </div>
      <div v-if="requiresEthereum && evmAddress">
        <strong>{{ t('getTs.ethereumWallet') }}</strong
        ><code>{{ evmAddress }}</code
        ><button type="button" @click="connectEthereum">{{ t('getTs.changeWallet') }}</button>
      </div>
      <div v-if="isLoggedIn">
        <strong>{{ t('getTs.onboarding.soraWallet') }}</strong
        ><code>{{ soraAddress }}</code
        ><button type="button" @click="connectSora">{{ t('getTs.changeWallet') }}</button>
      </div>
    </details>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { useWalletStore } from '@/stores/wallet';
import { useTonswapTonWallet } from '@/features/misc/composables/useTonswapTonWallet';
import type { GetTsSource } from '@/features/misc/lib/getTsFlow';

/** One explicitly requested wallet connection at a time, starting with the buyer's payment wallet. */
const props = withDefaults(defineProps<{ source: GetTsSource; purpose?: 'ts' | 'xor' }>(), { purpose: 'ts' });
const { t } = useTranslation();
const titleId = `claim-wallets-${useId()}`;
const currentStepHeading = ref<HTMLElement | null>(null);
const { isLoggedIn, soraAddress, isSoraAccountDialogVisible, connectSoraWallet, connectGoogleWallet } =
  useInternalConnect();
const { evmAddress, isConnecting, connectEvmWallet, openSelectProviderDialog } = useWeb3Connection();
const wallet = useWalletStore();
const ton = useTonswapTonWallet();
const error = ref(false);
const connectingTon = ref(false);
const requiresEthereum = computed(() => !['xor', 'sora'].includes(props.source));
const tonReady = computed(() => !!ton.address.value && ton.chain.value === '-239');
const current = computed(() =>
  props.source === 'ton' && !tonReady.value
    ? 'ton'
    : requiresEthereum.value && !evmAddress.value
      ? 'ethereum'
      : !isLoggedIn.value
        ? 'sora'
        : 'ready'
);
const googleWalletAvailable = computed(
  () => wallet.availableWallets?.some((entry) => entry.extensionName === 'google-drive') ?? false
);
const requiredWallets = computed(() => [
  ...(props.source === 'ton' ? [{ id: 'ton', label: 'getTs.tonWallet', ready: tonReady.value }] : []),
  ...(requiresEthereum.value ? [{ id: 'ethereum', label: 'getTs.ethereumWallet', ready: !!evmAddress.value }] : []),
  { id: 'sora', label: 'getTs.onboarding.soraWallet', ready: isLoggedIn.value },
]);
const connectedCount = computed(() => requiredWallets.value.filter((entry) => entry.ready).length);
/** Keeps keyboard and screen-reader position at the new step after the previous action is removed. */
function focusCurrentStep(): void {
  void nextTick(() => currentStepHeading.value?.focus({ preventScroll: true }));
}
onMounted(focusCurrentStep);
watch(
  current,
  () => {
    error.value = false;
    focusCurrentStep();
  },
  { flush: 'post' }
);

/** Opens TON Connect only after a click; an existing wrong-network account can be replaced. */
async function connectTon(): Promise<void> {
  error.value = false;
  connectingTon.value = true;
  try {
    if (ton.address.value) await ton.disconnect();
    await ton.connect();
  } catch {
    error.value = true;
  } finally {
    connectingTon.value = false;
  }
}
/** Uses the standard explicit EVM provider chooser and preserves rejection as a retryable state. */
async function connectEthereum(): Promise<void> {
  error.value = false;
  try {
    if (evmAddress.value) openSelectProviderDialog();
    else await connectEvmWallet();
  } catch {
    error.value = true;
  }
}
/** Google is a SORA account with encrypted backup, not an Ethereum account or a custody transfer. */
async function connectGoogle(): Promise<void> {
  error.value = false;
  try {
    await connectGoogleWallet();
  } catch {
    error.value = true;
  }
}
/** Opens the existing chooser, including its supported creation/import actions. */
async function connectSora(): Promise<void> {
  error.value = false;
  try {
    await connectSoraWallet();
  } catch {
    error.value = true;
  }
}
</script>
<style scoped lang="scss">
.claim-wallets {
  h2 {
    margin: 0 0 12px;
    font-size: 24px;
    line-height: 1.3;
  }
  h3 {
    margin: 0 0 8px;
    font-size: 18px;
  }
  p {
    color: var(--s-color-base-content-secondary);
    line-height: 1.6;
  }
  &__list {
    list-style: none;
    margin: 8px 0;
    padding: 8px 20px;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
  }
  &__list li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 12px 0;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  &__list li + li {
    border-top: 1px solid var(--s-color-base-border-secondary);
  }
  &__list li > span:last-child {
    color: var(--s-color-base-content-secondary);
  }
  &__list li.ready > span:last-child {
    color: var(--s-color-status-success-text);
  }
  &__action {
    padding-block: 8px 16px;
  }
  &__secondary,
  &__details button {
    display: block;
    width: fit-content;
    max-width: 100%;
    min-height: 44px;
    margin-block: 12px 4px;
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    border: 0;
    border-radius: var(--s-border-radius-small);
    padding: 12px 20px;
    color: var(--s-color-action-text);
    font: inherit;
    cursor: pointer;
    text-align: start;
    transition:
      box-shadow 160ms ease,
      color 160ms ease;
  }
  &__secondary:active,
  &__details button:active {
    box-shadow: var(--s-shadow-element);
  }
  &__help {
    font-size: 12px;
  }
  &__details {
    margin-top: 16px;
    font-size: 12px;
  }
  &__instructions {
    padding-inline-start: 20px;
    line-height: 1.6;
    color: var(--s-color-base-content-secondary);
    li + li {
      margin-top: 8px;
    }
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--s-color-action-text);
    overflow-wrap: anywhere;
    line-height: 1.5;
  }
  &__details summary {
    box-sizing: border-box;
    min-height: 44px;
    cursor: pointer;
    padding: 12px 0;
    color: var(--s-color-action-text);
  }
  &__details div {
    padding-top: 16px;
  }
  code {
    display: block;
    overflow-wrap: anywhere;
    margin-top: 8px;
  }
  :is(button, summary, a):focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 4px;
  }
  :deep(.el-button) {
    white-space: normal;
    height: auto;
    min-height: 46px;
    max-width: 100%;
  }
  @media (max-width: 480px) {
    &__list {
      padding-inline: 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &__secondary,
    &__details button {
      transition: none;
    }
  }
}
</style>
