<template>
  <section
    class="quant"
    :class="{ 'quant--calm': calm }"
    :style="{ '--quant-motion': calm ? 'paused' : 'running' }"
    data-testid="quant-center"
    :aria-busy="running"
    :aria-labelledby="titleId"
  >
    <div class="quant-light" aria-hidden="true" />

    <header class="quant-hero quant-glass quant-iridescent quant-reveal" style="--reveal-order: 0">
      <div class="quant-hero-copy">
        <h2 :id="titleId" class="quant-title">{{ t('bots.quant.title') }}</h2>
        <p class="quant-subtitle">{{ t('bots.quant.intro') }}</p>
        <ol class="quant-steps" data-testid="quant-steps">
          <li v-for="(step, index) in STEPS" :key="step" class="quant-step">
            <span class="quant-step-index" aria-hidden="true">{{ index + 1 }}</span>
            <div>
              <strong>{{ t(`bots.quant.steps.${step}.title`) }}</strong>
              <p>{{ t(`bots.quant.steps.${step}.text`) }}</p>
            </div>
          </li>
        </ol>
        <p v-if="loop.status.value !== 'done'" class="quant-status" data-testid="quant-status" role="status">
          <i :class="['quant-pulse', loop.status.value]" aria-hidden="true" />{{ statusText }}
          <button
            v-if="loop.status.value === 'error'"
            type="button"
            class="quant-link"
            data-testid="quant-retry"
            @click="loop.start()"
          >
            {{ t('bots.quant.retry') }}
          </button>
        </p>
      </div>
      <QuantGlassArt class="quant-art" :active="running" :paused="calm" />
    </header>

    <div
      v-if="running"
      class="quant-progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progressFraction * 100)"
      :aria-label="t('bots.quant.progress')"
    >
      <span :style="{ transform: `scaleX(${Math.max(0.02, progressFraction)})` }" />
    </div>

    <section
      v-if="hotMarket"
      class="quant-banner quant-glass quant-iridescent quant-reveal"
      style="--reveal-order: 1"
      data-testid="quant-banner"
      role="status"
    >
      <span class="quant-banner-dot" aria-hidden="true" />
      <div class="quant-banner-copy">
        <strong>{{ t('bots.quant.banner.title', { symbol: hotMarket.asset.symbol }) }}</strong>
        <span v-if="gaugeFor(hotMarket)">
          {{
            t('bots.quant.banner.detail', {
              value: gaugeFor(hotMarket)!.text,
              window: gaugeFor(hotMarket)!.window,
              threshold: `${gaugeFor(hotMarket)!.threshold}%`,
            })
          }}
        </span>
      </div>
      <div class="quant-actions">
        <button
          type="button"
          class="quant-primary"
          data-testid="quant-banner-live"
          :disabled="busy || !!preparing"
          @click="prepare(hotMarket, 'live')"
        >
          {{ t('bots.quant.goLive') }}
        </button>
        <button
          type="button"
          class="quant-link"
          data-testid="quant-banner-swap"
          @click="emit('swap', hotMarket.asset.address)"
        >
          {{ t('bots.quant.swap', { symbol: hotMarket.asset.symbol }) }} ↗
        </button>
      </div>
    </section>

    <section
      class="quant-panel quant-glass quant-radar quant-reveal"
      style="--reveal-order: 2"
      :aria-labelledby="`${titleId}-radar`"
    >
      <header class="quant-panel-heading">
        <h3 :id="`${titleId}-radar`">{{ t('bots.quant.radar.title') }}</h3>
      </header>
      <template v-if="!result">
        <p v-if="loop.status.value === 'error'" class="quant-empty">{{ statusText }}</p>
        <ul v-else class="quant-markets quant-skeletons" aria-hidden="true">
          <li v-for="index in 2" :key="index" class="quant-market quant-skeleton"><span /><span /><span /></li>
        </ul>
      </template>
      <template v-else>
        <ul class="quant-markets">
          <li
            v-for="(market, index) in deployMarkets"
            :key="market.asset.address"
            class="quant-market quant-market--deploy quant-reveal"
            :style="{ '--reveal-order': index + 1 }"
            :data-testid="`quant-market-${market.asset.symbol}`"
          >
            <header class="quant-market-heading">
              <span class="quant-token" aria-hidden="true">{{ market.asset.symbol.slice(0, 1) }}</span>
              <h4>{{ market.asset.symbol }}</h4>
              <span class="quant-badge deploy">{{ t('bots.quant.marketStatus.deploy') }}</span>
            </header>
            <div class="quant-market-body">
              <QuantGauge
                v-if="gaugeFor(market)"
                class="quant-gauge"
                :value="gaugeFor(market)!.value"
                :threshold="gaugeFor(market)!.threshold"
                :exit="gaugeFor(market)!.exit"
                :state="signalFor(market)?.state ?? 'unavailable'"
                :value-text="gaugeFor(market)!.text"
                :label="t('bots.quant.fromMean', { window: gaugeFor(market)!.window })"
                :aria-label="gaugeFor(market)!.aria"
              />
              <dl class="quant-stats">
                <div class="quant-stat quant-stat--main">
                  <dt>{{ t('bots.quant.result') }}</dt>
                  <dd
                    :class="tone(market.walkForward?.returnPercent)"
                    :data-testid="`quant-return-${market.asset.symbol}`"
                  >
                    {{ signed(market.walkForward?.returnPercent) }}
                  </dd>
                </div>
                <div class="quant-stat">
                  <dt>{{ t('bots.quant.priceChange', { symbol: market.asset.symbol }) }}</dt>
                  <dd>{{ signed(market.walkForward?.priceChangePercent) }}</dd>
                </div>
                <div class="quant-stat">
                  <dt>{{ t('bots.quant.drawdown') }}</dt>
                  <dd>{{ market.walkForward?.drawdownPercent ?? '0.00' }}%</dd>
                </div>
                <div class="quant-stat">
                  <dt>{{ t('bots.quant.trades') }}</dt>
                  <dd>{{ market.walkForward?.trades ?? 0 }}</dd>
                </div>
              </dl>
            </div>
            <p
              v-if="signalFor(market)"
              class="quant-signal"
              :class="signalFor(market)!.state"
              :data-testid="`quant-signal-${market.asset.symbol}`"
            >
              <strong>{{ t(`bots.quant.signal.${signalFor(market)!.state}`) }}</strong>
              <span>{{ signalSource(market) }}</span>
            </p>
            <dl v-if="market.final" class="quant-rule" :aria-label="t('bots.quant.rule.label')">
              <div>
                <dt>{{ t('bots.quant.rule.buy', { amount: market.final.candidate.amount }) }}</dt>
                <dd v-for="(leaf, index) in market.final.candidate.rules.entry.conditions" :key="`entry-${index}`">
                  {{ leafText(leaf) }}
                </dd>
              </div>
              <div v-if="market.final.candidate.rules.exit?.conditions.length">
                <dt>{{ t('bots.quant.rule.sell') }}</dt>
                <dd v-for="(leaf, index) in market.final.candidate.rules.exit.conditions" :key="`exit-${index}`">
                  {{ leafText(leaf) }}
                </dd>
              </div>
            </dl>
            <ul class="quant-facts">
              <li
                v-if="market.walkForward?.cadence?.daysPerEpisode"
                class="quant-cadence"
                :data-testid="`quant-cadence-${market.asset.symbol}`"
              >
                {{ cadenceText(market) }}
              </li>
              <li>
                {{
                  t('bots.quant.budget', {
                    total: capital,
                    amount: market.final?.candidate.amount ?? QUANT_AMOUNTS[0],
                    reserve: QUANT_FEE_BUDGET_XOR,
                  })
                }}
              </li>
            </ul>
            <div class="quant-session" role="radiogroup" :aria-label="t('bots.quant.session.label')">
              <span class="quant-session-label">{{ t('bots.quant.session.label') }}</span>
              <button
                v-for="days in QUANT_SESSION_DAYS"
                :key="days"
                type="button"
                role="radio"
                :aria-checked="sessionDays === days"
                :data-testid="`quant-session-${market.asset.symbol}-${days}`"
                @click="sessionDays = days"
              >
                {{ t('bots.quant.session.option', { count: days }) }}
              </button>
            </div>
            <p v-if="prepareError && prepareError.symbol === market.asset.symbol" class="quant-error" role="alert">
              {{ t(prepareError.message) }}
            </p>
            <div class="quant-actions">
              <button
                type="button"
                class="quant-secondary"
                :data-testid="`quant-paper-${market.asset.symbol}`"
                :disabled="busy || !!preparing"
                @click="prepare(market, 'paper')"
              >
                {{ t('bots.quant.paper') }}
              </button>
              <button
                type="button"
                class="quant-primary"
                :data-testid="`quant-live-${market.asset.symbol}`"
                :disabled="busy || !!preparing"
                @click="prepare(market, 'live')"
              >
                {{ preparing === `${market.asset.symbol}:live` ? t('bots.quant.preparing') : t('bots.quant.goLive') }}
              </button>
              <button
                type="button"
                class="quant-link"
                :data-testid="`quant-swap-${market.asset.symbol}`"
                @click="emit('swap', market.asset.address)"
              >
                {{ t('bots.quant.swap', { symbol: market.asset.symbol }) }} ↗
              </button>
            </div>
          </li>
        </ul>
        <div v-if="idleMarkets.length" class="quant-other">
          <h4 :id="`${titleId}-other`">{{ t('bots.quant.otherMarkets') }}</h4>
          <ul class="quant-idle" :aria-labelledby="`${titleId}-other`">
            <li
              v-for="market in idleMarkets"
              :key="market.asset.address"
              class="quant-idle-item"
              :class="`quant-idle-item--${market.status}`"
              :data-testid="`quant-market-${market.asset.symbol}`"
            >
              <span class="quant-token" aria-hidden="true">{{ market.asset.symbol.slice(0, 1) }}</span>
              <strong>{{ market.asset.symbol }}</strong>
              <span class="quant-badge" :class="market.status">{{
                t(`bots.quant.marketStatus.${market.status}`)
              }}</span>
              <span class="quant-idle-note">
                {{
                  market.status === 'thin'
                    ? t('bots.quant.thinNote', { depth: formatNumber(market.medianXorDepth) })
                    : t('bots.quant.watchNote')
                }}
              </span>
              <button
                v-if="market.status === 'watch'"
                type="button"
                class="quant-link"
                :data-testid="`quant-swap-${market.asset.symbol}`"
                @click="emit('swap', market.asset.address)"
              >
                {{ t('bots.quant.swap', { symbol: market.asset.symbol }) }} ↗
              </button>
            </li>
          </ul>
        </div>
      </template>
    </section>

    <section
      v-if="selected?.walkForward"
      class="quant-panel quant-glass quant-reveal"
      style="--reveal-order: 3"
      :aria-labelledby="`${titleId}-equity`"
    >
      <header class="quant-panel-heading">
        <h3 :id="`${titleId}-equity`">{{ t('bots.quant.equity.title') }}</h3>
        <div class="quant-tabs" role="tablist">
          <button
            v-for="market in comparableMarkets"
            :key="market.asset.address"
            type="button"
            role="tab"
            :aria-selected="selected.asset.address === market.asset.address"
            :data-testid="`quant-tab-${market.asset.symbol}`"
            @click="selectedAddress = market.asset.address"
          >
            {{ market.asset.symbol }}
          </button>
        </div>
      </header>
      <p class="quant-caption">{{ t('bots.quant.equity.caption', { symbol: selected.asset.symbol }) }}</p>
      <QuantEquity
        :key="selected.asset.address"
        :points="selected.walkForward.equity"
        :folds="selected.folds"
        :fills="selected.walkForward.fills"
        :capital="capital"
        :locale="locale"
        :strategy-label="t('bots.quant.equity.strategy')"
        :price-label="t('bots.quant.priceChange', { symbol: selected.asset.symbol })"
        :aria-label="t('bots.quant.equity.title')"
      />
      <ol class="quant-folds">
        <li v-for="fold in selected.folds" :key="fold.startAt" :class="tone(fold.returnPercent)">
          <time>{{ formatDate(fold.startAt) }} – {{ formatDate(fold.endAt) }}</time>
          <strong>{{ fold.family ? signed(fold.returnPercent) : t('bots.quant.equity.idle') }}</strong>
          <span v-if="fold.family">{{ t('bots.quant.equity.trades', { count: fold.trades }) }}</span>
        </li>
      </ol>
    </section>

    <div class="quant-grid">
      <section
        class="quant-panel quant-glass quant-reveal"
        style="--reveal-order: 4"
        :aria-labelledby="`${titleId}-mesh`"
      >
        <header class="quant-panel-heading">
          <h3 :id="`${titleId}-mesh`">{{ t('bots.quant.mesh.title') }}</h3>
          <span v-if="result">{{ selectedAtlas ? `${selectedAtlas.market} · ${meshSummary}` : meshSummary }}</span>
        </header>
        <p class="quant-caption">{{ t('bots.quant.atlas.caption') }}</p>
        <QuantAtlasMap
          :atlas="selectedAtlas"
          :locale="locale"
          :aria-label="t('bots.quant.mesh.title')"
          :paused="calm"
        />
      </section>
      <section
        class="quant-panel quant-glass quant-reveal"
        style="--reveal-order: 5"
        :aria-labelledby="`${titleId}-lattice`"
      >
        <header class="quant-panel-heading">
          <h3 :id="`${titleId}-lattice`">{{ t('bots.quant.lattice.title') }}</h3>
          <span v-if="selected">{{ `${selected.asset.symbol} · ${latticeSummary}` }}</span>
        </header>
        <p class="quant-caption">{{ t('bots.quant.lattice.caption') }}</p>
        <QuantLattice :fills="selected?.walkForward?.fills ?? []" :scanning="running" />
      </section>
    </div>

    <p v-if="result" class="quant-disclaimer" data-testid="quant-disclaimer">
      {{
        t('bots.quant.disclaimer', {
          start: formatDate(result.archive.startAt),
          end: formatDate(result.archive.endAt),
          fee: Number(result.costs.networkFeeXor).toFixed(4),
          swap: String(Number(result.costs.swapFeePercent)),
        })
      }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, useId } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import {
  QUANT_AMOUNTS,
  QUANT_CAPITAL_XOR,
  QUANT_FEE_BUDGET_XOR,
  type QuantMarketResult,
} from '@/features/bot-trading/quant-loop';
import {
  createQuantBot,
  quantDenomination,
  quantResearchSettings,
  quantResearchSnapshot,
  QUANT_SESSION_DAYS,
  type QuantDeployPayload,
} from '@/features/bot-trading/quant-deploy';
import { useQuantLoop } from '@/features/bot-trading/useQuantLoop';
import QuantEquity from './QuantEquity.vue';
import QuantGauge from './QuantGauge.vue';
import QuantGlassArt from './QuantGlassArt.vue';
import QuantLattice from './QuantLattice.vue';
import QuantAtlasMap from './QuantAtlasMap.vue';
import type { PlaygroundSettings } from '@/features/bot-trading/playground';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { StrategyRules } from '@/features/bot-trading/strategy-rules';
import type { BotAsset, BotDefinition, BotHistory } from '@/features/bot-trading/types';

