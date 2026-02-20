<template>
  <div class="sccp-page">
    <section class="sccp-card">
      <header class="sccp-header">
        <h1 class="sccp-title">{{ t('sccp.title') }}</h1>
        <p class="sccp-subtitle">{{ t('sccp.subtitle') }}</p>
        <p class="sccp-hint">{{ t('sccp.supportedNetworks', { chains: networkSummary }) }}</p>
      </header>

      <div class="sccp-form-grid">
        <label class="sccp-field">
          <span>{{ t('sccp.sourceNetworkLabel') }}</span>
          <select v-model="sourceNetwork">
            <option v-for="network in networks" :key="network.key" :value="network.key">
              {{ network.name }} ({{ network.symbol }})
            </option>
          </select>
        </label>

        <label class="sccp-field">
          <span>{{ t('sccp.destinationNetworkLabel') }}</span>
          <select v-model="destinationNetwork">
            <option v-for="network in networks" :key="network.key" :value="network.key">
              {{ network.name }} ({{ network.symbol }})
            </option>
          </select>
        </label>

        <label class="sccp-field">
          <span>{{ t('sccp.assetLabel') }}</span>
          <input v-model.trim="asset" type="text" maxlength="12" placeholder="SORA" />
        </label>

        <label class="sccp-field">
          <span>{{ t('sccp.destinationAddressLabel') }}</span>
          <input v-model.trim="destinationAddress" type="text" :placeholder="addressHint" />
          <small v-if="destinationAddress && !isDestinationAddressValid">
            {{ invalidAddressMessage }}
          </small>
        </label>

        <label class="sccp-field">
          <span>{{ t('sccp.amountLabel') }}</span>
          <input v-model.trim="amount" type="number" min="0" step="0.000001" placeholder="0.0" />
        </label>

        <label class="sccp-field">
          <span>{{ t('sccp.noteLabel') }}</span>
          <input v-model.trim="memo" type="text" placeholder="optional" />
        </label>
      </div>

      <div class="sccp-actions">
        <button type="button" :disabled="!canBuildPayload" @click="generatePayload">
          {{ t('sccp.generatePayload') }}
        </button>
        <button type="button" class="sccp-ghost" @click="clearForm">{{ t('sccp.clearPayload') }}</button>
      </div>

      <section class="sccp-output" aria-live="polite">
        <h2>{{ t('sccp.payloadLabel') }}</h2>
        <p v-if="!payloadText">{{ t('sccp.emptyPayloadHelp') }}</p>
        <template v-else>
          <pre>{{ payloadText }}</pre>
          <button type="button" :class="{ 'is-success': copyState === 'copied' }" @click="copyPayload">
            {{ copyButtonText }}
          </button>
        </template>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

type NetworkKey = 'bsc' | 'eth' | 'tron';

type Network = {
  key: NetworkKey;
  name: string;
  symbol: string;
  chainId: string;
  explorer: string;
  note: string;
  supports: string[];
  addressPattern: RegExp;
};

const { t } = useTranslation();

const networkByKey: Record<NetworkKey, Network> = {
  bsc: {
    key: 'bsc',
    name: 'Binance Smart Chain',
    symbol: 'BSC',
    chainId: '56',
    explorer: 'https://bscscan.com',
    note: 'Wallet: 0x...',
    supports: ['BEP-20', 'ERC-20'],
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
  },
  eth: {
    key: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: '1',
    explorer: 'https://etherscan.io',
    note: 'Wallet: 0x...',
    supports: ['ERC-20'],
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
  },
  tron: {
    key: 'tron',
    name: 'TRON',
    symbol: 'TRX',
    chainId: '728126428',
    explorer: 'https://tronscan.org',
    note: 'Wallet: T...',
    supports: ['TRC-20'],
    addressPattern: /^T[a-zA-Z0-9]{33,}$/,
  },
};

const networks = Object.values(networkByKey);
const sourceNetwork = ref<NetworkKey>(networks[0].key);
const destinationNetwork = ref<NetworkKey>(networks[1].key);
const destinationAddress = ref('');
const asset = ref('SORA');
const amount = ref('');
const memo = ref('');
const copyState = ref<'idle' | 'copied' | 'error'>('idle');

