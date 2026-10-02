<template>
  <section
    v-if="visibleFinalists.length"
    class="finalist-compare"
    data-testid="discovery-finalist-compare"
    :aria-label="t('bots.discovery.selectedCount', { count: visibleFinalists.length })"
  >
    <div class="compare-heading">
      <div>
        <span class="compare-eyebrow">{{ t('bots.discovery.training') }} / {{ t('bots.discovery.holdout') }}</span>
        <h3>{{ t('bots.discovery.selectedCount', { count: visibleFinalists.length }) }}</h3>
      </div>
      <span class="compare-key" aria-hidden="true"><i />{{ t('bots.discovery.qualified') }}</span>
    </div>

    <div class="compare-grid" :class="`count-${visibleFinalists.length}`">
      <article
        v-for="(finalist, index) in visibleFinalists"
        :key="finalist.id"
        class="compare-item"
        data-testid="discovery-finalist-card"
        :data-finalist-id="finalist.id"
        :style="{ '--compare-delay': `${index * 75}ms` }"
      >
        <header class="compare-item-heading">
          <span class="compare-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <strong>{{ pairTitle(finalist.pairKey) }}</strong>
          <span class="compare-request">{{ t('bots.discovery.requestNumber') }} {{ finalist.callNumber }}</span>
        </header>
        <div class="compare-strategy" data-testid="discovery-finalist-strategy">
          <strong>{{ strategyName(finalist.strategy.kind) }}</strong>
          <p>{{ strategySummary(finalist.strategy) }}</p>
        </div>
        <code class="compare-addresses"
          >{{ finalist.template.assetIn.address }} <span aria-hidden="true">→</span>
          {{ finalist.template.assetOut.address }}</code
        >

        <div class="compare-returns" data-testid="discovery-finalist-returns">
          <div v-for="period in periods(finalist)" :key="period.name" class="compare-return-row">
            <span class="compare-period">{{ t(`bots.discovery.${period.name}`) }}</span>
            <div class="compare-track" aria-hidden="true">
              <div class="compare-half negative">
                <i
                  v-if="period.metrics && isNegative(period.metrics.returnPercent)"
                  class="compare-bar"
                  :class="period.name"
                  :style="{ width: barWidth(period.metrics.returnPercent) }"
                  :data-period="period.name"
                  :data-value="period.metrics.returnPercent"
                />
              </div>
              <div class="compare-half positive">
                <i
                  v-if="period.metrics && !isNegative(period.metrics.returnPercent)"
                  class="compare-bar"
                  :class="period.name"
                  :style="{ width: barWidth(period.metrics.returnPercent) }"
                  :data-period="period.name"
                  :data-value="period.metrics.returnPercent"
                />
              </div>
            </div>
            <strong
              :class="{ 'is-negative': period.metrics && isNegative(period.metrics.returnPercent) }"
              :title="period.metrics ? `${period.metrics.returnPercent}%` : undefined"
              >{{ percentOrDash(period.metrics?.returnPercent) }}</strong
            >
          </div>
          <div class="compare-scale" :title="`${exactScaleLabel}%`" aria-hidden="true">
            <span>−{{ scaleLabel }}%</span><span>0</span><span>+{{ scaleLabel }}%</span>
          </div>
        </div>

        <table class="compare-metrics">
          <thead>
            <tr>
              <th scope="col">
                <span class="sr-only">{{ pairTitle(finalist.pairKey) }}</span>
              </th>
              <th scope="col">{{ t('bots.discovery.training') }}</th>
              <th scope="col">{{ t('bots.discovery.holdout') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{{ t('bots.discovery.excess') }}</th>
              <td :title="exactPercentTitle(finalist.training.excessReturnPercent)">
                {{ percentOrDash(finalist.training.excessReturnPercent) }}
              </td>
              <td :title="exactPercentTitle(completedHoldout(finalist)?.excessReturnPercent)">
                {{ percentOrDash(completedHoldout(finalist)?.excessReturnPercent) }}
              </td>
            </tr>
            <tr>
              <th scope="row">{{ t('bots.discovery.trades') }}</th>
              <td>{{ finalist.training.trades }}</td>
              <td>{{ completedHoldout(finalist)?.trades ?? '—' }}</td>
            </tr>
            <tr>
              <th scope="row">{{ t('bots.discovery.drawdown') }}</th>
              <td :title="`${finalist.training.drawdownPercent}%`">
                {{ percentOrDash(finalist.training.drawdownPercent) }}
              </td>
              <td :title="exactPercentTitle(completedHoldout(finalist)?.drawdownPercent)">
                {{ percentOrDash(completedHoldout(finalist)?.drawdownPercent) }}
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { formatExperimentPercent } from '../experiment-visuals';
import type { DiscoveryFinalist, DiscoveryMetrics } from '../discovery';
import type { StrategyConfig } from '../types';

const props = defineProps<{
  finalists: DiscoveryFinalist[];
  pairTitle: (key: string) => string;
  strategyName: (kind: StrategyConfig['kind']) => string;
  strategySummary: (strategy: StrategyConfig) => string;
}>();
const { t } = useTranslation();
const PERCENT_DECIMALS = 36;
const PERCENT_SCALE = 10n ** BigInt(PERCENT_DECIMALS);

/** Compare only the selected qualified strategies, in the user's selection order. */
const visibleFinalists = computed(() =>
  props.finalists.filter((finalist) => finalist.status === 'qualified').slice(0, 3)
);

/** A sealed or partial holdout never enters either the chart or the comparison table. */
function completedHoldout(finalist: DiscoveryFinalist): DiscoveryMetrics | null {
  return finalist.holdoutState === 'complete' ? finalist.holdout : null;
}

/** Keep both training and holdout labels visible even while holdout evidence is unavailable. */
function periods(finalist: DiscoveryFinalist): { name: 'training' | 'holdout'; metrics: DiscoveryMetrics | null }[] {
  return [
    { name: 'training', metrics: finalist.training },
    { name: 'holdout', metrics: completedHoldout(finalist) },
  ];
}

/** Parse the research metric's full decimal precision for signed visual proportions. */
function percentageUnits(value: string): bigint | null {
  const match = /^(-?)(\d{1,18})(?:\.(\d{1,36}))?$/.exec(value);
  if (!match) return null;
  const fraction = (match[3] ?? '').padEnd(PERCENT_DECIMALS, '0');
  const units = BigInt(match[2]) * PERCENT_SCALE + BigInt(fraction);
  return match[1] ? -units : units;
}

function isNegative(value: string): boolean {
  return (percentageUnits(value) ?? 0n) < 0n;
}

/** Every bar shares the largest measured absolute net return as its symmetric domain. */
const scale = computed(() => {
  let greatest = 0n;
  for (const finalist of visibleFinalists.value) {
    for (const period of periods(finalist)) {
      if (!period.metrics) continue;
      const units = percentageUnits(period.metrics.returnPercent);
      if (units === null) continue;
      const magnitude = units < 0n ? -units : units;
      if (magnitude > greatest) greatest = magnitude;
    }
  }
  return greatest;
});

const exactScaleLabel = computed(() => {
  const whole = scale.value / PERCENT_SCALE;
  const fraction = (scale.value % PERCENT_SCALE).toString().padStart(PERCENT_DECIMALS, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
});
const scaleLabel = computed(() => {
  if (scale.value > 0n && scale.value < PERCENT_SCALE / 100n) return '<0.01';
  return formatExperimentPercent(exactScaleLabel.value);
});

/** BigInt keeps the bar ratio finite without floating-point rounding or changing any return value. */
function barWidth(value: string): string {
  const units = percentageUnits(value);
  if (units === null || scale.value === 0n) return '0%';
  const magnitude = units < 0n ? -units : units;
  const tenths = (magnitude * 1_000n + scale.value / 2n) / scale.value;
  const fraction = tenths % 10n;
  return `${tenths / 10n}${fraction ? `.${fraction}` : ''}%`;
}

function percentOrDash(value: string | null | undefined): string {
  return value === null || value === undefined ? '—' : `${formatExperimentPercent(value)}%`;
}

function exactPercentTitle(value: string | null | undefined): string | undefined {
  return value === null || value === undefined ? undefined : `${value}%`;
}
</script>

<style scoped lang="scss">
.finalist-compare {
  --compare-text: var(--discovery-text, var(--s-color-base-content-primary));
  --compare-muted: var(--discovery-muted, var(--s-color-base-content-secondary));
  --compare-surface: var(--discovery-surface, var(--s-color-utility-surface));
  --compare-recess: var(--discovery-recess, var(--s-color-base-background));
  --compare-line: var(--discovery-line, var(--s-color-base-border-secondary));
  --compare-accent: var(--discovery-accent, var(--s-color-action-text));
  --compare-good: var(--discovery-good, var(--s-color-status-success-text));
  --compare-bad: var(--s-color-status-error-text);
  color: var(--compare-text);
  font-variant-numeric: tabular-nums;
  min-width: 0;
}

.finalist-compare * {
  box-sizing: border-box;
}

.compare-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 14px;
  margin-bottom: 14px;

  h3 {
    margin: 3px 0 0;
    font-size: clamp(18px, 2vw, 23px);
    letter-spacing: -0.035em;
  }
}

.compare-eyebrow,
.compare-key {
  color: var(--compare-muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.compare-key {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--compare-good);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--compare-good) 13%, transparent);
  }
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax' }(0, 1fr));
  gap: 14px;

  &.count-2 {
    grid-template-columns: repeat(2, #{'minmax' }(0, 1fr));
  }

  &.count-1 {
    grid-template-columns: #{'minmax' }(0, 480px);
  }
}

.compare-item {
  min-width: 0;
  padding: 17px 17px 13px;
  border-radius: 17px;
  background: var(--compare-surface);
  box-shadow: var(--discovery-raised, var(--bot-shadow-raised));
  animation: compare-enter 460ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--compare-delay);
}

