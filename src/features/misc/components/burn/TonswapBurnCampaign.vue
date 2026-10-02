<template>
  <s-form class="container tonswap-burn el-form--actions" :show-message="false">
    <div class="tonswap-burn__heading">
      <burn-logo-fire class="tonswap-burn__mark" variant="tonswap" />
      <generic-page-header :title="t('burnPage.tonswap.title')" />
    </div>
    <p class="tonswap-burn__description">{{ t('burnPage.tonswap.description') }}</p>
    <p v-if="statusMessage" class="tonswap-burn__status" role="status">{{ statusMessage }}</p>
    <p class="tonswap-burn__claim">
      <strong>{{ t('burnPage.tonswap.claimNotice') }}</strong>
    </p>
    <external-link href="https://tonswap.org/ts" :title="t('burnPage.tonswap.journey.terms')" />
    <section class="tonswap-burn__preview" aria-labelledby="tonswap-preview-title">
      <h3 id="tonswap-preview-title">{{ t('burnPage.tonswap.journey.preview') }}</h3>
      <label for="tonswap-preview-amount">{{ t('burnPage.tonswap.journey.amount') }}</label>
      <input
        id="tonswap-preview-amount"
        v-model="previewAmount"
        @input="previewEdited = true"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        maxlength="97"
        placeholder="0"
        :aria-invalid="Boolean(previewAmount && !parsedPreviewAmount)"
      />
      <p v-if="previewAmount && !parsedPreviewAmount" role="status">{{ t('burnPage.tonswap.invalidAmount') }}</p>
      <template v-else-if="parsedPreviewAmount">
        <info-line
          :label="t('burnPage.tonswap.journey.estimated')"
          :value="previewQuote ? format(previewQuote.reward, 6) : '—'"
          asset-symbol="TS"
        />
        <info-line
          :label="t('burnPage.tonswap.journey.total')"
          :value="parsedFee ? parsedPreviewAmount.add(parsedFee).toString() : '—'"
          asset-symbol="XOR"
        />
        <p v-if="!previewQuote">{{ t('burnPage.tonswap.estimateUnavailable') }}</p>
        <p v-if="previewQuote?.excess.gt(zero)">
          {{ t('burnPage.tonswap.excessRecord', { xor: previewQuote.excess.toString() }) }}
        </p>
        <p>{{ t('burnPage.tonswap.journey.estimateNotice') }}</p>
      </template>
    </section>
    <s-button v-if="!isLoggedIn" class="action-button" type="primary" @click="connectSoraWallet">
      {{ t('connectWalletText') }}
    </s-button>
    <s-button v-else class="action-button" type="primary" :disabled="!canBurn || submitting" @click="openDialog">
      {{ t('burnPage.tonswap.burn') }}
    </s-button>
    <details class="tonswap-burn__onboarding">
      <summary>{{ t('burnPage.tonswap.journey.getStarted') }}</summary>
      <tonswap-onboarding
        :is-logged-in="isLoggedIn"
        :google-wallet-available="googleWalletAvailable"
        :amount="previewAmount"
        @connect="connectSoraWallet"
        @review="openDialog"
      />
    </details>
    <div v-if="isMainnet" class="tonswap-burn__data" :data-state="dataStatusState">
      <div class="tonswap-burn__data-content">
        <p class="tonswap-burn__data-message" role="status">{{ dataStatusMessage }}</p>
        <p class="tonswap-burn__data-block">
          <span v-if="allocation">{{ t('blockNumberText') }} {{ indexedThroughBlock.toLocaleString('en-US') }}</span>
        </p>
      </div>
      <s-button
        class="tonswap-burn__data-refresh"
        type="action"
        alternative
        icon="arrows-refresh-ccw-24"
        :aria-label="t('burnPage.tonswap.refreshData')"
        :title="t('burnPage.tonswap.refreshData')"
        :disabled="refreshing || submitting"
        @click="refreshSnapshot()"
      />
    </div>
    <tonswap-reward-curve :burned="isMainnet ? (allocation?.totalEligible ?? null) : null" />
    <info-line :label="t('burnPage.tonswap.startBlock')" value="27,720,478" />
    <info-line :label="t('burnPage.tonswap.rateRange')" value="50 → 5" asset-symbol="TS / XOR" />
    <info-line :label="t('burnPage.tonswap.cap')" value="1,753,357" asset-symbol="XOR" />
    <template v-if="allocation">
      <info-line :label="t('burnPage.tonswap.currentRate')" :value="format(currentRate, 6)" asset-symbol="TS / XOR" />
      <info-line
        :label="t('burnPage.tonswap.rewardedBurns')"
        :value="format(allocation.totalEligible)"
        asset-symbol="XOR"
      />
      <info-line :label="t('burnPage.tonswap.remaining')" :value="format(allocation.remaining)" asset-symbol="XOR" />
      <info-line
        :label="t('burnPage.tonswap.totalReserved')"
        :value="format(allocation.totalReward)"
        asset-symbol="TS"
      />
      <progress
        class="tonswap-burn__progress"
        :value="allocation.totalEligible.toString()"
        max="1753357"
        :aria-label="t('burnPage.tonswap.rewardedBurns')"
      />
      <template v-if="isLoggedIn">
        <info-line
          :label="t('burnPage.tonswap.yourBurns')"
          :value="format(accountBurned)"
          asset-symbol="XOR"
          value-can-be-hidden
        />
        <info-line
          :label="t('burnPage.tonswap.yourReserved')"
          :value="format(accountReward)"
          asset-symbol="TS"
          value-can-be-hidden
        />
      </template>
    </template>
    <section
      v-if="allBurnReceipts.length || accountAllocations.length"
      ref="historySection"
      class="tonswap-burn__history"
      aria-labelledby="tonswap-history-heading"
    >
      <h3 id="tonswap-history-heading">
        <s-icon name="basic-flame-24" size="20" aria-hidden="true" />
        {{ t('burnPage.tonswap.claimDetails') }}
      </h3>
      <div v-if="burnReceipt?.phase === 'updated'" class="tonswap-burn__updated" role="status">
        <p>{{ receiptProgressMessage(burnReceipt) }}</p>
        <strong>{{ t('burnPage.tonswap.claimNotice') }}</strong>
      </div>
      <ol class="tonswap-burn__records">
        <li
          v-for="receipt in visibleBurnReceipts"
          :key="receipt.localId"
          class="tonswap-burn__record tonswap-burn__receipt"
          :data-burn-phase="receipt.phase"
          role="status"
        >
          <div class="tonswap-burn__receipt-heading">
            <s-icon class="tonswap-burn__record-icon" name="basic-flame-24" size="22" aria-hidden="true" />
            <strong>{{ receiptProgressMessage(receipt) }}</strong>
            <span v-if="isPendingReceipt(receipt)" class="tonswap-burn__spinner" aria-hidden="true" />
          </div>
          <p class="tonswap-burn__receipt-amount">
            {{ t('burnPage.tonswap.pendingBurnAmount', { xor: receipt.amount }) }}
          </p>
          <p
            v-if="!isExcludedXorBurnAddress(receipt.address) && receipt.phase !== 'failed'"
            class="tonswap-burn__receipt-claim"
          >
            <strong>{{ t('burnPage.tonswap.claimNotice') }}</strong>
          </p>
          <p v-if="isExcludedXorBurnAddress(receipt.address)" class="tonswap-burn__receipt-claim">
            <strong>0 TS</strong> · {{ t('burnPage.tonswap.excludedAccount') }}
          </p>
          <div v-if="receipt.txHash" class="tonswap-burn__hash">
            <div>
              <span>{{ t('burnPage.soraNetworkTxHashLabel') }}</span>
              <code>{{ receipt.txHash }}</code>
            </div>
            <s-button
              type="action"
              alternative
              icon="basic-copy-24"
              :aria-label="t('burnPage.copySoraNetworkTxHash')"
              @click="copyHash(receipt.txHash, $event)"
            />
          </div>
          <p v-if="reconciliationDelayed && isPendingReceipt(receipt)" class="tonswap-burn__delayed">
            {{ t('burnPage.tonswap.indexingDelayed') }}
          </p>
          <s-button
            v-if="isPendingReceipt(receipt)"
            class="tonswap-burn__retry"
            type="secondary"
            :disabled="refreshing"
            @click="retryBurnStatus"
          >
            {{ t('burnPage.tonswap.retryStatus') }}
          </s-button>
        </li>
        <li v-for="row in accountAllocations" :key="row.txHash" class="tonswap-burn__record" :data-tx-hash="row.txHash">
          <dl class="tonswap-burn__record-amounts">
            <div>
              <dt>
                <s-icon name="basic-flame-24" size="16" aria-hidden="true" />
                {{ t('burnPage.tonswap.yourBurns') }}
              </dt>
              <dd :title="`${row.amount.toString()} XOR`" :aria-label="`${row.amount.toString()} XOR`">
                <span class="tonswap-burn__record-number">{{ format(row.amount) }}</span>
                <span class="tonswap-burn__record-unit">{{ ' XOR' }}</span>
              </dd>
            </div>
            <div>
              <dt>{{ t('burnPage.tonswap.yourReserved') }}</dt>
              <dd :title="`${row.reward.toString()} TS`" :aria-label="`${row.reward.toString()} TS`">
                <span class="tonswap-burn__record-number">{{ format(row.reward) }}</span>
                <span class="tonswap-burn__record-unit">{{ ' TS' }}</span>
              </dd>
            </div>
          </dl>
          <p class="tonswap-burn__record-block">
            {{ t('blockNumberText') }} {{ row.blockHeight.toLocaleString('en-US') }}
          </p>
          <s-button type="secondary" class="tonswap-burn__save-receipt" @click="saveReceipt(row)">
            {{ t('burnPage.tonswap.journey.saveReceipt') }}
          </s-button>
          <p class="tonswap-burn__receipt-note">{{ t('burnPage.tonswap.journey.receiptNotice') }}</p>
          <p v-if="receiptDownloadError === row.txHash" role="alert">
            {{ t('burnPage.tonswap.journey.receiptError') }}
          </p>
          <p v-if="row.excess.gt(zero)" class="tonswap-burn__delayed">
            {{ t('burnPage.tonswap.excessRecord', { xor: format(row.excess) }) }}
          </p>
          <div class="tonswap-burn__hash">
            <div>
              <span>{{ t('burnPage.soraNetworkTxHashLabel') }}</span
              ><code>{{ row.txHash }}</code>
            </div>
            <s-button
              type="action"
              alternative
              icon="basic-copy-24"
              :aria-label="t('burnPage.copySoraNetworkTxHash')"
              @click="copyHash(row.txHash, $event)"
            />
          </div>
        </li>
      </ol>
    </section>
    <dialog-base
      v-model:visible="dialogVisible"
      :title="t('burnPage.tonswap.title')"
      custom-class="dialog--tonswap-burn"
      @after-open="focusAmountOnOpen"
    >
      <div class="tonswap-dialog">
        <token-input
          ref="amountInput"
          :model-value="amount"
          :token="xor"
          :title="t('burnPage.tonswap.amount')"
          :is-fiat-editable="false"
          :disabled="submitting"
          @update:model-value="setAmount"
        />
        <div class="tonswap-dialog__estimate" aria-live="polite">
          <span>{{ t('burnPage.tonswap.estimatedReward') }}</span>
          <div>
            <burn-logo-fire class="tonswap-dialog__fire" variant="tonswap" /><strong>{{
              quote ? format(quote.reward, 6) : '—'
            }}</strong
            ><span>TS</span>
          </div>
        </div>
        <p v-if="!quote" class="tonswap-dialog__warning">{{ t('burnPage.tonswap.estimateUnavailable') }}</p>
        <p v-if="isExcludedAccount" class="tonswap-dialog__warning">{{ t('burnPage.tonswap.excludedAccount') }}</p>
        <p v-else-if="exceedsRemaining" class="tonswap-dialog__warning">
          {{ t('burnPage.tonswap.excessRecord', { xor: quote!.excess.toString() }) }}
        </p>
        <info-line
          class="tonswap-dialog__fee"
          :label="t('networkFeeText')"
          :value="parsedFee ? format(fee, 8) : '—'"
          asset-symbol="XOR"
        />
        <div class="tonswap-dialog__notes">
          <p>
            <strong>{{ t('burnPage.tonswap.claimNotice') }}</strong>
          </p>
          <p>{{ t('burnPage.tonswap.walletNotice') }}</p>
        </div>
        <p class="tonswap-dialog__warning">{{ t('burnPage.tonswap.burnWarning') }}</p>
        <p v-if="validationMessage" class="tonswap-dialog__error" role="alert">{{ validationMessage }}</p>
        <p v-if="submitError" class="tonswap-dialog__error" role="alert">{{ submitError }}</p>
      </div>
      <template #footer>
        <s-button
          type="primary"
          class="tonswap-dialog__submit"
          :disabled="!canSubmit"
          :loading="submitting"
          @click="confirmBurn"
        >
          {{ t('burnPage.tonswap.confirmBurn') }}
        </s-button>
      </template>
    </dialog-base>
  </s-form>
