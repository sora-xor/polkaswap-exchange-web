<template>
  <section v-if="handoff || failed" class="refund-rehearsal" data-testid="refund-rehearsal">
    <h2>{{ t('communityStore.refundTitle') }}</h2>
    <template v-if="handoff">
      <p>{{ t('communityStore.orderId') }}: {{ handoff.orderId }}</p>
      <dl>
        <dt>{{ t('communityStore.widget.payer') }}</dt>
        <dd>{{ handoff.paymentRequest.payer }}</dd>
        <dt>{{ t('communityStore.widget.recipient') }}</dt>
        <dd>{{ handoff.paymentRequest.recipient }}</dd>
        <dt>{{ t('communityStore.widget.amount') }}</dt>
        <dd>{{ amount }} XOR</dd>
        <dt>{{ t('communityStore.widget.reference') }}</dt>
        <dd>{{ handoff.paymentRequest.reference }}</dd>
      </dl>
      <SoraPayCheckout v-if="handoff.state === 'available'" :mount-payment="mountPayment" />
      <p v-else>
        {{
          t(
            handoff.state === 'submitted'
              ? 'communityStore.widget.submitted'
              : handoff.state === 'canceled'
                ? 'orderBook.orderStatus.canceled'
                : 'communityStore.widget.uncertain'
          )
        }}
      </p>
      <p v-if="handoff.transactionHash">{{ t('communityStore.refundTransaction') }}: {{ handoff.transactionHash }}</p>
    </template>
    <p v-if="failed" role="alert">{{ t('communityStore.paymentUnavailable') }}</p>
  </section>
</template>

<script setup lang="ts">
import { fromCodec } from '@sora/sora-pay/core';
import { computed, onMounted } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import SoraPayCheckout from '../components/SoraPayCheckout.vue';
import { useRefundRehearsal } from './useRefundRehearsal';

const { t } = useTranslation();
const { handoff, failed, refresh, mountPayment } = useRefundRehearsal();
const amount = computed(() => (handoff.value ? fromCodec(handoff.value.paymentRequest.amountCodec, 18) : ''));
onMounted(refresh);
</script>

<style scoped>
.refund-rehearsal {
  margin-block: 2rem;
  padding: 2rem;
  border-radius: 1.5rem;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
}
.refund-rehearsal h2 {
  margin-bottom: 1rem;
}
.refund-rehearsal dl {
  display: grid;
  gap: 0.5rem 1rem;
  grid-template-columns: minmax(6rem, auto) minmax(0, 1fr);
  margin-block: 1rem;
}
.refund-rehearsal dd,
.refund-rehearsal p {
  overflow-wrap: anywhere;
}
.refund-rehearsal dd {
  margin: 0;
}
</style>
