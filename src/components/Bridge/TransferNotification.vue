<template>
  <dialog-base :visible.sync="visibility" class="bridge-transfer-notification">
    <simple-notification success @close="close">
      <template #title>Bridge transaction successful</template>
      <s-button v-if="asset" type="secondary" @click="addToken"> Add {{ asset.symbol }} to Metamask </s-button>
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

import type { BridgeHistory, RegisteredAccountAsset, RegisteredAsset } from '@sora-substrate/util';

@Component({
  components: {
    DialogBase,
    SimpleNotification: lazyComponent(Components.SimpleNotification),
  },
})
export default class TransferNotification extends Mixins(TranslationMixin) {
  @State((state) => state.bridge.notificationData) tx!: Nullable<BridgeHistory>;
  @Getter whitelist!: any;
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

  close(): void {
    this.visibility = false;
  }

  async addToken(): Promise<void> {
    if (this.asset) {
      const { externalAddress, externalDecimals, symbol, address } = this.asset as RegisteredAccountAsset &
        RegisteredAsset;
      const image = this.whitelist[address]?.icon;
      await ethersUtil.addToken(externalAddress, symbol, +externalDecimals, image);
    }
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