defineOptions({ name: 'QuantCommandCenter' });

/**
 * Ready-made rule bots from the in-browser research loop, with a three-step guide. It never
 * signs or saves: Go live and Paper trade emit reviewed templates that the page passes to the
 * existing funding review and consent flow; Swap asks the page to open the Swap form.
 */
const props = defineProps<{
  assets: BotAsset[];
  loadFees: (bot: BotDefinition, settings: { slippagePercent: string }) => Promise<ResearchFeeSnapshot>;
  loadHistory: (bot: BotDefinition, settings: PlaygroundSettings) => Promise<BotHistory>;
  busy: boolean;
}>();
const emit = defineEmits<{
  live: [payload: QuantDeployPayload];
  paper: [payload: QuantDeployPayload];
  swap: [assetAddress: string];
}>();

/** How-to steps, in the same order as each card's Paper trade and Go live actions. */
const STEPS = ['choose', 'paper', 'live'] as const;

const { t, language } = useTranslation();
const titleId = useId();
const loop = useQuantLoop(toRef(props, 'assets'), { loadFees: props.loadFees, loadHistory: props.loadHistory });
const result = computed(() => loop.result.value);
const running = computed(() => ['idle', 'loading', 'fees', 'running'].includes(loop.status.value));
const preparing = ref<string | null>(null);
const prepareError = ref<{ symbol: string; message: string } | null>(null);
const selectedAddress = ref('');
const capital = QUANT_CAPITAL_XOR;
/** Live session length chosen before review; the default covers the typical PSWAP unwind. */
const sessionDays = ref<(typeof QUANT_SESSION_DAYS)[number]>(7);

