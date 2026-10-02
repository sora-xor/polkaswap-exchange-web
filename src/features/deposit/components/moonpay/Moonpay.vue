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

const props = withDefaults(
  defineProps<{
    /** Lock a guided purchase to MoonPay's native Ethereum-mainnet currency code. */
    currencyCode?: 'eth';
    /** Optional positive USD budget, with at most two decimal places, for the guided ETH purchase. */
    baseCurrencyAmount?: string;
    /** Matches completed guided deliveries only; never sent to an unsigned widget URL. */
    receivingAddress?: string;
    /** Let a guided flow convert received ETH before offering a separate bridge transaction. */
    autoPrepareBridge?: boolean;
  }>(),
  { autoPrepareBridge: true }
);
const emit = defineEmits<{ completed: [transaction: MoonpayTransaction] }>();

const widgetUrl = ref('');
const transactionsPolling = ref<Nullable<FnWithoutArgs>>(null);
const checkout =
  ref<Nullable<{ key: string; account: string; receiver: string; startedAt: number; knownIds: Set<string> }>>(null);
let widgetTimer: ReturnType<typeof setTimeout> | undefined;
let pollingGeneration = 0;
let pollingStarting = false;
let pollingWanted = false;
let disposed = false;
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
/** Converts bounded provider fiat amounts to exact cents without floating-point arithmetic. */
function usdCents(value: unknown): bigint | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (text.length > 32 || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) return null;
  const cents = BigInt(`${text.split('.')[0]}${(text.split('.')[1] ?? '').padEnd(2, '0')}`);
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? cents : null;
}
const receiver = computed(() => props.receivingAddress?.toLowerCase() ?? '');
/** Trailing zeroes describe the same budget; invalid input still revokes a previous checkout context. */
const checkoutKey = computed(() => {
  const budget = props.baseCurrencyAmount;
  return JSON.stringify([
    account.value?.address ?? '',
    receiver.value,
    props.currencyCode,
    usdCents(budget)?.toString() ?? budget,
  ]);
});

/** Uses the documented transaction total/currency fields, not the fiat principal or a balance change. */
function matchesGuidedPurchase(transaction: MoonpayTransaction): boolean {
  if (props.autoPrepareBridge) return true;
  const target = usdCents(props.baseCurrencyAmount);
  const item = transaction as MoonpayTransaction & {
    currency?: { code?: unknown; type?: unknown };
    baseCurrency?: { code?: unknown; type?: unknown };
    externalTransactionId?: unknown;
    walletAddress?: unknown;
    areFeesIncluded?: unknown;
    feeAmount?: unknown;
    extraFeeAmount?: unknown;
    networkFeeAmount?: unknown;
  };
  if (
    props.currencyCode !== 'eth' ||
    target === null ||
    target <= 0n ||
    !/^0x[0-9a-f]{40}$/.test(receiver.value) ||
    /^0x0{40}$/.test(receiver.value) ||
    item.externalTransactionId !== account.value?.address ||
    typeof item.walletAddress !== 'string' ||
    item.walletAddress.toLowerCase() !== receiver.value ||
    item.currency?.code !== 'eth' ||
    item.currency.type !== 'crypto' ||
    item.baseCurrency?.code !== 'usd' ||
    item.baseCurrency.type !== 'fiat'
  )
    return false;
  let total = usdCents(item.baseCurrencyAmount);
  if (total === null) return false;
  if (item.areFeesIncluded === false) {
    for (const value of [item.feeAmount, item.extraFeeAmount, item.networkFeeAmount]) {
      const fee = usdCents(value);
      if (fee === null) return false;
      total += fee;
    }
  } else if (item.areFeesIncluded !== true) return false;
  return total === target;
}

const visibility = computed({
  get: () => Boolean(moonpayStore.dialogVisibility),
  set: (flag: boolean) => setDialogVisibility(flag),
});

const lastCompletedTransaction = computed<Nullable<MoonpayTransaction>>(() => {
  if (!pollingTimestamp.value) return undefined;
  const current = checkout.value;
  if (!current || current.key !== checkoutKey.value || current.account !== account.value?.address) return undefined;

  return transactions.value.find(
    (item) =>
      !current.knownIds.has(item.id) &&
      Date.parse(item.createdAt) >= Math.max(pollingTimestamp.value, current.startedAt) &&
      item.status === 'completed' &&
      matchesGuidedPurchase(item)
  );
});

