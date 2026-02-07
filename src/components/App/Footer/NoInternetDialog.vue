<template>
  <s-dialog
    class="no-internet"
    width="466px"
    :visible="!isInternetConnectionEnabled"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-esc="false"
  >
    <div class="no-internet__content s-flex">
      <div class="no-internet__icon s-flex"><s-icon name="wi-fi-16" size="32"></s-icon></div>
      <span class="no-internet__title">{{ t('footer.internet.dialogTitle') }}</span>
      <span class="no-internet__desc">{{ t('footer.internet.dialogDesc') }}</span>
    </div>
    <s-button slot="footer" class="no-internet__action" @click="refreshPage">
      {{ t('footer.internet.action') }}
    </s-button>
  </s-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';

const { t } = useTranslation();

const isInternetConnectionEnabled = computed(() => Boolean(store.getters?.settings?.isInternetConnectionEnabled));

function refreshPage(): void {
  window.location.reload();
}
</script>
