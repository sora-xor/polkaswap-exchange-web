<template>
  <dialog-base :visible.sync="visibility" class="bridge-transfer-notification">
    <simple-notification modal-content success @submit.native.prevent="close">
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
        </div>
      </s-button>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts">
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state, mutation } from '@/store/decorators';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';
import ethersUtil from '@/utils/ethers-util';

import type { IBridgeTransaction } from '@sora-substrate/util';
import type { Whitelist, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    SimpleNotification: components.SimpleNotification,
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
  },
})
export default class BridgeTransferNotification extends Mixins(TranslationMixin) {
  @state.bridge.notificationData private tx!: Nullable<IBridgeTransaction>;

  @getter.wallet.account.whitelist private whitelist!: Whitelist;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  @mutation.bridge.setNotificationData private setNotificationData!: (tx?: IBridgeTransaction) => void;

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
    if (!this.tx?.externalNetworkType) return false;
    if (this.tx.externalNetworkType === BridgeNetworkType.Sub) return false;

    return (
      !!this.asset && !ethersUtil.isNativeEvmTokenAddress(this.asset.externalAddress) && isOutgoingTransaction(this.tx)
    );
  }

  close(): void {
    this.visibility = false;
  }

  async addToken(): Promise<void> {
    if (!this.asset) return;

    const { externalAddress, externalDecimals, symbol, address } = this.asset;
    const image = this.whitelist[address]?.icon;
    await ethersUtil.addToken(externalAddress, symbol, +externalDecimals, image);
  }
}
</script>

<style lang="scss" scoped>
.add-token-btn {
  .token-icons {
    display: flex;
    margin-left: $inner-spacing-mini;
  }
}
</style>
