<template>
  <section
    ref="root"
    class="studio"
    :class="{ 'studio--calm': calm }"
    :style="{ '--studio-motion': calm ? 'paused' : 'running' }"
    data-testid="quant-studio"
    :aria-labelledby="titleId"
    :aria-busy="status !== 'ready'"
  >
    <header class="studio-head">
      <div class="studio-head-copy">
        <h3 :id="titleId">{{ t('bots.studio.title') }}</h3>
        <p>{{ t('bots.studio.intro') }}</p>
      </div>
      <ol class="studio-steps" data-testid="studio-steps">
        <li v-for="(step, index) in STEPS" :key="step">
          <span aria-hidden="true">{{ index + 1 }}</span
          >{{ t(`bots.studio.steps.${step}`) }}
        </li>
      </ol>
    </header>

    <p v-if="statusText" class="studio-status" role="status" data-testid="studio-status">
      <i class="studio-pulse" :class="status" aria-hidden="true" />{{ statusText }}
      <button
        v-if="status === 'error'"
        type="button"
        class="studio-link"
        data-testid="studio-retry"
        @click="studio.retry()"
      >
        {{ t('bots.quant.retry') }}
      </button>
    </p>

    <div class="studio-pickers">
      <div class="studio-row">
        <span :id="`${titleId}-market`" class="studio-label">{{ t('bots.studio.market') }}</span>
        <div class="studio-chips" role="radiogroup" :aria-labelledby="`${titleId}-market`">
          <button
            v-for="market in markets"
            :key="market.symbol"
            type="button"
            role="radio"
            class="studio-chip"
            :aria-checked="studio.market.value === market.symbol"
            :disabled="!market.tradable"
            :title="
              market.tradable ? undefined : t('bots.quant.thinNote', { depth: formatDepth(market.medianXorDepth) })
            "
            :data-testid="`studio-market-${market.symbol}`"
            @click="studio.setMarket(market.symbol)"
          >
            {{ market.symbol }}
          </button>
        </div>
      </div>
      <div class="studio-row">
        <span :id="`${titleId}-idea`" class="studio-label">{{ t('bots.studio.idea') }}</span>
        <div class="studio-recipes" role="radiogroup" :aria-labelledby="`${titleId}-idea`">
          <button
            v-for="recipe in STUDIO_RECIPES"
            :key="recipe.id"
            type="button"
            role="radio"
            class="studio-recipe"
            :aria-checked="state.recipe === recipe.id"
            :data-testid="`studio-recipe-${recipe.id}`"
            @click="studio.setRecipe(recipe.id)"
          >
            <svg viewBox="0 0 48 24" aria-hidden="true"><path :d="GLYPHS[recipe.id]" /></svg>
            <span>{{ t(`bots.studio.recipes.${recipe.id}.name`) }}</span>
            <small v-if="!recipe.readyMade">{{ t('bots.studio.newIdea') }}</small>
          </button>
        </div>
      </div>
      <p class="studio-idea" data-testid="studio-idea">{{ t(`bots.studio.recipes.${state.recipe}.idea`) }}</p>
    </div>

    <div class="studio-main">
      <section class="studio-panel studio-panel--landscape" :aria-labelledby="`${titleId}-landscape`">
        <header class="studio-panel-head">
          <h4 :id="`${titleId}-landscape`">{{ t('bots.studio.landscape.title') }}</h4>
          <p>{{ t('bots.studio.landscape.caption') }}</p>
        </header>
        <QuantTerrain
          :landscape="landscape"
          :selected="axisSelection"
          :x-label="paramLabel(recipe.axes[0])"
          :y-label="paramLabel(recipe.axes[1])"
          :format-x="(value) => formatValue(recipe.axes[0], value)"
          :format-y="(value) => formatValue(recipe.axes[1], value)"
          :format-percent="formatFraction"
          :height-label="t('bots.studio.landscape.height')"
          :color-label="t('bots.studio.landscape.color')"
          :help="t('bots.studio.landscape.help')"
          :aria-label="t('bots.studio.landscape.title')"
          :describe="describeCell"
          :busy="studio.pending.landscape"
          :paused="calm"
          @select="selectCell"
          @hover="hoverCell"
        >
          <template #tooltip="{ x, y }">
            <template v-if="probeFor({ [recipe.axes[0]]: x, [recipe.axes[1]]: y })">
              <span
                >{{ t('bots.studio.result.first') }}
                <b>{{ signed(probeFor({ [recipe.axes[0]]: x, [recipe.axes[1]]: y })!.first.returnPercent) }}</b></span
              >
              <span
                >{{ t('bots.studio.result.second') }}
                <b>{{ signed(probeFor({ [recipe.axes[0]]: x, [recipe.axes[1]]: y })!.second.returnPercent) }}</b></span
              >
            </template>
            <span v-else>{{ t('bots.studio.calculating') }}</span>
            <em>{{ t('bots.studio.landscape.pick') }}</em>
          </template>
        </QuantTerrain>
      </section>

      <aside
        class="studio-panel studio-panel--result"
        :aria-labelledby="`${titleId}-result`"
        data-testid="studio-result"
      >
        <header class="studio-panel-head">
          <h4 :id="`${titleId}-result`">{{ t('bots.studio.result.title') }}</h4>
          <span v-if="studio.pending.replay" class="studio-busy">{{ t('bots.studio.calculating') }}</span>
        </header>
        <dl class="studio-halves" :class="{ 'is-pending': !replayCurrent }" aria-live="polite">
          <div class="studio-half">
            <dt>
              {{ t('bots.studio.result.first') }}<small>{{ halfRange(replay?.first) }}</small>
            </dt>
            <dd :class="tone(replay?.first.returnPercent)" data-testid="studio-first">
              {{ signed(replay?.first.returnPercent) }}
            </dd>
            <span>{{ t('bots.quant.priceChange', { symbol }) }} {{ signed(replay?.first.holdPercent) }}</span>
          </div>
          <div class="studio-half studio-half--check">
            <dt>
              {{ t('bots.studio.result.second') }}<small>{{ halfRange(replay?.second) }}</small>
            </dt>
            <dd :class="tone(replay?.second.returnPercent)" data-testid="studio-second">
              {{ signed(replay?.second.returnPercent) }}
            </dd>
            <span>{{ t('bots.quant.priceChange', { symbol }) }} {{ signed(replay?.second.holdPercent) }}</span>
          </div>
          <div class="studio-stat">
            <dt>{{ t('bots.quant.drawdown') }}</dt>
            <dd data-testid="studio-drop">{{ biggestDrop }}</dd>
          </div>
          <div class="studio-stat">
            <dt>{{ t('bots.quant.trades') }}</dt>
            <dd data-testid="studio-trades">{{ replay ? replay.first.trades + replay.second.trades : '—' }}</dd>
          </div>
        </dl>
        <p v-if="cadenceText" class="studio-cadence" data-testid="studio-cadence">{{ cadenceText }}</p>
        <dl v-if="candidate" class="studio-rule" :aria-label="t('bots.quant.rule.label')">
          <div>
            <dt>{{ t('bots.quant.rule.buy', { amount: state.values.amount }) }}</dt>
            <dd v-for="(leaf, index) in candidate.rules.entry.conditions" :key="`entry-${index}`">
              {{ leafText(leaf) }}
            </dd>
          </div>
          <div v-if="candidate.rules.exit?.conditions.length">
            <dt>
              {{ t(candidate.rules.exit.operator === 'any' ? 'bots.studio.rule.sellAny' : 'bots.quant.rule.sell') }}
            </dt>
            <dd v-for="(leaf, index) in candidate.rules.exit.conditions" :key="`exit-${index}`">
              {{ leafText(leaf) }}
            </dd>
          </div>
        </dl>
        <div class="studio-settings">
          <div v-for="param in recipe.params" :key="`${recipe.id}-${param.key}`" class="studio-setting">
            <label :for="`${titleId}-${param.key}`">
              {{ paramLabel(param.key) }} <strong>{{ formatValue(param.key, state.values[param.key]) }}</strong>
            </label>
            <input
              v-if="param.values.length > 5"
              :id="`${titleId}-${param.key}`"
              type="range"
              min="0"
              :max="param.values.length - 1"
              step="1"
              :value="Math.max(0, param.values.indexOf(state.values[param.key]))"
              :aria-valuetext="formatValue(param.key, state.values[param.key])"
              :data-testid="`studio-param-${param.key}`"
              @input="onRange(param.key, $event)"
            />
            <div
              v-else
              :id="`${titleId}-${param.key}`"
              class="studio-segments"
              role="radiogroup"
              :aria-label="paramLabel(param.key)"
            >
              <button
                v-for="value in param.values"
                :key="value"
                type="button"
                role="radio"
                :aria-checked="state.values[param.key] === value"
                :data-testid="`studio-param-${param.key}-${value}`"
                @click="studio.setValues({ [param.key]: value })"
              >
                {{ formatValue(param.key, value) }}
              </button>
            </div>
          </div>
        </div>
        <p v-if="prepareError" class="studio-error" role="alert">{{ t(prepareError) }}</p>
        <div class="studio-actions">
          <button type="button" class="studio-primary" data-testid="studio-paper" :disabled="!canPaper" @click="paper">
            {{ preparing ? t('bots.quant.preparing') : t('bots.quant.paper') }}
          </button>
          <RouterLink class="studio-link" data-testid="studio-lab" :to="labLink"
            >{{ t('bots.studio.openLab') }} ↗</RouterLink
          >
        </div>
        <p class="studio-note">{{ t('bots.studio.fairness') }}</p>
      </aside>
    </div>

    <section class="studio-panel" :aria-labelledby="`${titleId}-chart`">
      <header class="studio-panel-head">
        <h4 :id="`${titleId}-chart`">{{ t('bots.studio.chart.title') }}</h4>
        <p>{{ t(recipe.buyLine ? 'bots.studio.chart.caption' : 'bots.studio.chart.captionNoLines') }}</p>
      </header>
      <QuantSignalChart
        :series="series"
        :replay="replay"
        :replay-current="replayCurrent"
        :recipe="recipe"
        :values="state.values"
        :labels="chartLabels"
        :format-line="formatLine"
        :format-percent="formatFraction"
        :format-price="formatPrice"
        :format-date="formatDate"
        :summary="chartSummary"
        :busy="studio.pending.series"
        :paused="calm"
        @change="studio.setValues"
      />
    </section>

    <section class="studio-panel" :aria-labelledby="`${titleId}-parallel`">
      <header class="studio-panel-head">
        <h4 :id="`${titleId}-parallel`">{{ t('bots.studio.parallel.title') }}</h4>
        <p>{{ t('bots.studio.parallel.caption') }}</p>
      </header>
      <QuantParallel
        :axes="parallelAxes"
        :data="grid?.recipe === state.recipe ? grid.data : null"
        :columns="grid?.recipe === state.recipe ? grid.columns : []"
        :rows="grid?.recipe === state.recipe ? grid.rows : 0"
        color-key="second"
        :current="currentRow"
        :aria-label="t('bots.studio.parallel.title')"
        :help="t('bots.studio.parallel.help')"
        :clear-label="t('bots.studio.parallel.clear')"
        :count-label="(shown, total) => t('bots.studio.parallel.count', { shown: number(shown), total: number(total) })"
        :busy="studio.pending.grid"
        :paused="calm"
        @select="selectRow"
        @hover="hoverRow"
      >
        <template #tooltip="{ row }">
          <strong>{{ rowSummary(row) }}</strong>
          <template v-if="probeFor(rowValues(row))">
            <span
              >{{ t('bots.studio.result.first') }}
              <b>{{ signed(probeFor(rowValues(row))!.first.returnPercent) }}</b></span
            >
            <span
              >{{ t('bots.studio.result.second') }}
              <b>{{ signed(probeFor(rowValues(row))!.second.returnPercent) }}</b></span
            >
          </template>
          <span v-else>{{ t('bots.studio.calculating') }}</span>
          <em>{{ t('bots.studio.parallel.pick') }}</em>
        </template>
      </QuantParallel>
    </section>

    <p v-if="info && studio.costs.value" class="studio-disclaimer" data-testid="studio-disclaimer">
      {{
        t('bots.quant.disclaimer', {
          start: formatDate(info.startAt),
          end: formatDate(info.endAt),
          fee: Number(studio.costs.value.networkFeeXor).toFixed(4),
          swap: String(Number(studio.costs.value.swapFeePercent)),
        })
      }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, toRef, useId, watch } from 'vue';
