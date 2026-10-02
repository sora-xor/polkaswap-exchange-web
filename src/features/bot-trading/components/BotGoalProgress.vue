<template>
  <BotExactGoalProgress v-if="exactProgress.kind === 'exact'" :progress="exactProgress" />
  <p
    v-else-if="exactProgress.kind === 'invalid'"
    class="goal-progress"
    role="alert"
    data-testid="goal-progress-invalid"
  >
    {{ t('bots.errors.storage') }}
  </p>
  <section
    v-else-if="bot.goal"
    class="goal-progress"
    data-testid="goal-progress"
    :aria-label="t('bots.goals.progress')"
  >
    <header class="goal-progress-heading">
      <div>
        <span class="goal-progress-eyebrow">{{ t('bots.goals.progress') }}</span>
        <h3>{{ bot.goal.title }}</h3>
      </div>
      <span
        class="goal-status"
        :class="{ 'goal-reached': outcome === 'target' }"
        data-testid="goal-status"
        role="status"
      >
        {{ t(`bots.goals.status.${status}`) }}
      </span>
    </header>

    <dl class="goal-metrics">
      <div class="goal-current">
        <dt>{{ t(bot.mode === 'paper' ? 'bots.goals.paperReturn' : 'bots.goals.currentReturn') }}</dt>
        <dd :class="returnTone" data-testid="goal-return" :title="bot.goalState?.returnPercent">
          <bdi>{{ returnLabel }}<small v-if="hasReturn">%</small></bdi>
        </dd>
      </div>
      <div>
        <dt>{{ t('bots.goals.target') }}</dt>
        <dd data-testid="goal-target-value">
          <bdi>+{{ bot.goal.targetReturnPercent }}<small>%</small></bdi>
        </dd>
      </div>
      <div>
        <dt>{{ t(bot.goal.lossMetric === 'drawdown' ? 'bots.goals.pauseBelowPeak' : 'bots.goals.pauseAt') }}</dt>
        <dd data-testid="goal-loss-value">
          <bdi>−{{ bot.goal.maxLossPercent }}<small>%</small></bdi>
        </dd>
      </div>
    </dl>

    <div class="goal-time">
      <span>{{ t('bots.goals.deadline') }}</span>
      <time v-if="deadline !== undefined" :datetime="deadlineIso" data-testid="goal-deadline">{{ deadlineLabel }}</time>
      <span v-else data-testid="goal-awaiting-start">{{ t('bots.goals.beginsOnStart') }}</span>
    </div>
    <details class="goal-progress-note">
      <summary>{{ t('assets.details') }}</summary>
      <p data-testid="goal-valuation-note">
        {{ t('bots.goals.valuationNote', { symbol: valuationSymbol }) }}
      </p>
    </details>
    <p v-if="outcome !== 'active' && outcome !== undefined" class="goal-progress-note" data-testid="goal-outcome-note">
      {{ t('bots.goals.completionNote') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import BotExactGoalProgress from './BotExactGoalProgress.vue';
import { useExactGoalProgress } from '../goal-progress-view';
import type { BotDefinition, BotOrder } from '@/features/bot-trading/types';
import { FPNumber } from '@/lib/substrate/math';

defineOptions({ name: 'BotGoalProgress' });

/** Show durable observed goal progress, never historical research results or an assumed opening return. */
const props = defineProps<{
  bot: BotDefinition;
  runtimeStatus?: BotDefinition['status'];
  orders?: readonly BotOrder[] | null;
  now?: number;
}>();
const exactProgress = useExactGoalProgress(() => ({
  bot: props.bot,
  runtimeStatus: props.runtimeStatus,
  orders: props.orders,
  now: props.now,
}));
const { t, language } = useTranslation();
const outcome = computed(() => props.bot.goalState?.outcome);
const valuationSymbol = computed(() =>
  props.bot.goal?.valuationAsset === 'output' ? props.bot.assetOut.symbol : props.bot.assetIn.symbol
);
const status = computed(() => {
  if (outcome.value && outcome.value !== 'active') return outcome.value;
  const runtimeStatus = props.runtimeStatus ?? props.bot.status;
  if (!props.bot.goalState) return runtimeStatus === 'running' ? 'starting' : 'awaitingStart';
  return runtimeStatus === 'running' ? 'active' : 'paused';
});
const returnValue = computed(() => {
  const value = props.bot.goalState?.returnPercent;
  if (value === undefined) return undefined;
  const amount = new FPNumber(value, 36);
  return amount.isFinity() ? amount : undefined;
});
const hasReturn = computed(() => returnValue.value !== undefined);
const returnTone = computed(() => {
  if (!returnValue.value || returnValue.value.isZero()) return '';
  return returnValue.value.gt(FPNumber.ZERO) ? 'goal-positive' : 'goal-negative';
});
/** Keep tiny gains/losses visible and round only the displayed percentage, using exact decimal arithmetic. */
const returnLabel = computed(() => {
  const amount = returnValue.value;
  if (!amount) return '—';
  if (amount.isZero()) return '0.00';
  const positive = amount.gt(FPNumber.ZERO);
  if (amount.abs().lt(new FPNumber('0.01', 36))) return positive ? '+<0.01' : '−<0.01';
  return `${positive ? '+' : ''}${amount.value.toFixed(2, 4)}`;
});
const deadline = computed(() => {
  if (!props.bot.goalState || !props.bot.goal) return undefined;
  return props.bot.goalState.startedAt + props.bot.goal.durationMs;
});
const deadlineIso = computed(() => (deadline.value === undefined ? '' : new Date(deadline.value).toISOString()));
const deadlineLabel = computed(() => {
  if (deadline.value === undefined) return '';
  const date = new Date(deadline.value);
  try {
    return date.toLocaleString(language?.value, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return date.toISOString();
  }
});
</script>

<style scoped lang="scss">
.goal-progress {
  padding-block: 20px;
  padding-inline: 28px;
  color: var(--s-color-base-content-primary);
  border-block: 1px solid var(--s-color-base-border-secondary);
  text-align: start;
}
.goal-progress-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  h3 {
    margin: 6px 0 0;
    font-size: 18px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
}
.goal-progress-eyebrow,
.goal-status {
  color: var(--s-color-base-content-secondary);
  font-size: 11px;
}
.goal-status {
  text-align: end;
  max-width: 45%;
}
.goal-metrics {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 16px;
  margin: 24px 0 22px;
  > div {
    min-width: 0;
  }
  dt {
    color: var(--s-color-base-content-secondary);
    font-size: 11px;
    line-height: 1.4;
    margin-bottom: 7px;
  }
  dd {
    margin: 0;
    font-size: 24px;
    font-weight: 550;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    small {
      font-size: 13px;
      margin-inline-start: 3px;
    }
  }
}
.goal-time {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  > :first-child {
    color: var(--s-color-base-content-secondary);
  }
  > :last-child {
    text-align: end;
  }
}
.goal-progress-note {
  margin: 10px 0 0;
  color: var(--s-color-base-content-secondary);
  font-size: 11px;
  line-height: 1.5;
  summary {
    cursor: pointer;
    width: fit-content;
  }
  p {
    margin-top: 8px;
  }
}
.goal-positive,
.goal-reached {
  color: var(--s-color-status-success-text);
}
.goal-negative {
  color: var(--s-color-status-error-text);
}
@media (max-width: 480px) {
  .goal-progress {
    padding-inline: 0;
  }
  .goal-metrics {
    gap: 10px;
    dd {
      font-size: 20px;
    }
  }
}
</style>
