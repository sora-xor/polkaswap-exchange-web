<template>
  <section class="tonswap-curve" :aria-labelledby="headingId">
    <h3 :id="headingId">{{ t('burnPage.tonswap.curve.title') }}</h3>
    <p class="tonswap-curve__description">
      {{ exhausted ? t('burnPage.tonswap.capReached') : t('burnPage.tonswap.curve.description') }}
    </p>
    <div v-if="showSummary && position && !exhausted" class="tonswap-curve__current">
      <span>{{ t('burnPage.tonswap.curve.current') }}</span>
      <strong>{{ rateLabel }} <small>TS / XOR</small></strong>
    </div>
    <svg
      class="tonswap-curve__chart"
      viewBox="0 0 360 188"
      role="img"
      :aria-labelledby="chartTitleId"
      :aria-describedby="chartDescriptionId"
    >
      <title :id="chartTitleId">{{ t('burnPage.tonswap.curve.title') }}</title>
      <desc :id="chartDescriptionId">{{ chartDescription }}</desc>
      <defs>
        <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#00a6f2" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#00a6f2" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <g aria-hidden="true">
        <path class="tonswap-curve__grid" d="M20 30H340 M20 78H340 M20 126H340" />
        <path d="M20 30L340 126H20Z" :fill="`url(#${gradientId})`" />
        <path class="tonswap-curve__line" d="M20 30L340 126" />
        <path v-if="position" class="tonswap-curve__completed" :d="`M20 30L${position.x} ${position.y}`" />
        <text class="tonswap-curve__rate" x="20" y="16">50 TS / XOR</text>
        <text class="tonswap-curve__rate" x="340" y="148" text-anchor="end">5 TS / XOR</text>
        <text class="tonswap-curve__tick" x="20" y="178">{{ t('burnPage.tonswap.curve.start') }}</text>
        <text class="tonswap-curve__tick" x="340" y="178" text-anchor="end">
          {{ t('burnPage.tonswap.curve.end') }}
        </text>
      </g>
      <g v-if="position" class="tonswap-curve__position" aria-hidden="true">
        <title>{{ t('burnPage.tonswap.curve.currentPoint') }}: {{ rateLabel }} TS / XOR</title>
        <path class="tonswap-curve__guide" :d="`M${position.x} ${position.y}V126`" />
        <circle class="tonswap-curve__halo" :cx="position.x" :cy="position.y" r="11" />
        <circle class="tonswap-curve__point" :cx="position.x" :cy="position.y" r="5" />
      </g>
    </svg>
    <dl v-if="showSummary" class="tonswap-curve__totals">
      <div v-if="position" class="tonswap-curve__burned-total">
        <dt>{{ t('burnPage.tonswap.curve.burned') }}</dt>
        <dd>
          <strong class="tonswap-curve__burned">{{ burnedLabel }} <small>XOR</small></strong>
          <span class="tonswap-curve__progress">{{ progressLabel }}</span>
        </dd>
      </div>
      <div class="tonswap-curve__cap-total">
        <dt>{{ t('burnPage.tonswap.cap') }}</dt>
        <dd>
          <strong class="tonswap-curve__cap">{{ capLabel }} <small>XOR</small></strong>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { computed, useId } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { formatBurnAmount } from '@/features/misc/lib/burnCampaigns';
import { getTonswapCurrentRate, getTonswapRemaining, TONSWAP_XOR_CAP } from '@/features/misc/lib/tonswapBurn';

/**
 * Display the actual marginal reward schedule with finalized eligible XOR only.
 * Pass `null` until a complete campaign snapshot is available. Coordinates use a
 * bounded display ratio; reward amounts and the exhaustion check stay exact.
 * Finalized progress is grouped separately from the schedule's axis endpoints.
 * The exact cap percentage makes small burns visible without distorting the scale.
 * Set `showSummary` to false when the page already shows the rate and totals next to the chart.
 */
