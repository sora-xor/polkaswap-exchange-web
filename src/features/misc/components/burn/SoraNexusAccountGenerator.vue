<template>
  <section v-if="burnAvailable || confirmedAddress || dialogVisible" class="nexus-generator" :aria-labelledby="titleId">
    <div class="nexus-generator__heading">
      <h2 :id="titleId">{{ t('burnPage.nexusGenerator.title') }}</h2>
      <p>{{ t('burnPage.nexusGenerator.intro') }}</p>
    </div>
    <div class="nexus-generator__warning" role="note">
      <strong>{{ t('burnPage.nexusGenerator.recoveryWarningTitle') }}</strong>
      <p>{{ t('burnPage.nexusGenerator.formatWarning') }}</p>
    </div>
    <div v-if="confirmedAddress" class="nexus-generator__address">
      <div>
        <span class="nexus-generator__label">{{ t('burnPage.nexusGenerator.addressLabel') }}</span>
        <code data-testid="nexus-confirmed-address">{{ confirmedAddress }}</code>
        <p>{{ t('burnPage.nexusGenerator.addressInstruction') }}</p>
      </div>
      <div class="nexus-generator__address-actions">
        <s-button type="secondary" @click="copyAddress">{{ t('burnPage.nexusGenerator.copyAddress') }}</s-button>
        <s-button type="primary" :disabled="!burnAvailable" @click="emit('useAddress', confirmedAddress)">
          {{ t('burnPage.nexusGenerator.useForBurn') }}
        </s-button>
      </div>
      <p v-if="copyMessage" class="nexus-generator__copy-status" role="status">{{ t(copyMessage) }}</p>
    </div>
    <s-button
      v-if="burnAvailable"
      :type="confirmedAddress ? 'secondary' : 'primary'"
      class="nexus-generator__generate"
      @click="generate"
    >
      {{ t(confirmedAddress ? 'burnPage.nexusGenerator.generateAgain' : 'burnPage.nexusGenerator.generate') }}
    </s-button>
    <p v-else class="nexus-generator__campaign-ended">{{ t('burnPage.nexusGenerator.campaignEnded') }}</p>
    <p v-if="generationError" class="nexus-generator__error" role="alert">
      {{ t('burnPage.nexusGenerator.generationFailed') }}
    </p>

    <dialog-base
      v-model:visible="dialogVisible"
      custom-class="dialog--nexus-generator"
      width="620px"
      :title="dialogTitle"
      :show-close-button="false"
      :close-on-click-modal="false"
      :close-on-esc="false"
    >
      <p v-if="!discardRequested" class="nexus-generator__step">
        {{ t('burnPage.nexusGenerator.step', { step: stepNumber }) }}
      </p>
      <p v-if="discardRequested" class="nexus-generator__modal-intro" role="alert">
        {{ t('burnPage.nexusGenerator.discardWarning') }}
      </p>
      <template v-else-if="stage === 'display' && words.length === 24">
        <p class="nexus-generator__modal-intro">{{ t('burnPage.nexusGenerator.backupInstruction') }}</p>
        <ol class="nexus-generator__words" data-testid="nexus-recovery-words">
          <li v-for="(word, index) in words" :key="index">
            <span>{{ index + 1 }}.</span> {{ word }}
          </li>
        </ol>
        <label class="nexus-generator__acknowledgement">
          <input v-model="backupAcknowledged" type="checkbox" data-testid="nexus-backup-acknowledgement" />
          <span>{{ t('burnPage.nexusGenerator.backupCheck') }}</span>
        </label>
      </template>
      <template v-else-if="stage === 'verify' && words.length === 24">
        <p class="nexus-generator__modal-intro">{{ t('burnPage.nexusGenerator.verifyInstruction') }}</p>
        <div class="nexus-generator__challenge">
          <label v-for="(index, position) in challengeIndexes" :key="index">
            <span>{{ t('burnPage.nexusGenerator.wordNumber', { number: index + 1 }) }}</span>
            <input
              v-model="challengeAnswers[position]"
              type="text"
              :data-testid="`nexus-word-${index + 1}`"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              @input="mismatch = false"
            />
          </label>
        </div>
        <p v-if="mismatch" class="nexus-generator__error" role="alert">{{ t('burnPage.nexusGenerator.mismatch') }}</p>
      </template>
      <template v-else-if="stage === 'address' && pendingAddress">
        <p class="nexus-generator__modal-intro">{{ t('burnPage.nexusGenerator.addressBackupInstruction') }}</p>
        <code class="nexus-generator__modal-address" data-testid="nexus-pending-address">{{ pendingAddress }}</code>
        <s-button type="secondary" @click="copyAddress">{{ t('burnPage.nexusGenerator.copyAddress') }}</s-button>
        <p v-if="copyMessage" class="nexus-generator__copy-status" role="status">{{ t(copyMessage) }}</p>
        <label class="nexus-generator__acknowledgement">
          <input v-model="addressBackupAcknowledged" type="checkbox" data-testid="nexus-address-acknowledgement" />
          <span>{{ t('burnPage.nexusGenerator.addressBackupCheck') }}</span>
        </label>
      </template>
      <template #footer>
        <div class="nexus-generator__footer">
          <template v-if="discardRequested">
            <button type="button" class="nexus-generator__discard-link" @click="confirmDiscard">
              {{ t('burnPage.nexusGenerator.confirmDiscard') }}
            </button>
            <s-button type="primary" class="nexus-generator__footer-primary" @click="cancelDiscard">
              {{ t('burnPage.nexusGenerator.keepBackingUp') }}
            </s-button>
          </template>
          <template v-else>
            <button type="button" class="nexus-generator__discard-link" @click="requestDiscard">
              {{ t('burnPage.nexusGenerator.discard') }}
            </button>
            <s-button
              v-if="stage === 'verify' || stage === 'address'"
              type="secondary"
              class="nexus-generator__footer-secondary"
              @click="showWords"
            >
              {{ t('burnPage.nexusGenerator.showWords') }}
            </s-button>
            <s-button
              v-if="stage === 'display'"
              type="primary"
              class="nexus-generator__footer-primary"
              :disabled="!backupAcknowledged"
              @click="checkBackup"
            >
              {{ t('burnPage.nexusGenerator.continue') }}
            </s-button>
            <s-button
              v-else-if="stage === 'verify'"
              type="primary"
              class="nexus-generator__footer-primary"
              :disabled="challengeAnswers.some((answer) => !answer.trim())"
              @click="verifyWords"
            >
              {{ t('burnPage.nexusGenerator.continueToAddress') }}
            </s-button>
            <s-button
              v-else
              type="primary"
              class="nexus-generator__footer-primary"
              :disabled="!addressBackupAcknowledged"
              @click="finishBackup"
            >
              {{ t('burnPage.nexusGenerator.finish') }}
            </s-button>
          </template>
        </div>
      </template>
    </dialog-base>
  </section>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import { generateSoraNexusAccount } from '@/features/misc/lib/nexusAccountGenerator';

