<template>
  <dialog-base :visible.sync="visibility" class="bridge-transfer-notification">
    <simple-notification modal-content success @submit.native.prevent="close">
      <template #title>{{ t('bridgeTransferNotification.title') }}</template>

      <external-link v-if="txLink" v-bind="txLink" />

      <external-link v-if="txAccountLink" v-bind="txAccountLink" />

      <s-button v-if="addTokenBtnVisibility" @click="addToken" class="add-token-btn s-typography-button--big">
        <span>{{ t('bridgeTransferNotification.addToken', { symbol: assetSymbol }) }}</span>
        <div class="token-icons">
          <token-logo size="small" :token="asset" />
        </div>
        <span>{{ t('operations.andText') }} {{ t('closeText') }}</span>
      </s-button>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts">
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import BridgeTransactionMixin from '@/components/mixins/BridgeTransactionMixin';
import { getter, state, mutation } from '@/store/decorators';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import ethersUtil from '@/utils/ethers-util';

import type { IBridgeTransaction } from '@sora-substrate/util';
import type { Whitelist, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

@Component({
  components: {
    SimpleNotification: components.SimpleNotification,
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    ExternalLink: components.ExternalLink,
  },
})
export default class BridgeTransferNotification extends Mixins(BridgeTransactionMixin) {
  @state.bridge.notificationData private notificationData!: Nullable<IBridgeTransaction>;
  @state.bridge.subBridgeConnector private subBridgeConnector!: SubNetworksConnector;

  @getter.wallet.account.whitelist private whitelist!: Whitelist;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  @mutation.bridge.setNotificationData private setNotificationData!: (tx?: IBridgeTransaction) => void;

  // BridgeTransactionMixin override
  get tx(): Nullable<IBridgeTransaction> {
    return this.notificationData;
  }

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

  get isSubEvm(): boolean {
    return subBridgeApi.isEvmAccount(this.tx?.externalNetwork as SubNetwork);
  }

  get isEvmNetwork(): boolean {
    if (!this.tx?.externalNetworkType) return false;
    if (this.tx.externalNetworkType === BridgeNetworkType.Sub && !this.isSubEvm) return false;
    return true;
  }

  get addTokenBtnVisibility(): boolean {
    if (!this.isEvmNetwork) return false;

    const address = this.asset?.externalAddress;

    return !!address && !ethersUtil.isNativeEvmTokenAddress(address) && isOutgoingTransaction(this.tx);
  }

  get txLink() {
    const link = this.isOutgoing ? this.externalExplorerLinks[0] : this.internalExplorerLinks[0];
    const network = this.isOutgoing ? this.externalNetworkId : undefined;

    return this.prepareLink(link, network);
  }

  get txAccountLink() {
    const link = this.isOutgoing ? this.externalAccountLinks[0] : this.internalAccountLinks[0];
    const network = this.isOutgoing ? this.externalNetworkId : undefined;

    return this.prepareLink(link, network, false);
  }

  private prepareLink(
    link: WALLET_CONSTS.ExplorerLink,
    externalNetworkId?: Nullable<BridgeNetworkId>,
    isTxLink = true
  ): { href: string; title: string } | null {
    if (!link) return null;

    const linkText = isTxLink ? this.tc('transactionText', 1) : this.tc('accountText', 1);

    return {
      href: link.value,
      title: this.getNetworkText(linkText, externalNetworkId),
    };
  }

  close(): void {
    this.visibility = false;
  }

  async addToken(): Promise<void> {
    if (!this.asset) return;

    try {
      const { externalAddress, externalDecimals, symbol, address } = this.asset;
      const image = this.whitelist[address]?.icon;

      let tokenAddress = externalAddress;
      let tokenSymbol = symbol;
      let tokenDecimals = +externalDecimals;

      if (this.isSubEvm) {
        const adapter = this.subBridgeConnector.parachain;
        if (!adapter) throw new Error('Adapter not found');
        const assetMeta = adapter.getAssetMeta(this.asset);
        if (!assetMeta) throw new Error('Asset metadata not found');
        tokenAddress = adapter.assetIdToEvmContractAddress(externalAddress);
        tokenSymbol = assetMeta.symbol;
        tokenDecimals = assetMeta.decimals;
      }

      await ethersUtil.addToken(tokenAddress, tokenSymbol, tokenDecimals, image);
    } catch (error) {
      console.error(error);
    } finally {
      this.visibility = false;
    }
  }
}
</script>

<style lang="scss">
.bridge-transfer-notification {
  .el-button + .el-button {
    margin-left: 0;
  }
}
</style>

<style lang="scss" scoped>
.add-token-btn {
  width: 100%;

  .token-icons {
    display: flex;
    margin: 0 $inner-spacing-tiny;
  }
}
</style>
