<template>
  <dialog-base v-model:visible="visible">
    <template #title>
      <slot name="title">
        <span class="el-dialog__title">{{ t('confirmTransactionText') }}</span>
      </slot>
    </template>

    <slot name="content-title"></slot>

    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmountSend }}</span>
        <div v-if="asset" class="token">
          <i :class="`network-icon network-icon--${getNetworkIcon(isSoraToEvm ? 0 : network)}`"></i>
          {{ tokenSymbol }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24"></s-icon>
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmountReceived }}</span>
        <div v-if="asset" class="token">
          <i :class="`network-icon network-icon--${getNetworkIcon(isSoraToEvm ? network : 0)}`"></i>
          {{ tokenSymbol }}
        </div>
      </div>
    </div>

    <s-divider class="s-divider--dialog"></s-divider>

    <bridge-transaction-details
      :asset="asset"
      :native-token="nativeToken"
      :external-transfer-fee="externalTransferFee"
      :external-network-fee="externalNetworkFee"
      :sora-network-fee="soraNetworkFee"
      :network-name="networkName"
    ></bridge-transaction-details>

    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option"></account-confirmation-option>
      <s-button type="primary" class="s-typography-button--large" :loading="loading" @click="handleConfirm">
        {{ confirmText }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { CodecString } from '@sora-substrate/sdk';
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { useNetworkFormatter } from '@/composables/useNetworkFormatter';
import { Components as LazyComponents, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    AccountConfirmationOption: components.AccountConfirmationOption,
    BridgeTransactionDetails: lazyComponent(LazyComponents.BridgeTransactionDetails),
  },
});

const props = withDefaults(
  defineProps<{
    network?: BridgeNetworkId | string | number;
    networkType?: BridgeNetworkType | string | number;
    amountSend?: CodecString;
    amountReceived?: CodecString;
    asset?: Nullable<RegisteredAccountAsset>;
    nativeToken?: Nullable<RegisteredAccountAsset>;
    externalTransferFee?: CodecString;
    externalNetworkFee?: CodecString;
    soraNetworkFee?: CodecString;
    isSoraToEvm?: boolean;
    confirmButtonText?: string;
  }>(),
  {
    network: 0,
    networkType: 0,
    amountSend: ZeroStringValue,
    amountReceived: ZeroStringValue,
    asset: null,
    nativeToken: null,
    externalTransferFee: ZeroStringValue,
    externalNetworkFee: ZeroStringValue,
    soraNetworkFee: ZeroStringValue,
    isSoraToEvm: true,
    confirmButtonText: '',
  }
);

const visible = defineModel<boolean>('visible', { default: false });

const { t } = useTranslation();
const { formatStringValue } = useFormattedAmount();
const { getNetworkName, getNetworkIcon } = useNetworkFormatter();
const { loading, withLoading } = useLoading();

const confirmText = computed(() => props.confirmButtonText || t('confirmText'));
const formattedAmountSend = computed(() => (props.amountSend ? formatStringValue(props.amountSend) : ''));
const formattedAmountReceived = computed(() => (props.amountReceived ? formatStringValue(props.amountReceived) : ''));
const tokenSymbol = computed(() => props.asset?.symbol ?? '');
const networkName = computed(() =>
  getNetworkName(props.networkType as BridgeNetworkType, props.network as BridgeNetworkId)
);

const emit = defineEmits<{
  (e: 'confirm'): void;
}>();

async function handleConfirm(): Promise<void> {
  await withLoading(async () => {
    emit('confirm');
    visible.value = false;
  });
}
</script>

<style scoped lang="scss">
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);

  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 800;
  }
}

.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  letter-spacing: var(--s-letter-spacing-mini);

  &-value {
    margin-right: $inner-spacing-medium;
  }

  .network-icon {
    margin-right: $inner-spacing-medium;
    width: var(--s-size-small);
    height: var(--s-size-small);
  }
}

.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
</style>
