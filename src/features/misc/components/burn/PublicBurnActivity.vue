<template>
  <section class="public-burn" :aria-labelledby="`${prefix}-title`" :data-testid="`${prefix}-activity`">
    <header class="public-burn__head">
      <h2 :id="`${prefix}-title`">{{ t(campaignHistory ? 'burnActivity.campaignHistory' : 'burnActivity.title') }}</h2>
      <p
        v-if="activity"
        :data-testid="`${prefix}-coverage`"
        :data-start-block="activity.startBlock"
        :data-through-block="activity.throughBlock"
      >
        {{
          t('burnActivity.coverage', {
            from: groupExactDecimal(activity.startBlock),
            to: groupExactDecimal(activity.throughBlock),
          })
        }}
      </p>
    </header>
    <!-- Exact totals can be wider than a phone: they scroll here, and only then is the area a named keyboard stop.
         It is a group, not a second region: the section around it is already the region with this name. -->
    <div
      v-if="activity"
      ref="scroller"
      class="public-burn__scroll"
      :data-testid="`${prefix}-scroll`"
      :tabindex="keyboardStop ? 0 : undefined"
      :role="keyboardStop ? 'group' : undefined"
      :aria-labelledby="keyboardStop ? `${prefix}-title` : undefined"
      @focus="focused = true"
      @blur="focused = false"
    >
      <table ref="table">
        <thead>
          <tr>
            <th scope="col">{{ t('burnActivity.scope') }}</th>
            <th scope="col">{{ t('burnActivity.count') }}</th>
            <th scope="col">{{ t('burnActivity.xor') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{{ t('burnActivity.all') }}</th>
            <td :data-testid="`${prefix}-total-count`">{{ groupExactDecimal(activity.burnCount) }}</td>
            <td :data-testid="`${prefix}-total-xor`" :title="`${activity.burnedXor} XOR`">
              {{ groupExactDecimal(activity.burnedXor) }}
            </td>
          </tr>
          <tr>
            <th scope="row">{{ t('burnActivity.tonswap') }}</th>
            <td :data-testid="`${prefix}-tonswap-count`">{{ groupExactDecimal(activity.tonswapCount) }}</td>
            <td :data-testid="`${prefix}-tonswap-xor`" :title="`${activity.tonswapXor} XOR`">
              {{ groupExactDecimal(activity.tonswapXor) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else role="status">{{ t(loading ? 'burnActivity.loading' : 'burnActivity.unavailable') }}</p>
  </section>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { computed, nextTick, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { groupExactDecimal } from '@/features/misc/lib/burnActivityFormat';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import {
  BURN_ACTIVITY_MAX_AGE_MS,
  fetchPublicBurnActivity,
  type PublicBurnActivity,
} from '@/indexer/queries/publicBurnActivity';
import { useWalletStore } from '@/stores/wallet';
import { resolvePolkaswapIndexerEndpoint } from '@/utils/indexerEndpoint';

const props = defineProps<{ campaignHistory?: boolean }>();
const prefix = computed(() => (props.campaignHistory ? 'campaign-burn' : 'public-burn'));
const { t } = useTranslation();
const wallet = useWalletStore();
const endpoint = computed(() => resolvePolkaswapIndexerEndpoint(wallet.indexers?.[IndexerType.POLKASWAP]?.endpoint));
const activity = ref<PublicBurnActivity | null>(null);
const loading = ref(true);
const scroller = ref<HTMLElement | null>(null);
const table = ref<HTMLTableElement | null>(null);
/** True while the exact totals are wider than the card, so keyboard users can reach and scroll them. */
const scrollable = ref(false);
/** True while the scrolling area has focus, so it never loses its stop (and focus ring) under the user. */
const focused = ref(false);
/** A named keyboard stop while the totals overflow, and until a focused stop is left. */
const keyboardStop = computed(() => scrollable.value || focused.value);

/** Re-measures whether the totals overflow their scrolling area. */
function measureScroll(): void {
  const el = scroller.value;
  scrollable.value = !!el && el.scrollWidth > el.clientWidth;
}

// The area overflows when the card narrows or the numbers (or the font) get wider, so both boxes are watched.
useResizeObserver(scroller, measureScroll);
useResizeObserver(table, measureScroll);
watch(activity, (next) => {
  // A withdrawn table removes the area without a blur event.
  if (!next) focused.value = false;
  void nextTick(measureScroll);
});

watch(
  [endpoint, () => Boolean(props.campaignHistory)] as const,
  ([url, campaignHistory], _previous, onCleanup) => {
    activity.value = null;
    loading.value = Boolean(url);
    if (!url) return;
    let active = true;
    let pending = false;
    let expires: number | undefined;

    /** Withdraw an expired observation even while a replacement request is pending. */
    function expire(): void {
      if (
        !campaignHistory &&
        activity.value &&
        Date.now() >= activity.value.throughTimestamp * 1000 + BURN_ACTIVITY_MAX_AGE_MS
      ) {
        activity.value = null;
      }
    }

    /** Read the finalized totals without publishing responses from a previously selected endpoint. */
    async function refresh(): Promise<void> {
      expire();
      if (pending || document.hidden) return;
      pending = true;
      try {
        const next = await fetchPublicBurnActivity(url, campaignHistory ? 'campaign' : 'recent');
        if (!active) return;
        window.clearTimeout(expires);
        activity.value = next;
        if (next && !campaignHistory)
          expires = window.setTimeout(expire, next.throughTimestamp * 1000 + BURN_ACTIVITY_MAX_AGE_MS - Date.now());
      } catch {
        if (active) activity.value = null;
      } finally {
        pending = false;
        if (active) loading.value = false;
      }
    }

    void refresh();
    const poll = window.setInterval(refresh, 20_000);
    document.addEventListener('visibilitychange', refresh);
    onCleanup(() => {
      active = false;
      window.clearTimeout(expires);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', refresh);
    });
  },
  { immediate: true, flush: 'sync' }
);
</script>

<style lang="scss" scoped>
// Public totals are reference reading under the burn form, so the card is quiet and compact.
.public-burn {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 16px 20px;
  border-radius: 20px;
  background: var(--s-color-utility-surface);
  box-shadow: var(--s-shadow-element);
  text-align: start;

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 2px 16px;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }

  > p {
    margin-top: 8px;
  }

  // Exact amounts are never broken or shortened, so a total too long for a phone scrolls inside the card instead of
  // widening the page. While it scrolls it is a keyboard stop, drawn with the app's focus ring.
  &__scroll {
    overflow-x: auto;
    margin-top: 8px;
    border-radius: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    line-height: 1.4;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    padding: 7px 0;
    padding-inline-start: 12px;
    text-align: end;
    // A long amount breaks only when the card has no room left, never to make a label column wider.
    overflow-wrap: break-word;
  }

  th:first-child {
    padding-inline-start: 0;
    text-align: start;
  }

  thead th {
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
    font-weight: 500;
  }

  tbody th {
    font-weight: 500;
  }

  // The cells follow the page direction, so each number stays under its heading in right-to-left languages.
  tbody td {
    font-weight: 700;
  }

  tbody tr {
    border-top: 1px solid var(--s-color-base-border-secondary);
  }

  @media (max-width: 480px) {
    padding: 14px 16px;
  }
}
</style>