defineOptions({ name: 'TonswapRewardCurve' });
const props = withDefaults(defineProps<{ burned: FPNumber | null; showSummary?: boolean }>(), { showSummary: true });
const { t } = useTranslation();
const id = useId();
const headingId = `tonswap-curve-heading-${id}`;
const chartTitleId = `tonswap-curve-title-${id}`;
const chartDescriptionId = `tonswap-curve-description-${id}`;
const gradientId = `tonswap-curve-gradient-${id}`;
const cap = new FPNumber(TONSWAP_XOR_CAP);
const hundred = new FPNumber('100');
const capLabel = formatBurnAmount(cap, 0);
const eligible = computed(() => {
  if (!props.burned) return null;
  try {
    return cap.sub(getTonswapRemaining(props.burned));
  } catch {
    return null;
  }
});
const exhausted = computed(() => eligible.value !== null && FPNumber.gte(eligible.value, cap));
const rateLabel = computed(() =>
  eligible.value === null ? '' : formatBurnAmount(getTonswapCurrentRate(eligible.value), 6)
);
const burnedLabel = computed(() => (eligible.value === null ? '' : formatBurnAmount(eligible.value, 4)));
const progressLabel = computed(() =>
  eligible.value === null
    ? ''
    : t('burnPage.tonswap.curve.progress', { percent: formatBurnAmount(eligible.value.mul(hundred).div(cap), 4) })
);
const position = computed(() => {
  if (eligible.value === null) return null;
  const ratio = Number(eligible.value.div(cap).toString());
  return { x: 20 + 320 * ratio, y: 30 + 96 * ratio };
});
const chartDescription = computed(() => {
  const schedule = t('burnPage.tonswap.curve.chartLabel', { cap: capLabel });
  if (eligible.value === null) return schedule;
  const progress = `${t('burnPage.tonswap.curve.burned')}: ${burnedLabel.value} / ${capLabel}.`;
  const current = exhausted.value
    ? t('burnPage.tonswap.capReached')
    : `${t('burnPage.tonswap.curve.current')}: ${rateLabel.value} TS / XOR.`;
  return `${schedule} ${progress} ${progressLabel.value}. ${current}`;
});
</script>

<style scoped lang="scss">
.tonswap-curve {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 16px 0;
  padding: 20px;
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-surface);
  box-shadow: var(--s-shadow-element-pressed);
  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    text-transform: none;
  }
  &__description {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);
  }
  &__current {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 12px;
    margin-top: 14px;
    font-size: 12px;
    > span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--s-color-theme-accent);
      }
    }
    strong {
      font-size: 16px;
      font-weight: 600;
      color: var(--s-color-theme-accent);
    }
    small {
      font-size: 11px;
      font-weight: 400;
    }
  }
  &__chart {
    // A chart reads left to right in every language, so RTL pages must not mirror its labels.
    direction: ltr;
    display: block;
    width: 100%;
    max-width: 440px;
    height: auto;
    margin: 16px auto 0;
    overflow: visible;
  }
  &__grid {
    fill: none;
    stroke: var(--s-color-base-border-secondary);
    stroke-width: 1;
    stroke-dasharray: 3 5;
  }
  &__line,
  &__completed {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
  }
  &__line {
    stroke: #00a6f2;
  }
  &__completed {
    stroke: var(--s-color-theme-accent);
  }
  &__rate,
  &__tick {
    fill: var(--s-color-base-content-primary);
    font-family: inherit;
    font-size: 15px;
  }
  &__rate {
    font-weight: 600;
  }
  &__tick {
    fill: var(--s-color-base-content-secondary);
  }
  &__guide {
    stroke: var(--s-color-theme-accent);
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }
  &__halo {
    fill: var(--s-color-theme-accent);
    opacity: 0.16;
  }
  &__point {
    fill: var(--s-color-theme-accent);
    stroke: var(--s-color-utility-surface);
    stroke-width: 2;
  }
  &__progress {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);
    font-variant-numeric: tabular-nums;
  }
  &__totals {
    display: grid;
    // Keep native CSS minmax separate from the shared Sass breakpoint helper.
    grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
    gap: 16px;
    margin: 16px 0 0;
    padding: 16px;
    border-radius: 8px;
    background: var(--s-color-base-border-primary);
    box-shadow: var(--s-shadow-element-pressed);
    > div {
      min-width: 0;
    }
    dt {
      margin: 0 0 6px;
      font-size: 11px;
      line-height: 1.5;
      color: var(--s-color-base-content-secondary);
    }
    dd {
      margin: 0;
    }
    strong {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      column-gap: 4px;
      font-size: 14px;
      line-height: 1.4;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--s-color-base-content-primary);
    }
    small {
      font-size: 11px;
      font-weight: 400;
    }
  }
  @media (max-width: 480px) {
    padding: 16px;
  }
  @media (max-width: 379px) {
    &__totals {
      grid-template-columns: 1fr;
    }
  }
}
</style>
