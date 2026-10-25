<template>
  <section
    class="discovery-visuals"
    data-testid="discovery-visuals"
    :class="{ 'is-scanning': scanning, 'has-focused-candidate': !!focusedCandidateId }"
  >
    <div v-if="!session" class="visuals-preview" data-testid="discovery-visuals-empty">
      <div class="preview-copy">
        <span class="visuals-eyebrow">{{ t('bots.discovery.ready') }}</span>
        <strong>{{ t('bots.discovery.period') }}</strong>
      </div>
      <div v-if="directedMarketCount" class="preview-markets" data-testid="discovery-preview-markets">
        <strong>{{ directedMarketCount }}</strong>
        <span>{{ t('bots.discovery.markets') }}</span>
      </div>
      <div class="preview-steps" role="list">
        <span role="listitem">{{ t('bots.discovery.markets') }}</span>
        <span class="preview-arrow" aria-hidden="true">→</span>
        <span role="listitem">{{ t('bots.discovery.training') }}</span>
        <span class="preview-arrow" aria-hidden="true">→</span>
        <span role="listitem">{{
          t(preflightExploratory ? 'bots.discovery.exploratory' : 'bots.discovery.holdout')
        }}</span>
      </div>
      <div class="preview-window" role="img" :aria-label="t('bots.discovery.period')">
        <span class="preview-window-training" /><span class="preview-window-holdout" />
      </div>
    </div>

    <template v-else>
      <div class="visuals-intro">
        <span class="visuals-eyebrow">{{ t('bots.discovery.markets') }} / {{ t('bots.discovery.training') }}</span>
        <span class="visuals-live" aria-hidden="true"><i /><i /><i /></span>
      </div>

      <div class="research-phases" data-testid="discovery-research-phases" :aria-label="t('bots.discovery.running')">
        <div
          v-for="(step, index) in phaseSteps"
          :key="step.label"
          class="research-phase"
          :class="{ 'is-current': phaseIndex === index, 'is-complete': phaseIndex > index }"
          :aria-current="phaseIndex === index ? 'step' : undefined"
        >
          <span class="research-phase-index" aria-hidden="true">{{ index + 1 }}</span>
          <span>{{ t(step.label) }}</span>
          <strong v-if="index === 0 && counts.total">{{ counts.screened }} / {{ counts.total }}</strong>
          <strong v-else-if="index === 1">{{ session.callsUsed }} / {{ session.callCap }}</strong>
        </div>
      </div>

      <div class="visuals-overview">
        <div
          class="coverage"
          data-testid="discovery-coverage"
          :data-total="counts.total"
          :data-ready="counts.ready"
          :data-screened="counts.screened"
          :data-skipped="counts.skipped"
          :data-pending="counts.pending"
        >
          <div class="coverage-orbit">
            <svg viewBox="0 0 176 176" aria-hidden="true">
              <circle class="coverage-halo" cx="88" cy="88" r="78" />
              <circle class="coverage-track" cx="88" cy="88" r="67" />
              <circle
                v-if="counts.ready"
                class="coverage-ready"
                cx="88"
                cy="88"
                r="67"
                :stroke-dasharray="ringDash(counts.ready)"
              />
              <circle
                v-if="counts.skipped"
                class="coverage-skipped"
                cx="88"
                cy="88"
                r="67"
                :stroke-dasharray="ringDash(counts.skipped)"
                :stroke-dashoffset="ringOffset"
              />
            </svg>
            <div class="coverage-value">
              <template v-if="counts.total">
                <strong>{{ counts.ready }}</strong>
                <span>{{ t('bots.discovery.covered') }}</span>
                <small>{{ counts.screened }} / {{ counts.total }} {{ t('bots.discovery.screened') }}</small>
              </template>
              <span v-else class="coverage-scanning">{{
                t(scanning ? 'bots.discovery.scanning' : 'bots.discovery.markets')
              }}</span>
            </div>
          </div>
          <div v-if="counts.total" class="coverage-key">
            <span
              ><i class="screened" />{{ t('bots.discovery.screened') }} <strong>{{ counts.screened }}</strong></span
            >
            <span
              ><i class="ready" />{{ t('bots.discovery.covered') }} <strong>{{ counts.ready }}</strong></span
            >
            <span
              ><i class="skipped" />{{ t('bots.discovery.skipped') }} <strong>{{ counts.skipped }}</strong></span
            >
            <span
              ><i class="pending" />{{ t('bots.discovery.scanning') }} <strong>{{ counts.pending }}</strong></span
            >
          </div>
          <p v-if="marketScanning && counts.pending" class="scan-estimate" data-testid="discovery-scan-estimate">
            {{
              scanEstimateMinutes === null
                ? t('bots.discovery.scanRemaining', { count: counts.pending })
                : t('bots.discovery.scanEstimate', { minutes: scanEstimateMinutes })
            }}
          </p>
        </div>

        <div class="window" data-testid="discovery-window">
          <div class="window-heading">
            <span class="visuals-eyebrow window-heading-long">{{ t('bots.discovery.period') }}</span>
            <span class="visuals-eyebrow window-heading-short"
              >{{ t('bots.discovery.training') }} / {{ t('bots.discovery.holdout') }}</span
            >
            <strong>{{ windowStart }} <span aria-hidden="true">→</span> {{ windowEnd }}</strong>
          </div>
          <div class="window-track" :class="{ 'has-window': !!windowSplit }" role="img" :aria-label="windowLabel">
            <span class="window-training" :style="{ width: `${windowSplit?.trainingPercent ?? 0}%` }" />
            <span class="window-holdout" :style="{ width: `${windowSplit?.holdoutPercent ?? 0}%` }" />
            <i v-if="windowSplit" class="window-boundary" :style="{ left: `${windowSplit.trainingPercent}%` }" />
          </div>
          <div class="window-legend">
            <div>
              <span class="window-mark training" />
              <span>{{ t('bots.discovery.training') }}</span>
              <strong>{{ windowSplit ? formatPercent(windowSplit.trainingPercent) + '%' : '—' }}</strong>
            </div>
            <div>
              <span class="window-mark holdout" />
              <span>{{ t('bots.discovery.holdout') }}</span>
              <strong>{{ windowSplit ? formatPercent(windowSplit.holdoutPercent) + '%' : '—' }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div v-if="counts.reasons.length" class="skip-groups" data-testid="discovery-skip-groups">
        <strong>{{ t('bots.discovery.skipReasons') }}</strong>
        <ul>
          <li v-for="item in counts.reasons" :key="item.reason" :data-reason="item.reason">
            <span>{{ skipReasonLabel(item.reason) }}</span
            ><strong>{{ item.count }}</strong>
          </li>
        </ul>
      </div>

      <div class="scatter" data-testid="discovery-scatter">
        <div class="scatter-heading">
          <div>
            <span class="visuals-eyebrow">{{ t('bots.discovery.training') }}</span>
            <h3>
              {{ t('bots.discovery.drawdown') }} <span aria-hidden="true">/</span> {{ t('bots.discovery.return') }}
            </h3>
          </div>
          <div class="scatter-key" aria-hidden="true">
            <span><i class="training" />{{ t('bots.discovery.training') }}</span>
            <span v-if="holdoutPoints.length"><i class="holdout" />{{ t('bots.discovery.holdout') }}</span>
            <span v-if="drawdownLimitX !== null"
              ><i class="limit" />{{ t('bots.discovery.maxDrawdown') }} {{ maxDrawdownLabel }}%</span
            >
          </div>
        </div>

        <div v-if="!trainingPoints.length" class="scatter-waiting" data-testid="discovery-scatter-waiting">
          <span class="waiting-signal" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <strong>{{ scanning ? t('bots.discovery.scanning') : t('bots.discovery.candidates') }}</strong>
            <span>{{ t('bots.discovery.noCandidates') }}</span>
          </div>
        </div>

        <div v-show="trainingPoints.length" ref="plotWrap" class="plot-wrap">
          <svg
            class="scatter-plot"
            viewBox="0 0 340 188"
            preserveAspectRatio="none"
            :aria-label="plotLabel"
            :style="{ minHeight: `${minimumPlotHeight}px` }"
            role="img"
          >
            <defs>
              <pattern id="discovery-plot-grid" width="48" height="34" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 34" class="plot-grid-line" />
              </pattern>
            </defs>
            <rect x="32" y="12" width="292" height="145" fill="url(#discovery-plot-grid)" />
            <line class="plot-axis" x1="32" y1="157" x2="324" y2="157" />
            <line class="plot-axis" x1="32" y1="12" x2="32" y2="157" />
            <line v-if="trainingPoints.length" class="plot-zero" x1="32" :y1="zeroY" x2="324" :y2="zeroY" />
            <line
              v-if="trainingPoints.length && drawdownLimitX !== null"
              class="plot-risk-limit"
              data-testid="discovery-drawdown-limit"
              :data-value="session.maxDrawdownPercent"
              :x1="drawdownLimitX"
              y1="12"
              :x2="drawdownLimitX"
              y2="157"
            >
              <title>{{ t('bots.discovery.maxDrawdown') }} {{ maxDrawdownLabel }}%</title>
            </line>
            <text
              v-if="trainingPoints.length && drawdownLimitX !== null"
              class="plot-risk-label"
              :x="drawdownLimitX > 260 ? drawdownLimitX - 4 : drawdownLimitX + 4"
              y="25"
              :text-anchor="drawdownLimitX > 260 ? 'end' : 'start'"
            >
              {{ maxDrawdownLabel }}%
            </text>
            <template v-for="point in holdoutPoints" :key="`${point.id}-connector`">
              <line
                v-if="trainingById.get(point.id)"
                class="plot-connector"
                :class="{ 'is-focused': focusedCandidateId === point.id }"
                :x1="trainingById.get(point.id)!.x"
                :y1="trainingById.get(point.id)!.y"
                :x2="point.x"
                :y2="point.y"
              />
            </template>
          </svg>
          <template v-if="trainingPoints.length">
            <span class="plot-bound top" aria-hidden="true">{{ formatPercent(plotDomain.yMax) }}%</span>
            <span class="plot-bound bottom" aria-hidden="true">{{ formatPercent(plotDomain.yMin) }}%</span>
            <span class="plot-bound end" aria-hidden="true">{{ formatPercent(plotDomain.xMax) }}%</span>
          </template>
          <span
            v-for="point in displacedPoints"
            :key="`${point.id}-${point.period}-tether`"
            class="plot-point-tether"
            :class="{ 'is-focused': focusedCandidateId === point.id }"
            :data-candidate-id="point.id"
            :data-period="point.period"
            :data-true-x="point.trueX"
            :data-true-y="point.trueY"
            :data-display-x="point.displayX"
            :data-display-y="point.displayY"
            :style="tetherStyle(point)"
            aria-hidden="true"
          />
          <button
            v-for="(point, index) in displayTrainingPoints"
            :key="`${point.id}-training`"
            type="button"
            class="plot-point training"
            :class="{ 'is-focused': focusedCandidateId === point.id }"
            data-testid="discovery-training-point"
            :data-candidate-id="point.id"
            :data-focused="focusedCandidateId === point.id"
            :data-pair-key="point.pairKey"
            :data-risk="point.drawdownText"
            :data-return="point.returnText"
            :data-excess="point.excessReturnPercent"
            :data-trades="point.trades"
            :data-x="point.x"
            :data-y="point.y"
            :data-display-x="point.displayX"
            :data-display-y="point.displayY"
            :data-displaced="point.displaced"
            :data-overlap="coincidentIds.has(point.id)"
            :aria-label="pointActionLabel(point, t('bots.discovery.training'))"
            :title="pointLabel(point, t('bots.discovery.training'))"
            @click="focusPlotCandidate(point.id, $event)"
            :style="{
              left: `${point.displayX}px`,
              top: `${point.displayY}px`,
              '--point-delay': `${Math.min(index, 12) * 45}ms`,
            }"
          />
          <button
            v-for="point in displayHoldoutPoints"
            :key="`${point.id}-holdout`"
            type="button"
            class="plot-point holdout"
            :class="{ 'is-focused': focusedCandidateId === point.id }"
            data-testid="discovery-holdout-point"
            :data-candidate-id="point.id"
            :data-focused="focusedCandidateId === point.id"
            :data-pair-key="point.pairKey"
            :data-risk="point.drawdownText"
            :data-return="point.returnText"
            :data-excess="point.excessReturnPercent"
            :data-trades="point.trades"
            :data-x="point.x"
            :data-y="point.y"
            :data-display-x="point.displayX"
            :data-display-y="point.displayY"
            :data-displaced="point.displaced"
            :data-overlap="coincidentIds.has(point.id)"
            :aria-label="pointActionLabel(point, t('bots.discovery.holdout'))"
            :title="pointLabel(point, t('bots.discovery.holdout'))"
            @click="focusPlotCandidate(point.id, $event)"
            :style="{
              left: `${point.displayX}px`,
              top: `${point.displayY}px`,
            }"
          />
        </div>
        <div v-if="trainingPoints.length" class="scatter-axis">
          <span>{{ t('bots.discovery.return') }} ↑</span>
          <span>{{ t('bots.discovery.drawdown') }} →</span>
        </div>
        <p v-if="trainingPoints.length" class="scatter-source-note" data-testid="discovery-fee-caveat">
          {{ t('bots.discovery.sourceNote') }}
        </p>
        <div
          v-if="spotlightCandidate"
          id="discovery-candidate-spotlight"
          class="candidate-spotlight"
          data-testid="discovery-candidate-spotlight"
          :data-candidate-id="spotlightCandidate.id"
          role="region"
          aria-labelledby="discovery-candidate-spotlight-heading"
        >
          <div class="spotlight-heading">
            <div>
              <span class="visuals-eyebrow"
                >{{ t('bots.discovery.requestNumber') }} {{ spotlightCandidate.callNumber }}</span
              >
              <h4 id="discovery-candidate-spotlight-heading">{{ pairTitle(spotlightCandidate) }}</h4>
            </div>
            <button
              ref="spotlightView"
              type="button"
              class="spotlight-view"
              data-testid="discovery-spotlight-view"
              @click="emit('view-candidate', spotlightCandidate.id)"
            >
              {{ t('filter.show') }} <span class="sr-only">{{ pairTitle(spotlightCandidate) }}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div class="spotlight-strategy" data-testid="discovery-spotlight-strategy">
            <strong>{{ strategyName(spotlightCandidate.strategy.kind) }}</strong>
            <p>{{ strategySummary(spotlightCandidate.strategy) }}</p>
          </div>
          <div class="spotlight-periods">
            <div
              v-for="period in spotlightPeriods"
              :key="period.name"
              class="spotlight-period"
              :data-period="period.name"
            >
              <span class="spotlight-period-name">{{ t(`bots.discovery.${period.name}`) }}</span>
              <dl class="spotlight-metrics">
                <div>
                  <dt>{{ t('bots.discovery.return') }}</dt>
                  <dd :title="`${period.metrics.returnPercent}%`">{{ percentOrDash(period.metrics.returnPercent) }}</dd>
                </div>
                <div>
                  <dt>{{ t('bots.discovery.drawdown') }}</dt>
                  <dd :title="`${period.metrics.drawdownPercent}%`">
                    {{ percentOrDash(period.metrics.drawdownPercent) }}
                  </dd>
                </div>
                <div>
                  <dt>{{ t('bots.discovery.excess') }}</dt>
                  <dd :title="exactPercentTitle(period.metrics.excessReturnPercent)">
                    {{ percentOrDash(period.metrics.excessReturnPercent) }}
                  </dd>
                </div>
                <div>
                  <dt>{{ t('bots.discovery.trades') }}</dt>
                  <dd>{{ period.metrics.trades }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import {
  estimateDiscoveryScanMinutes,
  summarizeDiscoveryCoverage,
  type DiscoveryScanSample,
  type DiscoverySkipReason,
} from '../discovery-coverage';
import { formatExperimentPercent } from '../experiment-visuals';
import type { DiscoveryCandidate, DiscoveryMetrics, DiscoverySession } from '../discovery';
import type { StrategyConfig } from '../types';

const props = defineProps<{
  session: DiscoverySession | null;
  directedMarketCount?: number;
  preflightExploratory?: boolean;
  focusedCandidateId?: string | null;
  strategyName: (kind: StrategyConfig['kind']) => string;
  strategySummary: (strategy: StrategyConfig) => string;
}>();
const emit = defineEmits<{
  (event: 'focus-candidate', id: string): void;
  (event: 'view-candidate', id: string): void;
}>();
const { t } = useTranslation();

/** Research values remain exact in marker data; spotlight metrics use compact labels. */
function percentOrDash(value: string | null | undefined): string {
  return value === null || value === undefined ? '—' : `${formatExperimentPercent(value)}%`;
}

function exactPercentTitle(value: string | null | undefined): string | undefined {
  return value === null || value === undefined ? undefined : `${value}%`;
}
const RING_CIRCUMFERENCE = 2 * Math.PI * 67;
const PLOT = { left: 32, right: 324, top: 12, bottom: 157 } as const;
const VIEWBOX = { width: 340, height: 188 } as const;
const POINT_DIAMETER = 28;
const POINT_SPACING = 32;
const phaseSteps = [
  { label: 'bots.discovery.scanning' },
  { label: 'bots.discovery.requests' },
  { label: 'bots.discovery.stage.holdout' },
] as const;

interface MetricPoint {
  id: string;
  callNumber: number;
  pairKey: string;
  pairTitle: string;
  drawdown: number;
  drawdownText: string;
  returnPercent: number;
  returnText: string;
  excessReturnPercent: string | null;
  trades: number;
  x: number;
  y: number;
}

type PlotPeriod = 'training' | 'holdout';
interface DisplayPoint extends MetricPoint {
  period: PlotPeriod;
  trueX: number;
  trueY: number;
  displayX: number;
  displayY: number;
  displaced: boolean;
}

const plotWrap = ref<HTMLElement | null>(null);
const spotlightView = ref<HTMLButtonElement | null>(null);
const plotSize = ref({ width: VIEWBOX.width, height: VIEWBOX.height });
let plotObserver: ResizeObserver | null = null;
let keyboardFocusRequest: string | null = null;

/** Native Enter and Space clicks have detail zero; leave pointer focus on its selected chart marker. */
function focusPlotCandidate(id: string, event: MouseEvent): void {
  keyboardFocusRequest = event.detail === 0 ? id : null;
  emit('focus-candidate', id);
  if (keyboardFocusRequest === id && props.focusedCandidateId === id) {
    void nextTick(() => focusSpotlightIfRequested(id));
  }
}

function focusSpotlightIfRequested(id: string): void {
  if (keyboardFocusRequest !== id || props.focusedCandidateId !== id || !spotlightView.value) return;
  spotlightView.value.focus();
  keyboardFocusRequest = null;
}

watch(
  () => props.focusedCandidateId,
  async (id) => {
    if (!id) {
      keyboardFocusRequest = null;
      return;
    }
    await nextTick();
    focusSpotlightIfRequested(id);
  },
  { flush: 'post' }
);

/** Keep hit-target spacing and tethers measured in CSS pixels after responsive layout changes. */
function measurePlot(): void {
  const bounds = plotWrap.value?.getBoundingClientRect();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
  plotSize.value = { width: bounds.width, height: bounds.height };
}

watch(
  plotWrap,
  (element, previous) => {
    if (previous) plotObserver?.unobserve(previous);
    if (!element) return;
    void nextTick(measurePlot);
    if (typeof ResizeObserver !== 'undefined') {
      plotObserver ??= new ResizeObserver(measurePlot);
      plotObserver.observe(element);
    }
  },
  { flush: 'post' }
);
onMounted(() => {
  measurePlot();
  window.addEventListener('resize', measurePlot);
});
onBeforeUnmount(() => {
  plotObserver?.disconnect();
  window.removeEventListener('resize', measurePlot);
});

/** Count only frozen directed pairs; no sample or estimated markets enter the ring. */
const counts = computed(() => {
  const summary = summarizeDiscoveryCoverage(props.session?.pairs ?? []);
  return { ...summary, ready: summary.verified };
});
const scanning = computed(() => props.session?.status === 'scanning' || props.session?.status === 'researching');
const marketScanning = computed(() => props.session?.status === 'scanning' && props.session.phase === 'scanning');
const phaseIndex = computed(() =>
  Math.max(0, ['scanning', 'researching', 'finalizing', 'complete'].indexOf(props.session?.phase ?? 'scanning'))
);
const scanSamples = ref<DiscoveryScanSample[]>([]);
watch(
  () => [props.session?.id ?? null, counts.value.screened, marketScanning.value] as const,
  ([id, screened, active], previous) => {
    if (!id || !active) {
      scanSamples.value = [];
      return;
    }
    if (id !== previous?.[0] || !previous?.[2] || !scanSamples.value.length) {
      scanSamples.value = [{ screened, at: Date.now() }];
      return;
    }
    if (screened > scanSamples.value[scanSamples.value.length - 1].screened) {
      scanSamples.value = [...scanSamples.value, { screened, at: Date.now() }];
    }
  },
  { immediate: true }
);
const scanEstimateMinutes = computed(() => estimateDiscoveryScanMinutes(scanSamples.value, counts.value.pending));

function skipReasonLabel(reason: DiscoverySkipReason): string {
  if (reason === 'unknown') return t('bots.discovery.skipped');
  const key = {
    incompleteHistory: 'noHistory',
    denomination: 'denomination',
    routeUnavailable: 'routeUnavailable',
    amount: 'amountUnavailable',
    historyChanged: 'historyChanged',
  }[reason];
  return t(`bots.discovery.${key}`);
}
const ringOffset = computed(
  () => -RING_CIRCUMFERENCE * (counts.value.total ? counts.value.ready / counts.value.total : 0)
);

/** SVG stroke lengths represent the actual ready and skipped shares of the directed universe. */
function ringDash(count: number): string {
  const length = counts.value.total ? (RING_CIRCUMFERENCE * count) / counts.value.total : 0;
  return `${length} ${RING_CIRCUMFERENCE}`;
}

/** The timeline uses the session's frozen endpoints, not the current date. */
const windowSplit = computed(() => {
  const window = props.session?.window;
  if (!window) return null;
  const { startAt, trainingEndAt, holdoutStartAt, endAt } = window;
  if (![startAt, trainingEndAt, holdoutStartAt, endAt].every(Number.isSafeInteger)) return null;
  if (startAt >= trainingEndAt || trainingEndAt >= holdoutStartAt || holdoutStartAt > endAt) return null;
  const span = endAt - startAt;
  if (span <= 0) return null;
  const trainingPercent = ((trainingEndAt - startAt) / span) * 100;
  return { trainingPercent, holdoutPercent: 100 - trainingPercent };
});

/** Render UTC dates so the frozen hour cannot shift with the viewer's timezone. */
function formatDate(timestamp: number | undefined): string {
  if (timestamp === undefined || !Number.isSafeInteger(timestamp)) return '—';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  if (Math.abs(value) < 0.0001) return `${value < 0 ? '−' : ''}<0.0001`;
  if (Math.abs(value) >= 1_000_000_000) return value.toExponential(1);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: Math.abs(value) < 0.01 ? 4 : 2 }).format(value);
}

