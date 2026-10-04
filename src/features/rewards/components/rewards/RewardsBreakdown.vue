<template>
  <section class="rw-card rw-breakdown" :style="{ '--rw-i': index }" :aria-labelledby="titleId">
    <header class="rw-card__head">
      <h3 :id="titleId" class="rw-card__title">{{ t('rewards.analytics.sources.title') }}</h3>
      <button
        v-if="hasSegments && connected"
        type="button"
        class="rw-card__toggle"
        :aria-pressed="tableView"
        @click="tableView = !tableView"
      >
        {{ t('rewards.analytics.showTable') }}
      </button>
    </header>

    <template v-if="hasSegments && connected">
      <template v-if="!tableView">
        <div class="rw-breakdown__plot">
          <div
            class="rw-stack"
            :class="{ 'rw-stack--focus': activeId, 'rw-stack--ghost': !drawn.length }"
            role="img"
            :aria-label="summary"
            @pointerleave="activeId = null"
          >
            <span
              v-for="(segment, position) in drawn"
              :key="segment.id"
              class="rw-stack__segment"
              :class="{ 'is-active': activeId === segment.id, 'is-skipped': !segment.selected }"
              :style="{ flexGrow: segment.share, '--rw-color': colorOf(segment.id), '--i': position }"
              @pointerenter="activeId = segment.id"
            ></span>
          </div>
          <div v-if="active" class="rw-tip" role="presentation" :style="tipStyle">
            <rewards-segment-value
              class="rw-tip__value"
              :amounts="active.amounts"
              :fiat="active.fiat"
              :prefer-fiat="breakdown.basis === 'fiat'"
            ></rewards-segment-value>
            <span class="rw-tip__name">{{ nameOf(active.id) }} · {{ formatShare(active.share) }}</span>
          </div>
        </div>

        <ul class="rw-legend">
          <li
            v-for="segment in breakdown.segments"
            :key="segment.id"
            class="rw-legend__row"
            :class="{ 'is-active': activeId === segment.id, 'is-skipped': !segment.selected }"
            tabindex="0"
            @pointerenter="activeId = segment.id"
            @pointerleave="activeId = null"
            @focus="activeId = segment.id"
            @blur="activeId = null"
          >
            <i class="rw-legend__swatch" :style="{ '--rw-color': colorOf(segment.id) }" aria-hidden="true"></i>
            <span class="rw-legend__name">
              {{ nameOf(segment.id) }}
              <span v-if="!segment.selected" class="rw-legend__flag">{{ t('rewards.analytics.skipped') }}</span>
            </span>
            <rewards-segment-value
              class="rw-legend__value"
              :amounts="segment.amounts"
              :fiat="segment.fiat"
              :prefer-fiat="breakdown.basis === 'fiat'"
            ></rewards-segment-value>
            <span class="rw-legend__share">{{ shareOf(segment) }}</span>
          </li>
        </ul>
        <p v-if="breakdown.hasUnpriced" class="rw-card__note">{{ t('rewards.analytics.sources.unpriced') }}</p>
      </template>

      <table v-else class="rw-table">
        <caption class="rw-sr-only">
          {{
            t('rewards.analytics.sources.title')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('rewards.analytics.table.source') }}</th>
            <th scope="col">{{ t('amountText') }}</th>
            <th scope="col">{{ t('rewards.analytics.table.value') }}</th>
            <th scope="col">{{ t('rewards.analytics.table.share') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="segment in breakdown.segments" :key="segment.id">
            <th scope="row">{{ nameOf(segment.id) }}</th>
            <td>
              <rewards-segment-value :amounts="segment.amounts" :prefer-fiat="false"></rewards-segment-value>
            </td>
            <td>
              <rewards-segment-value
                v-if="segment.fiat"
                :fiat="segment.fiat"
                :amounts="segment.amounts"
              ></rewards-segment-value>
              <template v-else>–</template>
            </td>
            <td>
              <bdi dir="ltr">{{ shareOf(segment) }}</bdi>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-else>
      <div class="rw-stack rw-stack--ghost" aria-hidden="true"></div>
      <p class="rw-card__ghost">
        {{ connected ? t('rewards.analytics.sources.empty') : t('rewards.analytics.connectToSee') }}
      </p>
    </template>
  </section>
</template>

<script lang="ts" setup>
import { computed, ref, useId } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import {
  formatShare,
  type BreakdownSegment,
  type RewardSourceId,
  type RewardsBreakdown,
} from '@/features/rewards/utils/analytics';

import RewardsSegmentValue from './RewardsSegmentValue.vue';

/**
 * Part-to-whole view of what can be claimed: one stacked bar, a legend with values, and a table twin.
 *
 * Each source keeps its own color slot. Sources the user unticked in the claim list are dimmed and flagged, so the
 * bar and the claim list always tell the same story. Hovering or focusing a legend row or a bar segment shows the
 * same readout.
 */
defineOptions({
  name: 'RewardsBreakdown',
});

const props = withDefaults(
  defineProps<{
    breakdown: RewardsBreakdown;
    /** The wallet is connected; otherwise the card shows an empty frame. */
    connected?: boolean;
    /** Position in the column, used to stagger the entrance. */
    index?: number;
  }>(),
  {
    connected: false,
    index: 0,
  }
);

const { t } = useTranslation();
const titleId = `rw-breakdown-${useId()}`;
const tableView = ref(false);
const activeId = ref<RewardSourceId | null>(null);

const hasSegments = computed(() => props.breakdown.segments.length > 0);
/** Segments with a share are drawn; unpriced ones only appear in the legend. */
const drawn = computed<BreakdownSegment[]>(() => props.breakdown.segments.filter((segment) => segment.share > 0));
const active = computed(() => props.breakdown.segments.find((segment) => segment.id === activeId.value) ?? null);

const colorOf = (id: RewardSourceId): string => `var(--rw-src-${id})`;
const nameOf = (id: RewardSourceId): string => t(`rewards.analytics.sources.${id}`);

/** One line for assistive technology. A source that could not be priced has no share, so it gets a dash, not 0%. */
const shareOf = (segment: BreakdownSegment): string => (segment.share > 0 ? formatShare(segment.share) : '–');

const summary = computed(() =>
  props.breakdown.segments.map((segment) => `${nameOf(segment.id)} ${shareOf(segment)}`).join(', ')
);

/** Centre of the active segment along the bar, kept away from the edges so the readout stays inside the card. */
const tipStyle = computed(() => {
  const target = active.value;
  let start = 0;

  for (const segment of drawn.value) {
    if (segment.id === target?.id) {
      const center = (start + segment.share / 2) * 100;

      return { insetInlineStart: `${Math.min(80, Math.max(20, center))}%` };
    }

    start += segment.share;
  }

  return { insetInlineStart: '50%' };
});
</script>

<style lang="scss">
.rw-breakdown {
  &__plot {
    position: relative;
    padding-top: 2px;
  }
}

// One bar, <= 24px thick. Segments are separated by a 2px gap of the surface (never a border); only the outer ends
// are rounded (4px).
.rw-stack {
  display: flex;
  gap: 2px;
  height: 16px;

  &__segment {
    flex: 1 1 0;
    min-width: 4px;
    background: var(--rw-color);
    transform-origin: left center;
    animation: rw-grow 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--i, 0) * 110ms + 150ms);
    transition:
      opacity 0.2s ease,
      transform 0.2s ease,
      filter 0.2s ease;

    &:first-child {
      border-start-start-radius: 4px;
      border-end-start-radius: 4px;
    }

    &:last-child {
      border-start-end-radius: 4px;
      border-end-end-radius: 4px;
    }

    &.is-skipped {
      opacity: 0.35;
    }
  }

  // Hovering one segment lifts it and quiets the rest.
  &--focus &__segment:not(.is-active) {
    opacity: 0.45;
  }

  &__segment.is-active {
    opacity: 1;
    filter: brightness(1.08);
    transform: scaleY(1.4);
  }

  &--ghost {
    border: 1px dashed var(--rw-line, #ede4e7);
    border-radius: 4px;
    background: transparent;
  }
}

[dir='rtl'] .rw-stack__segment {
  transform-origin: right center;
}

.rw-tip {
  position: absolute;
  bottom: calc(100% + 6px);
  z-index: 2;
  display: grid;
  gap: 2px;
  min-width: max-content;
  padding: 8px 12px;
  border: 1px solid var(--rw-line, #ede4e7);
  border-radius: 12px;
  background: var(--rw-surface, #fdf7fb);
  box-shadow: 0 10px 28px -10px rgba(42, 23, 31, 0.3);
  pointer-events: none;
  transform: translateX(-50%);
  animation: rw-fade 0.15s ease-out both;

  [dir='rtl'] & {
    transform: translateX(50%);
  }

  // Value first and strong, the name after it.
  &__value {
    justify-content: flex-start;
    color: var(--rw-ink, #2a171f);
    font-size: var(--s-font-size-small);
    font-weight: 700;
  }

  &__name {
    color: var(--rw-muted, #6e6168);
    font-size: 11px;
  }
}

.rw-legend {
  display: grid;
  gap: 2px;
  margin: $inner-spacing-medium 0 0;
  padding: 0;
  list-style: none;

  &__row {
    display: grid;
    grid-template-columns: #{'auto minmax(0, 1fr) auto auto'};
    align-items: baseline;
    gap: $inner-spacing-small;
    padding: 7px 8px;
    margin-inline: -8px;
    border-radius: 12px;
    color: var(--rw-ink, #2a171f);
    font-size: var(--s-font-size-small);
    transition: background-color 0.2s ease;
    cursor: default;

    &.is-active,
    &:hover {
      background: color-mix(in srgb, var(--rw-ink, #2a171f) 6%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--s-color-focus-ring, #ab0555);
      outline-offset: 0;
    }

    &.is-skipped .rw-legend__name,
    &.is-skipped .rw-legend__value,
    &.is-skipped .rw-legend__share {
      opacity: 0.6;
    }
  }

  // A short key in the series color; the text beside it stays in the text color.
  &__swatch {
    align-self: center;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--rw-color);
  }

  &__name {
    min-width: 0;
    font-weight: 600;
  }

  &__flag {
    margin-inline-start: 6px;
    padding: 1px 7px;
    border: 1px solid var(--rw-line, #ede4e7);
    border-radius: 999px;
    color: var(--rw-muted, #6e6168);
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  &__value {
    color: var(--rw-ink, #2a171f);
    font-weight: 600;
  }

  &__share {
    min-width: 3.2ch;
    color: var(--rw-muted, #6e6168);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: end;
    // A share is a number: it reads left to right in every language, so `<1%` keeps its sign in front.
    direction: ltr;
    unicode-bidi: isolate;
  }
}

// `scale` is an individual transform property, so the entrance does not lock the `transform` used by the hover lift.
@keyframes rw-grow {
  from {
    scale: 0 1;
  }
  to {
    scale: 1 1;
  }
}

@keyframes rw-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rw-stack__segment {
    animation: none;
    transition: none;
  }

  .rw-tip {
    animation: none;
  }
}

@media (forced-colors: active) {
  .rw-stack__segment {
    outline: 1px solid CanvasText;
  }
}
</style>