import { routeLocationKey } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';
import { PageNames } from '@/consts/navigation';
import { encodeRuleShare } from '@/features/bot-trading/rule-recipes';
import {
  STUDIO_RECIPES,
  normalizeStudioState,
  studioCandidate,
  studioRecipe,
  type StudioHalf,
  type StudioParam,
  type StudioRecipeId,
} from '@/features/bot-trading/quant-studio';
import { studioPaperPayload, createStudioBot } from '@/features/bot-trading/quant-studio-deploy';
import { useQuantStudio } from '@/features/bot-trading/useQuantStudio';
import QuantParallel from './QuantParallel.vue';
import QuantSignalChart from './QuantSignalChart.vue';
import QuantTerrain from './QuantTerrain.vue';
import type { ParallelAxis, SignalChartLabels } from './studio-types';
import type { QuantDeployPayload } from '@/features/bot-trading/quant-deploy';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { RuleCondition } from '@/features/bot-trading/strategy-rules';
import type { BotAsset, BotDefinition } from '@/features/bot-trading/types';

defineOptions({ name: 'QuantStudio' });

/**
 * Strategy Studio: build a rule bot by exploring the archive visually. Users pick a market and
 * an idea, then tune it on a 3D landscape, by dragging lines on the chart, or by brushing the
 * parallel view; every view follows the same choice. Paper trade hands a reviewed template to
 * the page's paper flow; nothing here signs, saves or starts a bot by itself.
 */
