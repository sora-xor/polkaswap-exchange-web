<template>
  <section class="temporary-wallet" data-test-name="temporaryWalletPanel" :aria-labelledby="headingId">
    <template v-if="view === 'offer'">
      <h4 :id="headingId" ref="heading" tabindex="-1">{{ t('temporaryWallet.offerTitle') }}</h4>
      <p>{{ t('temporaryWallet.offerText') }}</p>
      <div class="temporary-wallet__row">
        <button type="button" class="temporary-wallet__button" data-test-name="temporaryWalletCreate" @click="create">
          {{ t('temporaryWallet.create') }}
        </button>
        <button
          type="button"
          class="temporary-wallet__link"
          data-test-name="temporaryWalletRestore"
          @click="show('restore')"
        >
          {{ t('temporaryWallet.restore') }}
        </button>
      </div>
      <a href="https://metamask.io/download" target="_blank" rel="noopener noreferrer">
        {{ t('getTs.onboarding.metamaskLink') }}
      </a>
    </template>

    <template v-else-if="view === 'restore'">
      <h4 :id="headingId" ref="heading" tabindex="-1">{{ t('temporaryWallet.restoreTitle') }}</h4>
      <p>{{ t('temporaryWallet.restoreText') }}</p>
      <p class="temporary-wallet__warning">{{ t('temporaryWallet.restoreWarning') }}</p>
      <label :for="inputId">{{ t('temporaryWallet.phrase') }}</label>
      <textarea
        :id="inputId"
        v-model="phraseInput"
        class="temporary-wallet__input notranslate"
        rows="3"
        dir="ltr"
        autocomplete="off"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
        translate="no"
        :aria-invalid="restoreFailed"
        :aria-describedby="restoreFailed ? errorId : undefined"
      ></textarea>
      <p v-if="restoreFailed" :id="errorId" class="temporary-wallet__error" role="alert">
        {{ t('temporaryWallet.invalidPhrase') }}
      </p>
      <s-button type="primary" native-type="button" :loading="connecting" @click="restore">
        {{ t('temporaryWallet.restoreAction') }}
      </s-button>
      <button type="button" class="temporary-wallet__link" @click="show('auto')">
        {{ t('temporaryWallet.cancel') }}
      </button>
    </template>

    <template v-else-if="view === 'backup' && backup">
      <h4 :id="headingId" ref="heading" tabindex="-1">{{ t('temporaryWallet.backupTitle') }}</h4>
      <p>{{ t('temporaryWallet.backupText') }}</p>
      <ol
        class="temporary-wallet__words notranslate"
        dir="ltr"
        translate="no"
        :aria-label="t('temporaryWallet.phrase')"
      >
        <li v-for="(word, index) in words" :key="index">
          <span aria-hidden="true">{{ index + 1 }}</span
          >{{ word }}
        </li>
      </ol>
      <p class="temporary-wallet__warning">{{ t('temporaryWallet.privateWarning') }}</p>
      <div class="temporary-wallet__row">
        <button type="button" class="temporary-wallet__button" data-test-name="temporaryWalletCopy" @click="copyPhrase">
          {{ t(copied ? 'temporaryWallet.copied' : 'temporaryWallet.copyPhrase') }}
        </button>
        <button
          type="button"
          class="temporary-wallet__button"
          data-test-name="temporaryWalletDownload"
          @click="download"
        >
          {{ t('temporaryWallet.download') }}
        </button>
      </div>
      <p class="temporary-wallet__address">
        <strong>{{ t('temporaryWallet.address') }}</strong>
        <code dir="ltr">{{ backup.address }}</code>
      </p>
      <template v-if="awaitingBackup">
        <label class="temporary-wallet__confirm">
          <input v-model="saved" data-test-name="temporaryWalletSaved" type="checkbox" />
          <span>{{ t('temporaryWallet.confirmSaved') }}</span>
        </label>
        <s-button
          type="primary"
          native-type="button"
          data-test-name="temporaryWalletUse"
          :disabled="!saved"
          :loading="connecting"
          @click="connect"
        >
          {{ t('temporaryWallet.use') }}
        </s-button>
        <button type="button" class="temporary-wallet__link" @click="discardNew">
          {{ t('temporaryWallet.cancel') }}
        </button>
      </template>
      <button v-else type="button" class="temporary-wallet__link" @click="show('auto')">
        {{ t('temporaryWallet.hidePhrase') }}
      </button>
    </template>

    <template v-else-if="view === 'closing'">
      <p class="temporary-wallet__warning" role="alert">{{ closeWarning }}</p>
      <div class="temporary-wallet__row">
        <button type="button" class="temporary-wallet__button" @click="show('auto')">
          {{ t('temporaryWallet.keepOpen') }}
        </button>
        <button
          type="button"
          class="temporary-wallet__button"
          data-test-name="temporaryWalletCloseConfirm"
          @click="close"
        >
          {{ t('temporaryWallet.closeConfirm') }}
        </button>
      </div>
    </template>

    <template v-else>
      <template v-if="!connected">
        <h4 :id="headingId" ref="heading" tabindex="-1">{{ t('temporaryWallet.openTitle') }}</h4>
        <code dir="ltr">{{ address }}</code>
        <s-button
          type="primary"
          native-type="button"
          :loading="connecting"
          data-test-name="temporaryWalletUseAgain"
          @click="connect"
        >
          {{ t('temporaryWallet.useAgain') }}
        </s-button>
      </template>
      <p v-else :id="headingId" class="temporary-wallet__muted">{{ t('temporaryWallet.leftover') }}</p>
      <div class="temporary-wallet__row">
        <button
          type="button"
          class="temporary-wallet__button"
          data-test-name="temporaryWalletShow"
          @click="show('backup')"
        >
          {{ t('temporaryWallet.showPhrase') }}
        </button>
        <button
          type="button"
          class="temporary-wallet__button"
          data-test-name="temporaryWalletClose"
          :disabled="checkingFunds"
          @click="startClose"
        >
          {{ t('temporaryWallet.close') }}
        </button>
      </div>
    </template>

    <p v-if="connectFailed" class="temporary-wallet__error" role="alert">{{ t('temporaryWallet.connectFailed') }}</p>
  </section>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { GET_TS_CARD_DAI } from '@/features/misc/lib/getTsCardReadiness';
