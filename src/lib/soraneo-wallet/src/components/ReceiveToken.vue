<template>
  <wallet-base :title="title" show-back @back="handleBack">
    <template #actions>
      <s-button type="action" :tooltip="t('code.download')" @click="downloadCode">
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

<script lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { Options, mixins, Ref } from 'vue-property-decorator';

import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../api';
import { svgSaveAs, IMAGE_EXTENSIONS } from '../util/image';

import WalletAccount from './Account/WalletAccount.vue';
import NotificationMixin from './mixins/NotificationMixin';
import QrCode from './QrCode/QrCode.vue';
import TokenLogo from './TokenLogo.vue';
import WalletBase from './WalletBase.vue';

import type { RouteNames } from '../consts';
import type { Route } from '../store/router/types';
import type { PolkadotJsAccount } from '../types/common';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Options({
  components: {
    WalletBase,
    WalletAccount,
    QrCode,
    TokenLogo,
  },
})
export default class ReceiveToken extends mixins(NotificationMixin) {
  private get routerStore() {
    return useRouterStore((this as any).$pinia);
  }

  private get walletStore() {
    return useWalletStore((this as any).$pinia);
  }

  @Ref('qrcode') readonly qrcode!: QrCode;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  public amount = '';

  get currentRouteParams(): Record<string, AccountAsset> {
    return this.routerStore.currentParams as Record<string, AccountAsset>;
  }

  get previousRoute(): RouteNames {
    return (this.routerStore.prev as RouteNames) ?? RouteNames.Wallet;
  }

  get previousRouteParams(): Record<string, unknown> {
    return this.routerStore.prevParams;
  }

  get account(): PolkadotJsAccount {
    return this.walletStore.account as PolkadotJsAccount;
  }

  get asset(): AccountAsset {
    return this.currentRouteParams.asset;
  }

  get title(): string {
    return this.t('asset.receive', { symbol: this.asset.symbol });
  }

  get code(): string {
    const chain = 'substrate';
    const accountAddress = this.account.address;
    const publicKey = `0x${api.getPublicKeyByAddress(accountAddress)}`;
    const accountName = this.account.name || '';
    const assetAddress = this.asset.address;
    const amount = this.amount;

    return [chain, accountAddress, publicKey, accountName, assetAddress, amount].join(':');
  }

  downloadCode(): void {
    this.withAppNotification(async () => {
      const codeSvg = (this.qrcode as any).element as SVGSVGElement;
      const filename = `${this.asset.symbol}_${this.account.address}`;

      await svgSaveAs(codeSvg, filename, IMAGE_EXTENSIONS.JPEG);
    });
  }

  handleBack(): void {
    this.routerStore.navigate({
      name: this.previousRoute,
      params: this.previousRouteParams,
    });
  }
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
