<template>
  <section
    class="trade-distribution"
    :class="{ 'is-compact': compact }"
    data-testid="trade-distribution"
    :data-renderer="rendererBackend"
    :data-calculation-checkpoint="live ? calculation?.checkpoint : undefined"
    :data-calculation-progress="live ? calculationProgress.toFixed(3) : undefined"
    :data-candidate-count="insights.count"
    :data-histogram-maximum="countMaximum"
    :data-flow-mode="flowMode"
    :data-landed-count="landedCount"
    :data-incoming-count="Math.max(0, insights.count - landedCount)"
  >
    <header v-if="!compact" class="distribution-heading">
      <h3>{{ t('bots.insights.title') }}</h3>
      <span class="distribution-count" data-testid="distribution-count">{{
        t('bots.research.candidateCount', { count: displayTrades.length })
      }}</span>
    </header>
    <dl class="decision-summary" data-testid="distribution-evidence">
      <div v-for="kind in decisionKinds" :key="kind" :data-testid="`decision-count-${kind}`">
        <dt>{{ t(`bots.decisionReview.counts.${kind}`) }}</dt>
        <dd>{{ decisionCounts[kind] }}</dd>
      </div>
    </dl>
    <div class="distribution-legend" role="group" :aria-label="t('bots.research.distributionVisibility')">
      <button
        v-for="option in visibilityOptions"
        :key="option"
        :aria-pressed="visibility === option"
        :aria-describedby="viewExplanationId"
        :disabled="calculating"
        :data-testid="`distribution-view-${option}`"
        @click="visibility = option"
      >
        <span class="distribution-filter-title"
          >{{ t(`bots.uxResults.view.${option}`) }}<strong>{{ insights[option].count }}</strong></span
        >
        <span class="distribution-filter-hint">{{ t(`bots.uxResults.viewHint.${option}`) }}</span>
      </button>
      <span class="outcome-legend"
        ><i class="positive" aria-hidden="true"></i>{{ t('bots.decisionReview.beatHolding')
        }}<i class="negative" aria-hidden="true"></i>{{ t('bots.decisionReview.belowHolding') }}</span
      >
    </div>
    <p :id="viewExplanationId" class="distribution-view-explanation" data-testid="distribution-view-explanation">
      {{
        t(`bots.uxResults.viewMeaning.${visibility}`, {
          total: insights.count,
          selected: insights.selected.count,
          excluded: insights.excluded.count,
        })
      }}
    </p>
    <p class="distribution-filter-note" data-testid="distribution-filter-note" v-if="calculating">
      {{ t('bots.decisionReview.liveAllChecks') }}
    </p>
    <div class="distribution-flow" data-testid="distribution-flow">
      <div>
        <strong>{{ t('bots.tradeFlow.title') }}</strong
        ><span>{{ flowStatus }}</span>
      </div>
      <div class="flow-actions">
        <button
          data-testid="distribution-follow"
          :disabled="!visibleTrades.length || calculating || paused"
          @click="followDecision"
        >
          {{ t('bots.decisionReview.follow') }}
        </button>
        <button
          data-testid="distribution-replay"
          :disabled="!insights.count || reducedMotion || paused || calculating"
          @click="toggleReplay"
        >
          <span aria-hidden="true">{{ flowMode === 'replay' ? '↘' : '↻' }}</span
          >{{ t(flowMode === 'replay' ? 'bots.tradeFlow.finish' : 'bots.tradeFlow.replay') }}
        </button>
      </div>
    </div>
    <div v-if="flowMode === 'replay'" class="replay-controls" data-testid="distribution-playback">
      <button data-testid="distribution-pause" :aria-pressed="playbackPaused" @click="togglePlaybackPause">
        {{ t(playbackPaused ? 'bots.decisionReview.resume' : 'bots.decisionReview.pause') }}
      </button>
      <label
        >{{ t('bots.decisionReview.speed')
        }}<select v-model.number="playbackSpeed" data-testid="distribution-speed">
          <option v-for="speed in [0.25, 0.5, 1, 2]" :key="speed" :value="speed">{{ speed }}×</option>
        </select></label
      >
      <input
        type="range"
        min="0"
        max="1000"
        :value="Math.round(calculationProgress * 1000)"
        :aria-label="t('bots.decisionReview.seek')"
        data-testid="distribution-seek"
        @input="seekReplay"
      />
    </div>
    <ul
      v-if="flowVisible"
      class="flow-live-counts"
      data-testid="flow-live-counts"
      :aria-label="t('bots.tradeFlow.filteringStep')"
    >
      <li v-for="gate in flowProgress.gates" :key="gate.key" :data-testid="`flow-live-count-${gate.key}`">
        <span>{{ checkLabels?.[gate.key] ?? t(`bots.research.checks.${gate.key}`) }}</span>
        <strong
          >{{ t('bots.tradeFlow.skippedHere', { count: gate.skippedHere }) }} ·
          {{ t('bots.tradeFlow.continued', { count: gate.continued }) }}</strong
        >
      </li>
    </ul>
    <p v-if="flowVisible" class="flow-mobile-progress">
      {{ t('bots.tradeFlow.landing', { landed: flowProgress.landed, total: flowProgress.total }) }}
    </p>
    <div
      v-if="visibility === 'selected' && !statistics.count && !calculating"
      class="no-taken-trades"
      data-testid="distribution-no-trades"
    >
      <strong>{{ t('bots.decisionReview.noTrades') }}</strong>
      <p>{{ t('bots.decisionReview.noTradesMeaning') }}</p>
      <button v-if="decisionCounts.checked" @click="visibility = 'excluded'">
        {{ t('bots.decisionReview.inspectSkipped') }}
      </button>
    </div>
    <div
      v-show="statistics.count || calculating"
      class="distribution-viewport"
      :class="{ 'is-settled': !flowVisible }"
      data-testid="distribution-viewport"
    >
      <div class="distribution-stage" :class="{ 'is-empty': !insights.count, 'is-complete': !calculating }">
        <canvas
          ref="canvas"
          :width="DISTRIBUTION_WIDTH"
          :height="DISTRIBUTION_HEIGHT"
          :aria-label="description"
          :aria-describedby="instructionsId"
          role="img"
          tabindex="0"
          data-testid="distribution-canvas"
          @pointermove="hoverTrade"
          @pointerleave="clearHover"
          @click="selectAtPointer"
          @keydown="navigateTrade"
        ></canvas>
        <canvas
          ref="particleCanvas"
          v-show="rendererBackend !== 'canvas2d'"
          class="distribution-particles"
          aria-hidden="true"
          data-testid="distribution-particles"
        ></canvas>
        <span class="flow-inlet-label">{{ t('bots.tradeFlow.incoming') }}</span>
        <span class="flow-step-label">{{ t('bots.tradeFlow.filteringStep') }}</span>
        <span class="flow-landing-count" data-testid="distribution-landing-count">{{
          t('bots.tradeFlow.landing', { landed: flowProgress.landed, total: flowProgress.total })
        }}</span>
        <div class="flow-gate-labels" :aria-label="t('bots.tradeFlow.gateNote')">
          <div
            v-for="gate in flowLayout.gates"
            :key="gate.key"
            class="flow-gate-label"
            :style="{ top: `${(gate.y / DISTRIBUTION_HEIGHT) * 100}%` }"
          >
            <span :title="checkLabels?.[gate.key] ?? t(`bots.research.checks.${gate.key}`)">{{
              checkLabels?.[gate.key] ?? t(`bots.research.checks.${gate.key}`)
            }}</span>
            <small :data-testid="`flow-check-count-${gate.key}`"
              >{{
                t('bots.tradeFlow.skippedHere', {
                  count: flowProgress.gates.find((entry) => entry.key === gate.key)?.skippedHere ?? 0,
                })
              }}
              ·
              {{
                t('bots.tradeFlow.continued', {
                  count: flowProgress.gates.find((entry) => entry.key === gate.key)?.continued ?? 0,
                })
              }}</small
            >
          </div>
        </div>
        <span class="flow-path-label flow-path-taken">{{ t('bots.tradeFlow.takenPath') }}</span>
        <span class="flow-path-label flow-path-skipped">{{ t('bots.tradeFlow.skippedPath') }}</span>
        <span class="flow-outcome-title">{{ t('bots.tradeFlow.outcomeStep') }}</span>
        <span class="distribution-axis-name">{{ t(`bots.uxResults.view.${visibility}`) }}</span>
        <div class="distribution-count-axis" aria-hidden="true">
          <span
            v-for="tick in countTicks"
            :key="tick"
            :style="{ top: `${((PLOT_TOP + PLOT_HEIGHT * (1 - tick / countMaximum)) / DISTRIBUTION_HEIGHT) * 100}%` }"
            >{{ tick }}</span
          >
        </div>
        <div class="distribution-axis" aria-hidden="true">
          <span
            v-if="insights.extent && insights.extent !== '0'"
            class="is-negative"
            :title="`−${insights.extent} ${symbol}`"
            >−{{ extentLabel }} {{ symbol }}</span
          >
          <span class="distribution-zero">0 · {{ t('bots.decisionReview.sameAsHolding') }}</span>
          <span
            v-if="insights.extent && insights.extent !== '0'"
            class="is-positive"
            :title="`+${insights.extent} ${symbol}`"
            >+{{ extentLabel }} {{ symbol }}</span
          >
        </div>
        <p v-if="!insights.count" class="distribution-empty">{{ t('bots.research.distributionEmpty') }}</p>
      </div>
    </div>
    <p class="distribution-outcome-axis">{{ t('bots.tradeFlow.outcomeAxis', { symbol }) }}</p>
    <p class="distribution-scale-note">{{ t('bots.decisionReview.scaleNote') }}</p>
    <p class="distribution-valuation" data-testid="distribution-valuation">{{ valuationDescription }}</p>
    <p class="flow-caption" v-if="visibility !== 'selected' || flowVisible">{{ t('bots.tradeFlow.caption') }}</p>
    <div
      v-if="decisionSummary.skippedCount && (visibility !== 'selected' || !statistics.count)"
      class="flow-skip-reasons"
      data-testid="flow-skip-reasons"
    >
      <strong>{{ t('bots.tradeFlow.skipReasons') }}</strong>
      <ul>
        <li v-for="gate in skipReasons" :key="gate.key" :data-testid="`flow-skip-reason-${gate.key}`">
          <span>{{ checkLabels?.[gate.key] ?? t(`bots.research.checks.${gate.key}`) }}</span>
          <strong>{{ gate.skippedHere }}</strong>
        </li>
        <li v-if="decisionSummary.unexplainedSkippedCount" data-testid="flow-skip-reason-unknown">
          <span>{{ t('bots.tradeFlow.unknownReason') }}</span
          ><strong>{{ decisionSummary.unexplainedSkippedCount }}</strong>
        </li>
      </ul>
      <p>{{ t('bots.tradeFlow.reasonNote') }}</p>
      <button
        v-if="hasLimitSkips"
        class="review-limits"
        data-testid="distribution-review-limits"
        @click="emit('reviewLimits')"
      >
        {{ t('bots.decisionReview.reviewLimits') }}
      </button>
    </div>
    <div class="distribution-bin-readout" data-testid="distribution-bin-readout">
      <template v-if="activeBin"
        ><strong
          :title="`${binRange(activeBin)} ${symbol}`"
          :class="{ 'is-positive': activeBin.sign === 'profit', 'is-negative': activeBin.sign === 'loss' }"
          >{{ binRange(activeBin, false) }} {{ symbol }}</strong
        ><span>{{
          t('bots.decisionReview.binCount', {
            count: decisionsInBin(activeBin, visibility),
            group: t(`bots.uxResults.view.${visibility}`),
          })
        }}</span></template
      >
      <span v-else>{{ t('bots.insights.binHint') }}</span>
    </div>
    <p v-if="insights.count" class="distribution-statistics-label">{{ t(`bots.uxResults.view.${visibility}`) }}</p>
    <div
      v-if="insights.count"
      class="distribution-statistics"
      data-testid="distribution-statistics"
      :aria-label="t(`bots.uxResults.view.${visibility}`)"
    >
      <div>
        <span>{{ t('bots.insights.median') }}</span
        ><strong :title="statistics.median ?? ''" :class="pnlClass(statistics.median)"
          >{{ formatPnl(statistics.median) }} <small>{{ symbol }}</small></strong
        >
      </div>
      <div>
        <span>{{ t('bots.insights.middle50') }}</span
        ><strong :title="`${statistics.q1 ?? '—'} → ${statistics.q3 ?? '—'}`"
          ><span :class="pnlClass(statistics.q1)">{{ formatPnl(statistics.q1) }}</span> →
          <span :class="pnlClass(statistics.q3)">{{ formatPnl(statistics.q3) }}</span>
          <small>{{ symbol }}</small></strong
        >
      </div>
      <div>
        <span>{{ t('bots.insights.observedPositive') }}</span
        ><strong
          >{{ statistics.winRatePercent === null ? '—' : `${statistics.winRatePercent}%` }}
          <small>{{ statistics.profitCount }}/{{ statistics.count }}</small></strong
        >
      </div>
    </div>
    <p v-if="compact" class="distribution-explanation">{{ t('bots.validationMotion.historical') }}</p>
    <section class="distribution-method" data-testid="distribution-method">
      <h4>{{ t('assets.details') }}</h4>
      <p class="distribution-explanation" data-testid="distribution-explanation">
        {{
          visibility === 'all'
            ? t('bots.insights.histogramMeaning')
            : t('bots.insights.filteredMeaning', { view: t(`bots.uxResults.view.${visibility}`) })
        }}
      </p>
      <p v-if="insights.count" class="distribution-explanation">{{ t('bots.insights.spreadMeaning') }}</p>
      <p class="distribution-explanation">{{ t('bots.insights.commonEndpoint') }}</p>
      <p class="distribution-explanation">{{ t('bots.tradeFlow.outcomeNote') }}</p>
    </section>
    <p v-if="insights.omittedCount" class="distribution-explanation" data-testid="distribution-omitted">
      {{ t('bots.insights.omitted', { count: insights.omittedCount }) }}
    </p>
    <section class="rule-totals">
      <h4>{{ t('bots.decisionReview.ruleTotals', { group: t(`bots.uxResults.view.${visibility}`) }) }}</h4>
      <p class="flow-gate-note">{{ t('bots.tradeFlow.gateNote') }}</p>
      <div class="distribution-gates">
        <div
          v-for="gate in gates"
          :key="gate.key"
          class="constraint-gate"
          :data-testid="`distribution-gate-${gate.key}`"
        >
          <span class="constraint-name">{{ checkLabels?.[gate.key] ?? t(`bots.research.checks.${gate.key}`) }}</span>
          <span class="constraint-count">{{
            t('bots.research.gateCount', { count: gate.count, total: visibleTrades.length })
          }}</span>
        </div>
      </div>
    </section>
    <div v-if="!compact || focusedTrade" class="distribution-inspect">
      <button
        data-testid="distribution-previous"
        :disabled="!visibleTrades.length"
        :aria-label="t('bots.research.previousTrade')"
        @click="stepTrade(-1)"
      >
        ←
      </button>
      <span v-if="focusedTrade" class="inspected-trade" data-testid="distribution-focused"
        ><span>{{
          t('bots.uxResults.candidatePosition', { index: focusedIndex + 1, total: visibleTrades.length })
        }}</span
        ><strong :class="pnlClass(focusedTrade.pnl)">{{ formatPnl(focusedTrade.pnl) }} {{ symbol }}</strong
        ><span>{{
          t(focusedTrade.selected ? 'bots.uxResults.view.selected' : 'bots.uxResults.view.excluded')
        }}</span></span
      >
      <span v-else class="inspect-hint">{{ t('bots.research.inspectTrade') }}</span>
      <button
        data-testid="distribution-next"
        :disabled="!visibleTrades.length"
        :aria-label="t('bots.research.nextTrade')"
        @click="stepTrade(1)"
      >
        →
      </button>
    </div>
    <section
      v-if="focusedTrade"
      class="decision-inspector"
      data-testid="distribution-decision-inspector"
      :aria-label="t('bots.decisionReview.follow')"
    >
      <header>
        <strong>{{ t(`bots.decisionReview.status.${decisionKind(focusedTrade)}`) }}</strong
        ><time>{{ formatDecisionTime(focusedTrade.signalTimestamp ?? focusedTrade.timestamp) }}</time>
      </header>
      <p v-if="focusedTrade.action">{{ t(`bots.decisionReview.action.${focusedTrade.action}`) }}</p>
      <p v-if="focusedTrade.reason" class="decision-reason" data-testid="decision-recorded-reason">
        {{ focusedTrade.reason.startsWith('bots.events.') ? t(focusedTrade.reason) : focusedTrade.reason }}
      </p>
      <p v-if="focusedPrice && outputSymbol" data-testid="decision-recorded-price">
        {{ t('bots.decisionReview.executionPrice', { price: focusedPrice, input: symbol, output: outputSymbol }) }}
      </p>
      <ol>
        <li
          v-for="check in focusedTrade.checks"
          :key="check.key"
          :class="{ 'is-current': followedId && followedGate === check.key }"
          :data-testid="`decision-check-${check.key}`"
        >
          <span class="decision-check-name"
            ><b aria-hidden="true">{{ check.passed ? '✓' : '×' }}</b
            >{{ checkLabels?.[check.key] ?? t(`bots.research.checks.${check.key}`) }}</span
          >
          <span>{{ t(check.passed ? 'bots.research.passed' : 'bots.research.filtered') }}</span>
          <small v-if="check.actual !== undefined || check.limit !== undefined">{{ checkEvidence(check) }}</small>
        </li>
      </ol>
      <p v-if="!focusedTrade.checks.length">{{ t('bots.tradeFlow.unknownReason') }}</p>
      <p class="decision-outcome">
        <strong :class="pnlClass(focusedTrade.pnl)">{{ formatPnl(focusedTrade.pnl) }} {{ symbol }}</strong
        ><span>{{
          t(focusedTrade.selected ? 'bots.decisionReview.takenOutcome' : 'bots.decisionReview.skippedOutcome')
        }}</span>
      </p>
      <p>{{ valuationDescription }}</p>
    </section>
    <p :id="instructionsId" class="distribution-instructions" :class="{ 'sr-only': compact }">
      {{ t('bots.insights.binHint') }}
    </p>
    <table class="sr-only" data-testid="distribution-bin-data">
      <caption>
        {{
          t('bots.insights.title')
        }}
      </caption>
      <tbody>
        <tr
          v-for="bin in insights.bins"
          :key="bin.index"
          :data-bin="bin.index"
          :data-count="bin.count"
          :data-selected-count="bin.selectedCount"
          :data-excluded-count="bin.excludedCount"
        >
          <th>{{ binRange(bin) }}</th>
          <td>{{ bin.count }}</td>
          <td>{{ bin.selectedCount }}</td>
          <td>{{ bin.excludedCount }}</td>
        </tr>
      </tbody>
    </table>
    <span class="sr-only" role="status" aria-live="polite">{{ description }}</span>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@/lib/substrate/math';
