<template>
  <section class="campaign-progress" data-testid="discovery-campaign-progress" :aria-label="t('bots.discovery.goal')">
    <div class="progress-lane time" data-testid="campaign-progress-time">
      <div class="lane-caption">
        <span>{{ t('bots.discovery.activeDays') }}</span>
        <strong>{{ activeDayLabel }} <small>/ 14</small></strong>
      </div>
      <div
        class="lane-track"
        role="progressbar"
        :aria-label="t('bots.discovery.activeDays')"
        :aria-valuemin="0"
        :aria-valuemax="DISCOVERY_GOAL_ACTIVE_MS"
        :aria-valuenow="Math.min(progress.activeMs, DISCOVERY_GOAL_ACTIVE_MS)"
        :aria-valuetext="`${progress.activeMs} ms / ${DISCOVERY_GOAL_ACTIVE_MS} ms`"
      >
        <span class="lane-fill" :style="{ width: `${activeWidth}%` }" />
      </div>
    </div>

    <div class="progress-lane swaps" data-testid="campaign-progress-swaps">
      <div class="lane-caption">
        <span>{{ t('bots.discovery.finalizedSwaps') }}</span>
        <strong>{{ progress.successfulSwaps }} <small>/ 10</small></strong>
      </div>
      <div
        class="lane-track"
        role="progressbar"
        :aria-label="t('bots.discovery.finalizedSwaps')"
        :aria-valuemin="0"
        :aria-valuemax="10"
        :aria-valuenow="Math.min(progress.successfulSwaps, 10)"
        :aria-valuetext="`${progress.successfulSwaps} / 10 ${t('bots.discovery.finalizedSwaps')}`"
      >
        <span class="lane-fill" :style="{ width: `${swapWidth}%` }" />
      </div>
    </div>

    <div
      class="progress-lane drawdown"
      :class="{ breached: drawdownBreached }"
      data-testid="campaign-progress-drawdown"
    >
      <div class="lane-caption">
        <span>{{ t('bots.discovery.drawdown') }}</span>
        <strong data-testid="campaign-drawdown-value"
          >{{ drawdownLabel }} <small>/ {{ progress.maxDrawdownPercent }}%</small></strong
        >
      </div>
      <div
        class="lane-track"
        role="progressbar"
        :aria-label="t('bots.discovery.drawdown')"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="drawdownWidth"
        :aria-valuetext="`${drawdownLabel} / ${progress.maxDrawdownPercent}% ${t('bots.discovery.maxDrawdown')}`"
      >
        <span class="lane-fill" :style="{ width: `${drawdownWidth}%` }" />
        <i class="limit-mark" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { codec, toCodec } from '../amounts';
import { DISCOVERY_GOAL_ACTIVE_MS, type DiscoveryCampaign } from '../campaign';

defineOptions({ name: 'DiscoveryCampaignProgress' });
const props = defineProps<{ progress: DiscoveryCampaign['progress'][string] }>();
const { t } = useTranslation();
const PERCENT_SCALE = 10n ** 18n;
const DAY_MS = 86_400_000n;

/** A CSS percentage is derived only after the exact integer ratio has been bounded. */
function boundedWidth(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n || numerator <= 0n) return 0;
  const basisPoints = (numerator * 10_000n) / denominator;
  return Number(basisPoints > 10_000n ? 10_000n : basisPoints) / 100;
}

/** Keep a visibly approximate mark when an exact codec ratio has a repeating decimal. */
function percentLabel(numerator: bigint, denominator: bigint): string {
  if (denominator <= 0n || numerator < 0n) return '—';
  const scaledNumerator = numerator * 10_000n;
  const scaled = scaledNumerator / denominator;
  const fraction = (scaled % 10_000n).toString().padStart(4, '0').replace(/0+$/, '');
  const value = `${scaled / 10_000n}${fraction ? `.${fraction}` : ''}%`;
  if (scaled === 0n && numerator > 0n) return '<0.0001%';
  return `${scaledNumerator % denominator ? '≈' : ''}${value}`;
}

