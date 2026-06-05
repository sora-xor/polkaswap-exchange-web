<template>
  <dialog-base :title="t('polkamarkt.actions.createMarket')" v-model:visible="isVisible">
    <form class="create-market" @submit.prevent="submit">
      <label class="create-field">
        <span>{{ t('polkamarkt.create.question') }}</span>
        <textarea
          v-model="question"
          class="polkamarkt-textarea"
          :placeholder="t('polkamarkt.create.questionPlaceholder')"
        />
        <small>{{ questionBytes }} / {{ maxMetadataBytes }} {{ t('polkamarkt.units.bytes') }}</small>
      </label>

      <div class="create-market__row">
        <div class="create-field">
          <s-select
            v-model="category"
            class="polkamarkt-select"
            :label="t('polkamarkt.create.category')"
            :options="categoryOptions"
            mandatory
            max-shown-options="8"
          />
        </div>
        <div class="create-field create-field--deadline">
          <div class="create-field__header">
            <span>{{ activeDeadlineLabel }}</span>
            <div class="create-market__deadline-toggle" role="group">
              <button
                type="button"
                data-testid="polkamarkt-deadline-mode-date"
                :class="[
                  'create-market__deadline-toggle-button',
                  { 'create-market__deadline-toggle-button--active': deadlineInputMode === 'date' },
                ]"
                :aria-pressed="deadlineInputMode === 'date'"
                @click="setDeadlineInputMode('date')"
              >
                {{ t('polkamarkt.create.deadline') }}
              </button>
              <button
                type="button"
                data-testid="polkamarkt-deadline-mode-block"
                :class="[
                  'create-market__deadline-toggle-button',
                  { 'create-market__deadline-toggle-button--active': deadlineInputMode === 'block' },
                ]"
                :aria-pressed="deadlineInputMode === 'block'"
                @click="setDeadlineInputMode('block')"
              >
                {{ t('polkamarkt.create.closeBlock') }}
              </button>
            </div>
          </div>
          <input
            v-if="deadlineInputMode === 'date'"
            v-model="deadline"
            class="polkamarkt-input"
            type="datetime-local"
          />
          <input
            v-else
            v-model="closeBlockInput"
            class="polkamarkt-input"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="off"
            @blur="normalizeCloseBlockInput"
          />
        </div>
      </div>

      <div class="create-market__preview">
        <div>
          <span>{{ t('polkamarkt.create.creatorSeed') }}</span>
          <strong>0 {{ collateralSymbol }}</strong>
        </div>
        <div>
          <span>{{ linkedDeadlinePreviewLabel }}</span>
          <strong>{{ linkedDeadlinePreviewValue }}</strong>
        </div>
        <div>
          <span>{{ t('polkamarkt.create.creationFee') }}</span>
          <strong>{{ creationFee }} {{ collateralSymbol }}</strong>
        </div>
        <div>
          <span>{{ t('networkFeeText') }}</span>
          <strong>{{ networkFeeFormatted }}</strong>
        </div>
      </div>

      <p class="create-market__note">{{ t('polkamarkt.create.dpmNote') }}</p>
      <p v-if="error" class="create-market__error">{{ error }}</p>

      <s-button
        type="primary"
        class="create-market__button"
        native-type="submit"
        :disabled="disabled"
        :loading="loading"
      >
        {{ actionLabel }}
      </s-button>
    </form>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { api } from '@/lib/soraneo-wallet/src/api';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import {
  MARKET_CATEGORIES,
  POLKAMARKT_CREATION_FEE_KUSD,
  POLKAMARKT_DEFAULT_ORACLE,
  POLKAMARKT_DEFAULT_RESOLUTION_SOURCE,
  POLKAMARKT_MAX_METADATA_BYTES,
  type MarketCategory,
} from '../consts';
import { formatPolkamarktCodec, isPositiveCodec, parsePolkamarktAmount } from '../lib/amounts';
import {
  calculateApproximateCloseDate,
  calculateCloseBlockFromBlockInput,
  calculateCloseBlockFromDate,
  formatApproximateCloseDate,
  formatDateTimeLocalInput,
  metadataByteLength,
  validateMarketMetadata,
} from '../lib/markets';

import type { CodecString } from '@sora-substrate/sdk';
import type { SelectOption } from '@/lib/soramitsu-ui/components/Select/types';

const props = withDefaults(
  defineProps<{
    visible?: boolean;
  }>(),
  {
    visible: false,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'created', marketId?: number): void;
}>();

