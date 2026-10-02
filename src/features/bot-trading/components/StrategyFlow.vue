<template>
  <section
    ref="root"
    class="strategy-flow"
    :class="{ 'is-illustrative': !decision, 'is-moving': moving }"
    data-testid="strategy-flow"
    :data-mode="decision ? 'historical' : 'illustrative'"
    :data-phase="decision ? 'historical' : frame.phase"
    :data-event="frame.event?.kind ?? 'none'"
    :data-progress="frame.progress.toFixed(4)"
    :data-duration-ms="lesson.durationMs"
    :data-playing="playing"
    :aria-label="t('bots.flow.title')"
  >
    <header class="flow-heading">
      <div>
        <span class="flow-kicker">{{ t('bots.flow.title') }}</span>
        <h3>{{ t(`bots.flow.rules.${settings.preset}.title`) }}</h3>
      </div>
      <span class="flow-source" data-testid="strategy-flow-source"
        ><i aria-hidden="true" />{{ t(decision ? 'bots.flow.historical' : 'bots.flow.illustrative') }}</span
      >
    </header>
    <div v-if="!decision" class="flow-lesson" data-testid="strategy-landscape">
      <div class="lesson-legend">
        <span><i class="legend-price" />{{ t('bots.flowMotion.price') }}</span
        ><template v-if="settings.preset === 'sma'"
          ><span><i class="legend-fast" />{{ t('bots.flowMotion.fast', { window: settings.fastWindow }) }}</span
          ><span
            ><i class="legend-slow" />{{ t('bots.flowMotion.slow', { window: settings.slowWindow }) }}</span
          ></template
        ><span v-else-if="settings.preset === 'threshold'"
          ><i class="legend-threshold" />{{ t('bots.flowMotion.trigger', { dip: settings.thresholdPercent }) }}</span
        ><span v-else>{{ t('bots.flowMotion.cadence', { cadence: values.cadence }) }}</span>
      </div>
      <svg
        :viewBox="`0 0 ${plotWidth} 170`"
        class="lesson-plot"
        role="img"
        :aria-label="`${t('bots.flow.illustrative')}: ${t(`bots.flow.rules.${settings.preset}.trigger`, values)}`"
        data-testid="strategy-lesson"
      >
        <defs>
          <clipPath :id="clipId"><rect x="0" y="0" :width="plotX(frame.x)" height="170" /></clipPath>
        </defs>
        <g class="lesson-grid">
          <path v-for="row in [18, 80, 142]" :key="row" :d="`M24 ${row}H${plotWidth - 24}`" />
          <path v-for="column in [30, 210, 390, 570, 750]" :key="column" :d="`M${plotX(column)} 18V142`" />
        </g>
        <path :d="paths.price" class="lesson-price is-preview" :class="{ 'is-muted': settings.preset === 'sma' }" />
        <path v-if="lesson.fast.length" :d="paths.fast" class="lesson-fast is-preview" />
        <path v-if="lesson.slow.length" :d="paths.slow" class="lesson-slow is-preview" />
        <line
          v-if="lesson.thresholdY !== null"
          x1="24"
          :x2="plotWidth - 24"
          :y1="lesson.thresholdY"
          :y2="lesson.thresholdY"
          class="lesson-threshold"
        />
        <g v-if="settings.preset === 'dca'" class="lesson-cadence">
          <line
            v-for="event in lesson.events"
            :key="event.fraction"
            :x1="plotX(event.x)"
            :x2="plotX(event.x)"
            y1="18"
            y2="142"
          />
        </g>
        <g :clip-path="`url(#${clipId})`">
          <path v-if="settings.preset !== 'sma'" :d="paths.area" class="lesson-area" />
          <path :d="paths.price" class="lesson-price" :class="{ 'is-muted': settings.preset === 'sma' }" />
          <path v-if="lesson.fast.length" :d="paths.fast" class="lesson-fast" />
          <path v-if="lesson.slow.length" :d="paths.slow" class="lesson-slow" />
        </g>
        <g
          v-for="(event, index) in lesson.events"
          :key="`${event.kind}-${index}`"
          class="lesson-event"
          :class="{ 'is-reached': index < frame.completedEvents, 'is-sell': event.action === 'sell' }"
          :data-testid="`strategy-lesson-event-${index}`"
        >
          <circle :cx="plotX(event.x)" :cy="event.y" r="7" />
          <text :x="plotX(event.x)" :y="event.y + 3.3" text-anchor="middle">
            {{ event.action === 'buy' ? '↑' : '↓' }}
          </text>
        </g>
        <line
          :x1="plotX(frame.x)"
          :x2="plotX(frame.x)"
          y1="10"
          y2="149"
          class="lesson-playhead"
          data-testid="strategy-lesson-playhead"
        />
        <circle v-if="frame.phase !== 'trade'" :cx="plotX(frame.x)" :cy="frame.y" r="4.5" class="lesson-cursor" />
        <g
          v-else
          :key="frame.event?.fraction"
          class="lesson-trade"
          :class="{ 'is-sell': frame.event?.action === 'sell' }"
          data-testid="strategy-lesson-confirmation"
        >
          <circle :cx="plotX(frame.x)" :cy="frame.y" r="19" class="lesson-trade-halo" />
          <circle :cx="plotX(frame.x)" :cy="frame.y" r="10" class="lesson-trade-marker" />
          <text :x="plotX(frame.x)" :y="frame.y + 4.5" text-anchor="middle">
            {{ frame.event?.action === 'buy' ? '↑' : '↓' }}
          </text>
        </g>
        <text :x="plotWidth - 24" y="165" text-anchor="end" class="lesson-axis">{{ t('bots.flowMotion.time') }} →</text>
      </svg>
      <div class="lesson-caption">
        <p role="status" aria-live="polite" data-testid="strategy-lesson-caption">{{ caption }}</p>
        <div class="lesson-controls">
          <button
            type="button"
            data-testid="strategy-lesson-toggle"
            :disabled="reduced"
            :aria-pressed="paused"
            @click="toggle"
          >
            {{ t(paused ? 'bots.resume' : 'bots.pause') }}</button
          ><button type="button" data-testid="strategy-lesson-replay" :disabled="reduced" @click="replayLesson">
            {{ t('bots.playground.replay') }}
          </button>
        </div>
      </div>
    </div>
    <div v-else class="flow-historical">
      <strong
        >{{ t(decision.action === 'buy' ? 'bots.playground.tradeBuy' : 'bots.playground.tradeSell') }} ·
        {{ decision.amount }} {{ decision.action === 'buy' ? values.input : values.output }}</strong
      ><time>{{ decisionTime }}</time>
    </div>
    <ol class="flow-stages">
      <li class="flow-stage" :class="{ 'is-current': stage === 0 }">
        <span class="stage-number">01</span>
        <h4>{{ t(decision ? 'bots.flow.candles' : 'bots.flowMotion.price') }}</h4>
      </li>
      <li class="flow-stage" :class="{ 'is-current': stage === 1 }">
        <span class="stage-number">02</span>
        <h4>{{ t('bots.flow.rule') }}</h4>
        <span v-if="decision" class="stage-evidence" data-testid="strategy-flow-signal">{{
          t(signalPassed ? 'bots.flow.signalPassed' : 'bots.flow.signalSkipped')
        }}</span>
      </li>
      <li class="flow-stage" :class="{ 'is-current': stage === 2 }">
        <span class="stage-number">03</span>
        <h4>{{ t('bots.flow.budget') }}</h4>
        <span v-if="decision" class="stage-evidence" data-testid="strategy-flow-budget">{{
          t(budgetPassed ? 'bots.flow.budgetPassed' : 'bots.flow.budgetSkipped')
        }}</span>
      </li>
      <li
        class="flow-stage"
        :class="{
          'is-current': stage === 3,
          'is-filled': decision?.selected,
          'is-skipped': decision && !decision.selected,
        }"
      >
        <span class="stage-number">04</span>
        <h4>{{ t('bots.flow.outcome') }}</h4>
        <span v-if="decision" class="stage-evidence" data-testid="strategy-flow-outcome"
          >{{ t(decision.selected ? 'bots.flow.filled' : 'bots.flow.skipped') }} · {{ t(decision.reason) }}</span
        >
      </li>
    </ol>
    <details class="flow-details">
      <summary>{{ t('assets.details') }}</summary>
      <p data-testid="strategy-flow-explanation">{{ t(`bots.flow.rules.${settings.preset}.description`, values) }}</p>
      <p data-testid="strategy-flow-action">{{ t(`bots.flow.rules.${settings.preset}.action`, values) }}</p>
      <p>{{ t(`bots.flow.rules.${settings.preset}.trigger`, values) }}</p>
      <p>{{ t('bots.flow.budgetNote') }} {{ t('bots.flow.outcomeNote') }}</p>
      <p>{{ t(decision ? 'bots.flow.historicalNote' : 'bots.flow.illustrativeNote') }}</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { buildStrategyLesson, lessonPath, strategyLessonFrame } from '../strategy-lesson';
