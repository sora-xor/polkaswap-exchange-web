<template>
  <form class="goal-setup" data-testid="goal-setup" :aria-label="t('bots.goals.createTitle')" @submit.prevent="create">
    <header class="goal-heading">
      <div>
        <span class="goal-eyebrow">{{ t('bots.goals.paperLabel') }}</span>
        <h2 id="bot-goal-title">{{ t('bots.goals.createTitle') }}</h2>
      </div>
      <button type="button" class="goal-cancel" :disabled="busy" @click="emit('cancel')">
        {{ t('bots.goals.cancel') }}
      </button>
    </header>

    <fieldset :disabled="busy">
      <label class="goal-field goal-name">
        <span>{{ t('bots.goals.titleLabel') }}</span>
        <input v-model="title" data-testid="goal-title" type="text" maxlength="80" required autocomplete="off" />
      </label>

      <div class="goal-fields">
        <label class="goal-field">
          <span>{{ t('bots.goals.capitalToken') }}</span>
          <select v-model="assetInAddress" data-testid="goal-asset-in" required>
            <option value="" disabled>{{ t('bots.goals.selectToken') }}</option>
            <option v-for="asset in assets" :key="asset.address" :value="asset.address">{{ asset.symbol }}</option>
          </select>
        </label>
        <label class="goal-field">
          <span>{{ t('bots.goals.tradeToken') }}</span>
          <select v-model="assetOutAddress" data-testid="goal-asset-out" required>
            <option value="" disabled>{{ t('bots.goals.selectToken') }}</option>
            <option v-for="asset in tradeAssets" :key="asset.address" :value="asset.address">{{ asset.symbol }}</option>
          </select>
        </label>
        <label class="goal-field">
          <span>{{ t('bots.goals.virtualCapital', { symbol: inputAsset?.symbol ?? '' }) }}</span>
          <input v-model="allocation" data-testid="goal-allocation" inputmode="decimal" maxlength="100" required />
        </label>
        <label class="goal-field">
          <span>{{ t('bots.goals.durationLabel') }}</span>
          <select v-model="durationMs" data-testid="goal-duration">
            <option v-for="duration in durations" :key="duration.value" :value="duration.value">
              {{ t(`bots.goals.durations.${duration.key}`) }}
            </option>
          </select>
        </label>
        <label class="goal-field">
          <span>{{ t('bots.goals.targetLabel') }}</span>
          <input v-model="targetReturnPercent" data-testid="goal-target" inputmode="decimal" maxlength="24" required />
        </label>
        <label class="goal-field">
          <span>{{ t('bots.goals.lossLabel') }}</span>
          <input v-model="maxLossPercent" data-testid="goal-loss" inputmode="decimal" maxlength="24" required />
        </label>
      </div>
      <p class="goal-note">{{ t('bots.goals.pauseHelp') }}</p>

      <details class="goal-details">
        <summary>{{ t('bots.goals.advanced') }}</summary>
        <label class="goal-field">
          <span>{{ t('bots.goals.feeBudget') }}</span>
          <input v-model="feeBudget" data-testid="goal-fee-budget" inputmode="decimal" maxlength="100" required />
        </label>
        <p class="goal-note">{{ t('bots.goals.feeHelp') }}</p>
      </details>

      <p v-if="validationError" class="goal-error" role="alert" data-testid="goal-validation">
        {{ t(validationError) }}
      </p>
      <footer class="goal-footer">
        <button class="goal-submit" data-testid="goal-create" type="submit" :disabled="!valid || busy">
          {{ t(busy ? 'bots.goals.creating' : 'bots.goals.createPaper') }}
          <span v-if="!busy" aria-hidden="true">→</span>
        </button>
      </footer>
    </fieldset>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { codec, toCodec } from '@/features/bot-trading/amounts';
import { copyBotGoal } from '@/features/bot-trading/goals';
import type { BotAsset } from '@/features/bot-trading/types';
import { VAL, XOR } from '@/lib/substrate/sdk/assets/consts';

defineOptions({ name: 'BotGoalSetup' });

/** A paper goal draft contains explicit limits; the parent connects Jev after saving it. */
interface GoalDraft {
  name: string;
  assetInAddress: string;
  assetOutAddress: string;
  allocation: string;
  feeBudget: string;
  title: string;
  targetReturnPercent: string;
  maxLossPercent: string;
  durationMs: number;
}

const props = defineProps<{ assets: BotAsset[]; busy: boolean }>();
const emit = defineEmits<{ create: [draft: GoalDraft]; cancel: [] }>();
const { t } = useTranslation();
const title = ref(t('bots.goals.defaultTitle'));
const assetInAddress = ref('');
const assetOutAddress = ref('');
const allocation = ref('100');
const feeBudget = ref('1');
const targetReturnPercent = ref('5');
const maxLossPercent = ref('5');
const durationMs = ref(7 * 24 * 60 * 60 * 1000);
const durations = [
  { key: 'hour', value: 60 * 60 * 1000 },
  { key: 'day', value: 24 * 60 * 60 * 1000 },
  { key: 'week', value: 7 * 24 * 60 * 60 * 1000 },
  { key: 'month', value: 30 * 24 * 60 * 60 * 1000 },
];
const inputAsset = computed(() => props.assets.find((asset) => asset.address === assetInAddress.value));
const tradeAssets = computed(() => props.assets.filter((asset) => asset.address !== assetInAddress.value));