const props = defineProps<{
  assets: BotAsset[];
  loadFees: (bot: BotDefinition, settings: { slippagePercent: string }) => Promise<ResearchFeeSnapshot>;
  busy: boolean;
}>();
const emit = defineEmits<{ paper: [payload: QuantDeployPayload] }>();

const STEPS = ['pick', 'tune', 'check', 'paper'] as const;
/** Small sparkline glyph per idea, drawn in a 48×24 box. */
const GLYPHS: Record<StudioRecipeId, string> = {
  dip: 'M2 8L12 9L20 19L28 12L36 9L46 6M2 12H46',
  'steady-dip': 'M2 9L12 10L20 18L28 12L46 8M2 13H46M2 4H46',
  drop: 'M2 6L18 7L20 20L30 12L46 9',
  oversold: 'M2 4L8 8L12 6L18 12L22 10L28 18L34 12L46 5',
  peak: 'M2 18L12 6L18 4L24 10L30 19L38 14L46 12M2 4H22',
  'rare-drop': 'M2 10L6 9L10 11L14 9L18 11L22 21L26 11L34 10L46 9',
  rebound: 'M2 8L12 10L18 19L24 6L32 9L46 8',
  range: 'M2 12L8 7L14 17L20 7L26 19L32 7L38 17L46 12M2 4H46M2 20H46',
  elastic: 'M2 12C8 4 10 20 16 12S24 4 30 12S38 20 46 12',
  trend: 'M2 20L12 16L20 17L30 9L38 10L46 3M2 18L46 6',
  breakout: 'M2 14L10 12L18 15L26 12L32 13L46 2M2 10H46',
};
/** Recipes whose shared parameter keys need a more specific label. */
const LABEL_OVERRIDES: Partial<Record<StudioRecipeId, Record<string, string>>> = {
  oversold: { window: 'rsiWindow' },
  peak: { window: 'peakWindow' },
  breakout: { window: 'highWindow', exitWindow: 'lowWindow' },
  range: { filterWindow: 'choppyWindow' },
  elastic: { filterWindow: 'pullWindow' },
};
const IDLE_MS = 60_000;
/** Plain-language rule texts for the conditions the recipes use, beyond the bot cards' own. */
const STUDIO_RULE_TEXT = new Set(['rsiBelow', 'drawdownBelow', 'efficiencyBelow', 'restoringAbove']);

