<template>
  <confirm-bridge-transaction-dialog
    v-bind="{ ...forwardedAttrs, ...modalData }"
    v-model:visible="visibility"
    :confirm-button-text="t('moonpay.buttons.transfer')"
    @confirm="handleConfirm"
  >
    <template #title>
      <moonpay-logo :theme="libraryTheme"></moonpay-logo>
    </template>
    <template #content-title>
      <div class="moonpay-confirmation__title">
        {{ t('moonpay.confirmations.txReady') }}
      </div>
    </template>
  </confirm-bridge-transaction-dialog>
</template>

<script lang="ts" setup>
import { ETH } from '@sora-substrate/sdk/build/assets/consts';
import { computed, useAttrs } from 'vue';

import ConfirmBridgeTransactionDialog from '@/components/shared/Dialog/ConfirmBridgeTransaction.vue';
import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { useMoonpayBridge } from '@/composables/useMoonpayBridge';
import { useTranslation } from '@/composables/useTranslation';
import { useMoonpayStore } from '@/stores/moonpay';
import { useSettingsStore } from '@/stores/settings';

import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  name: 'MoonpayConfirmation',
});

const attrs = useAttrs();
const emit = defineEmits<{
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const moonpayStore = useMoonpayStore();
const settingsStore = useSettingsStore();
const { bridgeTransactionData, getAsset, startBridgeForMoonpayTransaction, setConfirmationVisibility } =
  useMoonpayBridge();

const libraryTheme = computed(() => settingsStore.libraryTheme);

const visibility = computed({
  get: () => Boolean(moonpayStore.confirmationVisibility),
  set: (flag: boolean) => {
    setConfirmationVisibility(flag);
  },
});

const modalData = computed(() => {
  const data = bridgeTransactionData.value as EthHistory | null;

  if (!data) return {};

  const asset = getAsset(data.assetAddress as string) as RegisteredAccountAsset | undefined;
  const nativeAsset = getAsset(ETH.address) as RegisteredAccountAsset | undefined;

  return {
    isSoraToEvm: false,
    amount: data.amount,
    amount2: data.amount2,
    asset,
    nativeAsset,
    network: data.externalNetwork,
    networkType: data.externalNetworkType,
    externalNetworkFee: data.externalNetworkFee,
    soraNetworkFee: data.soraNetworkFee,
  };
});

const forwardedAttrs = computed<Record<string, unknown>>(() => {
  const entries = Object.entries(attrs as Record<string, unknown>);
  return entries.reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (key !== 'onConfirm') {
      acc[key] = value;
    }
    return acc;
  }, {});
});

const handleConfirm = async () => {
  await startBridgeForMoonpayTransaction();
  emit('confirm');
};

defineExpose({
  get visibility() {
    return visibility.value;
  },
  set visibility(value: boolean) {
    visibility.value = value;
  },
  get modalData() {
    return modalData.value;
  },
  handleConfirm,
});
</script>

<style lang="scss" scoped>
.moonpay-confirmation {
  &__title {
    font-size: var(--s-font-size-large);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-mini);
    line-height: var(--s-line-height-small);
    margin-bottom: $inner-spacing-big;
  }
}
</style>
