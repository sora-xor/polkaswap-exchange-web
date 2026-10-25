<template>
  <section class="rw-card rw-vesting" :style="{ '--rw-i': index }" :aria-labelledby="titleId">
    <header class="rw-card__head">
      <h3 :id="titleId" class="rw-card__title">{{ t('rewards.analytics.vesting.title') }}</h3>
    </header>

    <template v-if="connected && vesting.rows.length">
      <div v-if="vesting.rows.length > 1" class="rw-vesting__summary">
        <span class="rw-vesting__percent">{{ formatShare(vesting.unlocked) }}</span>
        <span class="rw-vesting__caption">{{
          vesting.fullyUnlocked ? t('rewards.analytics.vesting.fullyUnlocked') : t('rewards.stats.unlocked')
        }}</span>
      </div>

      <ul class="rw-vesting__rows">
        <li v-for="(row, position) in vesting.rows" :key="row.id" class="rw-vesting__row">
          <div class="rw-vesting__line">
            <span class="rw-vesting__name">{{ nameOf(row.id) }}</span>
            <span class="rw-vesting__share">
              <template v-if="vesting.rows.length === 1">{{ t('rewards.stats.unlocked') }}&nbsp;</template>
              {{ formatShare(row.unlocked) }}
            </span>
          </div>
          <div
            class="rw-meter"
            v-bind="meterAttrs(row)"
            :style="{ '--rw-color': `var(--rw-src-${row.id})`, '--fill': row.unlocked ?? 0, '--i': position }"
          >
            <span class="rw-meter__fill"></span>
          </div>
          <dl class="rw-vesting__amounts">
            <div>
              <dt>{{ t('rewards.claimableAmountDoneVesting') }}</dt>
              <dd>
                <rewards-segment-value :amounts="row.claimable" :prefer-fiat="false"></rewards-segment-value>
              </dd>
            </div>
            <div v-if="row.locked.length">
              <dt>{{ t('assets.balance.locked') }}</dt>
              <dd>
                <rewards-segment-value :amounts="row.locked" :prefer-fiat="false"></rewards-segment-value>
              </dd>
            </div>
          </dl>
        </li>
      </ul>
    </template>

    <template v-else>
      <div class="rw-meter rw-meter--ghost" aria-hidden="true"></div>
      <p class="rw-card__ghost">
        {{ connected ? t('rewards.analytics.vesting.empty') : t('rewards.analytics.connectToSee') }}
      </p>
    </template>
  </section>
</template>

<script lang="ts" setup>
import { useId } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import {
  formatShare,
  toWholePercent,
  type RewardsVesting,
  type VestingRow,
  type VestingSourceId,
} from '@/features/rewards/utils/analytics';

import RewardsSegmentValue from './RewardsSegmentValue.vue';

/**
 * How much of the vesting rewards (strategic and crowdloan) can be claimed now.
 *
 * One meter per source: the fill is the unlocked share, the track a lighter step of the same color. The amounts
 * under each meter are the same numbers as in the claim list, so nothing is readable only from the bar.
 */
defineOptions({
  name: 'RewardsVesting',
});

withDefaults(
  defineProps<{
    vesting: RewardsVesting;
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
const titleId = `rw-vesting-${useId()}`;

const nameOf = (id: VestingSourceId): string => t(`rewards.analytics.sources.${id}`);

/** A meter must carry a value. When the share is unknown the bar is only decoration, and the text beside it says so. */
const meterAttrs = (row: VestingRow) =>
  row.unlocked === null
    ? { 'aria-hidden': 'true' }
    : {
        role: 'meter',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': toWholePercent(row.unlocked),
        'aria-label': nameOf(row.id),
      };
</script>

<style lang="scss">
.rw-vesting {
  &__summary {
    display: flex;
    align-items: baseline;
    gap: $inner-spacing-mini;
    margin-bottom: $inner-spacing-medium;
  }

  // A stat value: proportional figures, semibold.
  &__percent {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--rw-ink, #2a171f);
  }

  &__caption {
    color: var(--rw-muted, #6e6168);
    font-size: var(--s-font-size-mini);
  }

  &__rows {
    display: grid;
    gap: $inner-spacing-medium;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: grid;
    gap: 6px;
  }

  &__line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $inner-spacing-mini;
    font-size: var(--s-font-size-small);
  }

  &__name {
    font-weight: 600;
    color: var(--rw-ink, #2a171f);
  }

  &__share {
    color: var(--rw-muted, #6e6168);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    direction: ltr;
    unicode-bidi: isolate;
  }

  &__amounts {
    display: grid;
    gap: 2px;
    margin: 0;
    font-size: var(--s-font-size-extra-small);

    > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: $inner-spacing-small;
    }

    dt {
      color: var(--rw-muted, #6e6168);
    }

    dd {
      margin: 0;
      color: var(--rw-ink, #2a171f);
      font-weight: 600;
    }
  }
}

// Meter: the fill is the value, the track is a lighter step of the same hue. 8px thick, 4px rounded ends.
.rw-meter {
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--rw-color, #d8267a) 20%, transparent);
  overflow: hidden;

  &__fill {
    display: block;
    width: calc(var(--fill, 0) * 100%);
    height: 100%;
    border-radius: 4px;
    background: var(--rw-color, #d8267a);
    animation: rw-meter-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--i, 0) * 120ms + 200ms);
  }

  &--ghost {
    border: 1px dashed var(--rw-line, #ede4e7);
    background: transparent;
  }
}

@keyframes rw-meter-in {
  from {
    width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rw-meter__fill {
    animation: none;
  }
}

@media (forced-colors: active) {
  .rw-meter {
    border: 1px solid CanvasText;
  }
}
</style>