const selectedSource = computed(() => networkByKey[sourceNetwork.value]);
const selectedDestination = computed(() => networkByKey[destinationNetwork.value]);
const isDestinationAddressValid = computed(() =>
  selectedDestination.value.addressPattern.test(destinationAddress.value || '')
);
const amountValue = computed(() => {
  const normalized = Number.parseFloat(amount.value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
});
const canBuildPayload = computed(
  () =>
    sourceNetwork.value !== destinationNetwork.value &&
    Boolean(asset.value.trim()) &&
    amountValue.value !== null &&
    Boolean(destinationAddress.value.trim()) &&
    isDestinationAddressValid.value
);
const networkSummary = computed(() => networks.map((item) => item.symbol).join(', '));
const addressHint = computed(() => selectedDestination.value?.note || '');
const invalidAddressMessage = computed(() => `Expected ${selectedDestination.value?.name} address format.`);
const payloadText = computed(() =>
  canBuildPayload.value
    ? JSON.stringify(
        {
          protocol: 'SCCP',
          version: '1.0',
          source: {
            chain: selectedSource.value.key,
            chainId: selectedSource.value.chainId,
            explorer: selectedSource.value.explorer,
          },
          destination: {
            chain: selectedDestination.value.key,
            chainId: selectedDestination.value.chainId,
            explorer: selectedDestination.value.explorer,
            recipient: destinationAddress.value,
          },
          asset: asset.value.toUpperCase(),
          amount: amountValue.value,
          memo: memo.value || undefined,
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    : ''
);

const copyButtonText = computed(() => {
  if (copyState.value === 'copied') {
    return t('sccp.payloadCopied');
  }
  if (copyState.value === 'error') {
    return t('sccp.payloadCopyFailed');
  }
  return t('sccp.copyPayload');
});

const copyPayload = async () => {
  copyState.value = 'idle';
  if (!payloadText.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(payloadText.value);
    copyState.value = 'copied';
  } catch (_err) {
    copyState.value = 'error';
  }
};

const generatePayload = () => {
  if (!canBuildPayload.value) return;
  copyState.value = 'idle';
};

const clearForm = () => {
  sourceNetwork.value = networks[0].key;
  destinationNetwork.value = networks[1].key;
  destinationAddress.value = '';
  asset.value = 'SORA';
  amount.value = '';
  memo.value = '';
  copyState.value = 'idle';
};
</script>

<style lang="scss" scoped>
.sccp-page {
  padding: 0 var(--inner-spacing-medium);
}

.sccp-card {
  border: var(--s-border-width) solid var(--s-color-base-border-primary);
  border-radius: var(--s-border-radius-big);
  margin: 0 auto;
  max-width: 920px;
  padding: var(--s-spacing-medium);
  background: var(--s-color-utility-surface);
}

.sccp-header {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
}

.sccp-title {
  font-size: var(--s-font-size-big);
  margin: 0;
}

.sccp-subtitle {
  margin: 0;
  color: var(--s-color-base-content-secondary);
}

.sccp-hint {
  margin: 6px 0 0 0;
  color: var(--s-color-base-content-tertiary);
}

.sccp-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sccp-field {
  display: grid;
  gap: 8px;

  span {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
  }

  input,
  select {
    border: 1px solid var(--s-color-base-border-primary);
    border-radius: 12px;
    padding: 10px 12px;
    color: var(--s-color-base-content-primary);
    background: var(--s-color-utility-body);
  }

  small {
    color: var(--s-color-status-error);
  }
}

.sccp-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;

  button {
    appearance: none;
    border: 0;
    padding: 10px 14px;
    border-radius: 12px;
    cursor: pointer;
    background: var(--s-color-theme-accent);
    color: var(--s-color-base-on-accent);
  }

  .sccp-ghost {
    background: var(--s-color-utility-body);
    color: var(--s-color-base-content-primary);
    border: 1px solid var(--s-color-base-border-primary);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.sccp-output {
  margin-top: 16px;
  display: grid;
  gap: 10px;

  h2 {
    margin: 0;
    font-size: var(--s-font-size-large);
  }

  pre {
    margin: 0;
    padding: 12px;
    border: 1px solid var(--s-color-base-border-primary);
    border-radius: 10px;
    background: var(--s-color-base-background-secondary);
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .is-success {
    background: var(--s-color-success-base);
  }
}

@media (max-width: 860px) {
  .sccp-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
