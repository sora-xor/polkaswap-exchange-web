<template>
  <div class="store-payment">
    <div ref="host" class="store-payment__widget" :aria-busy="mounting" />
    <p v-if="mounting" role="status">{{ t('communityStore.loading') }}</p>
    <p v-if="failed" role="alert">{{ t('communityStore.paymentUnavailable') }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

const props = defineProps<{ mountPayment: (element: HTMLElement) => Promise<() => void> }>();
const { t } = useTranslation();
const host = ref<HTMLElement | null>(null);
const mounting = ref(true);
const failed = ref(false);
let dispose: (() => void) | undefined;
let disposed = false;

/** Mount payment only after the parent holds a privately persisted order. */
onMounted(async () => {
  try {
    if (!host.value) return;
    const cleanup = await props.mountPayment(host.value);
    if (disposed) cleanup();
    else dispose = cleanup;
  } catch {
    failed.value = true;
  } finally {
    mounting.value = false;
  }
});

/** Dispose wallet listeners even if the widget resolves after navigation. */
onBeforeUnmount(() => {
  disposed = true;
  dispose?.();
});
</script>

<style scoped>
.store-payment {
  min-width: 0;
}
.store-payment__widget {
  --sora-pay-accent: var(--s-color-theme-accent, #e94b93);
}
.store-payment p {
  line-height: 1.7;
  font-size: 13px;
  color: var(--s-color-base-content-secondary, #737078);
}
</style>