</template>

<script lang="ts" setup>
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';
import BurnLogoFire from '@/features/misc/components/burn/BurnLogoFire.vue';
import TonswapRewardCurve from '@/features/misc/components/burn/TonswapRewardCurve.vue';
import TonswapOnboarding from '@/features/misc/components/burn/TonswapOnboarding.vue';
import TokenInput from '@/components/shared/Input/TokenInput.vue';
import { useCopyAddress } from '@/composables/useCopyAddress';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { SoraNetwork } from '@/consts';
import { formatBurnAmount, isSameSoraAddress } from '@/features/misc/lib/burnCampaigns';
import { isExcludedXorBurnAddress } from '@/features/misc/lib/burnEligibility';
import { readTonswapIntent } from '@/features/misc/lib/tonswapOnboarding';
import { createTonswapReceipt, parseTonswapPreviewAmount } from '@/features/misc/lib/tonswapReceipt';
import { trackTonswapStep } from '@/features/misc/lib/tonswapTelemetry';
import { getTsBurnPrefill } from '@/features/misc/lib/getTsPlan';
import {
  allocateTonswapBurns,
  createTonswapXorBurnRemark,
  getTonswapCurrentRate,
  parseTonswapXorBurnRemark,
  quoteTonswapBurn,
  TONSWAP_XOR_CAP,
  type TonswapBurnAllocation,
} from '@/features/misc/lib/tonswapBurn';
import { fetchTonswapBurnSnapshot, TONSWAP_MAINNET_GENESIS } from '@/indexer/queries/tonswapBurn';
import { api } from '@/lib/soraneo-wallet/src/api';
import { TransactionStatus, type HistoryItem } from '@/lib/substrate/sdk/types';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import InfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import ExternalLink from '@/lib/soraneo-wallet/src/components/shared/ExternalLink.vue';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';

