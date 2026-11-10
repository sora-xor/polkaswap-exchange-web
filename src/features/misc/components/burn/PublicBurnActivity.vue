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
    <table v-if="activity">
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
    <p v-else role="status">{{ t(loading ? 'burnActivity.loading' : 'burnActivity.unavailable') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

  table {
    width: 100%;
    margin-top: 8px;
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