import {
  createTemporaryWallet,
  forgetTemporaryWallet,
  formatTemporaryWalletBackupFile,
  getTemporaryWalletBackup,
  readTemporaryWalletBalances,
  restoreTemporaryWallet,
  TemporaryWalletAppProvider,
  temporaryWalletBackupFileName,
  type TemporaryWalletBackup,
} from '@/utils/connection/evm/temporaryWallet';
import { temporaryWalletSession } from '@/utils/connection/evm/temporaryWalletSession';

/**
 * Optional temporary Ethereum wallet for buyers without an Ethereum wallet app.
 *
 * Without a wallet it offers to make or restore one. A new wallet must have its recovery phrase saved (checkbox)
 * before it can connect. Once open, it can show the phrase again or close the wallet; closing warns when ETH or DAI
 * is left in it. The phrase is kept in this component only while it is on screen.
 */
defineOptions({ name: 'TemporaryWalletPanel' });

type View = 'auto' | 'restore' | 'backup' | 'closing';

const { t } = useTranslation();
const { evmAddress, selectEvmProvider } = useWeb3Connection();
const id = useId();
const headingId = `temporary-wallet-${id}`;
const inputId = `temporary-wallet-phrase-${id}`;
const errorId = `temporary-wallet-error-${id}`;
const heading = ref<HTMLElement | null>(null);
const mode = ref<View>('auto');
const backup = ref<TemporaryWalletBackup | null>(null);
const awaitingBackup = ref(false);
const saved = ref(false);
const copied = ref(false);
const phraseInput = ref('');
const restoreFailed = ref(false);
const connecting = ref(false);
const connectFailed = ref(false);
const checkingFunds = ref(false);
const closeWarning = ref('');