const windowStart = computed(() => formatDate(windowSplit.value ? props.session?.window.startAt : undefined));
const windowEnd = computed(() => formatDate(windowSplit.value ? props.session?.window.endAt : undefined));
const windowLabel = computed(() =>
  windowSplit.value
    ? `${t('bots.discovery.training')} ${formatPercent(windowSplit.value.trainingPercent)}%, ${t('bots.discovery.holdout')} ${formatPercent(windowSplit.value.holdoutPercent)}%`
    : t('noDataText')
);

/** Parse percentages only for screen coordinates; these numbers never enter token or trading math. */
function metricNumber(value: string): number | null {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function metricPair(metrics: DiscoveryMetrics): { drawdown: number; returnPercent: number } | null {
  const drawdown = metricNumber(metrics.drawdownPercent);
  const returnPercent = metricNumber(metrics.returnPercent);
  if (drawdown === null || drawdown < 0 || returnPercent === null) return null;
  return { drawdown, returnPercent };
}

const maxDrawdownNumber = computed(() => {
  const value = metricNumber(props.session?.maxDrawdownPercent ?? '');
  return value !== null && value >= 0 ? value : null;
});
const maxDrawdownLabel = computed(() => formatPercent(maxDrawdownNumber.value ?? 0));

const validTraining = computed(() =>
  (props.session?.candidates ?? []).flatMap((candidate) => {
    const metrics = metricPair(candidate.training);
    return metrics ? [{ candidate, source: candidate.training, ...metrics }] : [];
  })
);
const validHoldout = computed(() =>
  (props.session?.candidates ?? []).flatMap((candidate) => {
    if (candidate.holdoutState !== 'complete' || !candidate.holdout) return [];
    const metrics = metricPair(candidate.holdout);
    return metrics ? [{ candidate, source: candidate.holdout, ...metrics }] : [];
  })
);

/** Keep zero return visible and scale both period types against the same chart axes. */
const plotDomain = computed(() => {
  const all = [...validTraining.value, ...validHoldout.value];
  const xMax = Math.max(1, maxDrawdownNumber.value ?? 0, ...all.map((point) => point.drawdown));
  const minimum = Math.min(0, ...all.map((point) => point.returnPercent));
  const maximum = Math.max(0, ...all.map((point) => point.returnPercent));
  const yScale = Math.max(1, Math.abs(minimum), Math.abs(maximum));
  const scaledMinimum = minimum / yScale;
  const scaledMaximum = maximum / yScale;
  const padding = Math.max(0.1, scaledMaximum - scaledMinimum) * 0.08;
  return {
    xMax,
    yMin: minimum,
    yMax: maximum,
    yScale,
    scaledMinimum: scaledMinimum - padding,
    scaledMaximum: scaledMaximum + padding,
  };
});
const drawdownLimitX = computed(() =>
  maxDrawdownNumber.value === null
    ? null
    : PLOT.left + (maxDrawdownNumber.value / plotDomain.value.xMax) * (PLOT.right - PLOT.left) * 0.94
);

/** Keep SVG coordinates finite even when persisted percent strings have extreme magnitudes. */
function pointY(returnPercent: number): number {
  const domain = plotDomain.value;
  const ratio = (returnPercent / domain.yScale - domain.scaledMinimum) / (domain.scaledMaximum - domain.scaledMinimum);
  return PLOT.bottom - ratio * (PLOT.bottom - PLOT.top);
}

function pairTitle(candidate: DiscoveryCandidate): string {
  const pair = props.session?.pairs.find((item) => item.key === candidate.pairKey);
  if (!pair) return candidate.pairKey;
  const input = props.session?.assets.find((asset) => asset.address === pair.assetInAddress);
  const output = props.session?.assets.find((asset) => asset.address === pair.assetOutAddress);
  if (!input || !output) return candidate.pairKey;
  return `${input.symbol} → ${output.symbol} (${candidate.pairKey})`;
}

function position(
  candidate: DiscoveryCandidate,
  source: DiscoveryMetrics,
  drawdown: number,
  returnPercent: number
): MetricPoint {
  const domain = plotDomain.value;
  return {
    id: candidate.id,
    callNumber: candidate.callNumber,
    pairKey: candidate.pairKey,
    pairTitle: pairTitle(candidate),
    drawdown,
    drawdownText: source.drawdownPercent,
    returnPercent,
    returnText: source.returnPercent,
    excessReturnPercent: source.excessReturnPercent,
    trades: source.trades,
    x: PLOT.left + (drawdown / domain.xMax) * (PLOT.right - PLOT.left) * 0.94,
    y: pointY(returnPercent),
  };
}

const trainingPoints = computed(() =>
  validTraining.value.map(({ candidate, source, drawdown, returnPercent }) =>
    position(candidate, source, drawdown, returnPercent)
  )
);
const holdoutPoints = computed(() =>
  validHoldout.value.map(({ candidate, source, drawdown, returnPercent }) =>
    position(candidate, source, drawdown, returnPercent)
  )
);
const trainingById = computed(() => new Map(trainingPoints.value.map((point) => [point.id, point])));
const holdoutById = computed(() => new Map(holdoutPoints.value.map((point) => [point.id, point])));
/** Fan coincident period markers around their true data coordinate so neither button covers the other. */
const coincidentTrainingPoints = computed(() =>
  trainingPoints.value.filter((point) => {
    const holdout = holdoutById.value.get(point.id);
    return holdout && Math.abs(point.x - holdout.x) < 0.000001 && Math.abs(point.y - holdout.y) < 0.000001;
  })
);
const coincidentIds = computed(() => new Set(coincidentTrainingPoints.value.map((point) => point.id)));
/** Give dense result sets enough vertical room to keep all marker hit targets separate. */
const minimumPlotHeight = computed(() => {
  const count = trainingPoints.value.length + holdoutPoints.value.length;
  if (!count) return 0;
  const columns = Math.max(1, Math.floor((plotSize.value.width - POINT_DIAMETER) / POINT_SPACING) + 1);
  const rows = Math.ceil(count / columns);
  return POINT_DIAMETER + (rows - 1) * POINT_SPACING + POINT_SPACING * 2;
});
watch(minimumPlotHeight, async () => {
  await nextTick();
  measurePlot();
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/** Search stable CSS-pixel slots so neighboring 28px buttons never mask one another. */
function freePlotSlot(
  trueX: number,
  trueY: number,
  placed: DisplayPoint[],
  width: number,
  height: number
): { x: number; y: number } {
  const inset = POINT_DIAMETER / 2;
  const fits = (x: number, y: number) =>
    placed.every((point) => Math.hypot(point.displayX - x, point.displayY - y) >= POINT_SPACING);
  const bounded = (x: number, y: number) => ({
    x: clamp(x, inset, width - inset),
    y: clamp(y, inset, height - inset),
  });
  const origin = bounded(trueX, trueY);
  if (fits(origin.x, origin.y)) return origin;

  const slots: { x: number; y: number; distance: number }[] = [];
  for (let y = inset; y <= height - inset; y += POINT_SPACING) {
    for (let x = inset; x <= width - inset; x += POINT_SPACING) {
      slots.push({ x, y, distance: (x - trueX) ** 2 + (y - trueY) ** 2 });
    }
  }
  slots.sort((first, second) => first.distance - second.distance || first.y - second.y || first.x - second.x);
  for (const slot of slots) {
    if (fits(slot.x, slot.y)) return { x: slot.x, y: slot.y };
  }
  return origin;
}

/** Position each period marker once, preserving its unmodified SVG data coordinate. */
const displayPoints = computed(() => {
  const width = Math.max(POINT_DIAMETER, plotSize.value.width);
  const height = Math.max(POINT_DIAMETER, plotSize.value.height);
  const entries: { point: MetricPoint; period: PlotPeriod }[] = [
    ...trainingPoints.value.map((point) => ({ point, period: 'training' as const })),
    ...holdoutPoints.value.map((point) => ({ point, period: 'holdout' as const })),
  ];
  entries.sort(
    (first, second) =>
      first.point.callNumber - second.point.callNumber ||
      (first.point.id < second.point.id ? -1 : first.point.id > second.point.id ? 1 : 0) ||
      (first.period === second.period ? 0 : first.period === 'training' ? -1 : 1)
  );
  const placed: DisplayPoint[] = [];
  const byKey = new Map<string, DisplayPoint>();
  for (const { point, period } of entries) {
    const trueX = (point.x / VIEWBOX.width) * width;
    const trueY = (point.y / VIEWBOX.height) * height;
    const { x: displayX, y: displayY } = freePlotSlot(trueX, trueY, placed, width, height);
    const plotted: DisplayPoint = {
      ...point,
      period,
      trueX,
      trueY,
      displayX,
      displayY,
      displaced: Math.hypot(displayX - trueX, displayY - trueY) > 4,
    };
    placed.push(plotted);
    byKey.set(`${period}:${point.id}`, plotted);
  }
  return byKey;
});
const displayTrainingPoints = computed(() =>
  trainingPoints.value.flatMap((point) => {
    const display = displayPoints.value.get(`training:${point.id}`);
    return display ? [display] : [];
  })
);
const displayHoldoutPoints = computed(() =>
  holdoutPoints.value.flatMap((point) => {
    const display = displayPoints.value.get(`holdout:${point.id}`);
    return display ? [display] : [];
  })
);
const displacedPoints = computed(() =>
  [...displayTrainingPoints.value, ...displayHoldoutPoints.value].filter((point) => point.displaced)
);

/** Tethers make each moved hit target visibly traceable to its true plotted coordinate. */
function tetherStyle(point: DisplayPoint): Record<string, string> {
  const dx = point.displayX - point.trueX;
  const dy = point.displayY - point.trueY;
  return {
    left: `${point.trueX}px`,
    top: `${point.trueY}px`,
    width: `${Math.hypot(dx, dy)}px`,
    transform: `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`,
  };
}

const zeroY = computed(() => pointY(0));
/** Keep the inspector tied to a real plotted result and hide unreleased holdout evidence. */
const spotlightCandidate = computed(() => {
  const id = props.focusedCandidateId;
  if (!id || !trainingPoints.value.some((point) => point.id === id)) return null;
  return props.session?.candidates.find((candidate) => candidate.id === id) ?? null;
});
const spotlightPeriods = computed(() => {
  const candidate = spotlightCandidate.value;
  if (!candidate) return [];
  const periods: { name: 'training' | 'holdout'; metrics: DiscoveryMetrics }[] = [
    { name: 'training', metrics: candidate.training },
  ];
  if (candidate.holdoutState === 'complete' && candidate.holdout && metricPair(candidate.holdout)) {
    periods.push({ name: 'holdout', metrics: candidate.holdout });
  }
  return periods;
});
const plotLabel = computed(
  () =>
    `${t('bots.discovery.training')}: ${trainingPoints.value.length}. ${t('bots.discovery.holdout')}: ${holdoutPoints.value.length}.`
);

function pointLabel(point: MetricPoint, period: string): string {
  const excess =
    point.excessReturnPercent !== null && metricNumber(point.excessReturnPercent) !== null
      ? `${point.excessReturnPercent}%`
      : '—';
  return `#${point.callNumber} · ${point.pairTitle} · ${period} · ${t('bots.discovery.return')} ${point.returnText}% · ${t('bots.discovery.excess')} ${excess} · ${t('bots.discovery.drawdown')} ${point.drawdownText}% · ${t('bots.discovery.trades')} ${point.trades}`;
}

/** Chart markers reveal the matching candidate without selecting it for a live campaign. */
function pointActionLabel(point: MetricPoint, period: string): string {
  return `${t('filter.show')} ${pointLabel(point, period)}`;
}
</script>

<style scoped lang="scss">
.discovery-visuals {
  --visual-surface: var(--discovery-surface, var(--s-color-utility-surface));
  --visual-recess: var(--discovery-recess, var(--s-color-base-background));
  --visual-line: var(--discovery-line, var(--s-color-base-border-secondary));
  --visual-text: var(--discovery-text, var(--s-color-base-content-primary));
  --visual-muted: var(--discovery-muted, var(--s-color-base-content-secondary));
  --visual-accent: var(--discovery-accent, var(--s-color-action-text));
  color: var(--visual-text);
  min-width: 0;
  padding: 20px 24px 18px;
  border-radius: 19px;
  background: var(--visual-surface);
  box-shadow: var(--discovery-raised, 0 8px 28px rgba(0, 0, 0, 0.08));
  overflow: hidden;
  font-variant-numeric: tabular-nums;
}
.discovery-visuals * {
  box-sizing: border-box;
}
.visuals-preview {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'} auto;
  align-items: center;
  gap: 19px 28px;
  min-height: 147px;
}
.preview-markets {
  display: flex;
  align-items: baseline;
  gap: 9px;
  color: var(--visual-muted);
  white-space: nowrap;
  strong {
    color: var(--visual-accent);
    font-size: clamp(30px, 3vw, 45px);
    font-weight: 680;
    line-height: 1;
    letter-spacing: -0.05em;
  }
  span {
    font-size: 11px;
    font-weight: 650;
  }
}
.preview-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  strong {
    color: var(--visual-text);
    font-size: 15px;
    font-weight: 680;
    line-height: 1.35;
  }
}
.preview-steps {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  color: var(--visual-muted);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  span[role='listitem'] {
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .preview-arrow {
    color: var(--visual-accent);
    font-size: 14px;
  }
}
.preview-window {
  grid-column: 1 / -1;
  display: flex;
  height: 7px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--visual-recess);
  box-shadow: var(--discovery-inset, inset 1px 1px 4px rgba(0, 0, 0, 0.1));
  span {
    display: block;
    height: 100%;
  }
  .preview-window-training {
    width: 84.4444%;
    background: var(--visual-accent);
    opacity: 0.75;
  }
  .preview-window-holdout {
    flex: 1;
    background: color-mix(in srgb, var(--visual-accent) 35%, var(--visual-surface));
  }
}
.visuals-intro,
.scatter-heading,
.window-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.window-heading-short {
  display: none;
}
.visuals-eyebrow {
  color: var(--visual-muted);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.visuals-live {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  height: 10px;
  i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--visual-accent);
    opacity: 0.3;
  }
}
.is-scanning .visuals-live i {
  animation: visual-blink 1.4s ease-in-out infinite;
  &:nth-child(2) {
    animation-delay: 160ms;
  }
  &:nth-child(3) {
    animation-delay: 320ms;
  }
}
.research-phases {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  gap: 12px;
  margin-top: 16px;
}
.research-phase {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-top: 10px;
  border-top: 3px solid var(--visual-line);
  color: var(--visual-muted);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.3;
  transition:
    border-color 250ms ease,
    color 250ms ease;
  > span:nth-child(2) {
    min-width: 0;
  }
  strong {
    flex: none;
    margin-inline-start: auto;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }
  &.is-current {
    border-color: var(--visual-accent);
    color: var(--visual-text);
  }
  &.is-complete {
    border-color: color-mix(in srgb, var(--visual-accent) 52%, var(--visual-line));
  }
}
.research-phase-index {
  display: grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--visual-recess);
  box-shadow: var(--discovery-inset, inset 1px 1px 4px rgba(0, 0, 0, 0.1));
  color: var(--visual-muted);
  font-size: 10px;
}
.research-phase.is-current .research-phase-index {
  color: var(--visual-accent);
}
.visuals-overview {
  display: grid;
  grid-template-columns: 194px 1fr;
  gap: 26px;
  align-items: center;
  margin: 8px 0 19px;
}
.coverage {
  min-width: 0;
}
.coverage-orbit {
  position: relative;
  width: 176px;
  height: 176px;
  margin: 0 auto;
  svg {
    display: block;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  circle {
    fill: none;
    transform-origin: center;
  }
}
.coverage-halo {
  stroke: var(--visual-line);
  stroke-width: 1;
  stroke-dasharray: 2 7;
  opacity: 0.8;
}
.is-scanning .coverage-halo {
  animation: visual-orbit 24s linear infinite;
}
.coverage-track {
  stroke: var(--visual-recess);
  stroke-width: 12;
}
.coverage-ready,
.coverage-skipped {
  stroke-width: 12;
  stroke-linecap: round;
  transition:
    stroke-dasharray 700ms ease,
    stroke-dashoffset 700ms ease;
}
.coverage-ready {
  stroke: var(--visual-accent);
}
.coverage-skipped {
  stroke: var(--visual-muted);
  opacity: 0.65;
}
.coverage-value {
  position: absolute;
  inset: 31px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  strong {
    font-size: 32px;
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 680;
  }
  small {
    display: block;
    max-width: 106px;
    margin-top: 5px;
    color: var(--visual-muted);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 1.25;
  }
  span {
    max-width: 92px;
    margin-top: 5px;
    color: var(--visual-muted);
    font-size: 11px;
    line-height: 1.3;
  }
}
.coverage-value .coverage-scanning {
  max-width: 100px;
  margin: 0;
  color: var(--visual-text);
  font-size: 12px;
  font-weight: 700;
}
.coverage-key {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px 10px;
  color: var(--visual-muted);
  font-size: 11px;
  line-height: 1.3;
  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  strong {
    color: var(--visual-text);
    font-weight: 650;
  }
  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--visual-accent);
  }
  i.skipped {
    background: var(--visual-muted);
  }
  i.screened {
    background: color-mix(in srgb, var(--visual-accent) 55%, var(--visual-muted));
  }
  i.pending {
    background: var(--visual-line);
  }
}
.scan-estimate {
  margin: 9px 0 0;
  color: var(--visual-muted);
  font-size: 11px;
  line-height: 1.35;
  text-align: center;
}
.skip-groups {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 12px 0 14px;
  border-top: 1px solid var(--visual-line);
  > strong {
    flex: none;
    color: var(--visual-text);
    font-size: 11px;
    font-weight: 700;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 14px;
    min-width: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    min-width: 0;
    color: var(--visual-muted);
    font-size: 11px;
    line-height: 1.4;
  }
  li strong {
    color: var(--visual-text);
    font-weight: 750;
  }
}
.window {
  min-width: 0;
  padding: 6px 0 6px 24px;
  border-inline-start: 1px solid var(--visual-line);
}
.window-heading {
  align-items: flex-start;
  flex-direction: column;
  gap: 7px;
  strong {
    font-size: 13px;
    font-weight: 650;
    letter-spacing: 0.01em;
  }
  strong span {
    color: var(--visual-accent);
    margin: 0 3px;
  }
}
.window-track {
  position: relative;
  display: flex;
  width: 100%;
  height: 30px;
  margin: 24px 0 14px;
  padding: 6px;
  border-radius: 99px;
  background: var(--visual-recess);
  box-shadow: var(--discovery-inset, inset 2px 2px 6px rgba(0, 0, 0, 0.1));
  overflow: hidden;
  > span {
    display: block;
    height: 100%;
    transition: width 700ms ease;
  }
  .window-training {
    border-radius: 99px 0 0 99px;
    background: var(--visual-accent);
    opacity: 0.83;
  }
  .window-holdout {
    border-radius: 0 99px 99px 0;
    background: var(--visual-muted);
    opacity: 0.42;
  }
  .window-boundary {
    position: absolute;
    top: 2px;
    bottom: 2px;
    width: 2px;
    background: var(--visual-surface);
    box-shadow: 0 0 0 1px var(--visual-accent);
  }
}
.is-scanning .window-training {
  background-image: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.28) 50%, transparent 65%);
  background-size: 190% 100%;
  animation: visual-sweep 3s ease-in-out infinite;
}
.window-legend {
  display: grid;
  gap: 9px;
  > div {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--visual-muted);
    font-size: 11px;
  }
  strong {
    margin-inline-start: auto;
    color: var(--visual-text);
    font-size: 12px;
  }
}
.window-mark {
  width: 14px;
  height: 5px;
  border-radius: 99px;
  background: var(--visual-accent);
}
.window-mark.holdout {
  background: var(--visual-muted);
  opacity: 0.6;
}
.scatter {
  border-top: 1px solid var(--visual-line);
  padding-top: 17px;
}
.scatter-heading {
  align-items: flex-end;
}
.scatter-heading h3 {
  margin: 4px 0 0;
  color: var(--visual-text);
  font-size: 18px;
  line-height: 1.2;
  letter-spacing: -0.025em;
  span {
    color: var(--visual-accent);
  }
}
.scatter-key {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--visual-muted);
  font-size: 11px;
  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  i.training {
    background: var(--visual-accent);
  }
  i.holdout {
    border: 2px solid var(--visual-accent);
  }
  i.limit {
    width: 10px;
    height: 0;
    border-top: 2px dashed var(--visual-muted);
    border-radius: 0;
  }
}
.scatter-waiting {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 78px;
  margin-top: 15px;
  padding: 16px 19px;
  border-radius: 11px;
  background: var(--visual-recess);
  box-shadow: var(--discovery-inset, inset 2px 2px 6px rgba(0, 0, 0, 0.1));
  > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }
  strong {
    color: var(--visual-text);
    font-size: 13px;
    font-weight: 700;
  }
  div > span {
    color: var(--visual-muted);
    font-size: 11px;
    line-height: 1.35;
  }
}
.waiting-signal {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--visual-accent);
    opacity: 0.35;
  }
}
.is-scanning .waiting-signal i {
  animation: visual-blink 1.4s ease-in-out infinite;
  &:nth-child(2) {
    animation-delay: 160ms;
  }
  &:nth-child(3) {
    animation-delay: 320ms;
  }
}
.plot-wrap {
  position: relative;
  margin-top: 15px;
  border-radius: 11px;
  background: var(--visual-recess);
  box-shadow: var(--discovery-inset, inset 2px 2px 6px rgba(0, 0, 0, 0.1));
  overflow: hidden;
}
.scatter-plot {
  display: block;
  width: 100%;
  height: 185px;
}
.plot-grid-line {
  fill: none;
  stroke: var(--visual-line);
  stroke-width: 0.7;
  opacity: 0.55;
}
.plot-axis {
  stroke: var(--visual-muted);
  stroke-width: 0.8;
  opacity: 0.65;
}
.plot-zero {
  stroke: var(--visual-accent);
  stroke-width: 0.8;
  stroke-dasharray: 3 6;
  opacity: 0.48;
}
.plot-risk-limit {
  stroke: var(--visual-muted);
  stroke-width: 1.4;
  stroke-dasharray: 4 4;
  opacity: 0.8;
}
.plot-risk-label {
  fill: var(--visual-muted);
  font-size: 10px;
  font-weight: 700;
}
.plot-connector {
  stroke: var(--visual-accent);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.55;
  transition:
    opacity 180ms ease,
    stroke-width 180ms ease;
}
.has-focused-candidate .plot-connector:not(.is-focused) {
  opacity: 0.17;
}
.plot-connector.is-focused {
  stroke-width: 2;
  opacity: 0.9;
}
.plot-point-tether {
  position: absolute;
  z-index: 0;
  height: 1px;
  border-radius: 2px;
  background: var(--visual-accent);
  opacity: 0.65;
  transform-origin: left center;
  pointer-events: none;
  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 5px;
    height: 5px;
    border: 1px solid var(--visual-accent);
    border-radius: 50%;
    background: var(--visual-recess);
    content: '';
    transform: translate(-50%, -50%);
  }
}
.plot-point-tether.is-focused {
  opacity: 1;
}
.plot-point {
  position: absolute;
  z-index: 1;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: opacity 180ms ease;
  &::after {
    content: '';
    position: absolute;
    inset: 7px;
    border-radius: 50%;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }
  &:hover::after,
  &:focus-visible::after {
    transform: scale(1.32);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--visual-accent) 16%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--visual-accent);
    outline-offset: 3px;
  }
}
.has-focused-candidate .plot-point:not(.is-focused) {
  opacity: 0.52;
}
.plot-point.is-focused {
  z-index: 2;
  &::after {
    transform: scale(1.32);
    box-shadow:
      0 0 0 5px color-mix(in srgb, var(--visual-accent) 20%, transparent),
      0 0 0 9px color-mix(in srgb, var(--visual-accent) 8%, transparent);
  }
}
.plot-point.training::after {
  border: 2px solid var(--visual-surface);
  background: var(--visual-accent);
}
.plot-point.holdout::after {
  border: 2px solid var(--visual-accent);
  background: var(--visual-recess);
}
.plot-point.training {
  animation: visual-point-in 360ms ease-out backwards;
  animation-delay: var(--point-delay);
}
.plot-bound {
  position: absolute;
  z-index: 0;
  color: var(--visual-muted);
  font-size: 10px;
  font-weight: 600;
  transform: translateY(-50%);
  pointer-events: none;
}
.plot-bound.top {
  top: 11.7%;
  left: 9.7%;
}
.plot-bound.bottom {
  top: 93.6%;
  left: 9.7%;
}
.plot-bound.end {
  top: 93.6%;
  right: 4.7%;
  text-align: end;
}
.scatter-axis {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 7px;
  color: var(--visual-muted);
  font-size: 11px;
}
.scatter-source-note {
  margin: 9px 0 0;
  color: var(--visual-muted);
  font-size: 10px;
  line-height: 1.45;
}
.candidate-spotlight {
  min-width: 0;
  margin-top: 17px;
  padding: 15px 17px;
  border-radius: 12px;
  background: var(--visual-recess);
  box-shadow: var(--discovery-inset, inset 2px 2px 6px rgba(0, 0, 0, 0.1));
}
.spotlight-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
  h4 {
    margin: 4px 0 0;
    color: var(--visual-text);
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
}
.spotlight-view {
  flex: none;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--visual-line);
  border-radius: 9px;
  color: var(--visual-accent);
  background: var(--visual-surface);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  span[aria-hidden='true'] {
    margin-inline-start: 5px;
  }
  &:hover {
    border-color: var(--visual-accent);
  }
  &:focus-visible {
    outline: 2px solid var(--visual-accent);
    outline-offset: 3px;
  }
}
.spotlight-strategy {
  min-width: 0;
  margin: -2px 0 14px;
  strong {
    display: block;
    color: var(--visual-accent);
    font-size: 12px;
    font-weight: 750;
  }
  p {
    margin: 4px 0 0;
    color: var(--visual-muted);
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
}
.spotlight-periods {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax' }(0, 1fr));
  gap: 13px;
}
.spotlight-period {
  min-width: 0;
  &:only-child {
    grid-column: 1 / -1;
  }
  & + .spotlight-period {
    padding-inline-start: 13px;
    border-inline-start: 1px solid var(--visual-line);
  }
}
.spotlight-period-name {
  display: block;
  margin-bottom: 9px;
  color: var(--visual-accent);
  font-size: 11px;
  font-weight: 750;
}
.spotlight-metrics {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax' }(0, 1fr));
  gap: 9px 12px;
  margin: 0;
  > div {
    min-width: 0;
  }
  dt {
    color: var(--visual-muted);
    font-size: 10px;
  }
  dd {
    margin: 3px 0 0;
    color: var(--visual-text);
    font-size: 13px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
}
@keyframes visual-blink {
  50% {
    opacity: 1;
    transform: scale(1.4);
  }
}
@keyframes visual-orbit {
  to {
    transform: rotate(360deg);
  }
}
@keyframes visual-sweep {
  to {
    background-position: -190% 0;
  }
}
@keyframes visual-point-in {
  from {
    opacity: 0;
    transform: translate(-50%, -30%) scale(0.6);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
@media (max-width: 680px) {
  .discovery-visuals {
    padding: 18px 16px;
  }
  .visuals-preview {
    grid-template-columns: #{'minmax(0, 1fr)'} auto;
    gap: 12px;
    min-height: 0;
  }
  .preview-markets {
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .preview-steps {
    padding-top: 11px;
    border-top: 1px solid var(--visual-line);
  }
  .visuals-overview {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .research-phases {
    gap: 7px;
  }
  .research-phase {
    flex-wrap: wrap;
    gap: 5px;
    font-size: 10px;
    strong {
      flex-basis: 100%;
      margin-inline-start: 25px;
    }
  }
  .skip-groups {
    flex-direction: column;
    gap: 7px;
  }
  .coverage-orbit {
    width: 158px;
    height: 158px;
  }
  .coverage-key {
    margin-top: 4px;
  }
  .window {
    padding: 17px 0 0;
    border-inline-start: 0;
    border-top: 1px solid var(--visual-line);
  }
  .window-heading-long {
    display: none;
  }
  .window-heading-short {
    display: inline;
  }
  .window-track {
    margin-top: 14px;
  }
  .scatter-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
  }
  .scatter-plot {
    height: 210px;
  }
  .spotlight-periods {
    grid-template-columns: 1fr;
  }
  .spotlight-period + .spotlight-period {
    padding: 12px 0 0;
    border-inline-start: 0;
    border-top: 1px solid var(--visual-line);
  }
}
@media (prefers-reduced-motion: reduce) {
  .discovery-visuals *,
  .discovery-visuals *::before,
  .discovery-visuals *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
