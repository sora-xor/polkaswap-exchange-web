<template>
  <details class="nexus-recovery" @toggle="onToggle">
    <summary>{{ t('burnPage.nexusRecovery.title') }}</summary>
    <div class="nexus-recovery__fields" role="group" :aria-label="t('burnPage.nexusRecovery.title')">
      <p>{{ t('burnPage.nexusRecovery.intro') }}</p>
      <label>
        <span>{{ t('burnPage.nexusRecovery.addressLabel') }}</span>
        <input
          v-model="expectedAddress"
          data-testid="nexus-recovery-address"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          @input="invalidateResult"
          @keydown.enter.prevent.stop="checkBackup"
        />
      </label>
      <label>
        <span>{{ t('burnPage.nexusRecovery.phraseLabel') }}</span>
        <input
          v-model="phrase"
          data-testid="nexus-recovery-phrase"
          type="password"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          @input="invalidateResult"
          @keydown.enter.prevent.stop="checkBackup"
        />
      </label>
      <div class="nexus-recovery__actions">
        <s-button
          data-testid="nexus-recovery-check"
          type="primary"
          native-type="button"
          :disabled="!phrase.trim() || !expectedAddress.trim()"
          @click="checkBackup"
        >
          {{ t('burnPage.nexusRecovery.check') }}
        </s-button>
        <button data-testid="nexus-recovery-clear" type="button" class="nexus-recovery__clear" @click="clear">
          {{ t('burnPage.nexusRecovery.clear') }}
        </button>
      </div>
      <p v-if="failed" role="alert">{{ t('burnPage.nexusRecovery.failed') }}</p>
      <div
        v-if="result"
        role="status"
        data-testid="nexus-recovery-result"
        :data-recovery-format="result.recoveryFormat"
      >
        <p>{{ t('burnPage.nexusRecovery.matched') }}</p>
        <code>{{ result.address }}</code>
        <!-- A match proves only that the words reproduce the address; say what cannot be done with it. -->
        <p class="nexus-recovery__limits" data-testid="nexus-recovery-limits">{{ t(limitsKey) }}</p>
      </div>
    </div>
  </details>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { recoverSoraNexusAccount, type SoraNexusRecoveryFormat } from '@/features/misc/lib/nexusAccountGenerator';

defineOptions({ name: 'SoraNexusAccountRecovery' });

const { t } = useTranslation();
const phrase = ref('');
const expectedAddress = ref('');
const result = ref<ReturnType<typeof recoverSoraNexusAccount> | null>(null);
const failed = ref(false);

/**
 * Every recognised format maps to a statement of limits. This page only compares addresses: it cannot
 * restore, open or move funds from either format, so no result offers a follow-up action.
 */
const LIMITS_KEYS: Readonly<Record<SoraNexusRecoveryFormat, string>> = {
  'bip39-slip10': 'burnPage.nexusRecovery.standard',
  'polkaswap-entropy-v1': 'burnPage.nexusRecovery.legacy',
};
/** Falls back to the strictest wording if a format is ever reported that this page does not know. */
const limitsKey = computed(() =>
  result.value ? (LIMITS_KEYS[result.value.recoveryFormat] ?? LIMITS_KEYS['polkaswap-entropy-v1']) : ''
);

/** Invalidates the previous public result as soon as either backup input changes. */
function invalidateResult(): void {
  result.value = null;
  failed.value = false;
}

/** Checks only the saved recipient and discards private words after every attempt. */
function checkBackup(): void {
  invalidateResult();
  try {
    result.value = recoverSoraNexusAccount(phrase.value, expectedAddress.value);
  } catch {
    failed.value = true;
  } finally {
    phrase.value = '';
  }
}

/** Removes all backup inputs and public results without persisting or exporting them. */
function clear(): void {
  phrase.value = '';
  expectedAddress.value = '';
  invalidateResult();
}

/** Closing the disclosure also discards words that have not been checked. */
function onToggle(event: Event): void {
  if (!(event.currentTarget as HTMLDetailsElement).open) clear();
}

onMounted(() => window.addEventListener('pagehide', clear));
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', clear);
  clear();
});
</script>

<style lang="scss" scoped>
.nexus-recovery {
  margin-top: 20px;
  overflow-wrap: anywhere;

  summary {
    cursor: pointer;
  }
  &__fields {
    display: grid;
    gap: 16px;
    margin-top: 16px;
  }
  p {
    margin: 0;
  }
  label {
    display: grid;
    gap: 8px;
  }
  input {
    box-sizing: border-box;
    width: 100%;
    padding: 12px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 8px;
    background: var(--s-color-base-background);
    color: inherit;
    font: inherit;
  }
  code {
    display: block;
    margin: 12px 0;
    white-space: normal;
  }
}
.nexus-recovery__limits {
  padding: 12px;
  border: 1px solid rgba(247, 84, 163, 0.32);
  border-radius: 8px;
  background: rgba(247, 84, 163, 0.12);
}
.nexus-recovery__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.nexus-recovery__clear {
  padding: 8px;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
</style>