const address = computed(() => temporaryWalletSession.address);
const connected = computed(() => !!address.value && evmAddress.value?.toLowerCase() === address.value);
const words = computed(() => backup.value?.phrase.split(' ') ?? []);
/** `auto` resolves to offering a wallet or managing the open one. */
const view = computed(() => {
  if (!address.value && ['backup', 'closing'].includes(mode.value)) return 'offer';
  if (mode.value !== 'auto') return mode.value;
  return address.value ? 'open' : 'offer';
});

/** Switches screens after a click and moves focus to the new heading; the phrase leaves memory with its screen. */
function show(next: View): void {
  mode.value = next;
  copied.value = false;
  restoreFailed.value = false;
  if (next === 'backup') backup.value = getTemporaryWalletBackup();
  else {
    backup.value = null;
    awaitingBackup.value = false;
    saved.value = false;
  }
  if (next !== 'restore') phraseInput.value = '';
  void nextTick(() => heading.value?.focus({ preventScroll: true }));
}

function create(): void {
  connectFailed.value = false;
  createTemporaryWallet();
  show('backup');
  awaitingBackup.value = true;
}

/** The new wallet has not been used anywhere yet, so cancelling deletes it. */
function discardNew(): void {
  forgetTemporaryWallet();
  show('auto');
}

/** Connects the open wallet through the app's normal EVM connection. */
async function connect(): Promise<void> {
  connectFailed.value = false;
  connecting.value = true;
  try {
    await selectEvmProvider(TemporaryWalletAppProvider);
    if (evmAddress.value?.toLowerCase() !== address.value) throw new Error('Not connected');
    show('auto');
  } catch {
    connectFailed.value = true;
  } finally {
    connecting.value = false;
  }
}

/** A restored phrase is already saved, so the wallet connects at once. */
async function restore(): Promise<void> {
  try {
    restoreTemporaryWallet(phraseInput.value);
  } catch {
    restoreFailed.value = true;
    return;
  }
  phraseInput.value = '';
  await connect();
}