const { t, language } = useTranslation();
const titleId = useId();
const root = ref<HTMLElement | null>(null);
const studio = useQuantStudio(toRef(props, 'assets'), { loadFees: props.loadFees });
const route = inject(routeLocationKey, null);
const preparing = ref(false);
const prepareError = ref('');

const status = computed(() => studio.status.value);
const info = computed(() => studio.info.value);
const state = computed(() => studio.state.value);
const recipe = computed(() => studioRecipe(state.value.recipe));
const landscape = computed(() =>
  studio.landscape.value?.recipe === state.value.recipe ? studio.landscape.value : null
);
const series = computed(() => (studio.series.value?.recipe === state.value.recipe ? studio.series.value : null));
const replay = computed(() => studio.replay.value);
const grid = computed(() => studio.grid.value);
const candidate = computed(() => studioCandidate(state.value));
/** The shown replay belongs to the current choice (otherwise it is dimmed until the new one lands). */
const replayCurrent = computed(() => replay.value?.candidate.id === candidate.value.id && !studio.pending.replay);
const symbol = computed(() => studio.market.value);
const markets = computed(() => info.value?.markets ?? []);
const axisSelection = computed(() => ({
  x: state.value.values[recipe.value.axes[0]],
  y: state.value.values[recipe.value.axes[1]],
}));

/* ---------------------------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------------------------- */

/** The app language as an Intl locale; unsupported or custom tags fall back to the browser default. */
const locale = computed(() => {
  const tag = (language?.value ?? '').replace('_', '-');
  try {
    return tag && Intl.DateTimeFormat.supportedLocalesOf([tag]).length ? tag : undefined;
  } catch {
    return undefined;
  }
});
const number = (value: number, digits = 0) =>
  value.toLocaleString(locale.value, { minimumFractionDigits: 0, maximumFractionDigits: digits });