/** Separate TS campaign: finalized global burns determine quotes and claims; no Nexus recipient is collected. */
defineOptions({ name: 'TonswapBurnCampaign' });
const props = defineProps<{ initialAmount?: string }>();
const emit = defineEmits<{ 'amount-change': [amount: string]; submitted: [payload: { transactionHash: string }] }>();

const { t } = useTranslation();
const { isLoggedIn, soraAddress, connectSoraWallet } = useInternalConnect();
const { withNotifications } = useTransaction();
const { handleCopyAddress } = useCopyAddress();
const settings = useSettingsStore();
const assets = useAssetsStore();
const wallet = useWalletStore();
const xor = XOR;
const zero = new FPNumber('0');
const allocation = shallowRef<ReturnType<typeof allocateTonswapBurns> | null>(null);
const indexedThroughBlock = ref(0);
const refreshing = ref(false);
const loadFailed = ref(false);
const dialogVisible = ref(false);
const amountInput = ref<InstanceType<typeof TokenInput> | null>(null);
const amount = ref('');
const previewAmount = ref(readTonswapIntent()?.amount ?? '');
const previewEdited = ref(false);
const receiptDownloadError = ref('');
const parsedPreviewAmount = computed(() => parseTonswapPreviewAmount(previewAmount.value));
const googleWalletAvailable = computed(
  () => wallet.availableWallets?.some((entry) => entry.extensionName === 'google-drive') ?? false
);
const submitting = ref(false);
type BurnPhase = 'waiting' | 'included' | 'confirmed' | 'updated' | 'failed';
type BurnReceipt = {
  localId: number;
  address: string;
  amount: string;
  historyId?: string;
  txHash: string;
  submittedAt: number;
  previousHistoryIds: string[];
  phase: BurnPhase;
};
const burnReceipt = ref<BurnReceipt | null>(null);
const priorBurnReceipts = ref<BurnReceipt[]>([]);
const submittedReceiptIds = new Set<number>();
let receiptId = 0;
const allBurnReceipts = computed(() =>
  burnReceipt.value ? [burnReceipt.value, ...priorBurnReceipts.value] : priorBurnReceipts.value
);
const visibleBurnReceipts = computed(() => allBurnReceipts.value.filter((receipt) => receipt.phase !== 'updated'));
const reconciliationDelayed = ref(false);
const RECONCILIATION_INTERVAL_MS = 2_000;
const RECONCILIATION_WINDOW_MS = 120_000;
const RECOVER_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1_000;
let reconciliationTimer: ReturnType<typeof setTimeout> | undefined;
let reconciliationDeadline = 0;
const submitError = ref('');
const historySection = ref<HTMLElement | null>(null);
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let disposed = false;
let requestId = 0;