watch(
  () => props.assets,
  () => {
    if (!inputAsset.value) {
      assetInAddress.value =
        props.assets.find((asset) => asset.address === XOR.address)?.address ?? props.assets[0]?.address ?? '';
    }
  },
  { immediate: true }
);
watch(
  tradeAssets,
  (assets) => {
    if (!assets.some((asset) => asset.address === assetOutAddress.value)) {
      assetOutAddress.value =
        assets.find((asset) => asset.address === VAL.address)?.address ?? assets[0]?.address ?? '';
    }
  },
  { immediate: true }
);

/** Validate decimal strings exactly, including a token's smallest supported base unit. */
const validationError = computed(() => {
  if (!title.value.trim()) return 'bots.goals.errors.name';
  if (!inputAsset.value || !tradeAssets.value.some((asset) => asset.address === assetOutAddress.value)) {
    return 'bots.goals.errors.pair';
  }
  try {
    if (!codec(toCodec(allocation.value, inputAsset.value.decimals))) return 'bots.goals.errors.capital';
  } catch {
    return 'bots.goals.errors.capital';
  }
  try {
    copyBotGoal({
      title: title.value,
      targetReturnPercent: targetReturnPercent.value,
      maxLossPercent: maxLossPercent.value,
      durationMs: durationMs.value,
    });
  } catch {
    return 'bots.goals.errors.percent';
  }
  try {
    if (!codec(toCodec(feeBudget.value, XOR.decimals))) return 'bots.goals.errors.fee';
  } catch {
    return 'bots.goals.errors.fee';
  }
  return '';
});
const valid = computed(() => !validationError.value);

/** Saving creates only a paper draft; credentials and starting remain explicit parent actions. */
function create(): void {
  if (!valid.value || props.busy) return;
  emit('create', {
    name: title.value.trim(),
    assetInAddress: assetInAddress.value,
    assetOutAddress: assetOutAddress.value,
    allocation: allocation.value,
    feeBudget: feeBudget.value,
    title: title.value.trim(),
    targetReturnPercent: targetReturnPercent.value,
    maxLossPercent: maxLossPercent.value,
    durationMs: durationMs.value,
  });
}
</script>

<style scoped lang="scss">
.goal-setup {
  color: var(--s-color-base-content-primary);
  font-size: 14px;
  text-align: start;
}
.goal-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
  h2 {
    margin: 5px 0 0;
    font-size: 25px;
    font-weight: 650;
    line-height: 1.2;
  }
}
.goal-eyebrow {
  color: var(--s-color-action-text);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
}
fieldset {
  padding: 0;
  border: 0;
  margin: 0;
  min-width: 0;
}
.goal-fields {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  gap: 18px 20px;
}
.goal-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  > span {
    font-size: 12px;
    color: var(--s-color-base-content-secondary);
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    box-sizing: border-box;
    padding: 11px 14px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 12px;
    background: var(--s-color-base-background);
    color: var(--s-color-base-content-primary);
    font: inherit;
    font-variant-numeric: tabular-nums;
    transition: border-color 150ms;
  }
}
.goal-name {
  margin-bottom: 22px;
  input {
    font-size: 17px;
  }
}
.goal-note {
  margin: 12px 0 0;
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.goal-details {
  margin-top: 23px;
  padding-block: 14px;
  border-block: 1px solid var(--s-color-base-border-secondary);
  summary {
    padding-block: 3px;
    cursor: pointer;
    font-size: 12px;
  }
  .goal-field {
    margin-top: 16px;
  }
}
.goal-footer {
  margin-top: 24px;
}
.goal-submit,
.goal-cancel {
  min-height: 44px;
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
  transition: background-color 150ms;
}
.goal-submit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 13px 16px;
  border: 1px solid var(--s-color-action-text);
  background: var(--s-color-base-background);
  color: var(--s-color-action-text);
  font-weight: 650;
  &:hover:not(:disabled) {
    background: var(--s-color-base-background-hover);
  }
}
.goal-cancel {
  border: 0;
  background: none;
  color: var(--s-color-base-content-secondary);
  padding: 8px;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
input:focus-visible,
select:focus-visible,
button:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--s-color-focus-ring);
  outline-offset: 3px;
}
.goal-error {
  color: var(--s-color-status-error-text);
  font-size: 12px;
  line-height: 1.5;
}
@media (max-width: 480px) {
  .goal-fields {
    grid-template-columns: #{'minmax(0, 1fr)'};
    gap: 16px;
  }
  .goal-heading h2 {
    font-size: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  input,
  select,
  button {
    transition: none !important;
  }
}
</style>
