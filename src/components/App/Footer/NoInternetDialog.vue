<template>
  <dialog-base
    class="no-internet"
    width="466px"
    :visible="!isInternetConnectionEnabled"
    :close-on-click-modal="false"
    :close-on-esc="false"
    :show-close-button="false"
  >
    <div class="no-internet__content s-flex">
      <div class="no-internet__icon s-flex"><s-icon name="wi-fi-16" size="32"></s-icon></div>
      <span class="no-internet__title">{{ t('footer.internet.dialogTitle') }}</span>
      <span class="no-internet__desc">{{ t('footer.internet.dialogDesc') }}</span>
    </div>
    <template #footer>
      <s-button class="no-internet__action" @click="refreshPage">
        {{ t('footer.internet.action') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
  },
});

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const isInternetConnectionEnabled = computed(() => settingsStore.isInternetConnectionEnabled);

function refreshPage(): void {
  window.location.reload();
}
</script>