const isMainnet = computed(() => settings.soraNetwork === SoraNetwork.Prod);
const isExcludedAccount = computed(() => isExcludedXorBurnAddress(soraAddress.value));
const burnPending = computed(() => allBurnReceipts.value.some(isPendingReceipt));
const canBurn = computed(() => isMainnet.value && !submitting.value);
const currentRate = computed(() => getTonswapCurrentRate(allocation.value?.totalEligible ?? zero));
const accountAllocations = computed(
  () =>
    allocation.value?.allocations
      .filter((row) => soraAddress.value && isSameSoraAddress(row.address, soraAddress.value))
      .slice()
      .reverse() ?? []
);
const accountBurned = computed(() => accountAllocations.value.reduce((total, row) => total.add(row.amount), zero));
const accountReward = computed(() => accountAllocations.value.reduce((total, row) => total.add(row.reward), zero));
const feeCodec = computed(() => settings.networkFees?.[Operation.BurnWithRemark]);
const parsedFee = computed(() => parseNonnegativeCodec(feeCodec.value));
const fee = computed(() => parsedFee.value ?? zero);
const balance = computed(() => parseNonnegativeCodec(assets.xor?.balance?.transferable));
const validAmount = computed(
  () =>
    amount.value.length <= 97 &&
    /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount.value) &&
    new FPNumber(amount.value).gt(zero)
);
const parsedAmount = computed(() => (validAmount.value ? new FPNumber(amount.value) : null));
const quote = computed(() => {
  if (!parsedAmount.value) return null;
  // An excluded source always earns zero, independently of whether reward data is available.
  if (isExcludedAccount.value) return quoteTonswapBurn(new FPNumber(TONSWAP_XOR_CAP), parsedAmount.value);
  return allocation.value ? quoteTonswapBurn(allocation.value.totalEligible, parsedAmount.value) : null;
});
const previewQuote = computed(() => {
  if (!isMainnet.value || !parsedPreviewAmount.value) return null;
  if (isExcludedAccount.value) return quoteTonswapBurn(new FPNumber(TONSWAP_XOR_CAP), parsedPreviewAmount.value);
  return allocation.value ? quoteTonswapBurn(allocation.value.totalEligible, parsedPreviewAmount.value) : null;
});
const insufficientBalance = computed(
  () => !!parsedAmount.value && (!balance.value || balance.value.lt(parsedAmount.value.add(fee.value)))
);
const exceedsRemaining = computed(() => !!quote.value && quote.value.excess.gt(zero));
const canSubmit = computed(
  () =>
    canBurn.value &&
    dialogVisible.value &&
    isLoggedIn.value &&
    !!soraAddress.value &&
    !!parsedAmount.value &&
    !!parsedFee.value &&
    !insufficientBalance.value &&
    !submitting.value
);
const statusMessage = computed(() => {
  if (isLoggedIn.value && isExcludedAccount.value) return t('burnPage.tonswap.excludedAccount');
  if (!isMainnet.value) return t('burnPage.tonswap.mainnetOnly');
  return '';
});
/** Keep background reads visually quiet; only a verified result or outage changes the displayed state. */
const dataStatusState = computed(() => {
  if (loadFailed.value) return allocation.value ? 'stale' : 'reconnecting';
  return allocation.value ? 'ready' : 'loading';
});
const dataStatusMessage = computed(() => {
  const keys = { ready: 'dataReady', stale: 'dataStale', reconnecting: 'dataReconnecting', loading: 'loading' };
  return t(`burnPage.tonswap.${keys[dataStatusState.value]}`);
});
const validationMessage = computed(() => {
  if (amount.value && !validAmount.value) return t('burnPage.tonswap.invalidAmount');
  if (insufficientBalance.value) return t('insufficientBalanceText', { tokenSymbol: 'XOR' });
  if (!parsedFee.value) return t('burnPage.tonswap.feeUnavailable');
  if (!isMainnet.value) return t('burnPage.tonswap.mainnetOnly');
  return '';
});

/** Formats exact token values only for display. */
function format(value: FPNumber, precision = 4): string {
  return formatBurnAmount(value, precision);
}

/** Rejects missing, malformed or negative chain amounts before any balance comparison. */
function parseNonnegativeCodec(value: unknown): FPNumber | null {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,77})$/.test(value)) return null;
  const parsed = FPNumber.fromCodecValue(value, XOR.decimals);
  return parsed.isFinity() && !parsed.lt(zero) ? parsed : null;
}

/** Refreshes advisory reward data without controlling whether XOR can be burned. */
async function refreshSnapshot(): Promise<boolean> {
  const id = ++requestId;
  if (!isMainnet.value) return false;
  refreshing.value = true;
  try {
    const snapshot = await fetchTonswapBurnSnapshot();
    const next = allocateTonswapBurns(snapshot.burns);
    if (disposed || id !== requestId) return false;
    allocation.value = next;
    indexedThroughBlock.value = snapshot.indexedThroughBlock;
    loadFailed.value = !snapshot.fresh;
    reconcileIndexedBurn();
    return snapshot.fresh;
  } catch {
    if (!disposed && id === requestId) loadFailed.value = true;
    return false;
  } finally {
    if (id === requestId) refreshing.value = false;
  }
}

/** Starts an independent XOR-only quote without any destination-account input. */
function openDialog(): void {
  if (!canBurn.value || submitting.value) return;
  amount.value = parsedPreviewAmount.value ? previewAmount.value : '';
  submitError.value = '';
  dialogVisible.value = true;
}

/** Runs once after the modal and its focus trap finish opening, never on amount updates. */
function focusAmountOnOpen(): void {
  if (!dialogVisible.value || submitting.value) return;
  void amountInput.value?.focusAndSelect();
}

/** Keeps entered amounts as decimal strings and prevents edits during submission. */
function setAmount(value: string): void {
  if (submitting.value) return;
  previewEdited.value = true;
  amount.value = value;
  emit('amount-change', value);
  submitError.value = '';
}

