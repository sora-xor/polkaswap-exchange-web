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
import { defineComponent } from 'vue';

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

export default defineComponent({
  components: {
    WalletBase,
    WalletAccount,
    QrCode,
    TokenLogo,
  },
  mixins: [NotificationMixin],
  data() {
    return {
      delimiters: FPNumber.DELIMITERS_CONFIG,
      amount: '',
    };
  },
  computed: {
    routerStore(this: any) {
      return useRouterStore(this.$pinia);
    },
    walletStore(this: any) {
      return useWalletStore(this.$pinia);
    },
    currentRouteParams(this: any): Record<string, AccountAsset> {
      return this.routerStore.currentParams as Record<string, AccountAsset>;
    },
    previousRoute(this: any): RouteNames {
      return (this.routerStore.prev as RouteNames) ?? RouteNames.Wallet;
    },
    previousRouteParams(this: any): Record<string, unknown> {
      return this.routerStore.prevParams;
    },
    account(this: any): PolkadotJsAccount {
      return this.walletStore.account as PolkadotJsAccount;
    },
    asset(this: any): AccountAsset {
      return this.currentRouteParams.asset;
    },
    title(this: any): string {
      return this.t('asset.receive', { symbol: this.asset.symbol });
    },
    code(this: any): string {
      const chain = 'substrate';
      const accountAddress = this.account.address;
      const publicKey = `0x${api.getPublicKeyByAddress(accountAddress)}`;
      const accountName = this.account.name || '';
      const assetAddress = this.asset.address;

      return [chain, accountAddress, publicKey, accountName, assetAddress, this.amount].join(':');
    },
  },
  methods: {
    downloadCode(this: any): void {
      void this.withAppNotification(async () => {
        const qrcode = (this.$refs as Record<string, any>).qrcode as { element?: SVGSVGElement } | undefined;
        const codeSvg = qrcode?.element as SVGSVGElement | undefined;

        if (!codeSvg) return;

        const filename = `${this.asset.symbol}_${this.account.address}`;

        await svgSaveAs(codeSvg, filename, IMAGE_EXTENSIONS.JPEG);
      });
    },
    handleBack(this: any): void {
      this.routerStore.navigate({
        name: this.previousRoute,
        params: this.previousRouteParams,
      });
    },
  },
});
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
