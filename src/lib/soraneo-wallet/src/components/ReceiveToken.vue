<template>
  <wallet-base :title="title" show-back @back="handleBack">
    <template #actions>
      <s-button type="action" :tooltip="t('code.download')" :aria-label="t('code.download')" @click="downloadCode">
        <s-icon name="basic-pulse-24" size="28"></s-icon>
      </s-button>
    </template>

    <div class="receive-token">
      <qr-code ref="qrcode" :value="code"></qr-code>
      <s-float-input
        v-model="amount"
        has-locale-string
        :decimals="asset.decimals"
        :delimiters="delimiters"
        :placeholder="t('amountText')"
        class="receive-token__amount"
      >
        <template #right>
          <token-logo :token="asset" size="small"></token-logo>
        </template>
      </s-float-input>
      <wallet-account class="receive-token__account" primary shadow="never"></wallet-account>
    </div>
  </wallet-base>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { computed, ref } from 'vue';

import { getWalletCurrentParams, getWalletPreviousParams, getWalletPreviousRoute } from '@/platform/wallet/navigation';
import { useWalletStore } from '@/stores/wallet';

import { useNotification } from '../composables/useNotification';
import { api } from '../api';
import { svgSaveAs, IMAGE_EXTENSIONS } from '../util/image';

import WalletAccount from './Account/WalletAccount.vue';
import QrCode from './QrCode/QrCode.vue';
import TokenLogo from './TokenLogo.vue';
import WalletBase from './WalletBase.vue';

import type { RouteNames } from '../consts';
import type { PolkadotJsAccount } from '../types/common';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const { t, withAppNotification } = useNotification();
const walletStore = useWalletStore();

const qrcode = ref<{ element?: SVGSVGElement }>();
const delimiters = FPNumber.DELIMITERS_CONFIG;
const amount = ref('');

const currentRouteParams = computed(() => getWalletCurrentParams<Record<string, AccountAsset>>());
const previousRoute = computed(() => ((getWalletPreviousRoute() as RouteNames) ?? RouteNames.Wallet) as RouteNames);
const previousRouteParams = computed(() => getWalletPreviousParams<Record<string, unknown>>());
const account = computed(() => walletStore.account as PolkadotJsAccount);
const asset = computed(() => currentRouteParams.value.asset);
const title = computed(() => t('asset.receive', { symbol: asset.value.symbol }));
const code = computed(() => {
  const chain = 'substrate';
  const accountAddress = account.value.address;
  const publicKey = `0x${api.getPublicKeyByAddress(accountAddress)}`;
  const accountName = account.value.name || '';
  const assetAddress = asset.value.address;

  return [chain, accountAddress, publicKey, accountName, assetAddress, amount.value].join(':');
});

function downloadCode(): void {
  void withAppNotification(async () => {
    const codeSvg = qrcode.value?.element;

    if (!codeSvg) return;

    const filename = `${asset.value.symbol}_${account.value.address}`;

    await svgSaveAs(codeSvg, filename, IMAGE_EXTENSIONS.JPEG);
  });
}

function handleBack(): void {
  walletStore.navigate({
    name: previousRoute.value,
    params: previousRouteParams.value,
  });
}
</script>

<style lang="scss" scoped>
$amount-width: 260px;

.receive-token {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: $basic-spacing-medium;

  &__amount {
    max-width: $amount-width;
  }

  &__account {
    max-width: 100%;
  }
}
</style>