/** Signs using live wallet and funding checks; reward-data requests never block a burn. */
async function confirmBurn(): Promise<void> {
  if (!canSubmit.value) return;
  const requested = amount.value;
  const signer = soraAddress.value;
  const submittedAt = Date.now();
  const previousHistoryIds = currentBurnHistory().map((item) => item.id ?? historyTxHash(item));
  submitting.value = true;
  submitError.value = '';
  try {
    const result = await withNotifications(async () => {
      if (
        disposed ||
        !dialogVisible.value ||
        !isLoggedIn.value ||
        !isMainnet.value ||
        soraAddress.value !== signer ||
        amount.value !== requested
      ) {
        throw new Error(t('burnPage.tonswap.accountChanged'));
      }
      if (!validAmount.value) throw new Error(t('burnPage.tonswap.invalidAmount'));
      if (!parsedFee.value) throw new Error(t('burnPage.tonswap.feeUnavailable'));
      if (insufficientBalance.value) throw new Error(t('insufficientBalanceText', { tokenSymbol: 'XOR' }));
      const chainApi = api.connection?.api;
      if (!chainApi?.isConnected) throw new Error(t('burnPage.tonswap.connectionUnavailable'));
      if (chainApi.genesisHash?.toString?.().toLowerCase() !== TONSWAP_MAINNET_GENESIS) {
        throw new Error(t('burnPage.tonswap.mainnetOnly'));
      }
      const actualSigner = api.account?.pair?.address;
      if (!actualSigner || !signer || !isSameSoraAddress(actualSigner, signer)) {
        throw new Error(t('burnPage.tonswap.accountChanged'));
      }
      await api.assets.burnWithRemark(XOR, requested, createTonswapXorBurnRemark());
    });
    const recovered = findSubmittedBurn(signer, requested, submittedAt, previousHistoryIds);
    const transaction =
      isMatchingBurnHistory(result.transaction, signer, requested) &&
      typeof result.transaction?.startTime === 'number' &&
      result.transaction.startTime >= submittedAt &&
      !previousHistoryIds.includes(result.transaction.id ?? historyTxHash(result.transaction))
        ? result.transaction
        : recovered;
    if ((result.submitted || transaction) && !disposed) {
      trackTonswapStep('burn_submitted');
      dialogVisible.value = false;
      if (soraAddress.value === signer && isLoggedIn.value && isMainnet.value) {
        appendBurnReceipt({
          address: signer,
          amount: requested,
          historyId: transaction?.id,
          txHash: transaction ? historyTxHash(transaction) : '',
          submittedAt,
          previousHistoryIds,
          phase: phaseFromHistory(transaction),
        });
        if (burnReceipt.value) submittedReceiptIds.add(burnReceipt.value.localId);
        syncBurnHistory();
        startReconciliation();
      }
      void nextTick(() => {
        const receipt = historySection.value?.querySelector('.tonswap-burn__record');
        receipt?.scrollIntoView?.({
          block: 'nearest',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      });
      if (!refreshing.value) void refreshSnapshot();
    } else if (result.error) {
      submitError.value = result.error instanceof Error ? result.error.message : t('burnPage.tonswap.submitFailed');
    }
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : t('burnPage.tonswap.submitFailed');
  } finally {
    submitting.value = false;
  }
}

/** Trust burns finish at chain finality because they are intentionally absent from reward data. */
function isPendingReceipt(receipt: BurnReceipt): boolean {
  return (
    !['updated', 'failed'].includes(receipt.phase) &&
    !(receipt.phase === 'confirmed' && isExcludedXorBurnAddress(receipt.address))
  );
}

/** Describes this transaction without promising TS for an excluded source. */
function receiptProgressMessage(receipt: BurnReceipt | null): string {
  if (!receipt) return '';
  if (receipt.phase === 'failed') return t('transaction.statuses.failed');
  if (receipt.phase === 'confirmed' && isExcludedXorBurnAddress(receipt.address))
    return t('transaction.statuses.complete');
  const keys = {
    waiting: 'waitingConfirmation',
    included: 'included',
    confirmed: 'confirmed',
    updated: 'rewardsUpdated',
  };
  return t(`burnPage.tonswap.${keys[receipt.phase]}`);
}

/** Preserves every earlier receipt when the wallet submits another independent burn. */
function appendBurnReceipt(receipt: Omit<BurnReceipt, 'localId'>): void {
  if (receipt.txHash && allBurnReceipts.value.some((entry) => entry.txHash === receipt.txHash)) return;
  if (burnReceipt.value) priorBurnReceipts.value.unshift(burnReceipt.value);
  burnReceipt.value = { ...receipt, localId: ++receiptId };
}

/** Only an actual extrinsic hash can reconcile a submitted burn against the global snapshot. */
function normalizeTxHash(value: unknown): string {
  return typeof value === 'string' && /^0x[\da-f]{64}$/i.test(value) ? value.toLowerCase() : '';
}

/** Distinguishes chain evidence from transport errors, which can follow node acceptance. */
function phaseFromHistory(item?: Pick<HistoryItem, 'status' | 'blockId'>): BurnPhase {
  if (item?.status === TransactionStatus.Error && normalizeTxHash(item.blockId)) return 'failed';
  if (item?.status === TransactionStatus.Finalized) return 'confirmed';
  if (item?.status === TransactionStatus.InBlock) return 'included';
  return 'waiting';
}

/** The SDK keeps its deterministic signed hash as history.id when a send response is lost. */
function historyTxHash(item: HistoryItem): string {
  return normalizeTxHash(item.txId) || normalizeTxHash(item.id);
}

/** Limits transaction identity recovery to this exact marked XOR burn and source wallet. */
function isMatchingBurnHistory(item: HistoryItem | undefined, address: string, amount?: string): boolean {
  return !!(
    item &&
    item.type === Operation.Burn &&
    item.assetAddress === XOR.address &&
    item.from &&
    isSameSoraAddress(item.from, address) &&
    typeof item.comment === 'string' &&
    parseTonswapXorBurnRemark(item.comment) &&
    typeof item.amount === 'string' &&
    item.amount.length <= 97 &&
    /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(item.amount) &&
    new FPNumber(item.amount).gt(zero) &&
    (amount === undefined || new FPNumber(item.amount).eq(new FPNumber(amount)))
  );
}

/** Rejects an ambiguous concurrent history match instead of attaching another operation's hash. */
function findSubmittedBurn(
  address: string,
  amount: string,
  submittedAt: number,
  previousHistoryIds: string[]
): HistoryItem | undefined {
  const candidates = currentBurnHistory().filter(
    (item) =>
      isMatchingBurnHistory(item, address, amount) &&
      typeof item.startTime === 'number' &&
      item.startTime >= submittedAt &&
      !previousHistoryIds.includes(item.id ?? historyTxHash(item))
  );
  const identities = new Set(candidates.map((item) => historyTxHash(item) || item.id).filter(Boolean));
  return identities.size === 1 ? candidates.find((item) => identities.has(historyTxHash(item) || item.id)) : undefined;
}

/** Reads the wallet's live transaction records, including indexer-delivered history updates. */
function currentBurnHistory(): HistoryItem[] {
  let local: HistoryItem[] = [];
  try {
    local = api.historyList ?? [];
  } catch {
    // The account may have disconnected between a wallet event and this read.
  }
  return [
    ...local,
    ...Object.values(wallet.history ?? {}),
    ...Object.values(wallet.externalHistoryUpdates ?? {}),
    ...Object.values(wallet.externalHistory ?? {}),
  ];
}

/** Uses wallet evidence for progress only; it never adds provisional rewards to the curve. */
function syncBurnHistory(): void {
  for (const receipt of allBurnReceipts.value) {
    if (isPendingReceipt(receipt)) syncReceiptHistory(receipt);
  }
  if (!burnPending.value) stopReconciliation();
}

/** Reconciles one receipt without assigning a hash already owned by a different submission. */
function syncReceiptHistory(receipt: BurnReceipt): void {
  const candidates = currentBurnHistory().filter((item) => {
    if (
      allBurnReceipts.value.some((other) => other !== receipt && other.txHash && other.txHash === historyTxHash(item))
    )
      return false;
    if (item.from && !isSameSoraAddress(item.from, receipt.address)) return false;
    if (receipt.txHash && historyTxHash(item) === receipt.txHash) return true;
    if (receipt.historyId && item.id === receipt.historyId) return true;
    return (
      !receipt.txHash &&
      !receipt.historyId &&
      isMatchingBurnHistory(item, receipt.address, receipt.amount) &&
      typeof item.startTime === 'number' &&
      item.startTime >= receipt.submittedAt &&
      !receipt.previousHistoryIds.includes(item.id ?? historyTxHash(item))
    );
  });
  if (
    !receipt.txHash &&
    !receipt.historyId &&
    new Set(candidates.map((entry) => historyTxHash(entry) || entry.id).filter(Boolean)).size !== 1
  )
    return;
  const item =
    candidates.find((entry) => entry.status === TransactionStatus.Finalized) ??
    candidates.find((entry) => phaseFromHistory(entry) === 'failed') ??
    candidates.find((entry) => entry.status === TransactionStatus.InBlock) ??
    candidates[0];
  if (!item) return;
  receipt.historyId ||= item.id;
  receipt.txHash ||= historyTxHash(item);
  const phase = phaseFromHistory(item);
  if (phase === 'failed' || phase === 'confirmed' || (phase === 'included' && receipt.phase === 'waiting')) {
    receipt.phase = phase;
  }
}

/** Completes feedback only when this exact account and transaction appear in authoritative finalized data. */
function reconcileIndexedBurn(): void {
  for (const receipt of allBurnReceipts.value) {
    if (
      receipt.txHash &&
      allocation.value?.allocations.some(
        (row) => row.txHash === receipt.txHash && isSameSoraAddress(row.address, receipt.address)
      )
    )
      receipt.phase = 'updated';
  }
  if (!burnPending.value) {
    reconciliationDelayed.value = false;
    stopReconciliation();
  }
}

/** Restores each recent marked burn without trusting local history for reward totals. */
function recoverBurnReceipt(): void {
  if (disposed || !isLoggedIn.value || !isMainnet.value || submitting.value) return;
  // First attach late history to submitted receipts, before considering any record as a new receipt.
  syncBurnHistory();
  const now = Date.now();
  const items = currentBurnHistory()
    .filter((entry) => {
      const txHash = historyTxHash(entry);
      return (
        isMatchingBurnHistory(entry, soraAddress.value) &&
        !!txHash &&
        typeof entry.startTime === 'number' &&
        entry.startTime <= now &&
        now - entry.startTime <= RECOVER_HISTORY_WINDOW_MS &&
        phaseFromHistory(entry) !== 'failed' &&
        !allBurnReceipts.value.some(
          (receipt) => receipt.txHash === txHash || (receipt.historyId && receipt.historyId === entry.id)
        ) &&
        !allocation.value?.allocations.some((row) => row.txHash === txHash)
      );
    })
    .sort((left, right) => (left.startTime ?? 0) - (right.startTime ?? 0));
  for (const item of items) {
    appendBurnReceipt({
      address: soraAddress.value,
      amount: item.amount as string,
      historyId: item.id,
      txHash: historyTxHash(item),
      submittedAt: item.startTime as number,
      previousHistoryIds: [],
      phase: phaseFromHistory(item),
    });
  }
  syncBurnHistory();
  reconcileIndexedBurn();
  if (items.length && burnPending.value) startReconciliation();
}

/** Stops the short retry loop; the normal background refresh remains available. */
function stopReconciliation(): void {
  clearTimeout(reconciliationTimer);
  reconciliationTimer = undefined;
}

/** Checks immediately on wallet/block changes, with one network read at a time. */
async function refreshBurnStatus(): Promise<void> {
  if (disposed || !isMainnet.value || !burnPending.value) return;
  syncBurnHistory();
  reconcileIndexedBurn();
  if (burnPending.value && !submitting.value && !refreshing.value) await refreshSnapshot();
}

/** Keeps the public curve current on blocks and tab return without overlapping reads or signing. */
async function refreshCampaignStatus(): Promise<void> {
  if (disposed || !isMainnet.value || document.visibilityState === 'hidden') return;
  if (burnPending.value) await refreshBurnStatus();
  else if (!submitting.value && !refreshing.value) await refreshSnapshot();
}

/** Polls briefly through normal indexer lag, then retains the receipt and slower background checks. */
function scheduleReconciliation(): void {
  stopReconciliation();
  if (disposed || !burnPending.value) return;
  if (Date.now() >= reconciliationDeadline) {
    reconciliationDelayed.value = true;
    return;
  }
  reconciliationTimer = setTimeout(async () => {
    await refreshBurnStatus();
    scheduleReconciliation();
  }, RECONCILIATION_INTERVAL_MS);
}

/** Opens a bounded fast-refresh window without changing any finalized reward values. */
function startReconciliation(): void {
  reconciliationDeadline = Date.now() + RECONCILIATION_WINDOW_MS;
  reconciliationDelayed.value = false;
  scheduleReconciliation();
}

/** Manually retries status checks without preventing another independent burn. */
function retryBurnStatus(): void {
  startReconciliation();
  void refreshBurnStatus();
}

/** Copies a burn hash so the user can retain its receipt through confirmation and indexing. */
function copyHash(hash: string, event: MouseEvent): void {
  void handleCopyAddress(hash, event);
}

/** Saves a public finalized record; the signing wallet is still required to exercise the claim. */
async function saveReceipt(row: TonswapBurnAllocation): Promise<void> {
  receiptDownloadError.value = '';
  try {
    const { saveAs } = await import('file-saver');
    saveAs(
      new Blob([createTonswapReceipt(row)], { type: 'application/json;charset=utf-8' }),
      `tonswap-${row.txHash}.json`
    );
    trackTonswapStep('receipt_saved');
  } catch {
    receiptDownloadError.value = row.txHash;
  }
}

let previewTracked = false;
// An optional purchase draft is only a suggestion; edited or open reviews stay under the user's control.
watch(
  [() => props.initialAmount, balance, feeCodec, isLoggedIn],
  () => {
    if (previewEdited.value || dialogVisible.value || !isLoggedIn.value || !props.initialAmount) return;
    previewAmount.value = getTsBurnPrefill(props.initialAmount, assets.xor?.balance?.transferable, feeCodec.value);
  },
  { immediate: true }
);
watch(previewAmount, (value) => emit('amount-change', value));
const emittedHashes = new Set<string>();
watch(
  () =>
    allBurnReceipts.value
      .filter((receipt) => submittedReceiptIds.has(receipt.localId))
      .map((receipt) => receipt.txHash),
  (hashes) => {
    for (const hash of hashes) {
      if (!/^0x[0-9a-f]{64}$/i.test(hash) || emittedHashes.has(hash)) continue;
      emittedHashes.add(hash);
      emit('submitted', { transactionHash: hash });
    }
  }
);
watch(parsedPreviewAmount, (value) => {
  if (!value || previewTracked) return;
  previewTracked = true;
  trackTonswapStep('preview');
});
watch(isLoggedIn, (value) => {
  if (value) trackTonswapStep('wallet_ready');
});
watch(
  () => allBurnReceipts.value.filter((receipt) => receipt.phase === 'updated').length,
  (count, previous) => {
    if (count > previous) trackTonswapStep('reservation_indexed');
  }
);

watch([soraAddress, isLoggedIn], () => {
  dialogVisible.value = false;
  stopReconciliation();
  burnReceipt.value = null;
  priorBurnReceipts.value = [];
  reconciliationDelayed.value = false;
  recoverBurnReceipt();
  void refreshBurnStatus();
});
watch(isMainnet, () => {
  dialogVisible.value = false;
  stopReconciliation();
  burnReceipt.value = null;
  priorBurnReceipts.value = [];
  allocation.value = null;
  indexedThroughBlock.value = 0;
  requestId += 1;
  if (isMainnet.value) void refreshSnapshot().then(() => recoverBurnReceipt());
});
watch(
  () => wallet.history,
  () => {
    const previous = allBurnReceipts.value.map((receipt) => `${receipt.phase}:${receipt.txHash}`).join(',');
    recoverBurnReceipt();
    syncBurnHistory();
    if (previous !== allBurnReceipts.value.map((receipt) => `${receipt.phase}:${receipt.txHash}`).join(','))
      void refreshBurnStatus();
  },
  { deep: true }
);
watch(
  [() => wallet.externalHistory, () => wallet.externalHistoryUpdates],
  () => {
    recoverBurnReceipt();
    void refreshBurnStatus();
  },
  { deep: true }
);
watch(
  () => settings.blockNumber,
  () => void refreshCampaignStatus()
);
onMounted(() => {
  trackTonswapStep('view');
  if (isLoggedIn.value) trackTonswapStep('wallet_ready');
  recoverBurnReceipt();
  void refreshSnapshot().then(() => {
    recoverBurnReceipt();
    void refreshBurnStatus();
  });
  document.addEventListener('visibilitychange', refreshCampaignStatus);
  window.addEventListener('focus', refreshCampaignStatus);
  refreshTimer = setInterval(() => void refreshCampaignStatus(), 5_000);
});
onBeforeUnmount(() => {
  disposed = true;
  requestId += 1;
  clearInterval(refreshTimer);
  document.removeEventListener('visibilitychange', refreshCampaignStatus);
  window.removeEventListener('focus', refreshCampaignStatus);
  stopReconciliation();
});
defineExpose({
  refreshSnapshot,
  openDialog,
  setAmount,
  confirmBurn,
  allocation,
  quote,
  canBurn,
  canSubmit,
  dialogVisible,
  submitError,
  burnReceipt,
  priorBurnReceipts,
  burnPending,
  reconciliationDelayed,
  retryBurnStatus,
  previewAmount,
  previewQuote,
  saveReceipt,
});
</script>

<style lang="scss" scoped>
.tonswap-burn {
  @include buttons;
  @include full-width-button('action-button');
  margin: 0 0 $basic-spacing;
  box-shadow: var(--s-shadow-element-pressed);

  &__preview {
    margin: 20px 0 16px;
    text-align: left;
    h3 {
      margin: 0 0 12px;
      font-size: 15px;
    }
    label {
      display: block;
      margin: 0 0 6px;
      font-size: 12px;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      min-height: 48px;
      border: 1px solid var(--s-color-base-content-secondary);
      border-radius: 12px;
      padding: 10px 12px;
      font: inherit;
      font-size: 18px;
      color: var(--s-color-base-content-primary);
      background: var(--s-color-utility-body);
      &:focus-visible {
        outline: 2px solid var(--s-color-theme-accent);
        outline-offset: 2px;
      }
    }
    p {
      font-size: 12px;
      line-height: 1.5;
      color: var(--s-color-base-content-secondary);
    }
  }
  &__onboarding {
    margin: 12px 0 20px;
    text-align: left;
    summary {
      cursor: pointer;
      padding: 12px 0;
      font-size: 13px;
      font-weight: 600;
    }
  }
  &__receipt-note {
    font-size: 12px;
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);
  }
  &__save-receipt {
    max-width: 100%;
    white-space: normal;
    min-height: 40px;
    height: auto;
  }

  &.container {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    padding: 24px;
    @media (max-width: 480px) {
      padding: 20px;
    }
  }

  &__heading {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
    :deep(.page-header) {
      margin: 0;
    }
    :deep(.page-header-title) {
      font-size: 20px;
      line-height: 1.3;
      font-weight: 600;
      text-transform: none;
    }
  }
  &__mark {
    display: block;
    flex: 0 0 96px;
    width: 96px;
    height: 96px;
  }
  &__description,
  &__claim {
    text-align: left;
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 12px;
  }
  &__claim strong {
    font-weight: 700;
  }
  :deep(.info-line) {
    min-width: 0;
    padding: 8px 4px;
  }
  :deep(.info-line-label) {
    font-size: 12px;
    line-height: 1.4;
    text-transform: none;
    font-weight: 400;
  }
  :deep(.info-line-value) {
    font-size: 13px;
    font-weight: 600;
  }
  :deep(.action-button.el-button) {
    height: 46px;
    min-height: 46px;
    font-size: 15px;
    line-height: 20px;
    font-weight: 600;
    text-transform: none;
  }
  &__progress {
    width: 100%;
    height: 4px;
    accent-color: var(--s-color-theme-accent);
    margin: 12px 0;
    border: 0;
    border-radius: 4px;
    overflow: hidden;
    &::-webkit-progress-bar {
      background: var(--s-color-base-border-secondary);
    }
    &::-webkit-progress-value {
      background: var(--s-color-theme-accent);
    }
  }
  &__status {
    font-size: 13px;
    margin: 12px 0;
    line-height: 1.5;
  }
  &__data {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    margin: 16px 0;
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
  }
  &__data-content {
    flex: 1;
    min-width: 0;
  }
  &__data-message {
    min-height: 36px;
    margin: 0;
    font-size: 12px;
    line-height: 18px;
  }
  &__data-block {
    min-height: 16px;
    margin: 4px 0 0;
    font-size: 11px;
    line-height: 16px;
    color: var(--s-color-base-content-secondary);
  }
  :deep(.tonswap-burn__data-refresh.el-button) {
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    margin: 0;
    padding: 0;
    &.is-disabled,
    &:disabled {
      opacity: 1;
      color: var(--s-color-base-content-primary);
    }
  }
  &__history {
    width: 100%;
    margin-top: 24px;
    font-size: 13px;
    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      font-size: 16px;
      line-height: 1.4;
      font-weight: 600;
    }
  }
  &__records {
    display: flex;
    flex-direction: column;
    gap: 16px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  &__record {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element);
    p {
      margin: 0;
    }
  }
  &__receipt-heading {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    line-height: 1.5;
    strong {
      flex: 1;
      min-width: 0;
      font-weight: 600;
    }
  }
  &__record-icon {
    flex: 0 0 22px;
    color: var(--s-color-theme-accent);
  }
  &__spinner {
    flex: 0 0 15px;
    width: 15px;
    height: 15px;
    margin-top: 2px;
    border: 2px solid var(--s-color-theme-accent);
    border-right-color: transparent;
    border-radius: 50%;
    animation: tonswap-pending 900ms linear infinite;
  }
  &__receipt-amount {
    padding: 12px;
    border-radius: 8px;
    background: var(--s-color-base-border-primary);
    box-shadow: var(--s-shadow-element-pressed);
    font-size: 16px;
    font-weight: 600;
  }
  &__receipt-claim {
    font-size: 12px;
    line-height: 1.5;
  }
  &__updated {
    margin-bottom: 16px;
    font-size: 12px;
    line-height: 1.5;
    p {
      margin: 0 0 4px;
      font-weight: 600;
      font-size: 14px;
    }
  }
  dl.tonswap-burn__record-amounts {
    display: grid;
    // Keep native CSS minmax separate from the shared Sass breakpoint helper.
    grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
    gap: 12px;
    margin: 0;
    @media (max-width: 379px) {
      grid-template-columns: 1fr;
    }
    > div {
      min-width: 0;
      padding: 12px;
      border-radius: 8px;
      background: var(--s-color-base-border-primary);
      box-shadow: var(--s-shadow-element-pressed);
    }
    dt {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      line-height: 1.4;
      color: var(--s-color-base-content-secondary);
      :deep(.s-icon) {
        flex: 0 0 16px;
        color: var(--s-color-theme-accent);
      }
    }
    dd {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      column-gap: 4px;
      margin: 4px 0 0;
      font-size: 16px;
      line-height: 1.4;
      font-weight: 600;
      @media (max-width: 480px) {
        font-size: 13px;
      }
    }
    .tonswap-burn__record-number {
      white-space: nowrap;
    }
    .tonswap-burn__record-unit {
      font-size: 12px;
      font-weight: 400;
    }
  }
  &__record-block,
  &__delayed {
    font-size: 12px;
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);
  }
  &__hash {
    display: flex;
    align-items: center;
    gap: 10px;
    > div {
      min-width: 0;
      flex: 1;
    }
    span {
      display: block;
      margin-bottom: 3px;
      font-size: 11px;
      color: var(--s-color-base-content-secondary);
    }
    code {
      display: block;
      font-size: 11px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    :deep(.el-button) {
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      min-height: 32px;
      padding: 0;
    }
  }
  :deep(.tonswap-burn__retry.el-button) {
    align-self: flex-start;
    min-height: 34px;
    height: auto;
    padding: 8px 12px;
    font-size: 12px;
    line-height: 1.4;
    font-weight: 500;
    text-transform: none;
  }
}
@keyframes tonswap-pending {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tonswap-burn__spinner {
    animation: none;
  }
}
</style>

