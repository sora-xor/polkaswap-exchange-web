<template>
  <section
    ref="root"
    class="rule-flow"
    data-testid="rule-flow"
    :data-source="model.source"
    :data-progress="frame.progress.toFixed(4)"
    :data-playing="playing"
    :data-outcome="current?.outcome ?? 'unavailable'"
    :data-complete="frame.complete"
    :data-duration-ms="model.durationMs"
  >
    <header class="rule-flow-heading">
      <h3>{{ t('bots.rules.flowTitle') }}</h3>
      <span>{{ t(model.source === 'historical' ? 'bots.rules.flowHistorical' : 'bots.rules.flowIllustrative') }}</span>
    </header>
    <template v-if="current">
      <div class="rule-flow-legend">
        <span><i class="price-key" />{{ t('bots.rules.flowPrice') }}</span>
        <span><i />{{ selectedLabel }}</span>
        <span><i class="threshold-key" />{{ t('bots.rules.flowThreshold') }}</span>
      </div>
      <svg
        class="rule-flow-plot"
        :viewBox="`0 0 ${width} 200`"
        role="img"
        :aria-label="t('bots.rules.flowChart')"
        data-testid="rule-flow-chart"
      >
        <defs>
          <clipPath :id="clipId"><rect x="0" y="0" :width="cursor.x" height="200" /></clipPath>
          <linearGradient :id="`${clipId}-scan`">
            <stop offset="0" stop-color="var(--rule-cyan)" stop-opacity="0" />
            <stop offset="1" stop-color="var(--rule-cyan)" stop-opacity="0.13" />
          </linearGradient>
          <linearGradient :id="`${clipId}-area`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--rule-accent)" stop-opacity="0.18" />
            <stop offset="1" stop-color="var(--rule-accent)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path v-for="row in [18, 92, 120, 180]" :key="row" :d="`M18 ${row}H${width - 18}`" class="plot-grid" />
        <path :d="paths.price" class="plot-price is-future" />
        <path :d="paths.value" class="plot-value is-future" />
        <path :d="paths.threshold" class="plot-threshold is-future" />
        <g :clip-path="`url(#${clipId})`">
          <path :d="paths.area" class="plot-area" :fill="`url(#${clipId}-area)`" />
          <path :d="paths.price" class="plot-price" />
          <path :d="paths.value" class="plot-value" />
          <path :d="paths.threshold" class="plot-threshold" />
        </g>
        <rect
          :x="Math.max(18, cursor.x - 60)"
          y="10"
          :width="Math.min(60, cursor.x - 18)"
          height="178"
          :fill="`url(#${clipId}-scan)`"
          class="plot-scan"
          aria-hidden="true"
          data-testid="rule-flow-scan"
        />
        <line
          :x1="cursor.x"
          :x2="cursor.x"
          y1="10"
          y2="188"
          class="plot-cursor-line"
          data-testid="rule-flow-playhead"
        />
        <circle :cx="cursor.x" :cy="cursor.y" r="9" class="plot-cursor-halo" aria-hidden="true" />
        <circle :cx="cursor.x" :cy="cursor.y" r="4" class="plot-cursor" />
        <circle
          v-if="selectedPoint"
          :cx="selectedPoint.x"
          :cy="selectedPoint.y"
          :r="frame.holding ? 6 : 4"
          class="plot-condition"
          :class="{ 'is-passed': selectedEvidence?.passed }"
        />
        <text x="18" y="110" class="plot-label">{{ t('bots.rules.flowIndicator') }}</text>
        <text :x="width - 18" y="110" text-anchor="end" class="plot-label">
          {{ valueLabel }} · {{ thresholdLabel }}
        </text>
      </svg>
      <div class="rule-flow-timeline" aria-hidden="true">
        <i :style="{ transform: `scaleX(${frame.progress})` }" data-testid="rule-flow-progress" />
      </div>
      <div class="rule-flow-groups">
        <div
          v-for="group in groups"
          :key="group.key"
          class="rule-flow-group"
          :class="{ 'is-met': current.evaluation.ready && group.passed }"
          :data-testid="`rule-flow-${group.key}`"
        >
          <strong class="group-name">{{ t(`bots.rules.flow${group.key === 'entry' ? 'Entry' : 'Exit'}`) }}</strong>
          <span class="group-operator">{{
            t(group.rule.operator === 'all' ? 'bots.rules.flowAll' : 'bots.rules.flowAny')
          }}</span>
          <div class="condition-list">
            <button
              v-for="(condition, index) in group.rule.conditions"
              :key="`${condition.kind}-${index}`"
              type="button"
              class="condition-tab"
              :class="{
                'is-selected': selected.group === group.key && selected.index === index,
                'is-passed': group.evidence[index]?.ready && group.evidence[index]?.passed,
              }"
              :aria-pressed="selected.group === group.key && selected.index === index"
              :title="evidenceTitle(group.evidence[index], condition)"
              :data-testid="`rule-flow-condition-${group.key}-${index}`"
              @click="select(group.key, index)"
            >
              <span aria-hidden="true">{{
                group.evidence[index]?.ready && group.evidence[index]?.passed ? '✓' : '·'
              }}</span>
              {{ t(`bots.rules.conditions.${condition.kind}`) }}
            </button>
          </div>
          <span aria-hidden="true" class="group-arrow">→</span>
          <span class="group-result">{{
            t(
              !current.evaluation.ready
                ? 'bots.rules.flowWarmup'
                : group.passed
                  ? 'bots.rules.flowPassed'
                  : 'bots.rules.flowFailed'
            )
          }}</span>
        </div>
      </div>
      <footer class="rule-flow-footer">
        <div class="rule-flow-result" role="status" aria-live="polite" data-testid="rule-flow-outcome">
          <strong :class="{ 'has-signal': current.outcome === 'buy' || current.outcome === 'sell' }">{{
            t(outcomeKey)
          }}</strong>
          <span>{{ t('bots.rules.flowSignalNote') }}</span>
        </div>
        <div class="rule-flow-controls">
          <span class="observation-count" data-testid="rule-flow-observation"
            >{{ frame.index + 1 }} / {{ model.observations.length }}</span
          >
          <button
            type="button"
            data-testid="rule-flow-toggle"
            :disabled="reduced"
            :aria-pressed="paused"
            @click="paused = !paused"
          >
            {{ t(paused ? 'bots.rules.flowResume' : 'bots.rules.flowPause') }}
          </button>
          <button type="button" data-testid="rule-flow-replay" :disabled="reduced" @click="replay">
            {{ t('bots.rules.flowReplay') }}
          </button>
        </div>
      </footer>
    </template>
    <p v-else class="rule-flow-empty">{{ t('bots.rules.flowUnavailable') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import {
  buildRuleFlow,
  formatRuleFlowValue,
  ruleFlowEvidence,
  ruleFlowFrame,
  ruleFlowPath,
  ruleFlowTrace,
} from '../rule-flow';
import type { RuleCondition, RuleEvidence, StrategyRules } from '../strategy-rules';
import type { BotCandle } from '../types';

/** Explain shared evaluator evidence, without implying a signal is an executed trade or future profit. */
const props = withDefaults(defineProps<{ rules: StrategyRules; active?: boolean; candles?: readonly BotCandle[] }>(), {
  active: true,
});
const { t } = useTranslation();
const root = ref<HTMLElement | null>(null);
const width = ref(780);
const elapsed = ref(0);
const paused = ref(false);
const reduced = ref(false);
const visible = ref(true);
const intersecting = ref(typeof IntersectionObserver === 'undefined');
const mounted = ref(false);
const cycleEndHoldMs = 800;
const selected = ref<{ group: 'entry' | 'exit'; index: number }>({ group: 'entry', index: 0 });
const clipId = `rule-flow-${useId().replace(/:/g, '')}`;
const model = computed(() => buildRuleFlow(props.rules, props.candles));
const frame = computed(() => ruleFlowFrame(model.value, reduced.value ? model.value.durationMs : elapsed.value));
const current = computed(() => model.value.observations[frame.value.index]);
const trace = computed(() => ruleFlowTrace(model.value, selected.value.group, selected.value.index, width.value));
const paths = computed(() => ({
  price: ruleFlowPath(trace.value.price),
  area: `${ruleFlowPath(trace.value.price)} L${width.value - 18},92 L18,92 Z`,
  value: ruleFlowPath(trace.value.value),
  threshold: ruleFlowPath(trace.value.threshold),
}));
const cursor = computed(() => {
  const points = trace.value.price;
  const a = points[frame.value.index] ?? { x: 18, y: 55 };
  const b = points[Math.min(points.length - 1, frame.value.index + 1)] ?? a;
  const fraction = frame.value.position - frame.value.index;
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
});
const selectedPoint = computed(() => {
  const points = trace.value.value;
  const a = points[frame.value.index];
  if (!a) return null;
  const b = points[Math.min(points.length - 1, frame.value.index + 1)] ?? a;
  const fraction = frame.value.position - frame.value.index;
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
});
const condition = computed(() => props.rules[selected.value.group]?.conditions[selected.value.index]);
const selectedLabel = computed(() =>
  condition.value ? t(`bots.rules.conditions.${condition.value.kind}`) : t('bots.rules.flowIndicator')
);
const selectedEvidence = computed(() =>
  current.value ? ruleFlowEvidence(current.value, selected.value.group, selected.value.index) : undefined
);
const valueLabel = computed(() => formatRuleFlowValue(selectedEvidence.value?.value, condition.value));
const thresholdLabel = computed(
  () =>
    `${condition.value?.direction === 'above' ? '>' : '<'} ${formatRuleFlowValue(selectedEvidence.value?.threshold, condition.value)}`
);
const groups = computed(() =>
  (['entry', 'exit'] as const).flatMap((key) => {
    const rule = props.rules[key];
    return rule && current.value
      ? [
          {
            key,
            rule,
            passed: current.value.evaluation[key],
            evidence:
              key === 'entry' ? current.value.evaluation.entryConditions : current.value.evaluation.exitConditions,
          },
        ]
      : [];
  })
);
const outcomeKey = computed(
  () =>
    `bots.rules.${({ buy: 'flowBuy', sell: 'flowSell', hold: 'flowHold', conflict: 'flowConflict', warmup: 'flowWarmup' } as const)[current.value?.outcome ?? 'warmup']}`
);
const playing = computed(
  () =>
    mounted.value &&
    props.active &&
    !paused.value &&
    !reduced.value &&
    visible.value &&
    intersecting.value &&
    model.value.observations.length > 1
);
// Parent renders can replace objects while preserving content; only semantic changes restart the lesson.
const contentKey = computed(() =>
  JSON.stringify([props.rules, props.candles?.slice(-250).map(({ timestamp, close }) => [timestamp, close])])
);
let animation = 0;
let previous: number | null = null;
let observer: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let media: MediaQueryList | null = null;

/** Selecting another condition keeps the same market observation and clock. */
function select(group: 'entry' | 'exit', index: number): void {
  selected.value = { group, index };
}
/** Screen readers can inspect the exact evidence behind each condition marker. */
function evidenceTitle(evidence: RuleEvidence | undefined, leaf: RuleCondition): string {
  return `${t(!evidence?.ready ? 'bots.rules.flowWarmup' : evidence.passed ? 'bots.rules.flowPassed' : 'bots.rules.flowFailed')} · ${formatRuleFlowValue(evidence?.value, leaf)} ${leaf.direction === 'above' ? '>' : '<'} ${formatRuleFlowValue(evidence?.threshold, leaf)}`;
}
/** Cancel before changing visibility so a resumed clock never catches up hidden time. */
function stop(): void {
  if (animation) cancelAnimationFrame(animation);
  animation = 0;
  previous = null;
}
/** Repeat the same observations, retaining the final evidence briefly before each new pass. */
function tick(timestamp: number): void {
  animation = 0;
  if (!playing.value) return;
  if (previous !== null)
    elapsed.value =
      (elapsed.value + Math.max(0, Math.min(80, timestamp - previous))) % (model.value.durationMs + cycleEndHoldMs);
  previous = timestamp;
  if (playing.value) animation = requestAnimationFrame(tick);
}
/** All lifecycle gates share one rendering clock. */
function sync(): void {
  if (!playing.value) stop();
  else if (!animation) animation = requestAnimationFrame(tick);
}
/** Updated rules restart their explanation while preserving the user's pause choice. */
function resetLesson(): void {
  stop();
  elapsed.value = 0;
  sync();
}
/** Replay only the rule explanation; it never invokes a backtest or trade. */
function replay(): void {
  paused.value = false;
  resetLesson();
}
/** Keep the SVG at actual CSS width so markers and text retain their pixel sizes. */
function resize(value: number): void {
  if (Number.isFinite(value) && value > 0) width.value = Math.max(240, value);
}
/** Hidden tabs suspend both motion and instructional time. */
function visibility(): void {
  visible.value = !document.hidden;
  sync();
}
/** Reduced motion renders the final evaluated observation without an autoplay clock. */
function motion(): void {
  reduced.value = media?.matches ?? false;
  sync();
}
watch(playing, sync, { flush: 'sync' });
watch(contentKey, () => {
  if (!props.rules[selected.value.group]?.conditions[selected.value.index])
    selected.value = { group: 'entry', index: 0 };
  resetLesson();
});
onMounted(() => {
  visible.value = !document.hidden;
  media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  reduced.value = media?.matches ?? false;
  media?.addEventListener?.('change', motion);
  document.addEventListener('visibilitychange', visibility);
  if (root.value) resize(root.value.getBoundingClientRect().width);
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resizeObserver = new ResizeObserver((entries) => resize(entries[0]?.contentRect.width ?? 0));
    resizeObserver.observe(root.value);
  }
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
  media?.removeEventListener?.('change', motion);
  document.removeEventListener('visibilitychange', visibility);
});
</script>

<style scoped lang="scss">
.rule-flow {
  --rule-accent: var(--s-color-action-text, #b84886);
  --rule-ink: var(--s-color-base-content-primary);
  --rule-muted: var(--s-color-base-content-secondary);
  --rule-line: var(--s-color-base-border-secondary);
  --rule-cyan: var(--bot-cyan, var(--s-color-status-success-text));
  --rule-surface: var(--bot-recess, var(--s-color-base-background));
  color: var(--rule-ink);
  min-width: 0;
  padding: 20px;
  border-radius: 18px;
  background: var(--rule-surface);
  box-shadow: var(--bot-shadow-inset, inset 3px 3px 8px rgb(0 0 0 / 8%));
  animation: flow-arrive 420ms ease-out both;
}
.rule-flow-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.rule-flow-heading h3 {
  font-size: 18px;
  line-height: 1.3;
  letter-spacing: -0.025em;
  font-weight: 550;
  text-transform: none;
  margin: 0;
}
.rule-flow-heading > span {
  font-size: 12px;
  color: var(--rule-muted);
}
.rule-flow-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 16px 0 1px;
  font-size: 12px;
  color: var(--rule-muted);
}
.rule-flow-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.rule-flow-legend i {
  width: 14px;
  border-top: 2px solid var(--rule-accent);
}
.rule-flow-legend .price-key {
  border-color: var(--rule-ink);
}
.rule-flow-legend .threshold-key {
  border-color: var(--rule-muted);
  border-top-style: dashed;
}
.rule-flow-plot {
  display: block;
  width: 100%;
  height: 200px;
  overflow: visible;
  margin-block: 8px;
}
.plot-grid {
  fill: none;
  stroke: var(--rule-line);
  stroke-width: 0.6;
  opacity: 0.5;
}
.plot-price,
.plot-value,
.plot-threshold {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.plot-price {
  stroke: var(--rule-ink);
  stroke-width: 1.8;
}
.plot-value {
  stroke: var(--rule-accent);
  stroke-width: 2.5;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--rule-accent) 32%, transparent));
}
.plot-threshold {
  stroke: var(--rule-muted);
  stroke-width: 1.3;
  stroke-dasharray: 5 4;
}
.is-future {
  opacity: 0.15;
}
.plot-scan {
  opacity: 0;
}
.rule-flow[data-playing='true'] .plot-scan {
  opacity: 1;
}
.plot-cursor-line {
  stroke: var(--rule-cyan);
  stroke-width: 0.8;
  opacity: 0.55;
}
.plot-cursor-halo {
  fill: var(--rule-cyan);
  opacity: 0.12;
}
.plot-cursor {
  fill: var(--rule-cyan);
  stroke: var(--rule-surface);
  stroke-width: 2;
}
.plot-condition {
  fill: var(--rule-surface);
  stroke: var(--rule-accent);
  stroke-width: 2;
}
.plot-condition.is-passed {
  fill: var(--rule-accent);
}
.plot-label {
  font-size: 11px;
  fill: var(--rule-muted);
}
.rule-flow-timeline {
  height: 3px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--rule-line);
  margin: 2px 0 12px;
}
.rule-flow-timeline i {
  display: block;
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, var(--rule-accent), var(--rule-cyan));
}
.rule-flow-groups {
  padding: 5px 0;
}
.rule-flow-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px 0;
  font-size: 13px;
}
.group-name {
  font-weight: 550;
  width: 40px;
  flex-shrink: 0;
}
.group-operator {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--rule-muted);
  width: 28px;
  flex-shrink: 0;
}
.condition-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  flex: 1;
  min-width: 0;
}
.condition-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--rule-muted);
  font: inherit;
  font-size: 13px;
  background: var(--s-color-utility-surface);
  box-shadow: var(--bot-shadow-raised, 2px 2px 5px rgb(0 0 0 / 6%));
  cursor: pointer;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}
