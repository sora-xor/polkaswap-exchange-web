<template>
  <dialog-base v-model:visible="visibility" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme"></moonpay-logo>
    </template>
    <i-frame-widget :src="widgetUrl" :allowed-origins="MOONPAY_WIDGET_ORIGINS"></i-frame-widget>
  </dialog-base>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { MoonpayNotifications } from '@/components/pages/Moonpay/consts';
import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { Components } from '@/consts';
import type { Theme } from '@/consts/theme';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useMoonpayBridge } from '@/composables/useMoonpayBridge';
import { useTranslation } from '@/composables/useTranslation';
import { getCssVariableValue } from '@/utils';
import { resolveLibraryTheme } from '@/utils/resolveLibraryTheme';
import { MOONPAY_WIDGET_ORIGINS } from '@/utils/moonpay';

import type { MoonpayTransaction } from '@/utils/moonpay';
import type { FnWithoutArgs } from '@/types/common';
import type { WALLET_TYPES } from '@wallet';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    MoonpayLogo,
    IFrameWidget: lazyComponent(Components.IFrameWidget),
  },
});

const widgetUrl = ref('');
const transactionsPolling = ref<Nullable<FnWithoutArgs>>(null);

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

const transactions = computed(() => store.state.moonpay.transactions as MoonpayTransaction[]);
const pollingTimestamp = computed(() => store.state.moonpay.pollingTimestamp as number);
const libraryTheme = computed(() => resolveLibraryTheme(store) as Theme);

const account = computed(() => store.getters.wallet.account.account as Nullable<WALLET_TYPES.PolkadotJsAccount>);

const visibility = computed({
  get: () => Boolean(store.state.moonpay.dialogVisibility),
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