<style lang="scss">
.dialog--tonswap-burn {
  width: min(448px, calc(100vw - 32px));
  max-width: min(448px, calc(100vw - 32px));
  flex-shrink: 0;
  .dialog-card__header {
    padding: 20px 24px 16px;
    border-bottom: 0;
    gap: 12px;
  }
  .dialog-card__title-text {
    font-size: 20px;
    line-height: 1.3;
    font-weight: 600;
    white-space: normal;
  }
  .dialog-card__close.el-button {
    width: 32px;
    min-width: 32px;
    height: 32px;
  }
  .dialog-card__content {
    // Keep the input's 4px outer focus ring inside the scroll container.
    padding: 8px 24px 0;
    max-height: calc(100dvh - 188px);
  }
  .dialog-card__footer {
    padding: 18px 24px 24px;
    gap: 0;
  }

  .tonswap-dialog {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    p {
      margin: 0;
    }
    .token-input {
      margin: 0;
    }
    .s-input.token-input > .s-input__content {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      > .s-input__right {
        flex-shrink: 0;
        justify-content: flex-end;
      }
    }
    .input-title--uppercase,
    .input-value--uppercase {
      text-transform: none;
      font-size: 12px;
    }
    .token-input input.el-input__inner {
      font-size: 28px;
      font-weight: 600;
      line-height: 1.2;
    }
  }
  .tonswap-dialog__estimate {
    padding: 16px 0;
    border-bottom: 1px solid var(--s-color-base-border-secondary);
    > span {
      display: block;
      font-size: 12px;
      color: var(--s-color-base-content-secondary);
    }
    > div {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
      min-width: 0;
    }
    .tonswap-dialog__fire {
      flex: 0 0 96px;
      width: 96px;
      height: 96px;
    }
    strong {
      min-width: 0;
      font-size: clamp(24px, 6vw, 32px);
      font-weight: 600;
      letter-spacing: -0.6px;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    div > span {
      font-size: 17px;
      font-weight: 500;
    }
  }
  .tonswap-dialog__fee {
    margin: 0;
    border: 0;
    .info-line-label,
    .info-line-value {
      font-size: 12px;
      font-weight: 400;
      text-transform: none;
    }
  }
  .tonswap-dialog__notes {
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-size: 12px;
    line-height: 1.5;
  }
  .tonswap-dialog__notes strong {
    font-weight: 700;
  }
  .tonswap-dialog__warning {
    font-size: 12px;
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);
  }
  .tonswap-dialog__error {
    font-size: 12px;
    line-height: 1.5;
    color: var(--s-color-status-error, #bf2852);
  }
  .tonswap-dialog__submit.el-button {
    width: 100%;
    height: 46px;
    min-height: 46px;
    padding: 12px 16px;
    font-size: 15px;
    line-height: 20px;
    font-weight: 600;
    text-transform: none;
  }
}
@media (max-width: 480px) {
  .dialog--tonswap-burn {
    .dialog-card__header {
      padding: 18px 20px 14px;
    }
    .dialog-card__content {
      padding: 8px 20px 0;
    }
    .dialog-card__footer {
      padding: 16px 20px 20px;
    }
    .dialog-card__title-text {
      font-size: 19px;
    }
  }
}
</style>