import type { CalculationUpdate } from '../experiment-visuals';
import { createCheckpointPresentation } from '../presentation-checkpoint';
import { summarizeResultDistribution, type ResultDistributionBin } from '../result-insights';
import {
  createTradeParticleRenderer,
  PARTICLE_COLORS,
  particleColorRgb,
  type ParticleColor,
  type ParticlePalette,
  type TradeParticleRenderer,
} from '../tradeParticleRenderer';
import { type DistributionReplayState, type DistributionTrade } from '../tradeDistribution';
import {
  commonDecisionEndpoint,
  decisionKind,
  decisionsInBin,
  decisionsInView,
  formatDecisionCheckValue,
  summarizeDecisionKinds,
  tradeFlowForView,
  type DecisionView,
} from '../decision-inspection';
import type { BotAsset } from '../types';
import {
  FLOW_WIDTH as DISTRIBUTION_WIDTH,
  FLOW_HEIGHT as DISTRIBUTION_HEIGHT,
  FLOW_PLOT_LEFT as PLOT_LEFT,
  FLOW_PLOT_RIGHT as PLOT_RIGHT,
  FLOW_PLOT_TOP as PLOT_TOP,
  FLOW_PLOT_BOTTOM as PLOT_BOTTOM,
  layoutTradeFlow,
  flowPosition,
  flowLandingPosition,
  flowBatchProgress,
  summarizeTradeFlowDecisions,
  summarizeTradeFlowProgress,
} from '../trade-flow';

