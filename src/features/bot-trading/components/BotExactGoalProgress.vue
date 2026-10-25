<template>
  <section class="exact-progress" data-testid="exact-goal-progress" :aria-label="t('bots.goals.progress')">
    <header>
      <span>{{ t('bots.goals.progress') }}</span>
      <span role="status" data-testid="goal-status">{{ statusLabel }}</span>
    </header>
    <dl class="exact-summary">
      <div>
        <dt>
          {{ t('bots.netReturn') }}<span v-if="progress.terminal"> · {{ t('bots.goals.deadline') }}</span>
        </dt>
        <dd :class="`exact-${progress.tone}`" data-testid="goal-return">
          <bdi
            >{{ progress.accountingComplete ? progress.labels.netReturn : '—'
            }}<small v-if="progress.accountingComplete">%</small></bdi
          >
        </dd>
      </div>
      <div>
        <dt>
          {{ t(progress.terminal ? 'bots.goals.exact.finalValue' : 'bots.goals.exact.value', { symbol: 'XOR' }) }}
        </dt>
        <dd data-testid="goal-net-value">
          <bdi
            >{{ progress.accountingComplete ? progress.labels.value : '—'
            }}<small v-if="progress.accountingComplete">XOR</small></bdi
          >
        </dd>
      </div>
      <div>
        <dt>{{ t('bots.goals.exact.maxBudget') }}</dt>
        <dd data-testid="goal-budget">
          <bdi>{{ progress.labels.budget }}<small>KUSD</small></bdi>
        </dd>
      </div>
    </dl>
    <dl class="exact-costs">
      <div>
        <dt>{{ t('bots.goals.exact.spent', { symbol: 'KUSD' }) }}</dt>
        <dd data-testid="goal-spent">
          <bdi>{{ progress.accountingComplete ? `${progress.labels.spent} KUSD` : '—' }}</bdi>
        </dd>
      </div>
      <div>
        <dt>{{ t('bots.goals.exact.reserve') }}</dt>
        <dd data-testid="goal-reserve">
          <bdi>{{ progress.accountingComplete ? `${progress.labels.reserve} XOR` : '—' }}</bdi>
        </dd>
      </div>
      <div>
        <dt>{{ t('bots.networkFees') }}</dt>
        <dd data-testid="goal-fees">
          <bdi>{{ progress.accountingComplete ? `${progress.labels.fees} XOR` : '—' }}</bdi>
        </dd>
      </div>
    </dl>
    <div class="exact-time">
      <span>{{ t('bots.goals.deadline') }}</span>
      <time :datetime="new Date(progress.deadlineAtMs).toISOString()" data-testid="goal-deadline">{{
        date(progress.deadlineAtMs)
      }}</time>
    </div>
    <p
      v-if="
        progress.accountingComplete &&
        progress.status === 'target' &&
        !progress.beatsIdleAfterFees &&
        !progress.postDeadline
      "
      class="exact-outcome-note"
      data-testid="goal-exact-idle-note"
    >
      {{ t('bots.goals.exact.noTradingGain') }}
    </p>
    <details>
      <summary>{{ t('assets.details') }}</summary>
      <dl class="exact-costs">
        <div>
          <dt>{{ t('bots.holdings') }}</dt>
          <dd data-testid="goal-holdings">
            <bdi>{{
              progress.accountingComplete ? `${progress.labels.kusd} KUSD · ${progress.labels.xor} XOR` : '—'
            }}</bdi>
          </dd>
        </div>
        <div>
          <dt>{{ t('bots.swaps') }}</dt>
          <dd>{{ progress.accountingComplete ? progress.trades : '—' }}</dd>
        </div>
        <div>
          <dt>{{ t('bots.goals.target') }}</dt>
          <dd>+5%</dd>
        </div>
        <div>
          <dt>{{ t('bots.goals.pauseBelowPeak') }}</dt>
          <dd>−5%</dd>
        </div>
      </dl>
      <div v-if="progress.postDeadline" data-testid="goal-after-deadline">
        <h3>{{ t('bots.goals.exact.afterDeadline') }}</h3>
        <dl class="exact-costs">
          <div>
            <dt>{{ t('bots.networkFees') }}</dt>
            <dd data-testid="goal-later-fees">
              {{ progress.accountingComplete ? `${progress.postDeadline.fees} XOR` : '—' }}
            </dd>
          </div>
          <div>
            <dt>{{ t('bots.swaps') }}</dt>
            <dd data-testid="goal-later-trades">
              {{ progress.accountingComplete ? progress.postDeadline.trades : '—' }}
            </dd>
          </div>
        </dl>
      </div>
      <p>{{ t('bots.goals.exact.valueNote') }}</p>
      <time :datetime="new Date(progress.valuedAtMs).toISOString()" data-testid="goal-valued-at">{{
        date(progress.valuedAtMs)
      }}</time>
    </details>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import type { ExactGoalProgress } from '../goal-progress';
defineOptions({ name: 'BotExactGoalProgress' });
const props = defineProps<{ progress: ExactGoalProgress }>();
const { t, language } = useTranslation();
const statusLabel = computed(() => {
  const state = props.progress.status;
  return t(
    state === 'attention'
      ? 'bots.status.attention'
      : state === 'target'
        ? 'bots.goals.exact.valueThreshold'
        : ['checking', 'pending', 'finalizing'].includes(state)
          ? `bots.goals.exact.${state}`
          : `bots.goals.status.${state}`
  );
});
/** Date formatting only; financial values arrive as integer-derived display strings. */
function date(value: number): string {
  try {
    return new Date(value).toLocaleString(language?.value, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return new Date(value).toISOString();
  }
}
</script>
<style scoped lang="scss">
.exact-progress {
  padding: 20px 28px;
  border-block: 1px solid var(--s-color-base-border-secondary);
  text-align: start;
}
header,
.exact-time {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
}
header > :last-child,
.exact-time > :last-child {
  text-align: end;
}
dl {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  gap: 16px;
  margin: 20px 0;
}
.exact-outcome-note {
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
  line-height: 1.5;
}
dt {
  color: var(--s-color-base-content-secondary);
  font-size: 11px;
  margin-bottom: 7px;
}
dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.exact-summary dd {
  font-size: 24px;
  font-weight: 550;
  line-height: 1.2;
}
small {
  font-size: 12px;
  margin-inline-start: 4px;
}
.exact-costs dd {
  font-size: 13px;
}
details {
  margin-top: 12px;
  color: var(--s-color-base-content-secondary);
  font-size: 11px;
  line-height: 1.5;
}
summary {
  cursor: pointer;
  width: fit-content;
}
.exact-positive {
  color: var(--s-color-status-success-text);
}
.exact-negative {
  color: var(--s-color-status-error-text);
}
@media (max-width: 480px) {
  .exact-progress {
    padding-inline: 0;
  }
  dl {
    gap: 10px;
  }
  .exact-summary dd {
    font-size: 19px;
  }
}
</style>