const { t } = useTranslation();
const { connectSoraWallet } = useInternalConnect();
const { loading, withNotifications } = useTransaction();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const categories = MARKET_CATEGORIES;
const collateralSymbol = KUSD.symbol;
const xorSymbol = XOR.symbol;
const creationFee = POLKAMARKT_CREATION_FEE_KUSD;
const maxMetadataBytes = POLKAMARKT_MAX_METADATA_BYTES;
const question = ref('');
const category = ref<MarketCategory>('Crypto');
const deadline = ref(defaultDeadlineInput());
const deadlineInputMode = ref<'date' | 'block'>('date');
const closeBlockInput = ref('');
const networkFeeTotal = ref<CodecString | null>(null);
const networkFeeLoading = ref(false);
const error = ref('');

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const currentBlock = computed(() => Number(settingsStore.blockNumber ?? 0));
const categoryOptions = computed<SelectOption<MarketCategory>[]>(() =>
  categories.map((item) => ({
    label: item,
    value: item,
  }))
);
const closeBlock = computed(() => {
  if (deadlineInputMode.value === 'block') {
    return calculateCloseBlockFromBlockInput(currentBlock.value, closeBlockInput.value);
  }

  return calculateCloseBlockFromDate(currentBlock.value, new Date(deadline.value));
});
const linkedDeadlineDate = computed(() => calculateApproximateCloseDate(currentBlock.value, closeBlock.value));
const activeDeadlineLabel = computed(() =>
  deadlineInputMode.value === 'date' ? t('polkamarkt.create.deadline') : t('polkamarkt.create.closeBlock')
);
const linkedDeadlinePreviewLabel = computed(() =>
  deadlineInputMode.value === 'date' ? t('polkamarkt.create.closeBlock') : t('polkamarkt.create.deadline')
);
const linkedDeadlinePreviewValue = computed(() => {
  if (deadlineInputMode.value === 'date') return closeBlock.value.toLocaleString();

  return linkedDeadlineDate.value ? formatApproximateCloseDate(linkedDeadlineDate.value) : t('polkamarkt.notIndexed');
});
const networkFeeFormatted = computed(() => {
  if (networkFeeLoading.value) return t('calculatingText');
  if (!networkFeeTotal.value) return t('provider.messages.notAvailable', { name: t('networkFeeText') });
  return `${formatCodec(networkFeeTotal.value)} ${xorSymbol}`;
});
const questionBytes = computed(() => metadataByteLength(question.value.trim()));
const creationFeeCodec = computed(() => parsePolkamarktAmount(creationFee));
const accountKusdBalance = computed(
  () => walletStore.accountAssetsAddressTable?.[KUSD.address]?.balance?.transferable ?? '0'
);
const requiredKusd = computed(() => creationFeeCodec.value);
const hasEnoughKusd = computed(() => BigInt(accountKusdBalance.value || '0') >= BigInt(requiredKusd.value || '0'));
const metadataErrors = computed(() =>
  validateMarketMetadata(question.value, POLKAMARKT_DEFAULT_ORACLE, POLKAMARKT_DEFAULT_RESOLUTION_SOURCE)
);

const disabledReason = computed(() => {
  if (metadataErrors.value.includes('questionTooShort')) return t('polkamarkt.create.questionTooShort');
  if (metadataErrors.value.includes('metadataTooLong')) return t('polkamarkt.create.metadataTooLong');
  if (!hasEnoughKusd.value) return t('polkamarkt.ticket.insufficientKusd', { symbol: collateralSymbol });
  return '';
});

const disabled = computed(() => loading.value || (walletStore.isLoggedIn && Boolean(disabledReason.value)));
const actionLabel = computed(() => {
  if (!walletStore.isLoggedIn) return t('connectWalletText');
  if (disabledReason.value) return disabledReason.value;
  return t('polkamarkt.create.submit');
});

function defaultDeadlineInput(): string {
  const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return formatDateTimeLocalInput(date);
}

function formatCodec(value: CodecString): string {
  return formatPolkamarktCodec(value, XOR.decimals);
}

function setDeadlineInputMode(mode: 'date' | 'block'): void {
  if (mode === deadlineInputMode.value) return;

  if (mode === 'block') {
    closeBlockInput.value = String(closeBlock.value);
  } else {
    const linkedInput = linkedDeadlineDate.value ? formatDateTimeLocalInput(linkedDeadlineDate.value) : '';
    if (linkedInput) {
      deadline.value = linkedInput;
    }
  }

  deadlineInputMode.value = mode;
}