import { explainedTradeAmount, type StrategyFlowSettings } from '../strategy-explanation';
import type { ResearchDecision } from '../research';

/** A repeating rule lesson; actual supplied decisions replace illustration without inventing fills. */
const props = withDefaults(
  defineProps<{
    settings: StrategyFlowSettings;
    inputSymbol?: string;
    inputDecimals?: number;
    outputSymbol?: string;
    decision?: ResearchDecision;
    calculating?: boolean;
    active?: boolean;
  }>(),
  { inputSymbol: '', inputDecimals: 18, outputSymbol: '', calculating: false, active: true }
);
const { t } = useTranslation();
const root = ref<HTMLElement | null>(null);
const plotWidth = ref(780);
const elapsed = ref(0);
const paused = ref(false);
const reduced = ref(false);
const intersecting = ref(typeof IntersectionObserver === 'undefined');
const pageVisible = ref(true);
const mounted = ref(false);
const cycleEndHoldMs = 800;
const clipId = `strategy-lesson-${useId().replace(/:/g, '')}`;
const lesson = computed(() => buildStrategyLesson(props.settings));
const paths = computed(() => ({
  price: lessonPath(lesson.value.price.map((point) => ({ ...point, x: plotX(point.x) }))),
  area: `${lessonPath(lesson.value.price.map((point) => ({ ...point, x: plotX(point.x) })))} L${plotWidth.value - 24},150 L24,150 Z`,
  fast: lessonPath(lesson.value.fast.map((point) => ({ ...point, x: plotX(point.x) }))),
  slow: lessonPath(lesson.value.slow.map((point) => ({ ...point, x: plotX(point.x) }))),
}));
const frame = computed(() =>
  strategyLessonFrame(lesson.value, reduced.value ? lesson.value.durationMs : elapsed.value)
);
const playing = computed(
  () =>
    mounted.value &&
    props.active &&
    !props.decision &&
    !paused.value &&
    !reduced.value &&
    intersecting.value &&
    pageVisible.value
);
const moving = computed(
  () =>
    playing.value ||
    Boolean(
      props.decision && props.active && props.calculating && !reduced.value && pageVisible.value && intersecting.value
    )
);
let animation = 0;
let lastFrame: number | null = null;
let observer: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let media: MediaQueryList | null = null;
const values = computed(() => ({
  input: props.inputSymbol || t('bots.flow.inputToken'),
  output: props.outputSymbol || t('bots.flow.outputToken'),
  amount: explainedTradeAmount(props.settings, props.inputDecimals),
  percent: props.settings.tradePercent,
  dip: props.settings.thresholdPercent,
  fast: props.settings.fastWindow,
  slow: props.settings.slowWindow,
  cadence:
    props.settings.intervalBlocks === undefined
      ? t('bots.flow.hourCadence', { hours: props.settings.intervalHours })
      : props.settings.intervalBlocks >= 600 && props.settings.intervalBlocks % 600 === 0
        ? t('bots.flow.hourCadence', { hours: props.settings.intervalBlocks / 600 })
        : t('bots.flow.blockCadence', { blocks: props.settings.intervalBlocks }),
}));
const signalPassed = computed(() => props.decision?.checks.some((check) => check.key === 'signal' && check.passed));
const budgetPassed = computed(() => {
  const checks = props.decision?.checks.filter((check) => check.key !== 'signal') ?? [];
  return checks.length === 4 && checks.every((check) => check.passed);
});
const decisionTime = computed(() => {
  const timestamp = props.decision?.signalTimestamp;
  return timestamp !== undefined && Number.isFinite(timestamp)
    ? `${new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC`
    : '—';
});
const caption = computed(() =>
  frame.value.phase === 'complete'
    ? t('bots.flowMotion.complete')
    : frame.value.phase === 'checks'
      ? t('bots.flowMotion.checks')
      : frame.value.phase === 'trade'
        ? t(`bots.flowMotion.${frame.value.event?.action ?? 'buy'}`, values.value)
        : frame.value.event
          ? t(`bots.flowMotion.events.${frame.value.event.kind}`)
          : t('bots.flowMotion.observe')
);
const stage = computed(() =>
  props.decision
    ? props.decision.selected
      ? 3
      : signalPassed.value
        ? 2
        : 1
    : { observe: 0, rule: 1, checks: 2, trade: 3, complete: 3 }[frame.value.phase]
);