/**
 * Ambient motion is for arrival. After a minute without interaction the page settles:
 * infinite CSS animations pause and the mesh stops drawing frames, so a tab left open
 * for a multi-day bot session costs no continuous rendering. Any interaction wakes it.
 */
const IDLE_MS = 60_000;
const calm = ref(false);
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let lastWake = 0;
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
function wake(): void {
  const now = Date.now();
  if (!calm.value && now - lastWake < 500) return;
  lastWake = now;
  calm.value = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => (calm.value = true), IDLE_MS);
}
onMounted(() => {
  if (loop.status.value === 'idle') void loop.start();
  wake();
  WAKE_EVENTS.forEach((type) => document.addEventListener(type, wake, { passive: true, capture: true }));
});
onBeforeUnmount(() => {
  clearTimeout(idleTimer);
  WAKE_EVENTS.forEach((type) => document.removeEventListener(type, wake, { capture: true }));
});

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
  value.toLocaleString(locale.value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const formatNumber = (value: number) => number(value, value < 10 ? 2 : 0);
const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const signed = (value?: string) => {
  if (value === undefined) return '—';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
};
const tone = (value?: string) => (!value || Number(value) === 0 ? 'flat' : Number(value) > 0 ? 'up' : 'down');

const progressFraction = computed(() => {
  if (loop.status.value === 'done') return 1;
  const progress = loop.progress.value;
  return progress?.total ? Math.min(1, progress.completed / progress.total) : 0;
});

/** One plain sentence per research phase; the line is hidden once results are ready. */
const statusText = computed(() => {
  switch (loop.status.value) {
    case 'fees':
      return t('bots.quant.status.fees');
    case 'running':
      return t('bots.quant.status.running');
    case 'error':
      return t('bots.quant.status.error');
    default:
      return t('bots.quant.status.loading');
  }
});

const meshSummary = computed(() =>
  result.value
    ? t('bots.quant.mesh.summary', {
        robust: number(result.value.counts.robust),
        killed: number(result.value.counts.killed),
      })
    : ''
);

const order = { deploy: 0, watch: 1, thin: 2 } as const;
/** Ready markets lead with the strongest test result; the rest follow by pool depth. */
const orderedMarkets = computed(() =>
  [...(result.value?.markets ?? [])].sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (a.status === 'deploy'
        ? Number(b.walkForward?.returnPercent ?? 0) - Number(a.walkForward?.returnPercent ?? 0)
        : 0) ||
      b.medianXorDepth - a.medianXorDepth
  )
);
const deployMarkets = computed(() => orderedMarkets.value.filter((market) => market.status === 'deploy'));
const idleMarkets = computed(() => orderedMarkets.value.filter((market) => market.status !== 'deploy'));
const comparableMarkets = computed(() => orderedMarkets.value.filter((market) => market.walkForward));
const selected = computed(
  () =>
    comparableMarkets.value.find((market) => market.asset.address === selectedAddress.value) ??
    comparableMarkets.value[0]
);
/** Every tested strategy of the market shown in "Results over time", for the strategy map. */
const selectedAtlas = computed(
  () =>
    result.value?.atlas?.find((item) => item.market === selected.value?.asset.symbol) ??
    result.value?.atlas?.[0] ??
    null
);
const latticeSummary = computed(() => {
  const sells = selected.value?.walkForward?.fills.filter((fill) => fill.side === 'sell') ?? [];
  const wins = sells.filter((fill) => Number(fill.pnlPercent) > 0).length;
  return t('bots.quant.lattice.summary', { wins, losses: sells.length - wins });
});