/** Historical study outcomes stay visible through validation; presentation cannot execute trades. */
const props = withDefaults(
  defineProps<{
    trades: readonly DistributionTrade[];
    selectedTradeId?: string;
    symbol?: string;
    checkLabels?: Record<string, string>;
    compact?: boolean;
    paused?: boolean;
    live?: boolean;
    calculation?: CalculationUpdate;
    calculating?: boolean;
    valuationTimestamp?: number;
    evidenceAssets?: readonly BotAsset[];
    outputSymbol?: string;
  }>(),
  { symbol: '', compact: false, paused: false, live: false, calculating: false, evidenceAssets: () => [] }
);
const emit = defineEmits<{ select: [id: string]; replay: [state: DistributionReplayState]; reviewLimits: [] }>();
const { t } = useTranslation();
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const STUDY_TRANSITION_MS = 640;
const REPLAY_MS = 8000;
const canvas = ref<HTMLCanvasElement>();
const particleCanvas = ref<HTMLCanvasElement>();
const rendererBackend = ref<'canvas2d' | 'webgl' | 'webgl2'>('canvas2d');
const instructionsId = `distribution-instructions-${useId()}`;
const viewExplanationId = `distribution-view-explanation-${useId()}`;
const displayTrades = computed(() => props.trades);
const insights = computed(() => summarizeResultDistribution(displayTrades.value));
const visibilityOptions = ['selected', 'excluded', 'all'] as const;
const chosenVisibility = ref<DecisionView>('selected');
/** Live calculation explains all checks; completed results start with the trades actually taken. */
const visibility = computed<DecisionView>({
  get: () => (props.calculating ? 'all' : chosenVisibility.value),
  set: (value) => {
    if (!props.calculating) chosenVisibility.value = value;
  },
});
const visibleTrades = computed(() => decisionsInView(displayTrades.value, visibility.value));
const statistics = computed(() => insights.value[visibility.value]);
const decisionCounts = computed(() => summarizeDecisionKinds(displayTrades.value));
const decisionKinds = computed(() =>
  decisionCounts.value.unknown
    ? (['checked', 'noSignal', 'blocked', 'taken', 'unknown'] as const)
    : (['checked', 'noSignal', 'blocked', 'taken'] as const)
);
const flowLayout = computed(() => layoutTradeFlow(displayTrades.value, insights.value));
const plotLayout = computed(() => tradeFlowForView(flowLayout.value, insights.value, visibility.value));
/** Visible counters follow drawn opportunities while preserving the study's original timing and scale. */
const visibleFlowLayout = computed(() =>
  followedId.value
    ? {
        ...flowLayout.value,
        particles: flowLayout.value.particles.filter((particle) => particle.id === followedId.value),
      }
    : visibility.value === 'all'
      ? flowLayout.value
      : {
          ...flowLayout.value,
          particles: flowLayout.value.particles.filter((particle) =>
            visibility.value === 'selected' ? particle.selected : !particle.selected
          ),
        }
);
const countMaximum = computed(() => plotLayout.value.countMaximum);
const flowMode = ref<'idle' | 'live' | 'replay'>('idle');
const playbackPaused = ref(false);
const playbackSpeed = ref(1);
const followedId = ref<string>();
const followedGate = ref<string>();
const flowVisible = computed(() => props.calculating || flowMode.value !== 'idle');
const incoming = shallowRef<ReadonlyMap<string, number>>(new Map());
const decisionSummary = computed(() => summarizeTradeFlowDecisions(displayTrades.value));
const skipReasons = computed(() => decisionSummary.value.gates.filter((gate) => gate.skippedHere > 0));
const hasLimitSkips = computed(() =>
  skipReasons.value.some((gate) => ['balance', 'tradeLimit', 'feeBudget'].includes(gate.key))
);
const flowProgress = shallowRef(summarizeTradeFlowProgress(visibleFlowLayout.value, incoming.value, 1));
const landedCount = ref(0);
const flowStatus = computed(() =>
  t(
    reducedMotion.value
      ? 'bots.tradeFlow.reducedMotion'
      : followedId.value
        ? 'bots.decisionReview.following'
        : flowMode.value === 'replay'
          ? 'bots.tradeFlow.replaying'
          : flowMode.value === 'live'
            ? 'bots.tradeFlow.processing'
            : 'bots.tradeFlow.complete'
  )
);
const countTicks = computed(() => [0, 1, 2, 3, 4].map((step) => (step * countMaximum.value) / 4));
const hoveredBin = ref<number>();
const hoveredId = ref<string>();
const inspectedId = ref<string>();
const activeId = computed(() => followedId.value ?? hoveredId.value ?? inspectedId.value ?? props.selectedTradeId);
const focusedIndex = computed(() => visibleTrades.value.findIndex((trade) => trade.id === activeId.value));
const focusedTrade = computed(() => visibleTrades.value[focusedIndex.value]);
const focusedPrice = computed(() => {
  const price = focusedTrade.value?.price;
  if (!price || price.length > 256 || !/^(0|[1-9]\d*)(\.\d+)?$/.test(price)) return;
  const value = new FPNumber(price, Math.max(40, price.split('.')[1]?.length ?? 0));
  return value.isFinity() && value.gt(FPNumber.ZERO) ? value.toString() : undefined;
});
const activeBin = computed(
  () =>
    insights.value.bins.find((bin) => bin.index === hoveredBin.value) ??
    (focusedTrade.value ? binForPnl(focusedTrade.value.pnl) : undefined)
);
const extentLabel = computed(() => formatPnl(insights.value.extent, false));
const description = computed(() => t('bots.decisionReview.summary', decisionCounts.value));
const valuationDescription = computed(() => {
  const timestamp = props.valuationTimestamp ?? commonDecisionEndpoint(displayTrades.value);
  return timestamp === undefined
    ? t('bots.decisionReview.valuationUndated')
    : t('bots.decisionReview.valuation', { date: formatDecisionTime(timestamp) });
});
const gates = computed(() =>
  [...new Set(displayTrades.value.flatMap((trade) => trade.checks.map((check) => check.key)))].map((key) => ({
    key,
    count: visibleTrades.value.filter((trade) => trade.checks.find((check) => check.key === key)?.passed).length,
  }))
);
const reducedMotion = ref(false);
const calculationProgress = ref(1);
let presentedIds = new Set<string>();
let particleRenderer: TradeParticleRenderer | null = null;
let context: CanvasRenderingContext2D | null = null;
let palette: ParticlePalette = { ...PARTICLE_COLORS };
let mounted = false;
let calculationFrame = 0;
let animationTick: FrameRequestCallback | undefined;
let animationLast: number | undefined;
let animationElapsed = 0;
let animationDuration = REPLAY_MS;
let presentingCheckpoint: number | undefined;
let presentationGeneration = 0;
let mediaQuery: MediaQueryList | undefined;
let resizeObserver: ResizeObserver | undefined;
let themeObserver: MutationObserver | undefined;
const presentation = createCheckpointPresentation({
  onTimeout: (checkpoint) => {
    if (checkpoint === presentingCheckpoint) settleCalculation();
  },
});
defineExpose({ waitForCheckpoint: presentation.waitForCheckpoint });