const activeWidth = computed(() => boundedWidth(BigInt(props.progress.activeMs), BigInt(DISCOVERY_GOAL_ACTIVE_MS)));
const swapWidth = computed(() => boundedWidth(BigInt(props.progress.successfulSwaps), 10n));
const activeDayLabel = computed(() => {
  const milliseconds = BigInt(props.progress.activeMs);
  const hundredths = (milliseconds * 100n) / DAY_MS;
  if (hundredths === 0n && milliseconds > 0n) return '<0.01';
  const fraction = (hundredths % 100n).toString().padStart(2, '0');
  return `${(milliseconds * 100n) % DAY_MS ? '≈' : ''}${hundredths / 100n}.${fraction}`;
});
const drawdown = computed(() => {
  const peak = codec(props.progress.peakOutputCodec);
  const latest = codec(props.progress.latestOutputCodec);
  const limit = codec(toCodec(props.progress.maxDrawdownPercent, 18));
  return { peak, delta: peak >= latest ? peak - latest : -1n, limit };
});
const drawdownLabel = computed(() => percentLabel(drawdown.value.delta * 100n, drawdown.value.peak));
const drawdownWidth = computed(() =>
  drawdown.value.limit === 0n
    ? drawdown.value.delta > 0n
      ? 100
      : 0
    : boundedWidth(drawdown.value.delta * 100n * PERCENT_SCALE, drawdown.value.peak * drawdown.value.limit)
);
const drawdownBreached = computed(
  () =>
    props.progress.outcome === 'loss' ||
    (drawdown.value.peak > 0n &&
      drawdown.value.delta > 0n &&
      drawdown.value.delta * 100n * PERCENT_SCALE >= drawdown.value.peak * drawdown.value.limit)
);
</script>

<style scoped lang="scss">
.campaign-progress {
  --lane-surface: var(--bot-recess, var(--s-color-base-background));
  --lane-text: var(--s-color-base-content-primary);
  --lane-muted: var(--bot-muted, var(--s-color-base-content-secondary));
  --lane-inset: var(--bot-shadow-inset, inset 2px 2px 5px var(--s-shadow-color-dark));
  display: grid;
  grid-template-columns: repeat(3, #{'minmax' }(0, 1fr));
  gap: 14px;
  min-width: 0;
  padding: 12px 0 1px;
  font-variant-numeric: tabular-nums;
}
.progress-lane {
  --lane-accent: var(--bot-accent, var(--s-color-action-text));
  min-width: 0;
}
.progress-lane.swaps {
  --lane-accent: var(--bot-cyan, var(--s-color-status-success-text));
}
.progress-lane.drawdown {
  --lane-accent: var(--s-color-status-warning-text);
}
.progress-lane.drawdown.breached {
  --lane-accent: var(--s-color-status-error-text);
}
.lane-caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
  margin-bottom: 7px;
  color: var(--lane-muted);
  font-size: 10px;
  line-height: 1.35;
}
.lane-caption > span {
  overflow-wrap: anywhere;
}
.lane-caption strong {
  color: var(--lane-text);
  font-size: 11px;
  font-weight: 750;
  text-align: end;
  white-space: nowrap;
}
.drawdown.breached .lane-caption strong {
  color: var(--lane-accent);
}
.lane-caption small {
  color: var(--lane-muted);
  font-size: 10px;
  font-weight: 500;
}
.lane-track {
  position: relative;
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--lane-surface);
  box-shadow: var(--lane-inset);
}
.lane-fill {
  position: absolute;
  inset: 1px auto 1px 1px;
  max-width: calc(100% - 2px);
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--lane-accent) 62%, transparent), var(--lane-accent));
  box-shadow: 0 0 9px color-mix(in srgb, var(--lane-accent) 38%, transparent);
  animation: lane-reveal 850ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.lane-fill::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 13px;
  content: '';
  background: linear-gradient(90deg, transparent, color-mix(in srgb, white 40%, transparent));
}
.limit-mark {
  position: absolute;
  top: 0;
  right: 1px;
  bottom: 0;
  border-right: 2px solid var(--lane-accent);
  opacity: 0.75;
}
@keyframes lane-reveal {
  from {
    transform: scaleX(0);
    transform-origin: left;
  }
  to {
    transform: scaleX(1);
    transform-origin: left;
  }
}
@media (max-width: 760px) {
  .campaign-progress {
    grid-template-columns: #{'minmax' }(0, 1fr);
    gap: 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lane-fill {
    animation: none;
  }
}
</style>