/** Cancel the clock before any visibility change so resuming cannot jump over a lesson event. */
function stop(): void {
  if (animation) cancelAnimationFrame(animation);
  animation = 0;
  lastFrame = null;
}
/** Repeat the same lesson while visible, with a readable final frame and bounded steps on busy devices. */
function tick(timestamp: number): void {
  animation = 0;
  if (!playing.value) return;
  if (lastFrame !== null)
    elapsed.value =
      (elapsed.value + Math.max(0, Math.min(80, timestamp - lastFrame))) % (lesson.value.durationMs + cycleEndHoldMs);
  lastFrame = timestamp;
  if (playing.value) animation = requestAnimationFrame(tick);
}
/** Start at most one rendering callback; all other state changes suspend the same clock. */
function sync(): void {
  if (!playing.value) stop();
  else if (!animation) animation = requestAnimationFrame(tick);
}
/** Changed rule parameters reset the illustration without overriding a user's explicit pause. */
function resetLesson(): void {
  stop();
  elapsed.value = 0;
  sync();
}
/** Replay is an explicit local illustration action and never starts strategy evaluation. */
function replayLesson(): void {
  paused.value = false;
  resetLesson();
}
/** Pausing retains the exact playhead and instructional stage. */
function toggle(): void {
  paused.value = !paused.value;
}
/** Hidden documents must not consume frames or accumulate catch-up time. */
function visibility(): void {
  pageVisible.value = !document.hidden;
  sync();
}
/** Reduced-motion users receive the complete static example with every event marker. */
function motionPreference(): void {
  reduced.value = media?.matches ?? false;
  sync();
}
/** Map the lesson axis to the actual viewport while circles, strokes and text retain their size. */
function plotX(x: number): number {
  return 24 + ((x - 30) / 720) * (plotWidth.value - 48);
}
/** Resize geometry only; the active lesson keeps its position and event timing. */
function resizePlot(width: number): void {
  if (Number.isFinite(width) && width > 0) plotWidth.value = Math.max(240, width);
}
watch(playing, sync, { flush: 'sync' });
watch(
  [
    () => props.settings.preset,
    () => props.settings.fastWindow,
    () => props.settings.slowWindow,
    () => props.settings.thresholdPercent,
  ],
  resetLesson
);
onMounted(() => {
  if (root.value) resizePlot(root.value.getBoundingClientRect().width);
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resizeObserver = new ResizeObserver((entries) => resizePlot(entries[0]?.contentRect.width ?? 0));
    resizeObserver.observe(root.value);
  }
  pageVisible.value = !document.hidden;
  media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  reduced.value = media?.matches ?? false;
  media?.addEventListener?.('change', motionPreference);
  document.addEventListener('visibilitychange', visibility);
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    observer = new IntersectionObserver(
      (entries) => {
        intersecting.value = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { threshold: 0.05 }
    );
    observer.observe(root.value);
  }
  mounted.value = true;
  sync();
});
onBeforeUnmount(() => {
  mounted.value = false;
  stop();
  observer?.disconnect();
  resizeObserver?.disconnect();
  media?.removeEventListener?.('change', motionPreference);
  document.removeEventListener('visibilitychange', visibility);
});
</script>

