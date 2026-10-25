<template>
  <article
    class="experiment-card"
    :class="{ 'is-selected': selected, 'is-pinned': pinned, 'is-processing': processing }"
    :data-run-id="run.id"
    data-testid="experiment-card"
  >
    <header class="experiment-heading">
      <button class="experiment-title" :aria-pressed="selected" data-testid="experiment-select" @click="emit('select')">
        <span class="experiment-pair"
          >{{ pairLabel }}<span class="experiment-kind">{{ t('bots.uxResults.hourlySimulation') }}</span></span
        >
        <strong>{{ run.name }}</strong>
      </button>
      <button
        class="experiment-pin"
        :aria-label="t(pinned ? 'bots.lab.unpin' : 'bots.lab.pin')"
        :aria-pressed="pinned"
        data-testid="experiment-pin"
        @click="emit('pin')"
      >
        {{ pinned ? '★' : '☆' }}
      </button>
    </header>

    <div class="experiment-state">
      <span class="state-label" :class="`state-${run.status}`"
        ><i aria-hidden="true"></i>{{ t(`bots.lab.status.${run.status}`) }}</span
      >
      <span v-if="processing" class="state-progress">{{ Math.round(calculationProgress * 100) }}%</span>
      <span v-else-if="run.result" class="state-progress">{{ t('bots.lab.afterCosts') }}</span>
    </div>
    <div
      v-if="processing"
      class="calculation-progress"
      role="progressbar"
      :aria-label="t('bots.lab.calculationProgress')"
      :aria-valuenow="Math.round(calculationProgress * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ width: `${calculationProgress * 100}%` }"></span>
    </div>

    <ResearchFeeNote v-if="run.fees" :fees="run.fees" />
    <section v-if="portfolio && run.result" class="experiment-outcome" data-testid="experiment-outcome">
      <div class="portfolio-journey">
        <div>
          <span>{{ t('bots.simpleResults.startValue') }}</span
          ><strong data-testid="experiment-start-value"
            >{{ formatExperimentValue(portfolio.initial) }} <small>{{ inputSymbol }}</small></strong
          >
        </div>
        <span class="portfolio-arrow" aria-hidden="true">→</span>
        <div>
          <span>{{ t('bots.simpleResults.endValue') }}</span
          ><strong data-testid="experiment-final-value"
            >{{ formatExperimentValue(portfolio.final) }} <small>{{ inputSymbol }}</small></strong
          >
        </div>
      </div>
      <p class="portfolio-valuation">
        {{ t('bots.simpleResults.valuation', { symbol: inputSymbol, date: valuationDate }) }}
      </p>
    </section>

    <dl class="experiment-metrics">
      <div>
        <dt>{{ t(run.result ? 'bots.simpleResults.netChange' : 'bots.lab.returnSoFar') }}</dt>
        <dd :class="returnTone" data-testid="experiment-return">
          {{ formatExperimentPercent(metricReturn, true) }}<small v-if="metricReturn !== undefined">%</small>
        </dd>
        <span v-if="portfolio" class="metric-note" data-testid="experiment-net-change"
          >{{ formatExperimentValue(portfolio.netChange, true) }} {{ inputSymbol }}</span
        >
      </div>
      <div>
        <dt>{{ t('bots.simpleResults.worstDecline') }}</dt>
        <dd data-testid="experiment-drawdown">
          {{ formatExperimentPercent(run.result?.result.drawdownPercent ?? run.partial?.result.drawdownPercent)
          }}<small v-if="run.result || run.partial">%</small>
        </dd>
        <span class="metric-note">{{ t('bots.simpleResults.peakToLow') }}</span>
      </div>
      <div>
        <dt>{{ t('bots.simpleResults.vsHolding') }}</dt>
        <dd data-testid="experiment-vs-holding">
          {{ formatExperimentValue(portfolio?.excessOverHolding, true)
          }}<small v-if="portfolio">{{ inputSymbol }}</small>
        </dd>
        <span class="metric-note"
          >{{ t('bots.simpleResults.holdingReturn') }}
          <span data-testid="experiment-benchmark"
            >{{ formatExperimentPercent(benchmarkReturn, true)
            }}<template v-if="benchmarkReturn !== undefined">%</template></span
          ></span
        >
      </div>
    </dl>

    <div class="experiment-context">
      <p>
        <span>{{ t('bots.uxResults.studyPeriod') }}</span
        ><time>{{ studyPeriod }}</time>
      </p>
      <p>
        <span>{{ t('bots.uxResults.latestHeldOut') }}</span>
        <strong data-testid="experiment-heldout"
          >{{ formatExperimentPercent(heldOut?.test.returnPercent, true) }}<template v-if="heldOut">%</template></strong
        >
      </p>
      <p v-if="!heldOut" class="experiment-evidence-status">{{ t('bots.uxResults.notTested') }}</p>
      <p v-else class="experiment-evidence-status">
        <time>{{ testPeriod }}</time>
      </p>
      <p v-if="heldOut?.test.trades === 0" class="experiment-no-trades" data-testid="experiment-no-heldout-fills">
        {{ t('bots.uxResults.noHeldOutFills') }}
      </p>
      <p class="experiment-evidence-status">{{ t('bots.simpleResults.historicalNote') }}</p>
    </div>

    <section v-if="run.result" class="experiment-takeaway" data-testid="experiment-takeaway">
      <ol class="decision-counts" :aria-label="t('bots.simpleResults.decisionSummary')">
        <li>
          <strong data-testid="experiment-checks">{{ decisions.checked }}</strong
          ><span>{{ t('bots.simpleResults.priceChecks') }}</span>
        </li>
        <li>
          <strong data-testid="experiment-signals">{{ decisions.signals }}</strong
          ><span>{{ t('bots.simpleResults.tradeSignals') }}</span>
        </li>
        <li>
          <strong data-testid="experiment-trades">{{ decisions.taken }}</strong
          ><span>{{ t('bots.simpleResults.tradesTaken') }}</span>
        </li>
      </ol>
      <p class="decision-note">
        {{ t('bots.simpleResults.skippedSummary', { noSignal: decisions.noSignal, blocked: decisions.blocked }) }}
      </p>
      <p v-if="decisions.unexplained" class="decision-note">
        {{ t('bots.simpleResults.unexplained', { count: decisions.unexplained }) }}
      </p>
      <div v-if="decisions.reviewTarget" class="decision-next-step">
        <p v-if="decisions.dominantBlock" data-testid="experiment-dominant-block">
          {{
            t(`bots.simpleResults.blockReason.${decisions.dominantBlock.key}`, { count: decisions.dominantBlock.count })
          }}
        </p>
        <button data-testid="experiment-review" @click="emit('reviewSettings', decisions.reviewTarget)">
          {{ t(`bots.simpleResults.review.${decisions.reviewTarget}`) }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
    <p v-else-if="run.partial" class="experiment-partial-count">
      <span>{{ t('bots.uxResults.simulatedFills') }}</span>
      <strong data-testid="experiment-trades">{{ run.partial.trades }}</strong>
    </p>

    <div class="experiment-launch">
      <button class="experiment-paper" :disabled="!canStart" data-testid="experiment-paper" @click="emit('savePaper')">
        {{ t('bots.simpleResults.practiceFirst') }}<span aria-hidden="true">→</span>
      </button>
      <button
        class="experiment-create"
        :disabled="!canStart"
        data-testid="experiment-create"
        @click="emit('createBot')"
      >
        {{ t('bots.calmSetup.reviewLive') }}
      </button>
      <p v-if="canStart">{{ t('bots.simpleResults.startNote') }}</p>
    </div>

    <div class="experiment-visual">
      <template v-if="run.result || run.partial">
        <div class="visual-caption">
          <span>{{ t('bots.lab.tradeFlow') }}</span
          ><span>{{ t(processing ? 'bots.lab.processingData' : 'bots.lab.historical') }}</span>
        </div>
        <TradeDistribution
          ref="distribution"
          :trades="studyCandidates"
          :symbol="inputSymbol"
          :output-symbol="outputSymbol"
          :valuation-timestamp="valuationTimestamp"
          :evidence-assets="evidenceAssets"
          live
          :calculation="run.partial"
          :calculating="run.status === 'running'"
          compact
          :paused="paused"
          @review-limits="emit('reviewSettings', 'order-size')"
        />
        <p v-if="run.error" class="checkpoint-error" role="alert">{{ t(run.error) }}</p>
      </template>
      <div
        v-else
        class="experiment-pending"
        :class="{ 'is-error': run.status === 'error' }"
        :role="run.status === 'error' ? 'alert' : 'status'"
      >
        <div class="pending-grid" aria-hidden="true"><span v-if="processing"></span></div>
        <strong>{{
          run.status === 'error'
            ? t('bots.lab.runUnavailable')
            : t(run.partial ? 'bots.lab.processingData' : 'bots.lab.waitingForData')
        }}</strong>
        <p>{{ run.error ? t(run.error) : t('bots.lab.computeDescription') }}</p>
      </div>
    </div>

    <div class="experiment-trace">
      <div class="visual-caption">
        <span>{{ t('bots.lab.equityTrace') }}</span
        ><span data-testid="experiment-live-return">{{
          traceReturn !== undefined ? `${formatExperimentPercent(traceReturn, true)}%` : '—'
        }}</span>
      </div>
      <svg viewBox="0 0 360 70" role="img" :aria-label="t('bots.lab.equityTrace')" class="mini-equity">
        <path :d="`M10,${plot.zeroY} H350`" class="trace-baseline" />
        <path v-if="series?.path" :d="series.path" pathLength="1" class="trace-line" />
        <g v-if="cursor" class="trace-cursor">
          <path :d="`M${cursor.x},5 V65`" class="trace-cursor-rule" />
          <circle :cx="cursor.x" :cy="cursor.y" r="3" />
        </g>
      </svg>
      <div class="trace-caption">
        <span>{{ t('bots.lab.processedThrough') }}</span
        ><time>{{ clockLabel }}</time>
      </div>
      <p class="experiment-evidence-note">{{ t('bots.uxResults.holdingDefinition', { symbol: inputSymbol }) }}</p>
    </div>

    <footer class="experiment-actions">
      <button data-testid="experiment-duplicate" @click="emit('duplicate')">{{ t('bots.lab.duplicate') }}</button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@/lib/substrate/math';
import type { ExperimentRun } from '../experiments';
import { formatExperimentPercent, plotExperimentEquity } from '../experiment-visuals';
import {
  experimentDateRange,
  formatExperimentValue,
  holdingBenchmarkReturn,
  latestHeldOutFold,
  summarizeExperimentDecisions,
  summarizeExperimentPortfolio,
} from '../experiment-results';
import type { ExperimentReviewTarget } from '../experiment-results';
import type { BotAsset } from '../types';
import TradeDistribution from './TradeDistribution.vue';
import ResearchFeeNote from './ResearchFeeNote.vue';

/** One experiment lane renders actual computation checkpoints and freezes final evidence on completion. */
const props = withDefaults(
  defineProps<{ run: ExperimentRun; selected?: boolean; pinned?: boolean; paused?: boolean; assets?: BotAsset[] }>(),
  { selected: false, pinned: false, paused: false, assets: () => [] }
);
const emit = defineEmits<{
  select: [];
  pin: [];
  createBot: [];
  savePaper: [];
  duplicate: [];
  reviewSettings: [target: ExperimentReviewTarget];
}>();
/** The runner waits for the visible checkpoint to enter the graph before computing the next batch. */
const distribution = ref<{ waitForCheckpoint(checkpoint: number, signal?: AbortSignal): Promise<void> }>();
defineExpose({
  waitForCheckpoint: (checkpoint: number, signal?: AbortSignal) =>
    distribution.value?.waitForCheckpoint?.(checkpoint, signal) ?? Promise.resolve(),
});
const { t } = useTranslation();
const processing = computed(() => ['loading', 'running'].includes(props.run.status));
/** Keep actual cumulative study outcomes in the chart while other validation scopes run. */
const studyCandidates = computed(
  () =>
    props.run.result?.candidates ??
    props.run.partial?.studyCandidates ??
    (props.run.partial?.scope === 'study' ? props.run.partial.candidates : [])
);
const heldOut = computed(() => latestHeldOutFold(props.run.result));
const canStart = computed(() => !!props.run.result && props.run.status === 'complete');
const portfolio = computed(() => summarizeExperimentPortfolio(equity.value));
const decisions = computed(() => summarizeExperimentDecisions(props.run.result?.candidates ?? []));
const valuationTimestamp = computed(
  () => props.run.result?.source.history.candles.at(-1)?.timestamp ?? props.run.settings.historyEndAt
);
const valuationDate = computed(() => {
  const timestamp = portfolio.value?.valuedAt;
  return timestamp !== undefined && Number.isFinite(new Date(timestamp).getTime())
    ? `${new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC`
    : '—';
});
const benchmarkReturn = computed(() => holdingBenchmarkReturn(equity.value));
const studyPeriod = computed(() => {
  const candles = props.run.result?.source.history.candles;
  return experimentDateRange(
    candles?.[0]?.timestamp ?? props.run.settings.historyStartAt,
    candles?.at(-1)?.timestamp ?? props.run.settings.historyEndAt
  );
});
const testPeriod = computed(() => experimentDateRange(heldOut.value?.testStart, heldOut.value?.testEnd));
const calculationProgress = computed(() =>
  Number.isFinite(props.run.progress) ? Math.max(0, Math.min(1, props.run.progress)) : 0
);
const inputSymbol = computed(
  () =>
    props.run.result?.bot.assetIn.symbol ??
    props.assets.find((asset) => asset.address === props.run.settings.assetInAddress)?.symbol ??
    ''
);
const evidenceAssets = computed(() => {
  const bot = props.run.result?.bot ?? props.run.partial?.bot;
  return bot ? [...props.assets, bot.assetIn, bot.assetOut, bot.policy.feeAsset] : props.assets;
});
const outputSymbol = computed(
  () =>
    props.run.result?.bot.assetOut.symbol ??
    props.assets.find((asset) => asset.address === props.run.settings.assetOutAddress)?.symbol ??
    ''
);
const pairLabel = computed(() => {
  const bot = props.run.result?.bot;
  const input =
    bot?.assetIn.symbol ?? props.assets.find((asset) => asset.address === props.run.settings.assetInAddress)?.symbol;
  const output =
    bot?.assetOut.symbol ?? props.assets.find((asset) => asset.address === props.run.settings.assetOutAddress)?.symbol;
  return input && output ? `${input} → ${output}` : t('bots.lab.selectedMarket');
});
const returnTone = computed(() => {
  const value = new FPNumber(metricReturn.value ?? '0', 36);
  return value.gt(new FPNumber('0')) ? 'is-positive' : value.lt(new FPNumber('0')) ? 'is-negative' : '';
});
const equity = computed(() => props.run.result?.result.equity ?? props.run.partial?.equity ?? []);
const plot = computed(() => plotExperimentEquity([{ id: props.run.id, equity: equity.value }], 360, 70));
const series = computed(() => plot.value.series[0]);
const metricReturn = computed(
  () =>
    props.run.result?.result.returnPercent ??
    props.run.partial?.result.returnPercent ??
    series.value?.points.at(-1)?.returnPercent
);
const traceReturn = computed(
  () =>
    props.run.result?.result.returnPercent ??
    props.run.partial?.result.returnPercent ??
    series.value?.points.at(-1)?.returnPercent
);
const cursor = computed(() => series.value?.points.at(-1));
const clockLabel = computed(() => {
  const timestamp = props.run.result?.result.equity.at(-1)?.timestamp ?? props.run.partial?.timestamp;
  return timestamp !== undefined && timestamp !== null && Number.isFinite(timestamp)
    ? `${new Date(timestamp).toISOString().slice(5, 16).replace('T', ' ')} UTC`
    : '—';
});
</script>

<style scoped lang="scss">
.experiment-card {
  min-width: 0;
  position: relative;
  color: var(--lab-text, var(--s-color-base-content-primary, #2d2534));
  background: var(--lab-panel, var(--s-color-utility-surface, #f6f2f5));
  border: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  border-radius: 16px;
  box-shadow: none;
  overflow: hidden;
  transition:
    border-color 180ms,
    box-shadow 180ms,
    transform 180ms;
  &::before {
    content: '';
    display: block;
    height: 2px;
    background: var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
    transition: background 180ms;
  }
  &.is-selected {
    border-color: var(--lab-accent, var(--s-color-action-text, #ab0555));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--s-color-theme-accent) 12%, transparent);
    &::before {
      background: var(--lab-accent, var(--s-color-action-text, #ab0555));
    }
  }
  &.is-processing {
    display: flex;
    flex-direction: column;
    // Keep the renderer mounted while moving real computation ahead of interim metrics.
    .experiment-metrics {
      order: 1;
    }
    .experiment-context {
      order: 2;
    }
    .experiment-trace {
      order: 3;
    }
    .experiment-actions,
    .experiment-launch {
      order: 4;
    }
    .experiment-pending {
      min-height: 144px;
      padding: 18px;
    }
  }
  &:hover {
    border-color: var(--s-color-action-text, #ab0555);
  }
  &.is-selected:hover {
    border-color: var(--lab-accent, var(--s-color-action-text, #ab0555));
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--lab-cyan, var(--s-color-status-success-text, #166e53));
    outline-offset: 3px;
  }
}
.experiment-heading {
  display: flex;
  align-items: flex-start;
  padding: 16px 16px 10px;
  gap: 6px;
}
.experiment-title {
  flex: 1;
  text-align: start;
  padding: 0;
  border: 0;
  background: none;
  min-width: 0;
  color: inherit;
  strong {
    display: block;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 7px;
    overflow-wrap: anywhere;
  }
}
.experiment-pair {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font:
    12px/1.4 'SFMono-Regular',
    Consolas,
    monospace;
  color: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
  letter-spacing: 0.03em;
}
.experiment-kind {
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-family: inherit;
  font-size: 11px;
}
.experiment-pin {
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  background: transparent;
  border: 0;
  font-size: 22px !important;
  width: 30px;
  height: 32px;
  flex: 0 0 30px;
  padding: 0;
  border-radius: 50%;
  box-shadow: none;
  &[aria-pressed='true'] {
    color: var(--lab-accent, var(--s-color-action-text, #ab0555));
    background: color-mix(in srgb, var(--lab-accent) 8%, transparent);
  }
}
.experiment-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 0 16px 13px;
  font-size: 12px;
}
.state-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  i {
    width: 5px;
    height: 5px;
    background: currentColor;
    border-radius: 50%;
  }
  &.state-complete {
    color: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
  }
  &.state-error {
    color: var(--s-color-status-error-text, #ab0555);
  }
  &.state-running,
  &.state-loading {
    color: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
    i {
      box-shadow: 0 0 8px currentColor;
      animation: status-pulse 1.3s ease-in-out infinite;
    }
  }
}
.state-progress {
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-variant-numeric: tabular-nums;
}
.calculation-progress {
  height: 2px;
  background: var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  span {
    display: block;
    height: 100%;
    background: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
    transition: width 200ms linear;
    box-shadow: 0 0 10px color-mix(in srgb, var(--lab-cyan) 40%, transparent);
  }
}
.experiment-outcome {
  padding: 18px 16px 14px;
}
.portfolio-journey {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'} auto #{'minmax(0, 1fr)'};
  align-items: center;
  gap: 12px;
  div > span {
    display: block;
    margin-bottom: 7px;
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
    font-size: 12px;
  }
  strong {
    font-size: 23px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  small {
    font-size: 12px;
    font-weight: 400;
  }
}
.portfolio-arrow {
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
}
.portfolio-valuation,
.experiment-evidence-status,
.decision-note {
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 12px;
  line-height: 1.5;
  margin: 10px 0 0;
}
.experiment-takeaway {
  padding: 14px 16px 0;
}
.decision-counts {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  list-style: none;
  gap: 12px;
  li {
    min-width: 0;
  }
  strong {
    display: block;
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  span {
    display: block;
    font-size: 12px;
    line-height: 1.4;
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  }
}
.decision-next-step {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.5;
  p {
    flex: 1 1 200px;
    margin: 0;
  }
  button {
    min-height: 44px;
    padding: 6px 0;
    border: 0;
    background: none;
    color: var(--lab-accent, var(--s-color-action-text, #ab0555));
  }
}
.experiment-partial-count {
  padding: 0 16px;
  font-size: 12px;
}
.experiment-launch {
  display: grid;
  grid-template-columns: #{'minmax(0, 1.5fr)'} #{'minmax(0, 1fr)'};
  gap: 8px;
  padding: 18px 16px;
  button {
    min-height: 48px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
    font-size: 13px;
    line-height: 1.4;
    transition:
      transform 150ms ease,
      opacity 150ms ease;
    &:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
  .experiment-paper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--s-color-theme-accent, #e32376);
    color: var(--s-color-base-on-accent, #fff);
    border-color: transparent;
    font-weight: 600;
  }
  .experiment-create {
    background: transparent;
    color: var(--lab-text, var(--s-color-base-content-primary, #2d2534));
  }
  p {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
    font-size: 11px;
    line-height: 1.5;
  }
}
.experiment-metrics {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  gap: 20px 12px;
  padding: 18px 16px;
  border-block: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  background: var(--s-color-base-background);
  box-shadow: none;
  dt {
    font-size: 12px;
    min-height: 2.8em;
    line-height: 1.4;
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
    margin-bottom: 7px;
  }
  dd {
    margin: 0;
    font:
      23px/1.2 'SFMono-Regular',
      Consolas,
      monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.05em;
    overflow-wrap: anywhere;
    small {
      font-size: 11px;
      margin-left: 2px;
      letter-spacing: 0;
    }
  }
  .is-positive {
    color: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
  }
  .is-negative {
    color: var(--s-color-status-error-text, #ab0555);
  }
}
@media (max-width: 600px) {
  .experiment-metrics {
    gap: 18px 10px;
  }
  .experiment-metrics dd {
    font-size: 19px;
  }
  .experiment-metrics dt {
    min-height: 2.8em;
  }
  .portfolio-journey {
    gap: 8px;
  }
  .portfolio-journey strong {
    font-size: 21px;
  }
  .experiment-launch {
    grid-template-columns: 1fr;
  }
}
.metric-note {
  display: block;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 11px;
  margin-top: 5px;
}
.experiment-context {
  padding: 12px 16px;
  border-bottom: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  font-size: 11px;
  line-height: 1.6;
  p {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0 10px;
    margin: 0 0 5px;
  }
  span {
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  }
  time,
  strong {
    font-variant-numeric: tabular-nums;
  }
  .experiment-no-trades {
    color: var(--s-color-status-warning-text, #805700);
    margin: 8px 0 0;
  }
}
.experiment-evidence-note {
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 11px;
  line-height: 1.6;
  margin: 12px 0 0;
}
.experiment-visual {
  padding: 14px 12px 0;
  animation: reveal-evidence 250ms ease-out;
}
.visual-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 12px;
  margin-bottom: 8px;
  span:last-child {
    font:
      11px 'SFMono-Regular',
      Consolas,
      monospace;
  }
}
.checkpoint-error {
  color: var(--s-color-status-error-text);
  font-size: 11px;
  line-height: 1.6;
}
.experiment-pending {
  min-height: 258px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 22px;
  text-align: center;
  strong {
    z-index: 1;
    font-size: 13px;
    font-weight: 500;
  }
  p {
    z-index: 1;
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
    font-size: 11px;
    line-height: 1.6;
    margin: 10px 0 0;
  }
  &.is-error strong {
    color: var(--s-color-status-error-text, #ab0555);
  }
}
.pending-grid {
  position: absolute;
  inset: 8px 0;
  opacity: 0.4;
  overflow: hidden;
  background-image:
    linear-gradient(color-mix(in srgb, var(--lab-cyan) 12%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--lab-cyan) 12%, transparent) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(transparent, #000 25%, #000 75%, transparent);
  span {
    display: block;
    height: 1px;
    width: 100%;
    background: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
    box-shadow: 0 0 22px var(--lab-cyan, var(--s-color-status-success-text, #166e53));
    animation: data-scan 3s linear infinite;
  }
}
.experiment-trace {
  padding: 12px 16px 14px;
}
.mini-equity {
  display: block;
  width: 100%;
  height: 70px;
  overflow: visible;
  border-radius: 12px;
  background: var(--s-color-base-background);
  box-shadow: none;
}
.trace-baseline {
  stroke: var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  stroke-dasharray: 3 5;
  fill: none;
}
.trace-ghost {
  stroke: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
  stroke-opacity: 0.13;
  stroke-width: 1;
  fill: none;
}
.trace-line {
  stroke: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
  stroke-width: 1.5;
  fill: none;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--lab-cyan) 30%, transparent));
  animation: trace-reveal 600ms ease-out;
}
.trace-cursor {
  fill: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
}
.trace-cursor-rule {
  stroke: var(--lab-cyan, var(--s-color-status-success-text, #166e53));
  stroke-opacity: 0.2;
  stroke-dasharray: 2 4;
}
.trace-caption {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
  font-size: 11px;
  time {
    font:
      11px 'SFMono-Regular',
      Consolas,
      monospace;
  }
}
.experiment-actions {
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
  button {
    flex: 1;
    background: none;
    border: 0;
    color: var(--lab-muted, var(--s-color-base-content-secondary, #70646c));
    min-height: 46px;
    font-size: 12px;
    transition: background 150ms;
    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--lab-accent) 8%, transparent);
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
  .experiment-create {
    color: var(--lab-accent, var(--s-color-action-text, #ab0555));
    border-left: 1px solid var(--lab-line, var(--s-color-base-border-secondary, #dfd7de));
    span {
      margin-left: 12px;
    }
  }
}
@keyframes reveal-evidence {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes trace-reveal {
  from {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }
  to {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
  }
}
@keyframes status-pulse {
  50% {
    opacity: 0.35;
  }
}
@keyframes data-scan {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(240px);
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before {
    animation: none !important;
    transition: none !important;
  }
}
</style>
