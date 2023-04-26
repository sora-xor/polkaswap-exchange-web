<template>
  <dialog-base :visible.sync="visibility" class="bridge-transfer-notification">
    <simple-notification success @close="close">
      <template #title>{{ t('bridgeTransferNotification.title') }}</template>
      <s-button
        v-if="addTokenBtnVisibility"
        type="secondary"
        @click="addToken"
        class="add-token-btn s-typography-button--big"
      >
        <span>{{ t('bridgeTransferNotification.addToken', { symbol: assetSymbol }) }}</span>
        <div class="token-icons">
          <token-logo :token="asset" />
          <token-logo class="metamask-icon" />
        </div>
      </s-button>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import ethersUtil from '@/utils/ethers-util';
import { isEthereumAddress } from '@/utils';
import { isOutgoingTransaction } from '@/utils/bridge';
import { getter, state, mutation } from '@/store/decorators';

import type { BridgeHistory, RegisteredAccountAsset, RegisteredAsset } from '@sora-substrate/util';
import type { Whitelist } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    SimpleNotification: components.SimpleNotification,
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
  },
})
export default class BridgeTransferNotification extends Mixins(TranslationMixin) {
  @state.bridge.notificationData private tx!: Nullable<BridgeHistory>;

  @getter.wallet.account.whitelist private whitelist!: Whitelist;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  @mutation.bridge.setNotificationData private setNotificationData!: (tx?: BridgeHistory) => void;

  get visibility(): boolean {
    return !!this.tx;
  }

  set visibility(flag: boolean) {
    if (!flag) {
      this.setNotificationData();
    }
  }

  get asset(): Nullable<RegisteredAccountAsset> {
    if (!this.tx?.assetAddress) return null;

    return this.getAsset(this.tx.assetAddress);
  }

  get assetSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get addTokenBtnVisibility(): boolean {
    return !!this.asset && !isEthereumAddress(this.asset.externalAddress) && isOutgoingTransaction(this.tx);
  }

  close(): void {
    this.visibility = false;
  }

  async addToken(): Promise<void> {
    if (!this.asset) return;

    const { externalAddress, externalDecimals, symbol, address } = this.asset as RegisteredAccountAsset &
      RegisteredAsset;
    const image = this.whitelist[address]?.icon;
    await ethersUtil.addToken(externalAddress, symbol, +externalDecimals, image);
  }
}
</script>

<style lang="scss">
.dialog-wrapper.bridge-transfer-notification {
  $metamask-icon-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.8);
  $metamask-icon-filter: drop-shadow(-5px -5px 10px #ffffff) drop-shadow(1px 1px 10px rgba(0, 0, 0, 0.1));

  .el-dialog .el-dialog__body {
    .metamask-icon > .asset-logo {
      background-color: var(--s-color-base-content-secondary);
      background-image: url('~@/assets/img/metamask.svg');
      box-shadow: $metamask-icon-shadow;
      filter: $metamask-icon-filter;

      &:before {
        content: '';
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.add-token-btn {
  .token-icons {
    display: flex;
    margin-left: $inner-spacing-mini;

    .metamask-icon {
      margin-left: -$inner-spacing-tiny;
    }
  }
}
</style>
