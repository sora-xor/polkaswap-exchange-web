<template>
  <dialog-base v-model:visible="visible" :title="t('ux.swap.receiveXor')" custom-class="receive-xor-dialog">
    <p>{{ t('ux.swap.receiveInstructions') }}</p>
    <div v-if="address" class="receive-xor">
      <qr-code :value="address" :size="220" :aria-label="t('ux.swap.receiveQr')" role="img" />
      <wallet-account />
      <code class="receive-xor__address">{{ address }}</code>
      <s-button type="secondary" @click="copyAddress">{{
        t(copied ? 'ux.swap.copied' : 'ux.swap.copyAddress')
      }}</s-button>
      <p role="status" aria-live="polite">{{ copyError ? t('ux.swap.copyFailed') : '' }}</p>
    </div>
    <p v-else role="status">{{ t('ux.swap.accountUnavailable') }}</p>
    <template #footer
      ><s-button type="primary" @click="visible = false">{{ t('ux.swap.backToSwap') }}</s-button></template
    >
  </dialog-base>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useWalletStore } from '@/stores/wallet';
import { copyToClipboard } from '@/utils';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletAccount from '@/lib/soraneo-wallet/src/components/Account/WalletAccount.vue';
import { createAsyncComponent } from '@/shared/ui/async';

// The swap form always mounts this dialog, but the modal renders its content only while open.
// Loading the QR encoder (zxing) lazily keeps it out of the swap page's startup bundle.
const QrCode = createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/QrCode/QrCode.vue'));

/** Receives native XOR without navigating away from or resetting the user's swap draft. */
defineOptions({ name: 'ReceiveXorDialog' });
const visible = defineModel<boolean>('visible', { required: true });
const { t } = useTranslation();
const walletStore = useWalletStore();
const address = computed(() => walletStore.address || '');
const copied = ref(false);
const copyError = ref(false);
watch([address, visible], () => {
  copied.value = false;
  copyError.value = false;
});
/** Reports clipboard failure in place so the full address remains available to copy manually. */
async function copyAddress(): Promise<void> {
  try {
    await copyToClipboard(address.value);
    copied.value = true;
    copyError.value = false;
  } catch {
    copyError.value = true;
  }
}
</script>

<style lang="scss" scoped>
.receive-xor {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}
.receive-xor__address {
  overflow-wrap: anywhere;
  text-align: center;
  max-width: 100%;
  font-size: 14px;
}
</style>