defineOptions({ name: 'SoraNexusAccountGenerator' });

const props = withDefaults(defineProps<{ burnAvailable?: boolean }>(), { burnAvailable: true });
const emit = defineEmits<{ (event: 'useAddress', address: string): void }>();
const { t } = useTranslation();
const titleId = 'nexus-generator-title';
const challengeIndexes = ref<number[]>([]);
const dialogVisible = ref(false);
const stage = ref<'display' | 'verify' | 'address'>('display');
const words = ref<string[]>([]);
const pendingAddress = ref('');
const confirmedAddress = ref('');
const backupAcknowledged = ref(false);
const addressBackupAcknowledged = ref(false);
const challengeAnswers = ref<string[]>(['', '', '']);
const mismatch = ref(false);
const generationError = ref(false);
const copyMessage = ref('');
const discardRequested = ref(false);
const stepNumber = computed(() => (stage.value === 'display' ? 1 : stage.value === 'verify' ? 2 : 3));
const dialogTitle = computed(() => {
  if (discardRequested.value) return t('burnPage.nexusGenerator.discardTitle');
  if (stage.value === 'display') return t('burnPage.nexusGenerator.backupTitle');
  if (stage.value === 'verify') return t('burnPage.nexusGenerator.verifyTitle');
  return t('burnPage.nexusGenerator.addressBackupTitle');
});

/** Removes private words from component state when backup finishes or the dialog closes. */
function discardPending(): void {
  words.value = [];
  pendingAddress.value = '';
  backupAcknowledged.value = false;
  addressBackupAcknowledged.value = false;
  challengeAnswers.value = ['', '', ''];
  challengeIndexes.value = [];
  mismatch.value = false;
  discardRequested.value = false;
  stage.value = 'display';
}

/** Generates an Ed25519 Nexus recipient locally without persisting its recovery words. */
function generate(): void {
  if (!props.burnAvailable) return;
  discardPending();
  generationError.value = false;
  copyMessage.value = '';
  try {
    const account = generateSoraNexusAccount();
    words.value = account.phrase.split(' ');
    pendingAddress.value = account.address;
    dialogVisible.value = true;
  } catch {
    generationError.value = true;
  }
}

