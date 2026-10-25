<template>
  <div class="validation-report" data-testid="validation-report" :data-verdict="insights.verdict">
    <header class="validation-heading">
      <div>
        <span class="validation-kicker">02 / {{ t('bots.research.validationTitle') }}</span>
        <h3>{{ t('bots.validationInsights.title') }}</h3>
      </div>
      <p class="validation-verdict" data-testid="validation-verdict">
        {{ t(`bots.validationInsights.verdicts.${insights.verdict}`) }}
      </p>
    </header>
    <p class="validation-method">{{ t('bots.validationInsights.method') }}</p>
    <div
      v-if="progress"
      class="validation-progress"
      data-testid="validation-progress"
      :data-scope="progress.scope"
      role="status"
    >
      <span
        >{{ t(`bots.validationInsights.scopes.${progress.scope}`)
        }}<template v-if="progress.fold">
          · {{ t('bots.validationInsights.periodNumber', { index: progress.fold }) }}</template
        ></span
      >
      <span>{{ progress.scopeCompleted }} / {{ progress.scopeTotal }}</span>
      <progress
        :value="progressPercent"
        max="100"
        :aria-label="t(`bots.validationInsights.scopes.${progress.scope}`)"
      />
    </div>
    <template v-if="insights.foldCount">
      <p
        v-if="insights.verdict === 'insufficient-trades'"
        class="validation-interpretation"
        data-testid="validation-interpretation"
      >
        {{
          t('bots.validationInsights.insufficient', {
            count: insights.insufficientTradeFoldCount,
            minimum: insights.thresholds.minimumTestTradesPerFold,
          })
        }}
      </p>
      <dl class="validation-summary">
        <div>
          <dt>{{ t('bots.validationInsights.positivePeriods') }}</dt>
          <dd data-testid="validation-positive-periods">
            {{ insights.positiveFoldCount }}<span> / {{ insights.validFoldCount }}</span>
          </dd>
        </div>
        <div>
          <dt>{{ t('bots.validationInsights.medianReturn') }}</dt>
          <dd
            :class="outcomeClass(insights.medianReturnPercent)"
            :title="insights.medianReturnPercent ?? undefined"
            data-testid="validation-median-return"
          >
            {{ percentage(insights.medianReturnPercent) }}
          </dd>
        </div>
        <div>
          <dt>{{ t('bots.validationInsights.worstDrawdown') }}</dt>
          <dd :class="outcomeClass(insights.maxDrawdownPercent, true)" data-testid="validation-worst-drawdown">
            {{ percentage(insights.maxDrawdownPercent, false) }}
          </dd>
        </div>
        <div>
          <dt>{{ t('bots.validationInsights.beatBenchmark') }}</dt>
          <dd data-testid="validation-beat-benchmark">
            {{ insights.benchmarkBeatCount }}<span> / {{ insights.benchmarkedFoldCount }}</span>
          </dd>
        </div>
      </dl>
      <p class="validation-sample" data-testid="validation-samples">
        {{
          t('bots.validationInsights.samples', {
            eligible: insights.eligibleFoldCount,
            total: insights.foldCount,
            trades: insights.testTradeCount,
          })
        }}
      </p>
      <section
        class="validation-timeline"
        :aria-label="t('bots.validationInsights.timeline')"
        data-testid="validation-timeline"
      >
        <div class="timeline-legend" aria-hidden="true">
          <span class="legend-training">{{ t('bots.research.trainingPeriod') }}</span>
          <span v-if="sourceFolds.some((fold) => fold.purge?.candleCount)" class="legend-gap">{{
            t('bots.validationInsights.gap')
          }}</span>
          <span class="legend-test">{{ t('bots.research.testPeriod') }}</span>
        </div>
        <ol>
          <li v-for="fold in sourceFolds" :key="fold.index" class="timeline-period">
            <span class="timeline-index">
              <span class="sr-only">{{ t('bots.validationInsights.periodNumber', { index: fold.index }) }}</span>
              <span aria-hidden="true">{{ String(fold.index).padStart(2, '0') }}</span>
            </span>
            <div class="timeline-period-content">
              <div class="timeline-track" aria-hidden="true">
                <span
                  class="timeline-training"
                  :style="segment(fold.trainStart, fold.trainEnd)"
                  :title="rangeLabel('trainingPeriod', fold.trainStart, fold.trainEnd)"
                  :data-testid="`validation-train-${fold.index}`"
                />
                <span
                  v-if="fold.purge?.candleCount"
                  class="timeline-gap"
                  :style="segment(fold.purge.start, fold.purge.end)"
                  :title="t('bots.validationInsights.gap')"
                />
                <span
                  class="timeline-test"
                  :class="outcomeClass(fold.test.returnPercent)"
                  :style="segment(fold.testStart, fold.testEnd)"
                  :title="rangeLabel('testPeriod', fold.testStart, fold.testEnd)"
                  :data-testid="`validation-test-${fold.index}`"
                />
              </div>
              <div class="timeline-dates" :data-testid="`validation-dates-${fold.index}`">
                <span>{{ rangeLabel('trainingPeriod', fold.trainStart, fold.trainEnd) }}</span>
                <span>{{ rangeLabel('testPeriod', fold.testStart, fold.testEnd) }}</span>
              </div>
            </div>
            <strong
              class="timeline-return"
              :class="outcomeClass(fold.test.returnPercent)"
              :title="rangeLabel('testPeriod', fold.testStart, fold.testEnd)"
              ><span class="sr-only">{{ t('bots.research.testReturn') }}: </span
              >{{ percentage(fold.test.returnPercent) }}</strong
            >
          </li>
        </ol>
      </section>
      <p class="validation-historical">{{ t('bots.validationMotion.historical') }}</p>
      <div
        class="validation-table-scroll"
        tabindex="0"
        role="region"
        :aria-label="t('bots.validationInsights.foldResults')"
      >
        <table class="validation-table">
          <thead>
            <tr>
              <th scope="col">{{ t('bots.research.fold') }}</th>
              <th scope="col">{{ t('bots.research.trainingReturn') }}</th>
              <th scope="col">{{ t('bots.research.testReturn') }}</th>
              <th scope="col">{{ t('bots.validationInsights.benchmark') }}</th>
              <th scope="col">{{ t('bots.validationInsights.excess') }}</th>
              <th scope="col">{{ t('bots.research.testDrawdown') }}</th>
              <th scope="col">{{ t('bots.validationInsights.executions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="fold in insights.folds"
              :key="fold.index"
              :data-eligible="fold.eligible"
              :data-testid="`validation-fold-${fold.index}`"
            >
              <th scope="row">{{ String(fold.index).padStart(2, '0') }}</th>
              <td :class="outcomeClass(fold.trainReturnPercent)" :title="fold.trainReturnPercent ?? undefined">
                {{ percentage(fold.trainReturnPercent) }}<small>{{ daily(fold.trainReturnPerDayPercent) }}</small>
              </td>
              <td :class="outcomeClass(fold.testReturnPercent)" :title="fold.testReturnPercent ?? undefined">
                {{ percentage(fold.testReturnPercent) }}<small>{{ daily(fold.testReturnPerDayPercent) }}</small>
              </td>
              <td :class="outcomeClass(fold.benchmarkReturnPercent)">
                {{ percentage(fold.benchmarkReturnPercent) }}
              </td>
              <td :class="outcomeClass(fold.excessReturnPercent)">{{ points(fold.excessReturnPercent) }}</td>
              <td :class="outcomeClass(fold.testDrawdownPercent, true)">
                {{ percentage(fold.testDrawdownPercent, false) }}
              </td>
              <td>{{ fold.testTrades }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <section class="validation-details" data-testid="validation-details">
        <h4>{{ t('assets.details') }}</h4>
        <p class="validation-caption">{{ t('bots.validationInsights.observedOnly') }}</p>
        <p class="validation-criterion">
          {{
            t('bots.validationInsights.screen', {
              folds: insights.thresholds.minimumFolds,
              trades: insights.thresholds.minimumTestTradesPerFold,
            })
          }}
        </p>
        <p class="validation-caption">
          {{ t('bots.validationInsights.freshCapital') }}
          <template v-if="validation?.mode === 'walk-forward'">{{
            t('bots.validationInsights.expanding', { count: insights.foldCount })
          }}</template>
        </p>
        <p class="validation-caption">{{ t('bots.validationInsights.warmup') }}</p>
        <p class="validation-caption">{{ t('bots.validationInsights.benchmarkMethod') }}</p>
        <ul class="validation-notes" data-testid="validation-notes">
          <li v-for="note in insights.notes" :key="note">{{ t(`bots.validationInsights.notes.${note}`) }}</li>
        </ul>
      </section>
    </template>
    <p v-else-if="!progress" class="validation-empty">{{ t('bots.research.enableValidation') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@/lib/substrate/math';
import type { ResearchProgress, ResearchResult } from '../research';
import { summarizeValidation } from '../validation-insights';

/** Completed summaries and actual evaluator checkpoints; this report has no presentation clock. */
const props = withDefaults(
  defineProps<{
    validation?: ResearchResult['validation'];
    progress?: Pick<ResearchProgress, 'scope' | 'fold' | 'scopeCompleted' | 'scopeTotal'> | null;
    active?: boolean;
  }>(),
  { active: true }
);
const { t } = useTranslation();
const insights = computed(() => summarizeValidation(props.validation ?? { mode: 'none', folds: [], tuned: false }));
const sourceFolds = computed(() => (props.validation?.mode === 'none' ? [] : (props.validation?.folds ?? [])));
const timelineBounds = computed(() => {
  const dates = sourceFolds.value.flatMap((fold) => [fold.trainStart, fold.testEnd]).filter(Number.isFinite);
  return { start: dates.length ? Math.min(...dates) : 0, end: dates.length ? Math.max(...dates) : 1 };
});
const progressPercent = computed(() => {
  const { scopeCompleted = 0, scopeTotal = 0 } = props.progress ?? {};
  return scopeTotal > 0 && Number.isFinite(scopeCompleted / scopeTotal)
    ? Math.min(100, Math.max(0, (scopeCompleted / scopeTotal) * 100))
    : 0;
});
/** Display rounding never feeds the exact financial summaries or test eligibility. */
function percentage(value: string | null, signed = true): string {
  if (value === null) return '—';
  const number = new FPNumber(value, 37);
  if (!number.isFinity()) return '—';
  const rounded =
    !number.isZero() && number.abs().lt(new FPNumber('0.005'))
      ? number.value.toPrecision(2)
      : number.value.toFixed(2, 4);
  return `${signed && number.gt(FPNumber.ZERO) ? '+' : ''}${rounded}%`;
}

/** Use the arithmetic sign of observed outcomes; drawdown is displayed as a loss magnitude. */
function outcomeClass(value: string | null, drawdown = false): string {
  if (value === null) return 'is-neutral';
  const number = new FPNumber(value, 37);
  if (!number.isFinity() || number.isZero()) return 'is-neutral';
  return drawdown || number.lt(FPNumber.ZERO) ? 'is-negative' : 'is-positive';
}

/** Daily values are supplied by the engine and remain explicitly linear rather than compounded. */
function daily(value: string | null): string {
  return value === null ? '—' : t('bots.validationInsights.perDay', { value: percentage(value) });
}

/** Differences between returns use percentage points instead of a percentage change. */
function points(value: string | null): string {
  return value === null
    ? '—'
    : t('bots.validationInsights.percentagePoints', { value: percentage(value).replace('%', '') });
}

/** Render exact UTC observation boundaries without browser timezone or locale ambiguity. */
function utcDate(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC` : '—';
}

/** Name both endpoints so each visual interval also has a readable text equivalent. */
function rangeLabel(key: 'trainingPeriod' | 'testPeriod', start: number, end: number): string {
  return `${t(`bots.research.${key}`)}: ${utcDate(start)} — ${utcDate(end)}`;
}

/** All intervals share one time scale; geometry is display-only and never changes financial values. */
function segment(start: number, end: number): { left: string; width: string } {
  const range = timelineBounds.value.end - timelineBounds.value.start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || range <= 0 || end < start) return { left: '0%', width: '0%' };
  const left = Math.max(0, Math.min(100, ((start - timelineBounds.value.start) / range) * 100));
  return { left: `${left}%`, width: `${Math.max(0, Math.min(100 - left, ((end - start) / range) * 100))}%` };
}
</script>

<style scoped lang="scss">
.validation-report {
  --validation-profit: var(--s-color-status-success-text);
  --validation-loss: var(--s-color-status-error-text);
  color: var(--s-color-base-content-primary);
}
.validation-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.validation-kicker {
  color: var(--s-color-base-content-secondary);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.validation-heading h3 {
  font-size: 25px;
  font-weight: 550;
  letter-spacing: -0.035em;
  margin: 9px 0 0;
  text-transform: none;
}
.validation-verdict {
  font-size: 12px;
  margin: 0 0 3px;
  max-width: 260px;
  text-align: right;
}
.validation-method {
  font-size: 13px;
  line-height: 1.5;
  color: var(--s-color-base-content-secondary);
  margin: 15px 0 26px;
}
.validation-interpretation {
  font-size: 11px;
  line-height: 1.5;
  color: var(--s-color-base-content-secondary);
  margin: -10px 0 20px;
}
.validation-details {
  margin-top: 14px;
}
.validation-details h4 {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
}
.validation-summary {
  display: grid;
  grid-template-columns: repeat(4, #{'minmax(0, 1fr)'});
  gap: 24px;
  margin: 0;
}
.validation-summary dt {
  font-size: 11px;
  color: var(--s-color-base-content-secondary);
}
.validation-summary dd {
  font-size: clamp(23px, 2.7vw, 36px);
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  margin: 9px 0 0;
}
.validation-summary dd span {
  font-size: 0.6em;
  color: var(--s-color-base-content-secondary);
}
.validation-sample {
  font-size: 11px;
  color: var(--s-color-base-content-secondary);
  margin: 16px 0 24px;
}
.validation-timeline {
  padding: 18px 0;
  border-top: 1px solid var(--s-color-base-border-secondary);
}
.timeline-legend {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--s-color-base-content-secondary);
  margin-bottom: 20px;
}
.timeline-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.timeline-legend span::before {
  content: '';
  width: 14px;
  height: 8px;
  border-radius: 2px;
}
.legend-training::before {
  background: color-mix(in srgb, var(--s-color-base-content-primary) 16%, transparent);
}
.legend-gap::before {
  background: repeating-linear-gradient(90deg, var(--s-color-base-content-secondary) 0 1px, transparent 1px 3px);
}
.legend-test::before {
  background: var(--s-color-base-content-secondary);
}
.validation-timeline ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 22px;
}
.timeline-period {
  display: grid;
  grid-template-columns: 26px #{'minmax(0, 1fr)'} 76px;
  align-items: start;
  gap: 12px;
}
.timeline-index {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-base-content-secondary);
}
.timeline-track {
  height: 18px;
  position: relative;
  margin-top: 2px;
  background: var(--s-color-base-background-hover, transparent);
}
.timeline-track > span {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 2px;
}
.timeline-training {
  background: color-mix(in srgb, var(--s-color-base-content-primary) 16%, transparent);
  color: var(--s-color-base-content-primary);
}
.timeline-gap {
  min-width: 2px;
  background: repeating-linear-gradient(90deg, var(--s-color-base-content-secondary) 0 1px, transparent 1px 3px);
  opacity: 0.5;
}
.timeline-test {
  background: color-mix(in srgb, currentColor 74%, transparent);
}
.timeline-return {
  font-size: 13px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.validation-historical {
  color: var(--s-color-base-content-secondary);
  font-size: 11px;
  line-height: 1.5;
  margin: 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.timeline-dates {
  display: grid;
  gap: 4px;
  margin-top: 9px;
  font-size: 10px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  color: var(--s-color-base-content-secondary);
}
.validation-table-scroll {
  overflow-x: auto;
  margin-top: 10px;
}
.validation-table-scroll:focus-visible {
  outline: 2px solid var(--s-color-base-content-primary);
  outline-offset: 4px;
}
.validation-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 690px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.validation-table th,
.validation-table td {
  text-align: right;
  padding: 14px 12px;
  border-bottom: 1px solid var(--s-color-base-border-secondary);
  white-space: nowrap;
}
.validation-table th:first-child {
  text-align: left;
  padding-left: 0;
}
.validation-table thead th {
  font-size: 10px;
  color: var(--s-color-base-content-secondary);
  font-weight: 400;
}
.validation-table tbody th {
  font-weight: 450;
}
.validation-table small {
  display: block;
  font-size: 9px;
  margin-top: 5px;
  color: var(--s-color-base-content-secondary);
}
.validation-criterion {
  font-size: 11px;
  line-height: 1.65;
  margin: 20px 0 6px;
}
.validation-caption,
.validation-notes,
.validation-empty {
  color: var(--s-color-base-content-secondary);
  font-size: 11px;
  line-height: 1.65;
}
.validation-caption {
  margin: 6px 0;
}
.validation-notes {
  margin: 8px 0 0;
  padding-left: 15px;
}
.validation-notes li {
  margin: 2px 0;
}
.validation-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  font-size: 11px;
  margin: 0 0 24px;
}
.validation-progress progress {
  grid-column: 1 / -1;
  width: 100%;
  height: 3px;
  accent-color: var(--s-color-base-content-primary);
}
.is-positive {
  color: var(--validation-profit);
}
.is-negative {
  color: var(--validation-loss);
}
.is-neutral {
  color: var(--s-color-base-content-secondary);
}
@media (max-width: 600px) {
  .validation-heading {
    display: block;
  }
  .validation-heading h3 {
    font-size: 23px;
  }
  .validation-verdict {
    max-width: none;
    text-align: left;
    margin-top: 10px;
  }
  .validation-summary {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    gap: 24px 16px;
  }
  .validation-summary dd {
    font-size: 29px;
  }
  .timeline-legend {
    gap: 8px 14px;
  }
  .timeline-period {
    grid-template-columns: 20px #{'minmax(0, 1fr)'} 66px;
    gap: 8px;
  }
  .timeline-return {
    font-size: 12px;
  }
}
</style>
