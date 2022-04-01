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
        <span>{{ t('bridgeTransferNotification.addToken', { symbol: asset.symbol }) }}</span>
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
import { Action, State, Getter } from 'vuex-class';

import DialogBase from '@/components/DialogBase.vue';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

import ethersUtil from '@/utils/ethers-util';
import { isOutgoingTransaction } from '@/utils/bridge';

import type { BridgeHistory, RegisteredAccountAsset, RegisteredAsset } from '@sora-substrate/util';
import type { Whitelist } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase,
    SimpleNotification: lazyComponent(Components.SimpleNotification),
    TokenLogo: lazyComponent(Components.TokenLogo),
  },
})
export default class TransferNotification extends Mixins(TranslationMixin) {
  @State((state) => state.bridge.notificationData) tx!: Nullable<BridgeHistory>;
  @Getter whitelist!: Whitelist;
  @Getter('getAssetDataByAddress', { namespace: 'assets' }) getAssetDataByAddress!: (
    address: string
  ) => RegisteredAccountAsset;

  @Action('setNotificationData', { namespace: 'bridge' }) setNotificationData!: (
    tx: Nullable<BridgeHistory>
  ) => Promise<void>;

  get visibility(): boolean {
    return !!this.tx;
  }

  set visibility(flag: boolean) {
    if (!flag) {
      this.setNotificationData(null);
    }
  }

  get asset(): Nullable<RegisteredAccountAsset> {
    if (!this.tx?.assetAddress) return null;

    return this.getAssetDataByAddress(this.tx.assetAddress);
  }

  get addTokenBtnVisibility(): boolean {
    return !!this.asset && isOutgoingTransaction(this.tx);
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
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-big;
  }
}
</style>

<style lang="scss" scoped>
$token-size: 26px;
$metamask-icon-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.8);
$metamask-icon-filter: drop-shadow(-5px -5px 10px #ffffff) drop-shadow(1px 1px 10px rgba(0, 0, 0, 0.1));

.add-token-btn {
  .token-icons {
    display: flex;
    margin-left: $inner-spacing-mini;

    .token-logo {
      &--medium {
        width: $token-size;
        height: $token-size;
      }
    }

    .metamask-icon {
      margin-left: -$inner-spacing-mini / 2;
    }
  }
}

.token-logo {
  &.metamask-icon {
    background-color: var(--s-color-base-content-secondary);
    background-image: url('~@/assets/img/metamask.svg');
    box-shadow: $metamask-icon-shadow;
    filter: $metamask-icon-filter;

    &:before {
      content: '';
    }
  }
}
</style>
