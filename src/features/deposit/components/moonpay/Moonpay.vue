<template>
  <dialog-base v-model:visible="visibility" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme"></moonpay-logo>
    </template>
    <i-frame-widget :src="widgetUrl" :allowed-origins="MOONPAY_WIDGET_ORIGINS"></i-frame-widget>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { MoonpayNotifications } from '@/features/deposit/components/moonpay/consts';
import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import IFrameWidget from '@/components/shared/Widget/IFrame.vue';
import { useMoonpayBridge } from '@/composables/useMoonpayBridge';
import { useTranslation } from '@/composables/useTranslation';
import { useMoonpayStore } from '@/stores/moonpay';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { getCssVariableValue } from '@/utils';
import { MOONPAY_WIDGET_ORIGINS } from '@/utils/moonpay';

import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';
import type { MoonpayTransaction } from '@/utils/moonpay';
import type { FnWithoutArgs } from '@/types/common';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

defineOptions({
  name: 'MoonpayDialog',
});

const widgetUrl = ref('');
const transactionsPolling = ref<Nullable<FnWithoutArgs>>(null);
const moonpayStore = useMoonpayStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const {
  internalWallet,
  moonpayApi,
  withApi,
  initMoonpayApi,
  showNotification,
  prepareMoonpayTxForBridgeTransfer,
  setDialogVisibility,
  createTransactionsPolling,
} = useMoonpayBridge();

const { t, language } = useTranslation();

const transactions = computed(() => moonpayStore.transactions as MoonpayTransaction[]);
const pollingTimestamp = computed(() => moonpayStore.pollingTimestamp as number);
const libraryTheme = computed(() => settingsStore.libraryTheme);

const account = computed(() => walletStore.account as Nullable<PolkadotJsAccount>);

const visibility = computed({
  get: () => Boolean(moonpayStore.dialogVisibility),
  set: (flag: boolean) => setDialogVisibility(flag),
});

const lastCompletedTransaction = computed<Nullable<MoonpayTransaction>>(() => {
  if (!pollingTimestamp.value) return undefined;

  return transactions.value.find(
    (item) => Date.parse(item.createdAt) >= pollingTimestamp.value && item.status === 'completed'
  );
});

const createMoonpayWidgetUrl = (): string => {
  const currentAccount = account.value;
  if (!currentAccount) return '';

  return moonpayApi.value.createWidgetUrl({
    colorCode: getCssVariableValue('--s-color-theme-accent'),
    externalTransactionId: currentAccount.address,
    language: language.value,
  });
};

const updateWidgetUrl = () => {
  widgetUrl.value = '';

  const url = createMoonpayWidgetUrl();

  setTimeout(() => {
    widgetUrl.value = url;
  });
};

const startPollingMoonpay = async () => {
  console.info('Moonpay: start polling to get user transactions');
  transactionsPolling.value = await createTransactionsPolling();
};

const stopPollingMoonpay = () => {
  console.info('Moonpay: stop polling');
  transactionsPolling.value?.();
  transactionsPolling.value = null;
};

const prepareBridgeForTransfer = async (transaction: MoonpayTransaction) => {
  setDialogVisibility(false);
  stopPollingMoonpay();
  updateWidgetUrl();

  await showNotification(MoonpayNotifications.Success);
  await prepareMoonpayTxForBridgeTransfer(transaction, true);
};

watch(
  () => internalWallet.isLoggedIn.value,
  (isLoggedIn) => {
    if (!isLoggedIn) stopPollingMoonpay();
  },
  { immediate: true }
);

watch(
  visibility,
  (isVisible) => {
    if (isVisible && !pollingTimestamp.value) {
      void startPollingMoonpay();
    }
  },
  { immediate: true }
);

watch([language, libraryTheme], () => {
  if (!pollingTimestamp.value) {
    updateWidgetUrl();
  }
});

watch(lastCompletedTransaction, async (transaction, previous) => {
  if (!transaction || (previous && previous.id === transaction.id)) return;

  await prepareBridgeForTransfer(transaction);
});

onMounted(() => {
  void withApi(async () => {
    initMoonpayApi();
    updateWidgetUrl();
  });
});

onBeforeUnmount(() => {
  stopPollingMoonpay();
});

defineExpose({
  widgetUrl,
});
</script>