const formatDepth = (value: number) => number(value, value < 10 ? 2 : 0);
const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' });
/** Exact two-decimal percentage strings, shown with one decimal like the bot cards. */
const signed = (value?: string) => {
  if (value === undefined) return '—';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toLocaleString(locale.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};
const tone = (value?: string) => (!value || Number(value) === 0 ? 'flat' : Number(value) > 0 ? 'up' : 'down');
/** Scale labels for the views, from fractions. */
const formatFraction = (fraction: number) => {
  // `|| 0` turns a rounded negative zero into a plain zero.
  const percent = Math.round(fraction * 100) || 0;
  return `${percent > 0 ? '+' : ''}${number(percent)}%`;
};
const formatPrice = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString(locale.value, { maximumSignificantDigits: 3 }) : '—';
const paramOf = (key: string): StudioParam | undefined => recipe.value.params.find((param) => param.key === key);
function formatValue(key: string, value: number): string {
  if (!Number.isFinite(value)) return '—';
  const unit = paramOf(key)?.unit ?? 'percent';
  return t(`bots.studio.units.${unit}`, { value: number(value, 1) });
}
/** Setting names, shared by the controls, the landscape axes and the parallel view. */
function paramLabel(key: string): string {
  return t(`bots.studio.params.${LABEL_OVERRIDES[state.value.recipe]?.[key] ?? key}`);
}
function halfRange(half?: StudioHalf): string {
  return half ? `${formatDate(half.startAt)} – ${formatDate(half.endAt)}` : '';
}
const biggestDrop = computed(() => {
  const value = replay.value;
  if (!value) return '—';
  const first = BigInt(value.first.drawdownPercent.replace('.', ''));
  const second = BigInt(value.second.drawdownPercent.replace('.', ''));
  return `${first > second ? value.first.drawdownPercent : value.second.drawdownPercent}%`;
});
const cadenceText = computed(() => {
  const cadence = replay.value?.cadence;
  if (!cadence?.daysPerEpisode || !cadence.holdHours) return '';
  const hold =
    cadence.holdHours.max >= 48
      ? t('bots.quant.cadence.holdDays', {
          min: Math.max(1, Math.round(cadence.holdHours.min / 24)),
          max: Math.ceil(cadence.holdHours.max / 24),
        })
      : t('bots.quant.cadence.holdHours', { min: cadence.holdHours.min, max: cadence.holdHours.max });
  return [t('bots.quant.cadence.every', { days: cadence.daysPerEpisode }), hold].join(' · ');
});
/** A rule leaf in plain words, reusing the bot cards' wording where it exists. */
function leafText(leaf: RuleCondition): string {
  const side = leaf.direction === 'above' ? 'Above' : 'Below';
  if (leaf.kind === 'breakout') return t(`bots.quant.rule.breakout${side}`, { window: leaf.window });
  if (leaf.kind === 'return-quantile' && side === 'Below')
    return t('bots.studio.rule.quantileBelow', { window: leaf.window, percentile: leaf.percentile });
  if (!('threshold' in leaf)) return leaf.kind;
  const value = Number(leaf.threshold);
  const shown = `${value > 0 && (leaf.kind === 'deviation' || leaf.kind === 'momentum') ? '+' : ''}${number(value, 1)}`;
  if (leaf.kind === 'deviation' || leaf.kind === 'momentum')
    return t(`bots.quant.rule.${leaf.kind}${side}`, { window: leaf.window, value: shown });
  const key = `${leaf.kind}${side}`;
  return STUDIO_RULE_TEXT.has(key) ? t(`bots.studio.rule.${key}`, { window: leaf.window, value: shown }) : leaf.kind;
}
/** Indicator values on the chart: percentages for price measures, plain levels for up-move share. */
function formatLine(role: 'buy' | 'sell', value: number): string {
  const line = role === 'buy' ? recipe.value.buyLine : recipe.value.sellLine;
  const kind = line?.indicator(state.value.values).kind;
  if (!Number.isFinite(value)) return '—';
  if (kind === 'rsi') return number(value, 0);
  return `${value > 0 ? '+' : ''}${number(value, Math.abs(value) < 10 ? 1 : 0)}%`;
}
const chartLabels = computed<SignalChartLabels>(() => {
  const buyKind = recipe.value.buyLine?.indicator(state.value.values);
  const sellKind = recipe.value.sellLine?.indicator(state.value.values);
  const panel = (leaf?: RuleCondition) =>
    leaf ? t(`bots.studio.chart.indicators.${leaf.kind}`, { window: leaf.window }) : '';
  return {
    price: t('bots.studio.chart.price', { symbol: symbol.value }),
    buyPanel: panel(buyKind),
    sellPanel: panel(sellKind),
    equity: t('bots.studio.chart.equity'),
    first: t('bots.studio.chart.first'),
    second: t('bots.studio.chart.second'),
    buys: t('bots.studio.chart.buys'),
    sells: t('bots.studio.chart.sells'),
    bot: t('bots.quant.equity.strategy'),
    hold: t('bots.quant.priceChange', { symbol: symbol.value }),
    replay: t('bots.studio.chart.replay'),
    stop: t('bots.studio.chart.stop'),
    buyHandle: recipe.value.buyLine ? paramLabel(recipe.value.buyLine.param) : '',
    sellHandle: recipe.value.sellLine ? paramLabel(recipe.value.sellLine.param) : '',
  };
});
const chartSummary = computed(() => {
  const value = replay.value;
  if (!value || !replayCurrent.value) return '';
  const fills = [...value.first.fills, ...value.second.fills];
  return t('bots.studio.chart.summary', {
    buys: fills.filter((fill) => fill.side === 'buy').length,
    sells: fills.filter((fill) => fill.side === 'sell').length,
  });
});

/* ---------------------------------------------------------------------------------------------
 * Landscape and parallel view
 * ------------------------------------------------------------------------------------------- */

/** The exact probe for a choice that differs from the current one in the given values, if ready. */
function probeFor(values: Record<string, number>) {
  const target = normalizeStudioState({ recipe: state.value.recipe, values: { ...state.value.values, ...values } });
  const result = studio.probeResult.value;
  return result && result.key === studio.probeKey(target) ? result.replay : null;
}
function hoverCell(cell: { x: number; y: number } | null): void {
  if (!cell) return;
  studio.probe({
    recipe: state.value.recipe,
    values: { ...state.value.values, [recipe.value.axes[0]]: cell.x, [recipe.value.axes[1]]: cell.y },
  });
}
function selectCell(cell: { x: number; y: number }): void {
  studio.setValues({ [recipe.value.axes[0]]: cell.x, [recipe.value.axes[1]]: cell.y });
}
function describeCell(x: number, y: number): string {
  return t('bots.studio.landscape.describe', {
    x: `${paramLabel(recipe.value.axes[0])} ${formatValue(recipe.value.axes[0], x)}`,
    y: `${paramLabel(recipe.value.axes[1])} ${formatValue(recipe.value.axes[1], y)}`,
  });
}
const parallelAxes = computed<ParallelAxis[]>(() => [
  ...recipe.value.params.map((param) => ({
    key: param.key,
    label: paramLabel(param.key),
    format: (value: number) => formatValue(param.key, value),
    domain: [param.values[0], param.values[param.values.length - 1]] as [number, number],
  })),
  {
    key: 'trades',
    label: t('bots.studio.outcomes.trades'),
    format: (value: number) => number(value),
    floor: 0,
    baseline: 0,
  },
  {
    key: 'maxDrop',
    label: t('bots.studio.outcomes.maxDrop'),
    format: (value: number) => formatFraction(-value),
    floor: 0,
    baseline: 0,
    ceil: 1,
    invert: true,
  },
  { key: 'first', label: t('bots.studio.outcomes.first'), format: formatFraction, floor: -1 },
  { key: 'second', label: t('bots.studio.outcomes.second'), format: formatFraction, floor: -1 },
]);
/** Settings of a parallel-view row; empty while the grid still belongs to another idea. */
function rowValues(row: number): Record<string, number> {
  const value = grid.value;
  if (!value || value.recipe !== state.value.recipe || row < 0 || row >= value.rows) return {};
  const values: Record<string, number> = {};
  recipe.value.params.forEach((param) => {
    const column = value.columns.indexOf(param.key);
    if (column >= 0) values[param.key] = value.data[row * value.columns.length + column];
  });
  return values;
}
function rowSummary(row: number): string {
  const values = rowValues(row);
  return recipe.value.params
    .filter((param) => values[param.key] !== undefined)
    .map((param) => formatValue(param.key, values[param.key]))
    .join(' · ');
}
const currentRow = computed(() => {
  const value = grid.value;
  if (!value || value.recipe !== state.value.recipe) return -1;
  const columns = recipe.value.params.map((param) => value.columns.indexOf(param.key));
  for (let row = 0; row < value.rows; row++)
    if (
      recipe.value.params.every(
        (param, index) => value.data[row * value.columns.length + columns[index]] === state.value.values[param.key]
      )
    )
      return row;
  return -1;
});
function hoverRow(row: number | null): void {
  if (row !== null) studio.probe({ recipe: state.value.recipe, values: { ...state.value.values, ...rowValues(row) } });
}
function selectRow(row: number): void {
  studio.setValues(rowValues(row));
}
function onRange(key: string, event: Event): void {
  const param = paramOf(key);
  const index = Number((event.target as HTMLInputElement).value);
  if (param && Number.isInteger(index) && param.values[index] !== undefined)
    studio.setValues({ [key]: param.values[index] });
}

/* ---------------------------------------------------------------------------------------------
 * Actions
 * ------------------------------------------------------------------------------------------- */

const asset = computed(() => {
  const market = info.value?.markets.find((item) => item.symbol === symbol.value);
  return market ? props.assets.find((item) => item.address === market.address) : undefined;
});
const canPaper = computed(
  () => status.value === 'ready' && replayCurrent.value && !!asset.value && !preparing.value && !props.busy
);
/** Open the same rules as an editable draft in the Strategy Lab, which tests any pair. */
const labLink = computed(() => ({
  name: PageNames.Bots,
  params: { section: 'lab' },
  query: { rules: encodeRuleShare(candidate.value.rules) },
}));

/** Observe fresh fees for this pair, then hand the exact template to the page's paper flow. */
async function paper(): Promise<void> {
  const current = replay.value;
  const archive = info.value;
  const target = asset.value;
  if (!current || !archive || !target || !canPaper.value) return;
  preparing.value = true;
  prepareError.value = '';
  try {
    const name = t('bots.studio.botName', {
      idea: t(`bots.studio.recipes.${state.value.recipe}.name`),
      symbol: target.symbol,
    });
    const template = createStudioBot(target, current, props.assets, name, Date.now());
    const fees = await props.loadFees(template, { slippagePercent: template.policy.slippagePercent });
    emit(
      'paper',
      studioPaperPayload(
        target,
        current,
        props.assets,
        name,
        fees,
        { genesisHash: archive.genesisHash, denominator: archive.denominator },
        Date.now()
      )
    );
  } catch (reason) {
    prepareError.value =
      reason instanceof Error && /^bots\.errors\.[\w-]+$/.test(reason.message) ? reason.message : 'bots.errors.quote';
  } finally {
    preparing.value = false;
  }
}

const statusText = computed(() => {
  switch (status.value) {
    case 'ready':
      return studio.jobError.value ? t(studio.jobError.value) : '';
    case 'fees':
      return t('bots.quant.status.fees');
    case 'error':
      return t('bots.quant.status.error');
    default:
      return t('bots.studio.loading');
  }
});

/* ---------------------------------------------------------------------------------------------
 * Lifecycle: lazy start, deep links and calm mode
 * ------------------------------------------------------------------------------------------- */

/**
 * After a minute without input the studio settles: views stop drawing frames, so a tab left
 * open for a long paper session costs no continuous rendering. Any interaction wakes it.
 */
const calm = ref(false);
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let lastWake = 0;
let intersection: IntersectionObserver | null = null;
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
function wake(): void {
  const now = Date.now();
  if (!calm.value && now - lastWake < 500) return;
  lastWake = now;
  calm.value = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => (calm.value = true), IDLE_MS);
}