.compare-item-heading {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;

  strong {
    font-size: 17px;
    letter-spacing: -0.035em;
    overflow-wrap: anywhere;
  }
}

.compare-request {
  margin-inline-start: auto;
  color: var(--compare-muted);
  font-size: 10px;
  white-space: nowrap;
}

.compare-strategy {
  margin: 10px 0 0 24px;
  min-width: 0;

  strong {
    display: block;
    color: var(--compare-accent);
    font-size: 12px;
    line-height: 1.3;
  }

  p {
    margin: 3px 0 0;
    color: var(--compare-muted);
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}

.compare-index {
  color: var(--compare-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.compare-addresses {
  display: block;
  margin-top: 5px;
  padding-left: 24px;
  color: var(--compare-muted);
  font-size: 10px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.compare-returns {
  margin: 16px 0 12px;
  padding: 13px 11px 7px;
  border-radius: 12px;
  background: var(--compare-recess);
  box-shadow: var(--discovery-inset, var(--bot-shadow-inset));
}

.compare-return-row {
  display: grid;
  grid-template-columns: 59px #{'minmax' }(0, 1fr) 66px;
  gap: 8px;
  align-items: center;
  min-height: 27px;

  > strong {
    text-align: right;
    font-size: 12px;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }

  > strong.is-negative {
    color: var(--compare-bad);
  }
}

.compare-period {
  color: var(--compare-muted);
  font-size: 11px;
  line-height: 1.4;
}

.compare-track {
  position: relative;
  display: flex;
  align-items: center;
  height: 11px;

  &::after {
    content: '';
    position: absolute;
    inset-block: -3px;
    left: 50%;
    width: 1px;
    background: var(--compare-muted);
    opacity: 0.58;
  }
}

.compare-half {
  display: flex;
  align-items: center;
  width: 50%;
  height: 100%;

  &.negative {
    justify-content: flex-end;
  }
}

.compare-bar {
  display: block;
  height: 7px;
  min-width: 0;
  border-radius: 6px;
  background: var(--compare-accent);
  animation: compare-bar 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--compare-delay) + 160ms);

  &.holdout {
    background: var(--compare-good);
  }

  .negative & {
    background: var(--compare-bad);
    transform-origin: right;
  }
}

.compare-scale {
  display: flex;
  justify-content: space-between;
  margin: 2px 67px 0 67px;
  color: var(--compare-muted);
  font-size: 10px;
  line-height: 1.4;
}

.compare-metrics {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: clamp(12px, 0.95vw, 13px);
  line-height: 1.45;

  th,
  td {
    padding: 8px 3px;
    text-align: right;
    overflow-wrap: anywhere;
  }

  th:first-child {
    width: 42%;
    text-align: left;
  }

  thead th {
    color: var(--compare-muted);
    font-size: clamp(11px, 0.85vw, 12px);
    font-weight: 650;
  }

  tbody tr + tr {
    border-top: 1px solid color-mix(in srgb, var(--compare-line) 65%, transparent);
  }

  tbody th {
    color: var(--compare-muted);
    font-weight: 600;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes compare-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes compare-bar {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@media (max-width: 980px) {
  .compare-grid,
  .compare-grid.count-2 {
    grid-template-columns: 1fr;
  }

  .compare-grid.count-1 {
    grid-template-columns: #{'minmax' }(0, 1fr);
  }
}

@media (max-width: 480px) {
  .compare-key {
    display: none;
  }

  .compare-item {
    padding-inline: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .compare-item,
  .compare-bar {
    animation: none;
  }
}
</style>