/** Build the existing widget URL, rejecting unsupported guided-purchase currencies. */
const createMoonpayWidgetUrl = (): string => {
  const currentAccount = account.value;
  if (!currentAccount) return '';
  if (props.currencyCode !== undefined && props.currencyCode !== 'eth') return '';
  if (
    props.baseCurrencyAmount !== undefined &&
    (props.currencyCode !== 'eth' ||
      typeof props.baseCurrencyAmount !== 'string' ||
      props.baseCurrencyAmount.length > 32 ||
      !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(props.baseCurrencyAmount) ||
      BigInt(props.baseCurrencyAmount.replace('.', '')) <= 0n)
  )
    return '';

  return moonpayApi.value.createWidgetUrl({
    colorCode: getCssVariableValue('--s-color-theme-accent'),
    externalTransactionId: currentAccount.address,
    language: language.value,
    // Match the public card preview's fee schedule; the widget otherwise quotes an unspecified payment method.
    ...(props.currencyCode === 'eth' ? { currencyCode: 'eth', paymentMethod: 'credit_debit_card' } : {}),
    ...(props.baseCurrencyAmount !== undefined
      ? { baseCurrencyCode: 'usd', baseCurrencyAmount: props.baseCurrencyAmount, lockAmount: true }
      : {}),
  });
};

const updateWidgetUrl = () => {
  clearTimeout(widgetTimer);
  widgetUrl.value = '';

  const url = createMoonpayWidgetUrl();

  widgetTimer = setTimeout(() => {
    if (!disposed) widgetUrl.value = url;
  });
};

/** Serializes start/stop so a late polling handle cannot survive a changed account or checkout. */
const startPollingMoonpay = async () => {
  pollingWanted = true;
  if (pollingStarting || transactionsPolling.value || disposed) return;
  pollingStarting = true;
  const request = ++pollingGeneration;
  console.info('Moonpay: start polling to get user transactions');
  try {
    const stop = await createTransactionsPolling();
    if (disposed || !pollingWanted || request !== pollingGeneration) stop();
    else transactionsPolling.value = stop;
  } catch {
    pollingWanted = false;
  } finally {
    pollingStarting = false;
    if (!disposed && pollingWanted && !transactionsPolling.value) void startPollingMoonpay();
  }
};

const stopPollingMoonpay = () => {
  pollingWanted = false;
  pollingGeneration += 1;
  console.info('Moonpay: stop polling');
  transactionsPolling.value?.();
  transactionsPolling.value = null;
};

/** Retires a closed or account-invalid checkout; its delayed results cannot complete the next budget. */
const resetCheckout = () => {
  stopPollingMoonpay();
  checkout.value = null;
  updateWidgetUrl();
};

/** A fresh context starts only when the user opens checkout, not when an amount is edited. */
const beginCheckout = () => {
  if (!account.value || !internalWallet.isLoggedIn.value) return;
  if (!checkout.value || checkout.value.key !== checkoutKey.value) {
    if (checkout.value) resetCheckout();
    checkout.value = {
      key: checkoutKey.value,
      account: account.value.address,
      receiver: receiver.value,
      startedAt: Date.now(),
      knownIds: new Set(transactions.value.map((item) => item.id)),
    };
  }
  if (!pollingWanted && !transactionsPolling.value) void startPollingMoonpay();
};

const prepareBridgeForTransfer = async (transaction: MoonpayTransaction) => {
  setDialogVisibility(false);
  stopPollingMoonpay();
  checkout.value = null;
  updateWidgetUrl();

  if (!props.autoPrepareBridge) {
    emit('completed', transaction);
    return;
  }

  await showNotification(MoonpayNotifications.Success);
  await prepareMoonpayTxForBridgeTransfer(transaction, true);
};

watch(
  () => internalWallet.isLoggedIn.value,
  (isLoggedIn) => {
    if (!isLoggedIn) {
      setDialogVisibility(false);
      resetCheckout();
    }
  },
  { immediate: true }
);

watch(
  visibility,
  (isVisible) => {
    if (isVisible) beginCheckout();
    else if (checkout.value && checkout.value.key !== checkoutKey.value) resetCheckout();
  },
  { immediate: true }
);

watch([language, libraryTheme, checkoutKey], () => {
  const current = checkout.value;
  if (current && (current.account !== account.value?.address || current.receiver !== receiver.value)) {
    setDialogVisibility(false);
    resetCheckout();
    return;
  }
  // Never reset a visible provider checkout. Its completion is nevertheless revoked when the plan differs.
  if (visibility.value && current) return;
  if (current && current.key !== checkoutKey.value) resetCheckout();
  else if (!current && !pollingTimestamp.value) updateWidgetUrl();
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
  disposed = true;
  clearTimeout(widgetTimer);
  stopPollingMoonpay();
});

defineExpose({
  widgetUrl,
});
</script>
