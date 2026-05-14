<template>
  <dialog-base v-model:visible="visible" :title="t('mst.mstBridgeWarning')" width="420px">
    <div class="mst-bridge-warning">
      <p class="mst-bridge-warning__message">{{ t('mst.suggestSwitchFromMst') }}</p>
      <s-button class="mst-bridge-warning__action" type="primary" @click="handleSwitchFromMst">
        {{ t('mst.switchFromMst') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { api } from '@/lib/soraneo-wallet/src/api';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import { useWalletStore } from '@/stores/wallet';

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
  },
});

const visible = defineModel<boolean>('visible', { default: false });

const { t } = useTranslation();
const walletStore = useWalletStore();
const isMST = computed(() => walletStore.isMstAccount);

async function handleSwitchFromMst(): Promise<void> {
  if (isMST.value) {
    api.mst.switchAccount(false);
    walletStore.setIsMstAccount(false);
    walletStore.syncAccountWithStorage();
    await walletStore.afterLogin();
  }

  visible.value = false;
}
</script>

<style lang="scss" scoped>
.mst-bridge-warning {
  display: flex;
  flex-direction: column;
  gap: $inner-spacing-medium;
  min-width: 0;

  &__message {
    margin: 0;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-medium);
    overflow-wrap: anywhere;
  }

  &__action {
    align-self: flex-start;
  }
}
</style>
