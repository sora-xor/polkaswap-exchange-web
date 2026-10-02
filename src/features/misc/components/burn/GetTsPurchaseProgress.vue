<template>
  <section class="purchase-progress" :aria-labelledby="titleId" data-test-name="purchaseProgress">
    <div class="purchase-progress__heading">
      <h2 :id="titleId">{{ t('getTs.journey.title') }}</h2>
      <button v-if="hasTrackedTransaction" type="button" :disabled="refreshing" @click="emit('refresh')">
        {{ t(refreshing ? 'getTs.journey.checking' : 'getTs.journey.checkAll') }}
      </button>
    </div>
    <ol class="purchase-progress__steps">
      <li v-for="item in items" :key="item.id" :data-stage="item.id" :data-status="item.status">
        <span class="purchase-progress__marker" aria-hidden="true">{{ item.status === 'confirmed' ? '✓' : '·' }}</span>
        <div>
          <strong>{{ t(`getTs.journey.stages.${item.id}`) }}</strong
          ><span>{{ t(`getTs.journey.status.${item.status}`) }}</span>
        </div>
      </li>
    </ol>
    <p v-if="refreshFailed" role="status">{{ t('getTs.journey.checkFailed') }}</p>
    <details v-if="hasHistory" class="purchase-progress__history">
      <summary>{{ t('getTs.journey.details') }}</summary>
      <div v-for="item in historyItems" :key="item.id" class="purchase-progress__record">
        <strong>{{ t(`getTs.journey.stages.${item.id}`) }}</strong>
        <p v-if="item.id === 'card'">{{ t('getTs.journey.cardNote') }}</p>
        <p v-else-if="item.id === 'ton'">{{ t('getTs.journey.tonNote') }}</p>
        <p v-else-if="item.id === 'burn'">{{ t('getTs.journey.burnNote') }}</p>
        <router-link v-if="item.id === 'card'" to="/deposit/history"
          >{{ t('getTs.journey.cardHistory') }} →</router-link
        >
        <a
          v-else-if="item.id === 'conversion' && transactionUrl(item.reference)"
          :href="transactionUrl(item.reference)"
          target="_blank"
          rel="noopener noreferrer"
          >{{ t('getTs.journey.conversionHistory') }} ↗</a
        >
        <router-link v-else-if="item.id === 'bridge'" :to="bridgeHistory"
          >{{ t('getTs.journey.bridgeHistory') }} →</router-link
        >
        <router-link v-else-if="item.id === 'swap'" to="/wallet">{{ t('getTs.journey.swapHistory') }} →</router-link>
        <button v-if="reviewable.includes(item.id)" type="button" @click="emit('review', item.id)">
          {{ t('getTs.journey.review') }} →
        </button>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { getTsFundingQuery, type GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import type { GetTsJourneyItem, GetTsJourneyStage } from '@/features/misc/lib/getTsJourney';

/** A single read-only status and recovery surface; all transaction actions remain in their existing reviews. */
const props = defineProps<{
  items: GetTsJourneyItem[];
  purpose: GetTsPurpose;
  reviewable: GetTsJourneyStage[];
  refreshing: boolean;
  refreshFailed: boolean;
}>();
const emit = defineEmits<{ refresh: []; review: [stage: GetTsJourneyStage] }>();
const { t } = useTranslation();
const titleId = `purchase-progress-${useId()}`;
const hasTrackedTransaction = computed(() => props.items.some((item) => !!item.reference && item.id !== 'burn'));
const historyItems = computed(() =>
  props.items.filter((item) => !['next', 'current', 'existing'].includes(item.status))
);
const hasHistory = computed(() => historyItems.value.length > 0);
const bridgeHistory = computed(() => ({ path: '/bridge/history', query: getTsFundingQuery(props.purpose) }));
/** Only a canonical Ethereum hash may become an external recovery URL. */
function transactionUrl(reference?: string): string | undefined {
  return reference && /^0x[\da-fA-F]{64}$/.test(reference) ? `https://etherscan.io/tx/${reference}` : undefined;
}
</script>

<style scoped lang="scss">
.purchase-progress {
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--s-color-utility-body);
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-element);
  &__heading {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  h2 {
    margin: 0;
    font-size: 15px;
  }
  &__steps {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
    flex: 1 1 130px;
  }
  li strong {
    font-size: 13px;
    font-weight: 600;
  }
  li div > span {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--s-color-base-content-secondary);
  }
  &__marker {
    color: var(--s-color-base-content-secondary);
    font-weight: 700;
  }
  [data-status='current'] strong,
  [data-status='current'] .purchase-progress__marker {
    color: var(--s-color-action-text);
  }
  [data-status='confirmed'] .purchase-progress__marker {
    color: var(--s-color-status-success);
  }
  p {
    font-size: 12px;
    line-height: 1.5;
  }
  &__history {
    margin-top: 12px;
    font-size: 12px;
  }
  &__record {
    padding-block: 8px;
    border-top: 1px solid var(--s-color-base-border-secondary);
  }
  &__record > strong {
    display: block;
  }
  button,
  a,
  summary {
    min-height: 44px;
    box-sizing: border-box;
    cursor: pointer;
    padding: 12px 0;
    color: var(--s-color-action-text);
  }
  button {
    border: 0;
    background: none;
    font: inherit;
    font-size: 12px;
    text-align: start;
  }
  a,
  button {
    display: inline-flex;
    align-items: center;
    margin-inline-end: 16px;
  }
  :is(button, a, summary):focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 3px;
  }
  @media (max-width: 480px) {
    padding: 16px;
    li {
      flex-basis: calc(50% - 24px);
    }
  }
}
</style>