.condition-tab:hover {
  color: var(--rule-ink);
  transform: translateY(-1px);
}
.condition-tab:active {
  transform: translateY(1px);
}
.condition-tab.is-selected {
  color: var(--rule-ink);
  border-color: color-mix(in srgb, var(--rule-accent) 55%, transparent);
  box-shadow: var(--bot-shadow-inset, inset 2px 2px 5px rgb(0 0 0 / 8%));
}
.condition-tab.is-passed > span,
.rule-flow-group.is-met .group-result,
.rule-flow-group.is-met .group-arrow {
  color: var(--rule-accent);
}
.group-result {
  color: var(--rule-muted);
  font-size: 12px;
}
.group-arrow {
  color: var(--rule-muted);
}
.rule-flow[data-playing='true'] .rule-flow-group.is-met .group-arrow {
  animation: signal-travel 900ms ease-in-out infinite;
}
.rule-flow-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--rule-line);
  padding: 12px 0 0;
}
.rule-flow-result {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px 12px;
}
.rule-flow-result strong {
  font-size: 16px;
  font-weight: 550;
}
.rule-flow-result strong.has-signal {
  color: var(--rule-accent);
}
.rule-flow-result > span {
  font-size: 11px;
  color: var(--rule-muted);
}
.rule-flow-controls {
  display: flex;
  gap: 13px;
  align-items: center;
  flex-shrink: 0;
}
.rule-flow-controls button {
  border: 0;
  background: none;
  color: var(--rule-muted);
  padding: 5px 0;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.rule-flow-controls button:disabled {
  opacity: 0.4;
  cursor: default;
}
.observation-count {
  color: var(--rule-muted);
  font:
    11px ui-monospace,
    monospace;
}
.rule-flow button:focus-visible {
  outline: 2px solid var(--rule-accent);
  outline-offset: 3px;
}
.rule-flow-empty {
  min-height: 200px;
  display: grid;
  place-items: center;
  color: var(--rule-muted);
  font-size: 14px;
}
@keyframes flow-arrive {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes signal-travel {
  50% {
    transform: translateX(3px);
  }
}
@media (max-width: 600px) {
  .rule-flow {
    padding: 15px 12px;
    border-radius: 12px;
  }
  .rule-flow-heading {
    flex-direction: column;
    gap: 5px;
  }
  .rule-flow-heading h3 {
    font-size: 17px;
  }
  .rule-flow-legend {
    gap: 12px;
  }
  .rule-flow-group {
    gap: 7px;
    align-items: baseline;
  }
  .group-name {
    width: 35px;
  }
  .group-operator {
    width: 25px;
  }
  .condition-list {
    gap: 5px;
  }
  .condition-tab {
    padding: 5px 6px;
    font-size: 12px;
  }
  .group-result {
    max-width: 60px;
    font-size: 11px;
  }
  .rule-flow-footer {
    align-items: flex-start;
    gap: 12px;
  }
  .rule-flow-result {
    flex-direction: column;
    gap: 4px;
  }
  .rule-flow-result > span {
    max-width: 220px;
    line-height: 1.4;
  }
  .rule-flow-controls {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .observation-count {
    width: 100%;
    text-align: right;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rule-flow,
  .rule-flow[data-playing='true'] .group-arrow {
    animation: none;
  }
  .rule-flow button {
    transition: none;
  }
  .condition-tab:hover,
  .condition-tab:active {
    transform: none;
  }
  .plot-scan {
    display: none;
  }
}
</style>