function normalizeCloseBlockInput(): void {
  closeBlockInput.value = String(closeBlock.value);
}

async function refreshFees(): Promise<void> {
  if (!props.visible) {
    networkFeeLoading.value = false;
    networkFeeTotal.value = null;
    return;
  }

  networkFeeLoading.value = true;
  try {
    const estimate = await api.polkamarkt.estimateMarketCreationFee({
      question: question.value.trim(),
      oracle: POLKAMARKT_DEFAULT_ORACLE,
      resolutionSource: POLKAMARKT_DEFAULT_RESOLUTION_SOURCE,
      category: category.value,
      closeBlock: closeBlock.value,
    });
    networkFeeTotal.value = isPositiveCodec(estimate.totalFee) ? estimate.totalFee : null;
  } catch {
    networkFeeTotal.value = null;
  } finally {
    networkFeeLoading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!walletStore.isLoggedIn) {
    connectSoraWallet();
    return;
  }

  if (disabled.value) return;

  let marketId: number | undefined;
  await withNotifications(async () => {
    try {
      const market = await api.polkamarkt.createMarket({
        question: question.value.trim(),
        oracle: POLKAMARKT_DEFAULT_ORACLE,
        resolutionSource: POLKAMARKT_DEFAULT_RESOLUTION_SOURCE,
        category: category.value,
        closeBlock: closeBlock.value,
      });
      marketId = market.marketId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('polkamarkt.create.marketFailed');
      throw err;
    }
  });

  isVisible.value = false;
  resetForm();
  emit('created', marketId);
}

function resetForm(): void {
  question.value = '';
  category.value = 'Crypto';
  deadline.value = defaultDeadlineInput();
  deadlineInputMode.value = 'date';
  closeBlockInput.value = '';
  networkFeeTotal.value = null;
  networkFeeLoading.value = false;
  error.value = '';
}

let feeTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  [() => props.visible, question, category, closeBlock],
  () => {
    clearTimeout(feeTimer);
    feeTimer = setTimeout(() => void refreshFees(), 300);
  },
  { immediate: true }
);

watch(currentBlock, () => {
  if (deadlineInputMode.value === 'block') {
    normalizeCloseBlockInput();
  }
});
</script>

<style lang="scss" scoped>
.create-market {
  display: grid;
  gap: $inner-spacing-medium;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;

  &__row {
    display: grid;
    grid-template-columns: 1fr;
    gap: $inner-spacing-medium;
  }

  &__preview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: $inner-spacing-mini;

    @include tablet(true) {
      grid-template-columns: 1fr;
    }

    div {
      border: 1px solid var(--s-color-base-border-secondary);
      border-radius: var(--s-border-radius-mini);
      padding: $inner-spacing-small;
      background: var(--s-color-utility-body);
    }

    span {
      display: block;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
    }

    strong {
      display: block;
      margin-top: $inner-spacing-tiny;
      overflow-wrap: anywhere;
    }
  }

  &__deadline-toggle {
    display: inline-flex;
    flex-shrink: 0;
    gap: 2px;
    max-width: 100%;
    padding: 2px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);
  }

  &__deadline-toggle-button {
    min-height: 28px;
    min-width: 0;
    border: 0;
    border-radius: var(--s-border-radius-mini);
    background: transparent;
    color: var(--s-color-base-content-secondary);
    cursor: pointer;
    font: inherit;
    font-size: var(--s-font-size-mini);
    padding: 0 $inner-spacing-mini;

    &--active {
      background: var(--s-color-theme-accent);
      color: var(--s-color-base-on-accent);
    }
  }

  &__button {
    width: 100%;
  }

  &__error {
    color: var(--s-color-status-error);
    margin: 0;
  }

  &__retry {
    color: var(--s-color-status-warning);
    margin: 0;
  }

  &__note {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    margin: 0;
  }
}

.create-field {
  display: grid;
  gap: $inner-spacing-tiny;
  min-width: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: $inner-spacing-mini;
    min-width: 0;
  }

  span,
  small {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
  }
}

.polkamarkt-input,
.polkamarkt-textarea,
.polkamarkt-select {
  min-height: 40px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.polkamarkt-input,
.polkamarkt-textarea {
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-body);
  color: var(--s-color-base-content-primary);
  padding: 0 $inner-spacing-mini;
  font: inherit;
}

.polkamarkt-textarea {
  min-height: 112px;
  padding: $inner-spacing-mini;
  resize: vertical;
}
</style>