async function copyPhrase(): Promise<void> {
  if (!backup.value) return;
  try {
    await navigator.clipboard.writeText(backup.value.phrase);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}

/** Saves a text file with the phrase; only ever on this explicit click. */
function download(): void {
  const current = getTemporaryWalletBackup();
  if (!current) return;
  const text = formatTemporaryWalletBackupFile(current, {
    title: t('temporaryWallet.file.title'),
    created: t('temporaryWallet.file.created'),
    address: t('temporaryWallet.address'),
    phrase: t('temporaryWallet.phrase'),
    path: t('temporaryWallet.file.path'),
    warning: t('temporaryWallet.privateWarning'),
    help: t('temporaryWallet.file.help'),
  });
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = temporaryWalletBackupFileName(current.address);
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const formatBalance = (value: bigint, symbol: string) =>
  `${FPNumber.fromCodecValue(value.toString(), 18).dp(6, 2).toLocaleString(6)} ${symbol}`;

/** Closes an empty wallet at once; otherwise names what is left in it and asks first. */
async function startClose(): Promise<void> {
  checkingFunds.value = true;
  try {
    const { eth, tokens } = await readTemporaryWalletBalances([GET_TS_CARD_DAI]);
    const left = [eth > 0n ? formatBalance(eth, 'ETH') : '', tokens[0] > 0n ? formatBalance(tokens[0], 'DAI') : '']
      .filter(Boolean)
      .join(', ');
    if (!left) {
      close();
      return;
    }
    closeWarning.value = t('temporaryWallet.closeWarning', { amount: left });
  } catch {
    closeWarning.value = t('temporaryWallet.closeWarningUnknown');
  } finally {
    checkingFunds.value = false;
  }
  show('closing');
}

function close(): void {
  forgetTemporaryWallet();
  show('auto');
}

watch(address, (value, previous) => {
  // Another screen closed the wallet: drop any phrase still shown here.
  if (!value && previous) show('auto');
});
onBeforeUnmount(() => {
  backup.value = null;
  phraseInput.value = '';
});
</script>

<style scoped lang="scss">
.temporary-wallet {
  margin-top: 20px;
  padding: 16px 20px;
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-body);
  box-shadow: var(--s-shadow-element);
  font-size: 13px;
  line-height: 1.6;
  h4 {
    margin: 0 0 6px;
    font-size: 15px;
    line-height: 1.4;
    color: var(--s-color-base-content-primary);
  }
  h4[tabindex='-1']:focus {
    outline: none !important;
  }
  p {
    margin: 0 0 10px;
    color: var(--s-color-base-content-secondary);
  }
  label {
    display: block;
    margin-bottom: 6px;
    color: var(--s-color-base-content-primary);
  }
  code {
    display: block;
    overflow-wrap: anywhere;
    margin-block: 4px 12px;
    font-size: 12px;
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--s-color-action-text);
    overflow-wrap: anywhere;
  }
  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: center;
    margin-block: 8px;
  }
  &__button {
    min-height: 44px;
    max-width: 100%;
    padding: 10px 18px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element);
    color: var(--s-color-action-text);
    font: inherit;
    text-align: start;
    cursor: pointer;
    transition: box-shadow 160ms ease;
    &:active {
      box-shadow: var(--s-shadow-element-pressed);
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }
  &__link {
    display: inline-block;
    min-height: 44px;
    padding: 10px 4px;
    border: 0;
    background: none;
    color: var(--s-color-action-text);
    font: inherit;
    text-align: start;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  &__words {
    display: grid;
    grid-template-columns: #{'repeat(3, minmax(0, 1fr))'};
    gap: 8px;
    margin: 12px 0;
    padding: 0;
    list-style: none;
    li {
      display: flex;
      gap: 8px;
      align-items: baseline;
      padding: 8px 10px;
      border-radius: var(--s-border-radius-mini, 8px);
      background: var(--s-color-utility-surface);
      box-shadow: var(--s-shadow-element-pressed);
      font-family: var(--s-font-family-default);
      font-size: 14px;
      font-weight: 600;
      color: var(--s-color-base-content-primary);
      overflow-wrap: anywhere;
      user-select: all;
    }
    span {
      min-width: 1.5em;
      font-size: 11px;
      font-weight: 400;
      color: var(--s-color-base-content-secondary);
      font-variant-numeric: tabular-nums;
    }
  }
  &__warning {
    color: var(--s-color-status-warning-text, var(--s-color-status-warning)) !important;
  }
  &__error {
    color: var(--s-color-status-error-text, var(--s-color-status-error)) !important;
  }
  &__muted {
    font-size: 12px;
  }
  &__address {
    margin-top: 8px;
    strong {
      color: var(--s-color-base-content-primary);
    }
  }
  &__input {
    box-sizing: border-box;
    width: 100%;
    min-height: 88px;
    margin-bottom: 8px;
    padding: 10px 12px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-surface);
    color: var(--s-color-base-content-primary);
    font: inherit;
    font-size: 14px;
    resize: vertical;
  }
  &__confirm {
    display: flex !important;
    align-items: flex-start;
    gap: 10px;
    margin-block: 12px;
    cursor: pointer;
    input {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: var(--s-color-theme-accent);
    }
  }
  :is(button, a, input, textarea):focus-visible {
    outline: 2px solid var(--s-color-focus-ring, var(--s-color-theme-accent));
    outline-offset: 3px;
  }
  :deep(.el-button) {
    white-space: normal;
    height: auto;
    min-height: 46px;
    max-width: 100%;
  }
  @media (max-width: 480px) {
    padding-inline: 14px;
    &__words {
      grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &__button {
      transition: none;
    }
  }
}
</style>