/** A strategy opened from the bots page arrives as a deep link; the studio then scrolls into view. */
let linked = false;
watch(
  () => route?.query?.studio,
  (link) => {
    if (typeof link !== 'string' || !studio.applyLink(link)) return;
    linked = true;
    if (root.value) reveal();
  },
  { immediate: true }
);
function reveal(): void {
  if (!linked) return;
  linked = false;
  requestAnimationFrame(() => root.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
}

onMounted(() => {
  reveal();
  wake();
  WAKE_EVENTS.forEach((type) => document.addEventListener(type, wake, { passive: true, capture: true }));
  // The archive loads only when the studio comes into view.
  if (typeof IntersectionObserver === 'undefined' || !root.value) {
    void studio.start();
    return;
  }
  intersection = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      intersection?.disconnect();
      intersection = null;
      void studio.start();
    },
    { rootMargin: '400px 0px' }
  );
  intersection.observe(root.value);
});
onBeforeUnmount(() => {
  clearTimeout(idleTimer);
  intersection?.disconnect();
  WAKE_EVENTS.forEach((type) => document.removeEventListener(type, wake, { capture: true }));
});

defineExpose({ studio });
</script>

<style scoped lang="scss">
.studio {
  --st-pink: var(--s-color-theme-accent, #f8087b);
  --st-ink: var(--s-color-base-content-primary, #2a171f);
  --st-muted: var(--s-color-base-content-secondary, #6e6168);
  --st-faint: var(--s-color-base-content-tertiary, #796971);
  --st-surface: var(--s-color-utility-surface, #fdf7fb);
  --st-light: var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  --st-dark: var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1));
  --st-up: var(--s-color-action-text, #ab0555);
  --st-down: color-mix(in srgb, var(--s-color-status-info, #479aef) 70%, var(--st-ink));
  container-type: inline-size;
  position: relative;
  display: grid;
  gap: 18px;
  min-width: 0;
  margin-top: 22px;
  padding: 22px;
  border-radius: 28px;
  color: var(--st-ink);
  font-variant-numeric: tabular-nums;
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--st-surface) 86%, transparent),
    color-mix(in srgb, var(--st-surface) 58%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--st-light) 90%, transparent);
  box-shadow:
    10px 10px 28px var(--st-dark),
    -8px -8px 22px var(--st-light),
    inset 0 1px 0 var(--st-light);
}
.studio-head {
  display: grid;
  gap: 12px;
  h3 {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.01em;
  }
  p {
    margin: 4px 0 0;
    color: var(--st-muted);
    line-height: 1.5;
    max-width: 62ch;
  }
}
.studio-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 6px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    background: var(--st-surface);
    box-shadow:
      inset 2px 2px 5px var(--st-dark),
      inset -2px -2px 5px var(--st-light);
  }
  span {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 12px;
    color: var(--s-color-on-action, #fff);
    background: var(--s-color-action-fill, #bf065f);
  }
}
.studio-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--st-muted);
}
.studio-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--st-pink);
  animation: studio-pulse 1.4s ease-in-out infinite;
  animation-play-state: var(--studio-motion, running);
  &.error {
    animation: none;
    background: var(--s-color-status-error, #f754a3);
  }
}
.studio-pickers {
  display: grid;
  gap: 10px;
}
.studio-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.studio-label {
  min-width: 60px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--st-faint);
}
.studio-chips,
.studio-recipes,
.studio-segments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.studio-chip,
.studio-recipe,
.studio-segments button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 650;
  color: var(--st-ink);
  background: var(--st-surface);
  box-shadow:
    3px 3px 8px var(--st-dark),
    -3px -3px 8px var(--st-light);
  cursor: pointer;
  transition:
    box-shadow 160ms ease,
    color 160ms ease,
    transform 160ms ease;
  &[aria-checked='true'] {
    color: var(--st-up);
    box-shadow:
      inset 3px 3px 7px var(--st-dark),
      inset -3px -3px 7px var(--st-light);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  &:focus-visible {
    outline: 3px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }
}
.studio-recipe {
  svg {
    width: 34px;
    height: 17px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.8;
  }
  small {
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    color: var(--s-color-on-action, #fff);
    background: color-mix(in srgb, var(--s-color-status-info, #479aef) 70%, var(--st-ink));
  }
}
.studio-idea {
  margin: 0;
  color: var(--st-muted);
  line-height: 1.5;
}
.studio-main {
  display: grid;
  gap: 18px;
  min-width: 0;
}
@container (min-width: 900px) {
  .studio-main {
    grid-template-columns: #{'minmax(0, 1.35fr) minmax(300px, 1fr)'};
    align-items: start;
  }
}
.studio-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.studio-panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
  h4 {
    margin: 0;
    font-size: 16px;
  }
  p {
    flex-basis: 100%;
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--st-muted);
  }
}
.studio-busy {
  font-size: 12px;
  color: var(--st-faint);
}
.studio-panel--result {
  align-content: start;
  padding: 16px;
  border-radius: 22px;
  background: var(--st-surface);
  box-shadow:
    6px 6px 16px var(--st-dark),
    -6px -6px 16px var(--st-light);
}
.studio-halves {
  display: grid;
  grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
  gap: 10px;
  margin: 0;
  transition: opacity 180ms ease;
  &.is-pending {
    opacity: 0.6;
  }
  dt {
    display: grid;
    font-size: 12px;
    font-weight: 700;
    color: var(--st-muted);
    small {
      font-weight: 500;
      color: var(--st-faint);
    }
  }
  dd {
    margin: 2px 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: proportional-nums;
    &.up {
      color: var(--st-up);
    }
    &.down {
      color: var(--st-down);
    }
  }
  span {
    font-size: 12px;
    color: var(--st-faint);
  }
}
.studio-half {
  padding: 10px 12px;
  border-radius: 16px;
  box-shadow:
    inset 2px 2px 6px var(--st-dark),
    inset -2px -2px 6px var(--st-light);
}
.studio-half--check {
  background: color-mix(in srgb, var(--s-color-status-info, #479aef) 7%, transparent);
}
.studio-stat {
  padding: 0 4px;
  dd {
    font-size: 18px;
  }
}
.studio-cadence {
  margin: 0;
  font-size: 13px;
  color: var(--st-muted);
}
.studio-rule {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 13px;
  background: color-mix(in srgb, var(--st-pink) 5%, transparent);
  dt {
    font-weight: 700;
  }
  dd {
    margin: 2px 0 0 0;
    color: var(--st-muted);
  }
}
.studio-settings {
  display: grid;
  gap: 12px;
}
@container (min-width: 560px) and (max-width: 899px) {
  .studio-settings {
    grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
  }
}
.studio-setting {
  display: grid;
  gap: 6px;
  label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--st-muted);
  }
  strong {
    color: var(--st-ink);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--s-color-action-fill, #bf065f);
  }
}
.studio-segments button {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}
.studio-error {
  margin: 0;
  font-size: 13px;
  color: var(--s-color-status-error-text, #ab0555);
}
.studio-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
}
.studio-primary {
  min-height: 42px;
  padding: 0 20px;
  border: 0;
  border-radius: 21px;
  font-weight: 750;
  color: var(--s-color-on-action, #fff);
  background: var(--s-color-action-fill, #bf065f);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--s-color-action-fill, #bf065f) 30%, transparent);
  cursor: pointer;
  &:hover:not(:disabled) {
    background: var(--s-color-action-fill-hover, #ab0555);
  }
  &:disabled {
    cursor: not-allowed;
    color: var(--s-color-on-action-disabled, #796971);
    background: var(--s-color-action-disabled-fill, #ede4e7);
    box-shadow: none;
  }
  &:focus-visible {
    outline: 3px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }
}
.studio-link {
  border: 0;
  padding: 0;
  font-weight: 700;
  font-size: 13px;
  color: var(--st-up);
  background: none;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 3px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }
}
.studio-note,
.studio-disclaimer {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--st-faint);
}
:deep(.terrain-tooltip),
:deep(.parallel-tooltip) {
  span,
  em {
    color: var(--st-muted);
  }
  b {
    color: var(--st-ink);
  }
  em {
    font-style: normal;
    font-size: 11px;
  }
}
@keyframes studio-pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}
@container (max-width: 520px) {
  .studio {
    padding: 16px;
  }
  .studio-halves dd {
    font-size: 22px;
  }
}
@media (max-width: 520px) {
  .studio {
    padding: 16px;
    border-radius: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .studio-pulse {
    animation: none;
  }
}
</style>