/** UTC dates match the hourly history and make the common outcome valuation explicit. */
function formatDecisionTime(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC` : '—';
}

/** Give balance, order ceiling, fee budget and interval their correct comparison language and units. */
function checkEvidence(check: DistributionTrade['checks'][number]): string {
  const key = ['balance', 'tradeLimit', 'feeBudget', 'cooldown'].includes(check.key) ? check.key : 'other';
  const actual =
    check.key === 'cooldown' && check.actual === undefined
      ? t('bots.decisionReview.firstTrade')
      : (formatDecisionCheckValue(check, 'actual', props.evidenceAssets) ?? '—');
  return t(`bots.decisionReview.evidence.${key}`, {
    actual,
    limit: formatDecisionCheckValue(check, 'limit', props.evidenceAssets) ?? '—',
  });
}

/** Keep displayed decimal signs and small values while retaining exact values in range readouts. */
function formatPnl(value: string | null, signed = true): string {
  if (value === null) return '—';
  const amount = new FPNumber(value, Math.max(40, (value.split('.')[1]?.length ?? 0) + 4));
  if (!amount.isFinity()) return '—';
  const label =
    !amount.isZero() && amount.abs().lt(new FPNumber('0.0001'))
      ? amount.value.toPrecision(4)
      : amount.value.toFixed(4, 4);
  return `${signed && amount.gt(FPNumber.ZERO) ? '+' : ''}${label}`;
}

/** Match readable outcome colors to their exact sign, including subunit quantiles. */
function pnlClass(value: string | null): string {
  if (value === null) return '';
  const amount = new FPNumber(value, Math.max(40, (value.split('.')[1]?.length ?? 0) + 4));
  return amount.gt(FPNumber.ZERO) ? 'is-positive' : amount.lt(FPNumber.ZERO) ? 'is-negative' : '';
}

/** Range brackets expose exact boundary ownership, including the separate break-even point. */
function binRange(bin: ResultDistributionBin, exact = true): string {
  const lower = exact ? bin.lower : formatPnl(bin.lower, false);
  const upper = exact ? bin.upper : formatPnl(bin.upper, false);
  return bin.sign === 'zero'
    ? '0'
    : `${bin.lowerInclusive ? '[' : '('}${lower}, ${upper}${bin.upperInclusive ? ']' : ')'}`;
}

/** Match exact decimal evidence to the shared signed histogram without converting amounts to floats. */
function binForPnl(pnl: string): ResultDistributionBin | undefined {
  if (pnl.length > 256 || !/^-?(0|[1-9]\d*)(\.\d+)?$/.test(pnl)) return;
  const value = new FPNumber(pnl, Math.max(40, (pnl.split('.')[1]?.length ?? 0) + 4));
  if (!value.isFinity()) return;
  return insights.value.bins.find((bin) => {
    const precision = Math.max(
      value.precision,
      bin.lower.split('.')[1]?.length ?? 0,
      bin.upper.split('.')[1]?.length ?? 0
    );
    const lower = new FPNumber(bin.lower, precision),
      upper = new FPNumber(bin.upper, precision);
    return (
      (bin.lowerInclusive ? value.gte(lower) : value.gt(lower)) &&
      (bin.upperInclusive ? value.lte(upper) : value.lt(upper))
    );
  });
}

/** Shared count scale stays fixed while individual incoming records settle into exact bins. */
function binGeometry(bin: ResultDistributionBin) {
  const width = (PLOT_RIGHT - PLOT_LEFT) / Math.max(1, insights.value.bins.length);
  return { center: PLOT_LEFT + (bin.index + 0.5) * width, width: Math.max(1, Math.min(64, width - 5)) };
}

/** Paint actual candidates through their checks; count columns grow only after the corresponding arrival. */
function draw(): void {
  if (!context || !canvas.value) return;
  const ctx = context;
  ctx.clearRect(0, 0, DISTRIBUTION_WIDTH, DISTRIBUTION_HEIGHT);
  const renderer = particleRenderer;
  renderer?.begin();
  const line = (x1: number, y1: number, x2: number, y2: number, width: number, color: ParticleColor, alpha: number) => {
    if (renderer) renderer.line(x1, y1, x2, y2, width, color, alpha);
    else {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = palette[color];
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };
  const circle = (
    x: number,
    y: number,
    radius: number,
    color: ParticleColor,
    alpha: number,
    fill = true,
    sphere = false
  ) => {
    if (sphere && renderer?.sphere) renderer.sphere(x, y, radius, color, alpha);
    else if (renderer) renderer.circle(x, y, radius, Math.min(1, radius * 0.4), color, alpha, fill);
    else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = palette[color];
      ctx.strokeStyle = palette[color];
      ctx.lineWidth = Math.min(1, radius * 0.4);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      if (fill) {
        ctx.fill();
        if (sphere && radius > 2) {
          ctx.globalAlpha = alpha * 0.65;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x - radius * 0.28, y - radius * 0.32, radius * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else ctx.stroke();
    }
  };
  const layout = plotLayout.value;
  const center = (PLOT_LEFT + PLOT_RIGHT) / 2;
  // The inlet and check rails orient the real filter path without implying a probability model.
  line(center - 32, 27, center - 13, 48, 1, 'neutral', 0.28);
  line(center + 32, 27, center + 13, 48, 1, 'neutral', 0.28);
  line(center - 13, 48, center + 13, 48, 1.5, 'focus', 0.5);
  for (const gate of layout.gates) {
    line(226, gate.y, 729, gate.y, 0.8, 'neutral', 0.12);
    for (let x = 278; x <= 710; x += 54) circle(x, gate.y, 1.25, 'neutral', 0.24);
  }
  for (let y = 60; y < 285; y += 9) line(center, y, center, y + 3, 0.8, 'neutral', 0.2);
  const arrivals = layout.particles.map((particle) => {
    const index = incoming.value.get(particle.id);
    const local = index === undefined ? 1 : flowBatchProgress(index, incoming.value.size, calculationProgress.value);
    return { particle, local, point: flowPosition(particle, local, layout) };
  });
  const landed = insights.value.bins.map(() => ({ count: 0, selected: 0, excluded: 0 }));
  let settled = 0;
  for (const { particle, point } of arrivals) {
    if (!point.settled) continue;
    settled += 1;
    const bin = landed[particle.binIndex];
    bin.count += 1;
    if (particle.selected) bin.selected += 1;
    else bin.excluded += 1;
  }
  landedCount.value = settled;
  followedGate.value = followedId.value
    ? layout.gates[arrivals.find(({ particle }) => particle.id === followedId.value)?.point.gate ?? -1]?.key
    : undefined;
  flowProgress.value = summarizeTradeFlowProgress(visibleFlowLayout.value, incoming.value, calculationProgress.value);
  const countY = (count: number) => PLOT_BOTTOM - (count / countMaximum.value) * PLOT_HEIGHT;
  for (const tick of countTicks.value)
    line(PLOT_LEFT, countY(tick), PLOT_RIGHT, countY(tick), 0.7, 'neutral', tick === 0 ? 0.35 : 0.11);
  line(center, PLOT_TOP, center, PLOT_BOTTOM + 6, 1, 'neutral', 0.33);
  for (const bin of insights.value.bins) {
    const geometry = binGeometry(bin);
    const counts = landed[bin.index];
    const color = bin.sign === 'profit' ? 'positive' : bin.sign === 'loss' ? 'negative' : 'neutral';
    const column = (count: number, alpha: number) => {
      if (!count) return;
      const top = countY(count);
      if (renderer) renderer.line(geometry.center, top, geometry.center, PLOT_BOTTOM, geometry.width, color, alpha);
      else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = palette[color];
        ctx.fillRect(geometry.center - geometry.width / 2, top, geometry.width, PLOT_BOTTOM - top);
      }
    };
    if (visibility.value === 'all') {
      column(counts.count, 0.3);
      column(counts.selected, 0.94);
    } else column(visibility.value === 'selected' ? counts.selected : counts.excluded, 0.86);
    if (activeBin.value?.index === bin.index) {
      const count =
        visibility.value === 'all' ? counts.count : visibility.value === 'selected' ? counts.selected : counts.excluded;
      line(
        geometry.center - geometry.width / 2,
        countY(count),
        geometry.center + geometry.width / 2,
        countY(count),
        2,
        color,
        1
      );
    }
  }
  for (const { particle, local } of arrivals) {
    const point = flowLandingPosition(particle, local, layout, landed[particle.binIndex].selected, visibility.value);
    if (point.waiting) continue;
    if (
      (visibility.value === 'selected' && !particle.selected) ||
      (visibility.value === 'excluded' && particle.selected)
    )
      continue;
    // Outcome colors appear only after the recorded checks; green never means a rule passed.
    const checking = !point.settled && local < (layout.gates.length + 1) / (layout.gates.length + 3);
    const color: ParticleColor = checking
      ? 'neutral'
      : particle.sign === 'profit'
        ? 'positive'
        : particle.sign === 'loss'
          ? 'negative'
          : 'neutral';
    const fill = point.settled || particle.firstFailedGate === null ? particle.selected : !point.rejected;
    const radius = point.settled ? particle.radius : 3.5;
    if (!point.settled) {
      const previous = flowLandingPosition(
        particle,
        Math.max(0, local - 0.065),
        layout,
        landed[particle.binIndex].selected,
        visibility.value
      );
      line(previous.x, previous.y, point.x, point.y, 1.3, color, point.rejected ? 0.3 : 0.5);
      circle(point.x, point.y, radius * 2.1, color, 0.07);
      if (point.gate >= 0) {
        const gate = layout.gates[point.gate];
        if (gate && Math.abs(point.y - gate.y) < 8)
          circle(point.x, gate.y, 7, point.rejected ? 'neutral' : 'focus', 0.24, false);
      }
    }
    circle(point.x, point.y, radius, color, point.settled ? (fill ? 0.95 : 0.56) : 0.95, fill, fill && !point.settled);
    if (incoming.value.has(particle.id) && local > 0.93 && local < 1) {
      const fade = (1 - local) / 0.07;
      const landing = flowLandingPosition(particle, 1, layout, landed[particle.binIndex].selected, visibility.value);
      line(
        particle.x - 10 * (1 - fade),
        landing.y + radius,
        particle.x + 10 * (1 - fade),
        landing.y + radius,
        1.3,
        color,
        fade * 0.55
      );
    }
    if (particle.id === activeId.value) circle(point.x, point.y, Math.max(5, radius + 3), 'focus', 1, false);
  }
  renderer?.end();
  ctx.globalAlpha = 1;
}

/** Finish a bounded arrival window and release its exact evaluator checkpoint. */
function settleCalculation(): void {
  if (calculationFrame) cancelAnimationFrame(calculationFrame);
  calculationFrame = 0;
  animationTick = undefined;
  animationLast = undefined;
  playbackPaused.value = false;
  followedId.value = undefined;
  presentationGeneration += 1;
  calculationProgress.value = 1;
  incoming.value = new Map();
  flowMode.value = 'idle';
  if (mounted) draw();
  if (presentingCheckpoint !== undefined) presentation.settle(presentingCheckpoint);
  presentingCheckpoint = undefined;
}

/** One animation clock affects only record positions; the statistical evidence remains immediately available. */
function startFlow(mode: 'live' | 'replay', ids: readonly string[], duration: number): void {
  incoming.value = new Map(ids.map((id, index) => [id, index]));
  flowMode.value = mode;
  calculationProgress.value = 0;
  animationElapsed = 0;
  animationDuration = duration;
  animationLast = undefined;
  const generation = presentationGeneration;
  draw();
  const tick = (timestamp: number) => {
    if (generation !== presentationGeneration) return;
    if (mode === 'replay' && playbackPaused.value) return;
    if (animationLast !== undefined)
      animationElapsed += Math.max(0, timestamp - animationLast) * (mode === 'replay' ? playbackSpeed.value : 1);
    animationLast = timestamp;
    calculationProgress.value = Math.min(1, animationElapsed / duration);
    draw();
    calculationFrame = requestAnimationFrame(
      calculationProgress.value === 1
        ? () => {
            if (generation === presentationGeneration) settleCalculation();
          }
        : tick
    );
  };
  animationTick = tick;
  calculationFrame = requestAnimationFrame(tick);
}

/** Replay controls only affect recorded presentation; a live evaluator checkpoint is never paused. */
function togglePlaybackPause(): void {
  if (flowMode.value !== 'replay') return;
  playbackPaused.value = !playbackPaused.value;
  animationLast = undefined;
  if (calculationFrame) cancelAnimationFrame(calculationFrame);
  calculationFrame = !playbackPaused.value && animationTick ? requestAnimationFrame(animationTick) : 0;
}

/** Seeking pauses the replay at an exact presentation position without changing any recorded result. */
function seekReplay(event: Event): void {
  if (flowMode.value !== 'replay') return;
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;
  if (!playbackPaused.value) togglePlaybackPause();
  calculationProgress.value = Math.max(0, Math.min(1, value / 1000));
  animationElapsed = calculationProgress.value * animationDuration;
  draw();
}

/** Follow one real decision through its recorded rule values; reduced motion retains the same static evidence. */
function followDecision(): void {
  if (props.calculating || props.paused) return;
  const trade = focusedTrade.value ?? visibleTrades.value[0];
  if (!trade) return;
  settleCalculation();
  selectTrade(trade.id);
  if (reducedMotion.value || document.hidden) return;
  followedId.value = trade.id;
  startFlow('replay', [trade.id], REPLAY_MS);
}

/** Animate each actual study candidate once; validation checkpoints never relaunch the study. */
function presentCalculation(): void {
  if (!mounted || !props.live || !props.calculation) return;
  settleCalculation();
  const update = props.calculation;
  presentingCheckpoint = update.checkpoint;
  presentation.begin(update.checkpoint);
  const ids = flowLayout.value.particles
    .filter((particle) => !presentedIds.has(particle.id))
    .map((particle) => particle.id);
  presentedIds = new Set(flowLayout.value.particles.map((particle) => particle.id));
  if (
    !props.calculating ||
    update.scope !== 'study' ||
    props.paused ||
    reducedMotion.value ||
    document.hidden ||
    !ids.length
  ) {
    settleCalculation();
    return;
  }
  startFlow('live', ids, STUDY_TRANSITION_MS);
}

/** Explicit replay reuses immutable recorded outcomes and cannot rerun, change or select a strategy. */
function toggleReplay(): void {
  if (flowMode.value === 'replay') {
    settleCalculation();
    return;
  }
  if (!insights.value.count || props.calculating || props.paused || reducedMotion.value || document.hidden) return;
  settleCalculation();
  startFlow(
    'replay',
    flowLayout.value.particles.map((particle) => particle.id),
    REPLAY_MS
  );
}

/** Keep the chart legible on retina displays with a bounded backing-store size. */
function resizeCanvas(): void {
  if (!canvas.value) return;
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.value.width = Math.round(DISTRIBUTION_WIDTH * ratio);
  canvas.value.height = Math.round(DISTRIBUTION_HEIGHT * ratio);
  context ??= canvas.value.getContext('2d');
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  particleRenderer?.resize(DISTRIBUTION_WIDTH, DISTRIBUTION_HEIGHT, ratio);
  draw();
}

/** Theme changes update both rendering backends without altering evidence or presentation time. */
function updatePalette(): void {
  if (!canvas.value) return;
  const style = getComputedStyle(canvas.value);
  const tokens: Record<ParticleColor, string> = {
    neutral: '--s-color-base-content-secondary',
    positive: '--plot-profit',
    negative: '--plot-loss',
    focus: '--s-color-action-text',
  };
  for (const key of Object.keys(tokens) as ParticleColor[]) {
    const color = style.getPropertyValue(tokens[key]).trim();
    if (particleColorRgb(color)) palette[key] = color;
  }
  particleRenderer?.setColors?.(palette);
  draw();
}

/** Hidden pages and reduced-motion requests release study presentation without blocking validation. */
function updateVisibility(): void {
  if (document.hidden) settleCalculation();
}
/** Honor OS motion changes immediately. */
function updateMotion(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches;
  if (event.matches) settleCalculation();
}

/** Match pointer coordinates to a displayed signed range; every candidate remains keyboard reachable. */
function binAtPointer(event: MouseEvent | PointerEvent): ResultDistributionBin | undefined {
  const rect = canvas.value?.getBoundingClientRect();
  if (!rect?.width || !rect.height) return;
  const x = ((event.clientX - rect.left) / rect.width) * DISTRIBUTION_WIDTH;
  const y = ((event.clientY - rect.top) / rect.height) * DISTRIBUTION_HEIGHT;
  if (x < PLOT_LEFT || x > PLOT_RIGHT || y < PLOT_TOP || y > PLOT_BOTTOM) return;
  const index = Math.min(
    insights.value.bins.length - 1,
    Math.floor(((x - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * insights.value.bins.length)
  );
  return insights.value.bins[index];
}

/** Choose the first actual candidate represented by the hovered range and current filter. */
function tradeForBin(bin: ResultDistributionBin | undefined): DistributionTrade | undefined {
  if (!bin) return;
  const index =
    visibility.value === 'all'
      ? bin.firstIndex
      : visibility.value === 'selected'
        ? bin.firstSelectedIndex
        : bin.firstExcludedIndex;
  return index === null ? undefined : displayTrades.value[index];
}
/** Hover describes the range without changing the parent selection. */
function hoverTrade(event: PointerEvent): void {
  const bin = binAtPointer(event);
  hoveredBin.value = bin?.index;
  hoveredId.value = tradeForBin(bin)?.id;
}
/** Clear temporary inspection when the pointer leaves the chart. */
function clearHover(): void {
  hoveredBin.value = undefined;
  hoveredId.value = undefined;
}
/** Clicking opens the existing candidate inspector for the actual selected range. */
function selectAtPointer(event: MouseEvent): void {
  const trade = tradeForBin(binAtPointer(event));
  if (trade) selectTrade(trade.id);
}
/** Selection only identifies historical evidence and never changes strategy decisions. */
function selectTrade(id: string): void {
  if (followedId.value && followedId.value !== id) settleCalculation();
  inspectedId.value = id;
  clearHover();
  emit('select', id);
}
/** Walk only the displayed decisions so keyboard inspection respects the chosen comparison. */
function stepTrade(direction: number): void {
  if (!visibleTrades.value.length) return;
  const current = focusedIndex.value;
  const index =
    current < 0
      ? direction > 0
        ? 0
        : visibleTrades.value.length - 1
      : (current + direction + visibleTrades.value.length) % visibleTrades.value.length;
  if (followedId.value) settleCalculation();
  selectTrade(visibleTrades.value[index].id);
}
/** Keep individual candidate inspection available through arrows, Home and End. */
function navigateTrade(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    stepTrade(event.key === 'ArrowRight' ? 1 : -1);
  }
  if (event.key === 'Home' && visibleTrades.value.length) {
    event.preventDefault();
    if (followedId.value) settleCalculation();
    selectTrade(visibleTrades.value[0].id);
  }
  if (event.key === 'End' && visibleTrades.value.length) {
    event.preventDefault();
    if (followedId.value) settleCalculation();
    selectTrade(visibleTrades.value.at(-1)!.id);
  }
}

watch([visibility, activeBin, insights], () => {
  if (followedId.value && !visibleTrades.value.some((trade) => trade.id === followedId.value)) settleCalculation();
  draw();
});
watch(
  () => props.calculation,
  (update) => {
    if (!props.live) return;
    settleCalculation();
    if (update) presentCalculation();
    else presentation.release();
  },
  { immediate: true }
);
watch([() => props.calculating, () => props.paused], ([calculating, paused]) => {
  if (calculating) chosenVisibility.value = 'selected';
  if (!calculating || paused) settleCalculation();
});
watch(
  () => props.trades,
  () => {
    if (inspectedId.value && !displayTrades.value.some((trade) => trade.id === inspectedId.value))
      inspectedId.value = undefined;
    clearHover();
    if (!displayTrades.value.length) presentedIds.clear();
    if (!props.live) {
      settleCalculation();
      presentedIds = new Set(flowLayout.value.particles.map((particle) => particle.id));
      emit('replay', { settledCount: displayTrades.value.length });
    }
  },
  { immediate: true, flush: 'post' }
);
onMounted(() => {
  mounted = true;
  mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  reducedMotion.value = mediaQuery?.matches ?? false;
  mediaQuery?.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateVisibility);
  if (particleCanvas.value) {
    particleRenderer = createTradeParticleRenderer(particleCanvas.value, () => {
      particleRenderer = null;
      rendererBackend.value = 'canvas2d';
      if (particleCanvas.value) particleCanvas.value.style.display = 'none';
      if (mounted) settleCalculation();
    });
    if (particleRenderer) rendererBackend.value = particleRenderer.backend ?? 'webgl2';
  }
  resizeCanvas();
  updatePalette();
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(updatePalette);
    const observerOptions = {
      attributes: true,
      attributeFilter: ['data-theme', 'design-system-theme', 'class', 'style'],
    };
    themeObserver.observe(document.documentElement, observerOptions);
    const provider = canvas.value?.closest('.sora-theme-provider');
    if (provider) themeObserver.observe(provider, observerOptions);
  }
  if (typeof ResizeObserver !== 'undefined' && canvas.value) {
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.value);
  }
  presentCalculation();
});
onBeforeUnmount(() => {
  mounted = false;
  settleCalculation();
  presentation.dispose();
  document.removeEventListener('visibilitychange', updateVisibility);
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
  particleRenderer?.dispose();
  particleRenderer = null;
  mediaQuery?.removeEventListener('change', updateMotion);
});
</script>

<style scoped lang="scss">
.trade-distribution {
  --plot-profit: #168a52;
  --plot-loss: #d63743;
  --plot-muted: var(--s-color-base-content-secondary, #70646c);
  width: 100%;
  min-width: 0;
}
.decision-summary {
  display: grid;
  grid-template-columns: repeat(4, #{'minmax(0, 1fr)'});
  gap: 12px;
  margin: 14px 0;
  dt {
    font-size: 12px;
    line-height: 1.4;
    color: var(--plot-muted);
  }
  dd {
    font-size: 20px;
    margin: 5px 0 0;
    font-variant-numeric: tabular-nums;
  }
}
.distribution-flow .flow-actions {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.replay-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
  font-size: 12px;
  label {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  input {
    min-width: 100px;
    flex: 1;
    accent-color: var(--s-color-action-text);
  }
}
.replay-controls button,
.replay-controls select,
.review-limits,
.no-taken-trades button {
  font: inherit;
  font-size: 12px;
  min-height: 40px;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: 10px;
  padding: 8px 12px;
  background: var(--s-color-utility-surface);
  color: var(--s-color-action-text);
  cursor: pointer;
}
.review-limits {
  margin-top: 8px;
}
.no-taken-trades {
  padding: 20px 0;
  strong {
    font-size: 15px;
  }
  p {
    color: var(--plot-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}
.distribution-valuation {
  text-align: center;
  color: var(--plot-muted);
  font-size: 12px;
  line-height: 1.6;
  margin: 6px 0 12px;
}
.distribution-scale-note {
  margin: 3px 0;
  text-align: center;
  color: var(--plot-muted);
  font-size: 11px;
}
.rule-totals {
  margin: 12px 0;
  h4 {
    margin: 0;
    color: var(--plot-muted);
    font-size: 12px;
    font-weight: 600;
  }
}
.decision-inspector {
  border-top: 1px solid var(--s-color-base-border-secondary);
  margin-top: 16px;
  padding-top: 16px;
  font-size: 13px;
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  time {
    color: var(--plot-muted);
    font-size: 12px;
  }
  p {
    margin: 8px 0;
    color: var(--plot-muted);
    line-height: 1.6;
  }
  ol {
    list-style: none;
    margin: 14px 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 4px 12px;
    padding: 10px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--plot-muted) 5%, transparent);
  }
  li.is-current {
    box-shadow: inset 3px 0 var(--s-color-action-text);
    background: color-mix(in srgb, var(--s-color-action-text) 9%, transparent);
  }
  li > span:last-of-type {
    color: var(--plot-muted);
    font-size: 12px;
  }
  small {
    grid-column: 1 / -1;
    overflow-wrap: anywhere;
    line-height: 1.5;
    color: var(--plot-muted);
  }
  .decision-check-name {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .decision-outcome {
    display: flex;
    gap: 10px;
    align-items: baseline;
    flex-wrap: wrap;
  }
}
.flow-mobile-progress {
  display: none;
}
html[design-system-theme='dark'] .trade-distribution {
  --plot-profit: #83e3b2;
  --plot-loss: #ffa6b0;
}
.distribution-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  > div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  strong {
    font-size: 13px;
    font-weight: 600;
  }
  span {
    color: var(--plot-muted);
    font-size: 10px;
  }
  button {
    min-height: 40px;
    padding: 9px 12px;
    border: 0;
    border-radius: 12px;
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element);
    color: var(--s-color-action-text);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    span {
      color: inherit;
      font-size: 18px;
    }
    &:disabled {
      cursor: default;
      opacity: 0.45;
    }
    &:focus-visible {
      outline: 2px solid var(--s-color-action-text);
      outline-offset: 3px;
    }
  }
}
.flow-inlet-label,
.flow-landing-count {
  position: absolute;
  top: 0;
  font-size: 10px;
  color: var(--plot-muted);
  pointer-events: none;
}
.flow-inlet-label {
  left: 52.89%;
  transform: translateX(-50%);
  white-space: nowrap;
}
.flow-landing-count {
  right: 2.66%;
  font-variant-numeric: tabular-nums;
}
.flow-gate-label {
  position: absolute;
  left: 2%;
  width: 43%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--plot-muted);
  font-size: 12px;
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    font-size: 10px;
    color: var(--s-color-base-content-primary);
    font-variant-numeric: tabular-nums;
  }
}
.flow-step-label,
.flow-outcome-title,
.flow-path-label {
  position: absolute;
  color: var(--plot-muted);
  font-size: 10px;
  pointer-events: none;
}
.flow-step-label {
  top: 0;
  left: 2%;
  font-weight: 600;
}
.flow-outcome-title {
  top: 50.6%;
  left: 8.45%;
  font-weight: 600;
}
.flow-path-label {
  top: 40%;
}
.flow-path-taken {
  left: 48%;
  transform: translateX(-50%);
}
.flow-path-skipped {
  right: 2.66%;
}
.flow-path-label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border: 1px solid currentColor;
  border-radius: 50%;
}
.flow-path-taken::before {
  background: currentColor;
}
.flow-skip-reasons {
  margin: 14px 0;
  color: var(--plot-muted);
  font-size: 11px;
  > strong {
    color: var(--s-color-base-content-primary);
    font-weight: 500;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 8px 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
  }
  li {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  li strong {
    font-variant-numeric: tabular-nums;
    color: var(--s-color-base-content-primary);
  }
  p {
    margin: 0;
    line-height: 1.5;
  }
}
.flow-live-counts {
  display: none;
}
.distribution-view-explanation {
  font-size: 12px;
  line-height: 1.6;
  margin: 10px 0 3px;
  color: var(--s-color-base-content-primary);
}
.distribution-filter-note {
  color: var(--plot-muted);
  font-size: 11px;
  line-height: 1.5;
  margin: 0 0 16px;
}
.distribution-outcome-axis {
  margin: 5px 0;
  text-align: center;
  font-size: 11px;
  color: var(--s-color-base-content-primary);
}
.flow-caption,
.flow-gate-note {
  color: var(--plot-muted);
  font-size: 11px;
  line-height: 1.6;
  margin: 8px 0;
}
.distribution-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    text-transform: none;
  }
}
.distribution-method h4 {
  color: var(--plot-muted);
  font-size: 12px;
  font-weight: 600;
  margin: 8px 0;
}
.distribution-count,
.distribution-evidence,
.distribution-explanation,
.distribution-instructions {
  color: var(--plot-muted);
  font-size: 12px;
  line-height: 1.6;
}
.distribution-evidence {
  margin: 10px 0;
  font-variant-numeric: tabular-nums;
}
.distribution-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  button {
    flex: 1 1 170px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 5px;
    padding: 9px 10px;
    min-height: 62px;
    color: var(--plot-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px var(--s-color-base-border-secondary);
    &[aria-pressed='true'] {
      color: var(--s-color-action-text, #ab0555);
      background: color-mix(in srgb, var(--s-color-action-text, #ab0555) 8%, transparent);
    }
    &:disabled {
      cursor: default;
    }
  }
}
.distribution-filter-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  line-height: 1.4;
  strong {
    font-variant-numeric: tabular-nums;
    font-size: 14px;
  }
}
.distribution-filter-hint {
  font-size: 10px;
  line-height: 1.5;
  color: var(--plot-muted);
}
.outcome-legend {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--plot-muted);
  i {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    margin-left: 5px;
  }
  .positive {
    background: var(--plot-profit);
  }
  .negative {
    background: var(--plot-loss);
  }
}
.distribution-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 900 / 620;
  margin-top: 0;
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
    &:focus-visible {
      outline: 2px solid var(--s-color-action-text, #ab0555);
      outline-offset: 3px;
    }
  }
}
.distribution-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  aspect-ratio: 900 / 620;
  margin-top: 8px;
  .distribution-stage {
    position: absolute;
    top: 0;
    left: 0;
  }
  &.is-settled {
    aspect-ratio: 900 / 310;
    .distribution-stage {
      transform: translateY(-50%);
    }
  }
}
.distribution-stage canvas.distribution-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.distribution-axis-name {
  position: absolute;
  top: 58%;
  left: 1%;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  color: var(--plot-muted);
  font-size: 10px;
}
.distribution-count-axis {
  position: absolute;
  inset: 0;
  pointer-events: none;
  span {
    position: absolute;
    right: 93%;
    transform: translateY(-50%);
    font-size: 10px;
    color: var(--plot-muted);
    font-variant-numeric: tabular-nums;
  }
}
.distribution-axis {
  position: absolute;
  top: 92%;
  left: 8.45%;
  right: 2.66%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 10px;
  color: var(--plot-muted);
  span {
    max-width: 35%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    &.distribution-zero {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    }
  }
}
.distribution-empty {
  position: absolute;
  inset: 60% 10% auto;
  text-align: center;
  color: var(--plot-muted);
  font-size: 12px;
}
.distribution-bin-readout {
  min-height: 38px;
  display: flex;
  gap: 8px 14px;
  flex-wrap: wrap;
  color: var(--plot-muted);
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  strong {
    color: var(--s-color-base-content-primary);
    font-weight: 500;
  }
}
.distribution-statistics-label {
  margin: 3px 0 8px;
  color: var(--plot-muted);
  font-size: 11px;
}
.trade-distribution .is-positive {
  color: var(--plot-profit);
}
.trade-distribution .is-negative {
  color: var(--plot-loss);
}
.distribution-statistics {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  gap: 16px;
  border-block: 1px solid var(--s-color-base-border-secondary, #dfd7de);
  padding: 14px 0;
  div {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
  }
  div > span {
    font-size: 11px;
    color: var(--plot-muted);
  }
  strong {
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
  small {
    font-weight: 400;
    font-size: 10px;
    color: var(--plot-muted);
  }
}
.distribution-explanation {
  margin: 10px 0;
}
.distribution-gates {
  display: grid;
  grid-template-columns: repeat(auto-fit, #{'minmax(85px, 1fr)'});
  gap: 10px;
  margin: 12px 0;
}
.constraint-gate {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--plot-muted);
}
.constraint-count {
  font-variant-numeric: tabular-nums;
}
.distribution-inspect {
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--s-color-base-border-secondary, #dfd7de);
  padding-top: 8px;
  button {
    flex: 0 0 40px;
    height: 40px;
    background: transparent;
    border: 0;
    color: var(--plot-muted);
    font-size: 18px;
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
}
.inspected-trade,
.inspect-hint {
  display: flex;
  flex: 1;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--plot-muted);
  strong {
    font-weight: 500;
    overflow-wrap: anywhere;
  }
}
.distribution-instructions {
  text-align: center;
  margin: 8px 0 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 600px) {
  .decision-summary {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    gap: 12px 20px;
  }
  .distribution-flow {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .distribution-flow .flow-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .distribution-flow button {
    flex: 1;
    justify-content: center;
    font-size: 12px;
    min-height: 44px;
  }
  .flow-mobile-progress {
    display: block;
    font-size: 12px;
    color: var(--plot-muted);
    text-align: right;
    margin: 6px 0;
  }
  .distribution-viewport,
  .distribution-viewport.is-settled {
    height: 240px;
    aspect-ratio: auto;
    .distribution-stage {
      height: 480px;
      aspect-ratio: auto;
      transform: translateY(-50%);
    }
  }
  .flow-gate-labels,
  .flow-step-label,
  .flow-inlet-label,
  .flow-path-label,
  .flow-landing-count {
    display: none;
  }
  .distribution-axis {
    font-size: 12px;
    gap: 6px;
    span {
      max-width: 48%;
    }
    span.distribution-zero {
      top: 19px;
      max-width: 100%;
    }
  }
  .distribution-count-axis span {
    font-size: 12px;
  }
  .distribution-outcome-axis {
    font-size: 12px;
  }
  .flow-live-counts {
    display: grid;
    list-style: none;
    padding: 0;
    margin: 12px 0;
    gap: 7px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--plot-muted);
    li {
      min-height: 40px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    strong {
      font-weight: 500;
      color: var(--s-color-base-content-primary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }
  .flow-gate-label {
    width: 41%;
    font-size: 10px;
    small {
      display: none;
    }
  }
  .flow-path-label {
    display: none;
  }
  .flow-path-taken {
    left: 45%;
  }
  .flow-step-label {
    font-size: 9px;
  }
  .flow-inlet-label {
    display: none;
  }
  .flow-outcome-title {
    font-size: 9px;
  }
  .distribution-legend button {
    flex-basis: 100%;
  }
  .distribution-axis-name {
    display: none;
  }
  .distribution-statistics {
    gap: 10px;
    strong {
      font-size: 12px;
    }
  }
  .distribution-count {
    display: none;
  }
  .distribution-legend button {
    padding: 8px;
    font-size: 11px;
  }
  .outcome-legend {
    font-size: 10px;
  }
}
</style>