/** Chooses three distinct positions, excluding the last prompt after a review. */
function chooseChallengeIndexes(excluded: readonly number[] = []): number[] {
  const scores = new Uint32Array(24);
  globalThis.crypto.getRandomValues(scores);
  return Array.from({ length: 24 }, (_, index) => index)
    .filter((index) => !excluded.includes(index))
    .sort((left, right) => scores[left]! - scores[right]!)
    .slice(0, 3)
    .sort((left, right) => left - right);
}

/** Hides the words and starts a new three-word spot-check. */
function checkBackup(): void {
  if (!backupAcknowledged.value || words.value.length !== 24) return;
  challengeIndexes.value = chooseChallengeIndexes(challengeIndexes.value);
  challengeAnswers.value = ['', '', ''];
  mismatch.value = false;
  stage.value = 'verify';
}

/** Lets the user review the words before another check with new positions. */
function showWords(): void {
  stage.value = 'display';
  mismatch.value = false;
  challengeAnswers.value = ['', '', ''];
  addressBackupAcknowledged.value = false;
  copyMessage.value = '';
}

/** Advances to recording the public address after the word spot-check. */
function verifyWords(): void {
  if (stage.value !== 'verify' || words.value.length !== 24 || !backupAcknowledged.value) return;
  if (challengeIndexes.value.length !== 3) return;
  const matches = challengeIndexes.value.every(
    (index, position) => challengeAnswers.value[position]?.trim().toLowerCase() === words.value[index]
  );
  if (!matches) {
    mismatch.value = true;
    return;
  }
  challengeAnswers.value = ['', '', ''];
  stage.value = 'address';
}

/** Completes the flow only after the user records the public address too. */
function finishBackup(): void {
  if (stage.value !== 'address' || !addressBackupAcknowledged.value || !pendingAddress.value) return;
  confirmedAddress.value = pendingAddress.value;
  discardPending();
  dialogVisible.value = false;
}

/** Copies only the public address; the recovery phrase never reaches the clipboard. */
async function copyAddress(): Promise<void> {
  const address = dialogVisible.value && stage.value === 'address' ? pendingAddress.value : confirmedAddress.value;
  if (!address) return;
  try {
    await navigator.clipboard.writeText(address);
    copyMessage.value = 'burnPage.nexusGenerator.addressCopied';
  } catch {
    copyMessage.value = 'burnPage.nexusGenerator.copyFailed';
  }
}

/** Requires an explicit second action before abandoning unconfirmed words. */
function requestDiscard(): void {
  discardRequested.value = true;
}

/** Returns from the discard confirmation to the current backup step. */
function cancelDiscard(): void {
  discardRequested.value = false;
}

/** Removes the unfinished account after the user confirms the loss. */
function confirmDiscard(): void {
  if (!discardRequested.value) return;
  discardPending();
  dialogVisible.value = false;
}

/** Warns when leaving would destroy recovery words that have not been backed up. */
function hasPendingBackup(): boolean {
  return dialogVisible.value && words.value.length === 24;
}

/** Requests the browser's native confirmation before a reload or tab close. */
function confirmBeforeUnload(event: BeforeUnloadEvent): void {
  if (!hasPendingBackup()) return;
  event.preventDefault();
  event.returnValue = '';
}

onBeforeRouteLeave(() => {
  if (!hasPendingBackup()) return true;
  return window.confirm(
    `${t('burnPage.nexusGenerator.discardTitle')}\n\n${t('burnPage.nexusGenerator.discardWarning')}`
  );
});

watch(
  dialogVisible,
  (visible) => {
    if (visible) {
      window.addEventListener('beforeunload', confirmBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', confirmBeforeUnload);
      discardPending();
    }
  },
  { flush: 'sync' }
);
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', confirmBeforeUnload);
  discardPending();
});
</script>

<style lang="scss" scoped>
.nexus-generator {
  box-sizing: border-box;
  width: 100%;
  margin: $basic-spacing-big 0 0;
  padding: $basic-spacing;
  border-radius: 24px;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element-pressed);
  color: var(--s-color-base-content-primary);
}

.nexus-generator__address-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $basic-spacing;
}

.nexus-generator__heading h2 {
  margin: 0 0 $basic-spacing-tiny;
  font-size: 20px;
  line-height: 1.3;
}

