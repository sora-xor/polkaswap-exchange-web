<template>
  <div v-if="finalizedTime" class="research-fee-note" data-testid="research-fee-note">
    <p>{{ t('bots.research.feeObservedAt', { block: fees.blockNumber, time: finalizedTime }) }}</p>
    <p v-if="impact" data-testid="research-price-impact">
      {{ t('bots.priceImpact') }} · {{ t('bots.playground.tradeBuy') }} {{ impact.buy }}% /
      {{ t('bots.playground.tradeSell') }} {{ impact.sell }}%
    </p>
    <p v-if="delayed" data-testid="research-fee-delay">{{ t('bots.research.feeFinalityDelayed') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@/lib/substrate/math';
import type { ResearchFeeSnapshot } from '../research-fees';

/** Show the chain observation time, separately from when a historical experiment fetched it. */
const props = defineProps<{ fees: ResearchFeeSnapshot }>();
const { t } = useTranslation();
const impact = computed(() =>
  typeof props.fees.priceImpactPercent === 'string' && typeof props.fees.sellPriceImpactPercent === 'string'
    ? {
        buy: new FPNumber(props.fees.priceImpactPercent).value.toFixed(2),
        sell: new FPNumber(props.fees.sellPriceImpactPercent).value.toFixed(2),
      }
    : null
);
const finalizedTime = computed(() =>
  Number.isSafeInteger(props.fees.finalizedAt) && props.fees.finalizedAt! > 0
    ? new Date(props.fees.finalizedAt!).toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
    : ''
);
const delayed = computed(() => props.fees.queriedAt - props.fees.finalizedAt! > 300_000);
</script>

<style scoped>
.research-fee-note {
  margin-block: 12px;
  padding-inline-start: 12px;
  border-inline-start: 2px solid var(--bot-accent, var(--s-color-theme-accent));
  color: var(--bot-muted, var(--s-color-base-content-secondary));
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.research-fee-note p {
  margin: 0;
}
.research-fee-note p + p {
  margin-top: 6px;
}
</style>