<style scoped lang="scss">
.strategy-flow {
  --flow-ink: var(--s-color-base-content-primary);
  --flow-muted: var(--s-color-base-content-secondary);
  --flow-accent: var(--s-color-action-text, #ec6c95);
  --flow-line: var(--s-color-base-border-secondary);
  --flow-buy: #168a52;
  --flow-sell: #d63743;
  color: var(--flow-ink);
  min-width: 0;
  padding: 14px 0 0;
}
.flow-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.flow-heading h3 {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 550;
  line-height: 1.3;
  letter-spacing: -0.03em;
  text-transform: none;
}
.flow-kicker,
.flow-source {
  font-size: 9px;
  color: var(--flow-muted);
}
.flow-kicker {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.flow-source {
  display: flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}
.flow-source i {
  width: 5px;
  height: 5px;
  border: 1px solid currentColor;
  border-radius: 50%;
}
.lesson-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 17px 0 2px;
  color: var(--flow-muted);
  font-size: 11px;
}
.lesson-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lesson-legend i {
  width: 14px;
  border-top: 2px solid var(--flow-ink);
}
.lesson-legend .legend-fast {
  border-color: var(--flow-accent);
}
.lesson-legend .legend-slow {
  border-color: var(--flow-ink);
  border-top-style: dashed;
}
.lesson-legend .legend-threshold {
  border-color: var(--flow-accent);
  border-top-style: dashed;
}
.lesson-plot {
  display: block;
  width: 100%;
  height: 170px;
  overflow: visible;
}
.lesson-grid {
  stroke: var(--flow-line);
  stroke-width: 0.6;
  fill: none;
  opacity: 0.55;
}
.lesson-price,
.lesson-fast,
.lesson-slow {
  fill: none;
  stroke: var(--flow-ink);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.lesson-area {
  fill: var(--flow-accent);
  opacity: 0.045;
}
.lesson-trade {
  color: var(--flow-buy);
}
.lesson-trade.is-sell {
  color: var(--flow-sell);
}
.lesson-trade-halo {
  fill: currentColor;
  opacity: 0.14;
  transform-box: fill-box;
  transform-origin: center;
  animation: lesson-confirm 750ms ease-out both;
}
.strategy-flow[data-playing='false'] .lesson-trade-halo {
  animation-play-state: paused;
}
.lesson-trade-marker {
  fill: var(--s-color-base-background);
  stroke: currentColor;
  stroke-width: 2;
}
.lesson-trade text {
  fill: currentColor;
  font-size: 14px;
  font-weight: 650;
}
@keyframes lesson-confirm {
  from {
    transform: scale(0.35);
    opacity: 0.35;
  }
  to {
    transform: scale(1);
    opacity: 0.14;
  }
}
.lesson-fast {
  stroke: var(--flow-accent);
  stroke-width: 2.7;
}
.lesson-slow {
  stroke-dasharray: 4 3;
  stroke-width: 1.8;
}
.lesson-price.is-muted {
  opacity: 0.25;
  stroke-width: 1;
}
.lesson-price.is-preview,
.lesson-fast.is-preview,
.lesson-slow.is-preview {
  opacity: 0.15;
}
.lesson-threshold {
  stroke: var(--flow-accent);
  stroke-dasharray: 5 5;
  stroke-width: 1.2;
  opacity: 0.75;
}
.lesson-cadence {
  stroke: var(--flow-muted);
  stroke-width: 1;
  stroke-dasharray: 2 5;
  opacity: 0.3;
}
.lesson-playhead {
  stroke: var(--flow-accent);
  stroke-width: 0.8;
  opacity: 0.65;
}
.lesson-cursor {
  fill: var(--flow-accent);
  stroke: var(--s-color-base-background);
  stroke-width: 2;
}
.lesson-event {
  opacity: 0;
  color: var(--flow-buy);
}
.lesson-event.is-reached {
  opacity: 1;
}
.lesson-event.is-sell {
  color: var(--flow-sell);
}
.lesson-event circle {
  fill: var(--s-color-base-background);
  stroke: currentColor;
  stroke-width: 1.8;
}
.lesson-event text {
  fill: currentColor;
  font-size: 10px;
  font-weight: 700;
}
.lesson-axis {
  fill: var(--flow-muted);
  font-size: 9px;
}
.lesson-caption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 36px;
  margin-top: 3px;
}
.lesson-caption p {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}
.lesson-controls {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.lesson-controls button {
  padding: 3px 0;
  border: 0;
  background: none;
  color: var(--flow-muted);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}
.lesson-controls button:hover {
  color: var(--flow-ink);
}
.lesson-controls button:disabled {
  opacity: 0.4;
  cursor: default;
}
.lesson-controls button:focus-visible {
  outline: 2px solid var(--flow-accent);
  outline-offset: 3px;
}
.flow-stages {
  display: grid;
  grid-template-columns: repeat(4, #{'minmax(0, 1fr)'});
  list-style: none;
  margin: 9px 0 0;
  padding: 10px 0;
  border-top: 1px solid var(--flow-line);
  gap: 12px;
}
.flow-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 7px;
  min-width: 0;
  color: var(--flow-muted);
  transition: color 180ms ease;
}
.stage-number {
  font:
    9px ui-monospace,
    monospace;
}
.flow-stage h4 {
  font-size: 11px;
  font-weight: 450;
  margin: 0;
  line-height: 1.4;
}
.flow-stage.is-current {
  color: var(--flow-accent);
}
.stage-evidence {
  flex-basis: 100%;
  font-size: 10px;
  line-height: 1.5;
}
.flow-historical {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 24px 0;
  font-size: 14px;
}
.flow-historical time {
  font-size: 10px;
  color: var(--flow-muted);
}
.flow-details {
  padding: 8px 0 12px;
  color: var(--flow-muted);
  font-size: 11px;
  line-height: 1.7;
}
.flow-details summary {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 3px;
  }
}
.flow-details p {
  max-width: 820px;
  margin: 8px 0;
}
html[design-system-theme='dark'] .strategy-flow {
  --flow-buy: #83e3b2;
  --flow-sell: #ffa6b0;
}
@media (max-width: 600px) {
  .flow-heading {
    align-items: flex-start;
    gap: 8px;
    flex-direction: column;
  }
  .flow-heading h3 {
    font-size: 17px;
  }
  .lesson-legend {
    margin-top: 16px;
    gap: 10px;
    font-size: 11px;
  }
  .lesson-caption {
    align-items: flex-start;
    min-height: 44px;
  }
  .lesson-caption p {
    font-size: 11px;
  }
  .lesson-controls {
    gap: 10px;
  }
  .flow-stages {
    gap: 8px;
  }
  .flow-stage {
    gap: 4px;
  }
  .flow-stage h4 {
    font-size: 11px;
  }
  .flow-historical {
    flex-direction: column;
    gap: 7px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .strategy-flow * {
    animation: none;
    transition: none;
  }
}
</style>