.nexus-generator__heading p,
.nexus-generator__address p {
  margin: 0;
  color: var(--s-color-base-content-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.nexus-generator__generate {
  width: 100%;
  max-width: 100%;
  min-height: 44px;
  height: auto;
  padding: 8px 16px;
  white-space: normal !important;
  text-align: center;
}

.nexus-generator__generate :deep(.s-button__text) {
  white-space: normal !important;
}

.nexus-generator__address + .nexus-generator__generate {
  margin-top: $basic-spacing;
}

.nexus-generator__warning {
  margin: $basic-spacing 0;
  padding: $basic-spacing;
  border: 1px solid rgba(247, 84, 163, 0.32);
  border-radius: 16px;
  background: rgba(247, 84, 163, 0.12);
  box-shadow: var(--s-shadow-element-pressed);
}

.nexus-generator__warning strong,
.nexus-generator__warning p {
  color: var(--s-color-base-content-primary);
  font-size: 14px;
  line-height: 1.5;
}

.nexus-generator__warning p {
  margin: $basic-spacing-tiny 0 0;
}

.nexus-generator__campaign-ended {
  margin: $basic-spacing 0 0;
  color: var(--s-color-base-content-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.nexus-generator__address {
  margin-top: $basic-spacing-big;
  padding: $basic-spacing;
  border-radius: 20px;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
}

.nexus-generator__label {
  display: block;
  margin-bottom: $basic-spacing-tiny;
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.nexus-generator__address code,
.nexus-generator__modal-address {
  display: block;
  margin-bottom: $basic-spacing-small;
  font-family: var(--s-font-family-mono, monospace);
  font-size: 13px;
  overflow-wrap: anywhere;
  user-select: text;
}

.nexus-generator__modal-address {
  padding: $basic-spacing;
  border-radius: 12px;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
}

.nexus-generator__address-actions {
  justify-content: flex-start;
  margin-top: $basic-spacing;
}

.nexus-generator__copy-status {
  margin: $basic-spacing-small 0 0;
  font-size: 13px;
}

.nexus-generator__error {
  margin: $basic-spacing-small 0 0;
  color: var(--s-color-status-error);
  font-size: 13px;
  line-height: 1.4;
}

.nexus-generator__modal-intro {
  margin: 0 0 $basic-spacing;
  font-size: 14px;
  line-height: 1.5;
}

.nexus-generator__step {
  margin: 0 0 $basic-spacing-small;
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.nexus-generator__footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: $basic-spacing-small;
}

.nexus-generator__footer-secondary,
.nexus-generator__footer-primary {
  width: 100%;
}

.nexus-generator__discard-link {
  align-self: flex-start;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--s-color-base-content-secondary);
  font: inherit;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
}

.nexus-generator__discard-link:focus-visible {
  outline: 2px solid var(--s-color-theme-accent-focused);
  outline-offset: 2px;
}

.nexus-generator__words {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $basic-spacing-small;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nexus-generator__words li {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  font-family: var(--s-font-family-mono, monospace);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.nexus-generator__words li span {
  color: var(--s-color-base-content-secondary);
}

.nexus-generator__acknowledgement {
  display: flex;
  align-items: flex-start;
  gap: $basic-spacing-small;
  margin-top: $basic-spacing;
  font-size: 14px;
  line-height: 1.45;
  cursor: pointer;
}

.nexus-generator__acknowledgement input {
  margin-top: 4px;
  width: 18px;
  height: 18px;
  accent-color: var(--s-color-theme-accent);
}

.nexus-generator__challenge {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $basic-spacing;
}

.nexus-generator__challenge label span {
  display: block;
  margin-bottom: $basic-spacing-tiny;
  font-size: 13px;
}

.nexus-generator__challenge input {
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  color: var(--s-color-base-content-primary);
  font-size: 16px;
}

.nexus-generator__challenge input:focus-visible {
  outline: 2px solid var(--s-color-theme-accent-focused);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .nexus-generator__words {
    grid-template-columns: repeat(2, 1fr);
  }
  .nexus-generator__challenge {
    grid-template-columns: 1fr;
  }
}
</style>

<style lang="scss">
.dialog-card.dialog--nexus-generator {
  flex-shrink: 0;
  border-radius: 24px;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-dialog);

  .dialog-card__header {
    padding: 24px 24px 12px;
    border-bottom: 0;
  }

  .dialog-card__title-text {
    font-size: 22px;
    line-height: 1.3;
    white-space: normal;
  }

  .dialog-card__content {
    padding: 12px 24px 16px;
    max-height: min(72dvh, 720px);
  }

  .dialog-card__footer {
    padding: 8px 24px 24px;
  }
}

@media (max-width: 560px) {
  .dialog-card.dialog--nexus-generator {
    .dialog-card__header {
      padding: 20px 20px 10px;
    }
    .dialog-card__content {
      padding: 10px 20px 16px;
    }
    .dialog-card__footer {
      padding: 8px 20px 20px;
    }
  }
}
</style>
