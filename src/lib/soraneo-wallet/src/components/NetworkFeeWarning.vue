<template>
  <simple-notification
    v-model="hidePopup"
    optional
    modal-content
    :button-text="t('confirmNextTxFailure.button')"
    @submit.prevent="handleConfirm"
  >
    <template #title>{{ t('confirmNextTxFailure.header') }}</template>
    <template #text>
      <div>{{ t('confirmNextTxFailure.info', { fee, symbol }) }}</div>
      <div v-if="payoff">{{ t('confirmNextTxFailure.payoff') }}</div>
    </template>
  </simple-notification>
</template>

<script lang="ts" setup>
import { KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { getWalletStore } from '../store/instance';

import SimpleNotification from './SimpleNotification.vue';

const props = withDefaults(
  defineProps<{
    fee?: string;
    symbol?: string;
    payoff?: boolean;
  }>(),
  {
    fee: undefined,
    symbol: KnownSymbols.XOR,
    payoff: true,
  }
);

const emit = defineEmits<{
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const store = getWalletStore();

const hidePopup = ref(false);

const handleConfirm = async () => {
  store.commit.wallet.settings.setAllowFeePopup(!hidePopup.value);
  emit('confirm');
};

defineExpose({
  hidePopup,
  handleConfirm,
});
</script>