const signalFor = (market: QuantMarketResult) => loop.signals.value[market.asset.symbol];
/** The strongest ready market whose exact rule is in its buy zone right now. */
const hotMarket = computed(() => deployMarkets.value.find((market) => signalFor(market)?.state === 'entry') ?? null);
/** Frequency and holding time from the tests, so users expect rare, multi-day trades. */
function cadenceText(market: QuantMarketResult): string {
  const cadence = market.walkForward?.cadence;
  if (!cadence?.daysPerEpisode || !cadence.holdHours) return '';
  const hold =
    cadence.holdHours.max >= 48
      ? t('bots.quant.cadence.holdDays', {
          min: Math.max(1, Math.round(cadence.holdHours.min / 24)),
          max: Math.ceil(cadence.holdHours.max / 24),
        })
      : t('bots.quant.cadence.holdHours', { min: cadence.holdHours.min, max: cadence.holdHours.max });
  const parts = [t('bots.quant.cadence.every', { days: cadence.daysPerEpisode }), hold];
  if (cadence.lastEntryAt) parts.push(t('bots.quant.cadence.last', { date: formatDate(cadence.lastEntryAt) }));
  return parts.join(' · ');
}
function signalSource(market: QuantMarketResult): string {
  const signal = signalFor(market);
  if (!signal?.observedAt) return '';
  const when = new Date(signal.observedAt).toLocaleString(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return t(signal.source === 'live' ? 'bots.quant.signalLive' : 'bots.quant.signalArchive', { time: `${when} UTC` });
}
/** Gauge data comes from the exact entry-rule evidence; exits share the same mean when possible. */
function gaugeFor(market: QuantMarketResult) {
  const deviation = signalFor(market)?.deviation;
  if (!deviation || !market.final) return null;
  const exit = market.final.candidate.rules.exit?.conditions.find(
    (leaf) => leaf.kind === 'deviation' && leaf.window === deviation.window
  );
  const value = Number(deviation.value);
  const text = `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  return {
    value,
    threshold: Number(deviation.threshold),
    exit: exit && 'threshold' in exit ? Number(exit.threshold) : null,
    window: deviation.window,
    text,
    aria: t('bots.quant.gaugeAria', {
      value: text,
      threshold: `${Number(deviation.threshold)}%`,
      window: deviation.window,
    }),
  };
}
type Leaf = StrategyRules['entry']['conditions'][number];
function leafText(leaf: Leaf): string {
  if (leaf.kind === 'breakout')
    return t(leaf.direction === 'above' ? 'bots.quant.rule.breakoutAbove' : 'bots.quant.rule.breakoutBelow', {
      window: leaf.window,
    });
  if (leaf.kind === 'deviation' || leaf.kind === 'momentum') {
    const value = Number(leaf.threshold);
    const key = `bots.quant.rule.${leaf.kind}${leaf.direction === 'above' ? 'Above' : 'Below'}`;
    return t(key, { window: leaf.window, value: `${value > 0 ? '+' : ''}${value}` });
  }
  return leaf.kind;
}

/** Observe fresh fees for this pair, then hand the exact template to the page's review flow. */
async function prepare(market: QuantMarketResult, mode: 'live' | 'paper'): Promise<void> {
  const current = result.value;
  if (!current || preparing.value) return;
  preparing.value = `${market.asset.symbol}:${mode}`;
  prepareError.value = null;
  try {
    const name = t('bots.quant.botName', { symbol: market.asset.symbol });
    const template = createQuantBot(market, props.assets, name, Date.now());
    const fees = await props.loadFees(template, { slippagePercent: template.policy.slippagePercent });
    const bot = createQuantBot(market, props.assets, name, Date.now(), fees);
    const payload: QuantDeployPayload = {
      bot,
      settings: quantResearchSettings(market, fees),
      research: quantResearchSnapshot(current, market, fees, Date.now()),
      denomination: quantDenomination(current),
      sessionDurationMs: sessionDays.value * 86_400_000,
      cadence: market.walkForward!.cadence,
    };
    if (mode === 'live') emit('live', payload);
    else emit('paper', payload);
  } catch (reason) {
    prepareError.value = {
      symbol: market.asset.symbol,
      message:
        reason instanceof Error && /^bots\.errors\.[\w-]+$/.test(reason.message) ? reason.message : 'bots.errors.quote',
    };
  } finally {
    preparing.value = null;
  }
}
</script>

<style scoped lang="scss">
.quant {
  --q-pink: var(--s-color-theme-accent, #f8087b);
  --q-action: var(--s-color-action-fill, #bf065f);
  --q-on-action: var(--s-color-on-action, #fff);
  --q-ink: var(--s-color-base-content-primary, #2a171f);
  --q-muted: var(--s-color-base-content-secondary, #6e6168);
  --q-surface: var(--s-color-utility-surface, #fdf7fb);
  --q-recess: var(--s-color-base-background, #faf4f8);
  --q-violet: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
  --q-mint: var(--s-color-theme-secondary, #44e5b2);
  --q-light: var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  --q-dark: var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1));
  --q-raised: 10px 10px 28px var(--q-dark), -8px -8px 22px var(--q-light);
  --q-inset: inset 3px 3px 8px var(--q-dark), inset -3px -3px 8px var(--q-light);
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 20px;
  margin-bottom: 28px;
  color: var(--q-ink);
  font-variant-numeric: tabular-nums;
  min-width: 0;
}

/* Global illumination: a key light plus pink and violet bounce light behind the glass. */
.quant-light {
  position: absolute;
  inset: -24px -12px;
  z-index: -1;
  border-radius: 40px;
  background:
    radial-gradient(48% 36% at 12% 6%, var(--q-light), transparent 72%),
    radial-gradient(40% 32% at 88% 14%, color-mix(in srgb, var(--q-pink) 20%, transparent), transparent 70%),
    radial-gradient(46% 40% at 72% 62%, color-mix(in srgb, var(--q-violet) 18%, transparent), transparent 72%),
    radial-gradient(40% 30% at 18% 88%, color-mix(in srgb, var(--q-mint) 10%, transparent), transparent 70%);
  pointer-events: none;
}

.quant-glass {
  position: relative;
  border-radius: 28px;
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--q-surface) 82%, transparent),
    color-mix(in srgb, var(--q-surface) 50%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--q-light) 90%, transparent);
  box-shadow:
    var(--q-raised),
    inset 0 1px 0 var(--q-light);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}
/* Iridescent rim, masked to a one-pixel border. */
.quant-iridescent::after {
  content: '';
  position: absolute;
  inset: 0;
  padding: 1.5px;
  border-radius: inherit;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.quant-hero {
  display: grid;
  grid-template-columns: #{'minmax(0, 1.2fr) minmax(0, 0.8fr)'};
  align-items: center;
  gap: 24px;
  padding: 32px 32px 28px;
  overflow: hidden;
}
.quant-title {
  margin: 0;
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--q-ink);
}
.quant-subtitle {
  max-width: 62ch;
  margin: 12px 0 18px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--q-muted);
}
.quant-steps {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.quant-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--q-recess);
  box-shadow: var(--q-inset);
  strong {
    font-size: 14px;
  }
  p {
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--q-muted);
  }
}
.quant-step-index {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 800;
  color: var(--q-on-action);
  background: linear-gradient(120deg, var(--q-action), color-mix(in srgb, var(--q-action) 55%, var(--q-pink)));
}
.quant-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 16px 0 0;
  font-size: 12px;
  color: var(--q-muted);
}
.quant-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--q-violet);
  &.error {
    background: var(--s-color-status-error, #f754a3);
  }
}
@media (prefers-reduced-motion: no-preference) {
  .quant-pulse.idle,
  .quant-pulse.loading,
  .quant-pulse.fees,
  .quant-pulse.running {
    animation: quant-pulse 1.4s ease-in-out infinite;
    animation-play-state: var(--quant-motion, running);
  }
}
@keyframes quant-pulse {
  50% {
    box-shadow: 0 0 0 7px color-mix(in srgb, var(--q-violet) 0%, transparent);
    transform: scale(1.3);
  }
}
.quant-art {
  max-width: 420px;
  justify-self: center;
}

.quant-grid {
  display: grid;
  grid-template-columns: #{'minmax(0, 1.6fr) minmax(0, 1fr)'};
  gap: 20px;
  align-items: start;
}
.quant-panel {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 22px;
}
.quant-panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  > span {
    font-size: 12px;
    color: var(--q-muted);
  }
}
.quant-caption,
.quant-empty {
  margin: -6px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--q-muted);
}

.quant-markets {
  display: grid;
  grid-template-columns: #{'repeat(auto-fit, minmax(min(100%, 400px), 1fr))'};
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.quant-other {
  display: grid;
  gap: 8px;
  min-width: 0;
  h4 {
    margin: 6px 0 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--q-muted);
  }
}
.quant-idle {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.quant-idle-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  min-width: 0;
  padding: 10px 14px;
  border-radius: 18px;
  background: var(--q-recess);
  box-shadow: var(--q-inset);
  font-size: 12px;
  .quant-token {
    width: 24px;
    height: 24px;
    font-size: 11px;
    box-shadow: none;
  }
  strong {
    font-size: 13px;
  }
  .quant-badge {
    margin-inline-start: 0;
    box-shadow: none;
    background: var(--q-surface);
  }
  .quant-link {
    min-height: 32px;
    margin-inline-start: auto;
    font-size: 12px;
  }
}
.quant-idle-item--thin .quant-token {
  filter: grayscale(0.7);
  opacity: 0.7;
}
.quant-idle-note {
  flex: 1 1 260px;
  min-width: 0;
  color: var(--q-muted);
  line-height: 1.5;
}
.quant-market {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border-radius: 22px;
  background: var(--q-surface);
  box-shadow: var(--q-raised);
  &--deploy {
    box-shadow:
      var(--q-raised),
      0 0 0 1px color-mix(in srgb, var(--q-pink) 26%, transparent),
      0 12px 32px color-mix(in srgb, var(--q-pink) 14%, transparent);
  }
}
.quant-market-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
  }
}
.quant-token {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 800;
  color: var(--q-on-action);
  background: radial-gradient(
    circle at 32% 28%,
    color-mix(in srgb, var(--q-pink) 40%, #fff),
    var(--q-pink) 58%,
    var(--q-action)
  );
  box-shadow: 0 4px 12px color-mix(in srgb, var(--q-pink) 35%, transparent);
}
.quant-badge {
  margin-inline-start: auto;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: var(--q-recess);
  box-shadow: var(--q-inset);
  color: var(--q-muted);
  &.deploy {
    color: var(--s-color-on-action, #fff);
    background: linear-gradient(120deg, var(--q-action), color-mix(in srgb, var(--q-action) 55%, var(--q-pink)));
    box-shadow: 0 4px 14px color-mix(in srgb, var(--q-pink) 35%, transparent);
  }
}
.quant-market-body {
  display: grid;
  grid-template-columns: #{'minmax(120px, 170px) minmax(0, 1fr)'};
  gap: 12px;
  align-items: center;
}
.quant-stats {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  gap: 8px;
  margin: 0;
  /* Until the live signal arrives there is no gauge; the stats then use the full width. */
  &:first-child {
    grid-column: 1 / -1;
  }
}
.quant-stat {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 14px;
  background: var(--q-recess);
  box-shadow: var(--q-inset);
  dt {
    font-size: 11px;
    color: var(--q-muted);
  }
  dd {
    margin: 2px 0 0;
    font-size: 15px;
    font-weight: 800;
  }
  &--main {
    grid-column: 1 / -1;
    dd {
      font-size: 26px;
      letter-spacing: -0.02em;
    }
  }
  .up {
    color: var(--s-color-action-text, #ab0555);
  }
  .down {
    color: color-mix(in srgb, var(--s-color-status-info, #479aef) 60%, var(--q-ink));
  }
}
.quant-signal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin: 0;
  font-size: 12px;
  color: var(--q-muted);
  strong {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--q-recess);
    box-shadow: var(--q-inset);
    color: var(--q-ink);
  }
  &.entry strong {
    color: var(--s-color-on-action, #fff);
    background: linear-gradient(120deg, var(--q-action), color-mix(in srgb, var(--q-action) 55%, var(--q-pink)));
    box-shadow: 0 0 18px color-mix(in srgb, var(--q-pink) 45%, transparent);
  }
  &.exit strong {
    color: var(--s-color-on-action, #fff);
    background: linear-gradient(120deg, color-mix(in srgb, var(--q-violet) 80%, var(--q-ink)), var(--q-violet));
  }
}
.quant-rule {
  display: grid;
  gap: 6px;
  margin: 0;
  > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  dt {
    padding-inline: 2px;
    font-size: 12px;
    font-weight: 700;
    color: var(--q-muted);
  }
  dd {
    margin: 0;
    padding: 4px 9px;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.4;
    background: color-mix(in srgb, var(--q-violet) 10%, var(--q-surface));
    color: var(--q-ink);
  }
}
.quant-facts {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  line-height: 1.55;
  color: var(--q-muted);
}
.quant-error {
  margin: 0;
  font-size: 12px;
  color: var(--s-color-status-error-text, #ab0555);
}
.quant-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.quant-primary,
.quant-secondary,
.quant-link,
.quant-tabs button {
  font: inherit;
  cursor: pointer;
  min-height: 44px;
  border: 0;
}
.quant-primary {
  padding: 0 22px;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--q-on-action);
  background: linear-gradient(120deg, var(--q-action), color-mix(in srgb, var(--q-action) 55%, var(--q-pink)));
  box-shadow:
    0 10px 24px color-mix(in srgb, var(--q-pink) 38%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent);
  &:hover:not(:disabled) {
    filter: brightness(1.05);
    box-shadow:
      0 14px 30px color-mix(in srgb, var(--q-pink) 48%, transparent),
      inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent);
  }
}
.quant-secondary {
  padding: 0 18px;
  border-radius: 999px;
  font-weight: 700;
  color: var(--q-ink);
  background: var(--q-surface);
  box-shadow: var(--q-raised);
  &:hover:not(:disabled) {
    color: var(--s-color-action-text, #ab0555);
  }
}
.quant-link {
  padding: 0 4px;
  background: transparent;
  font-weight: 700;
  color: var(--s-color-action-text, #ab0555);
  &:hover {
    text-decoration: underline;
  }
}
.quant-primary:disabled,
.quant-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.quant-primary:focus-visible,
.quant-secondary:focus-visible,
.quant-link:focus-visible,
.quant-tabs button:focus-visible {
  outline: 2px solid var(--s-color-focus-ring, #ab0555);
  outline-offset: 3px;
}

.quant-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: var(--q-recess);
  box-shadow: var(--q-inset);
  button {
    min-height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: var(--q-muted);
    background: transparent;
    &[aria-selected='true'] {
      color: var(--q-ink);
      background: var(--q-surface);
      box-shadow: var(--q-raised);
    }
  }
}
.quant-folds {
  display: grid;
  grid-template-columns: repeat(4, #{'minmax(0, 1fr)'});
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    display: grid;
    gap: 3px;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 16px;
    background: var(--q-recess);
    box-shadow: var(--q-inset);
    font-size: 11px;
    color: var(--q-muted);
  }
  strong {
    font-size: 13px;
    color: var(--q-ink);
  }
  .up strong {
    color: var(--s-color-action-text, #ab0555);
  }
}
.quant-disclaimer {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--q-muted);
}

.quant-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 20px;
  padding: 18px 22px;
  border-radius: 24px;
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--q-pink) 18%, var(--q-surface)),
    color-mix(in srgb, var(--q-violet) 10%, var(--q-surface))
  );
  box-shadow:
    var(--q-raised),
    0 0 36px color-mix(in srgb, var(--q-pink) 28%, transparent);
  .quant-actions {
    margin-inline-start: auto;
  }
}
.quant-banner-dot {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--q-pink);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--q-pink) 22%, transparent);
}
.quant-banner-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1 1 260px;
  strong {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  span {
    font-size: 13px;
    line-height: 1.5;
    color: var(--q-muted);
  }
}
.quant-cadence {
  color: var(--q-ink);
  font-weight: 600;
}
.quant-session {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  width: fit-content;
  max-width: 100%;
  background: var(--q-recess);
  box-shadow: var(--q-inset);
  button {
    min-height: 32px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    color: var(--q-muted);
    background: transparent;
    cursor: pointer;
    &[aria-checked='true'] {
      color: var(--q-ink);
      background: var(--q-surface);
      box-shadow: var(--q-raised);
    }
    &:focus-visible {
      outline: 2px solid var(--s-color-focus-ring, #ab0555);
      outline-offset: 2px;
    }
  }
}
.quant-session-label {
  padding-inline: 8px 2px;
  font-size: 12px;
  font-weight: 700;
  color: var(--q-muted);
}

/* ---------------------------------------------------------------------------------
 * Motion: entrance choreography, living light and live research feedback.
 * Every animation is opt-in for users without a reduced-motion preference.
 * ------------------------------------------------------------------------------- */
@property --q-angle {
  syntax: '<angle>';
  initial-value: 210deg;
  inherits: false;
}
.quant-iridescent::after {
  background: conic-gradient(
    from var(--q-angle),
    color-mix(in srgb, var(--q-pink) 65%, transparent),
    color-mix(in srgb, var(--q-violet) 65%, transparent),
    color-mix(in srgb, var(--q-mint) 45%, transparent),
    color-mix(in srgb, var(--q-light) 90%, transparent),
    color-mix(in srgb, var(--q-pink) 65%, transparent)
  );
}
.quant-hero::before {
  content: '';
  position: absolute;
  inset: -30% -20%;
  z-index: 0;
  background: linear-gradient(
    105deg,
    transparent 38%,
    color-mix(in srgb, var(--q-light) 75%, transparent) 48%,
    color-mix(in srgb, var(--q-pink) 10%, transparent) 52%,
    transparent 62%
  );
  transform: translateX(-75%);
  pointer-events: none;
}
.quant-hero-copy,
.quant-art {
  position: relative;
  z-index: 1;
}
.quant-progress {
  position: relative;
  height: 6px;
  margin-top: -8px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--q-recess);
  box-shadow: var(--q-inset);
  span {
    position: absolute;
    inset: 0;
    transform-origin: left center;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--q-violet), var(--q-pink));
    box-shadow: 0 0 14px color-mix(in srgb, var(--q-pink) 55%, transparent);
    transition: transform 400ms ease;
  }
}
.quant-skeleton {
  display: grid;
  gap: 12px;
  min-height: 220px;
  span {
    height: 14px;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--q-recess) 0%,
      color-mix(in srgb, var(--q-pink) 12%, var(--q-recess)) 50%,
      var(--q-recess) 100%
    );
    background-size: 200% 100%;
    &:nth-child(1) {
      width: 40%;
      height: 22px;
    }
    &:nth-child(2) {
      width: 85%;
      height: 96px;
      border-radius: 18px;
    }
    &:nth-child(3) {
      width: 60%;
    }
  }
}

@media (prefers-reduced-motion: no-preference) {
  .quant-banner-dot {
    animation: quant-blink 1.2s ease-in-out infinite;
    animation-play-state: var(--quant-motion, running);
  }
  .quant-reveal {
    animation: quant-reveal 820ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--reveal-order, 0) * 110ms);
  }
  .quant-iridescent::after {
    animation: quant-rim 14s linear infinite;
    animation-play-state: var(--quant-motion, running);
  }
  .quant-hero::before {
    animation: quant-sweep 7.5s cubic-bezier(0.45, 0, 0.2, 1) 0.6s infinite;
    animation-play-state: var(--quant-motion, running);
  }
  .quant-light {
    animation: quant-drift 22s ease-in-out infinite alternate;
    animation-play-state: var(--quant-motion, running);
  }
  .quant-skeleton span {
    animation: quant-scan 1.6s linear infinite;
    animation-play-state: var(--quant-motion, running);
  }
  .quant-market--deploy .quant-badge.deploy {
    background-size: 200% 100%;
    animation: quant-shine 3.2s ease-in-out infinite;
    animation-play-state: var(--quant-motion, running);
  }
}
@keyframes quant-reveal {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.98);
    filter: blur(12px) saturate(0.6);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
@keyframes quant-rim {
  to {
    --q-angle: 570deg;
  }
}
@keyframes quant-sweep {
  0% {
    transform: translateX(-75%);
  }
  55%,
  100% {
    transform: translateX(75%);
  }
}
@keyframes quant-drift {
  from {
    transform: translate3d(-1.5%, -1%, 0) scale(1);
  }
  to {
    transform: translate3d(1.5%, 1.5%, 0) scale(1.05);
  }
}
@keyframes quant-blink {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}
@keyframes quant-shine {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
@keyframes quant-scan {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -120% 0;
  }
}

@media (max-width: 1100px) {
  .quant-grid {
    grid-template-columns: #{'minmax(0, 1fr)'};
  }
}
@media (max-width: 760px) {
  .quant-hero {
    grid-template-columns: #{'minmax(0, 1fr)'};
    padding: 22px 18px;
  }
  .quant-art {
    order: -1;
    max-width: 230px;
    margin-bottom: -6px;
  }
  .quant-market-body {
    grid-template-columns: #{'minmax(0, 1fr)'};
    justify-items: center;
  }
  .quant-stats {
    width: 100%;
  }
  .quant-session {
    gap: 4px;
    button {
      padding: 0 8px;
    }
  }
  .quant-folds {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  }
  .quant-panel {
    padding: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .quant-progress span {
    transition: none;
  }
}
</style>
