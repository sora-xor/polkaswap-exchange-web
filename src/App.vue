<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app" class="page">
    <img src="/img/greed.png" loading="lazy" alt="" class="greed-img" />

    <app-header :open-wallet="openWallet" />

    <div class="wrap-floats">
      <img src="img/float-img-left.png" loading="lazy" alt="" class="float-img-left" />

      <img src="img/float-img-right.png" loading="lazy" alt="" class="float-img-right" />

      <div class="footer-circles">
        <div class="circle-1">
          <div class="circle-2">
            <div class="circle-3"></div>
          </div>
        </div>
      </div>

      <div class="blur-circle-3"></div>
    </div>

    <div class="wrap-cart">
      <cart :buy="handleBuy" :sell="handleSell" :redeem="handleRedeem" />
    </div>

    <wallet-dialog :visible.sync="showWallet" />
    <select-node-dialog />
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { History, connection } from '@sora-substrate/util';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem';

import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';

import { PageNames, Components, Language } from '@/consts';
import axiosInstance, { updateBaseUrl } from '@/api';
import router, { lazyComponent } from '@/router';
import { preloadFontFace } from '@/utils';
import type { ConnectToNodeOptions } from '@/types/nodes';

@Component({
  components: {
    AppHeader: lazyComponent(Components.AppHeader),
    Cart: lazyComponent(Components.Cart),
    WalletDialog: lazyComponent(Components.WalletDialog),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
  },
})
export default class App extends Mixins(mixins.TransactionMixin, NodeErrorMixin) {
  readonly PageNames = PageNames;

  showWallet = false;

  @Getter isLoggedIn!: boolean;
  @Getter soraNetwork!: WALLET_CONSTS.SoraNetwork;
  @Getter libraryDesignSystem!: DesignSystem;
  @Getter firstReadyTransaction!: History;

  // Wallet
  @Action resetAccountAssetsSubscription!: AsyncVoidFn;
  @Action trackActiveTransactions!: AsyncVoidFn;
  @Action resetActiveTransactions!: AsyncVoidFn;
  @Action resetFiatPriceAndApySubscription!: AsyncVoidFn;

  @Action updateAccountAssets!: AsyncVoidFn;
  @Action setSoraNetwork!: (networkType: string) => Promise<void>; // wallet
  @Action setDefaultNodes!: (nodes: any) => Promise<void>;
  @Action setNetworkChainGenesisHash!: (hash: string) => Promise<void>;
  @Action connectToNode!: (options: ConnectToNodeOptions) => Promise<void>;
  @Action setFaucetUrl!: (url: string) => Promise<void>;
  @Action setLanguage!: (lang: Language) => Promise<void>;
  @Watch('firstReadyTransaction', { deep: true })
  private handleNotifyAboutTransaction(value: History): void {
    this.handleChangeTransaction(value);
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean): void {
    if (nodeConnected) {
      this.updateAccountAssets();
    } else {
      this.resetAccountAssetsSubscription();
    }
  }

  async created() {
    // element-icons is not common used, but should be visible after network connection lost
    preloadFontFace('element-icons');

    updateBaseUrl(router);

    await this.setLanguage(Language.EN);

    await this.withLoading(async () => {
      const { data } = await axiosInstance.get('/env.json');

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set');
      }

      await this.setSoraNetwork(data.NETWORK_TYPE);
      await this.setDefaultNodes(data?.DEFAULT_NETWORKS);

      if (data.FAUCET_URL) {
        this.setFaucetUrl(data.FAUCET_URL);
      }
      if (data.CHAIN_GENESIS_HASH) {
        await this.setNetworkChainGenesisHash(data.CHAIN_GENESIS_HASH);
      }

      // connection to node
      await this.runAppConnectionToNode();
    });

    this.trackActiveTransactions();
  }

  handleBuy(): void {
    this.checkAuth(() => {
      console.log('handle Buy');
    });
  }

  handleSell(): void {
    this.checkAuth(() => {
      console.log('handle Sell');
    });
  }

  handleRedeem(): void {
    this.checkAuth(() => {
      console.log('handle Redeem');
    });
  }

  checkAuth(func: VoidFunction): void {
    if (!this.isLoggedIn) {
      this.openWallet();
    } else {
      func();
    }
  }

  openWallet(): void {
    this.showWallet = true;
  }

  async beforeDestroy(): Promise<void> {
    await this.resetFiatPriceAndApySubscription();
    await this.resetActiveTransactions();
    await this.resetAccountAssetsSubscription();
    await connection.close();
  }

  private async runAppConnectionToNode() {
    try {
      await this.connectToNode({
        onError: (error) => this.handleNodeError(error, true), // prefer notification on connection success
        onDisconnect: this.handleNodeDisconnect,
        onReconnect: this.handleNodeReconnect,
      });
    } catch (error) {
      // we handled error using callback, do nothing
    }
  }
}
</script>

<style lang="scss">
.app {
  .el-loading-mask {
    background-color: var(--s-color-utility-body);
    .el-loading-spinner {
      background-image: url('~@/assets/img/pswap-loader.svg');
      height: var(--s-size-medium);
      width: var(--s-size-medium);
      margin-left: calc(50% - (var(--s-size-medium) / 2));
      > svg {
        display: none;
      }
    }
  }
}

.el-notification.sora {
  background: var(--s-color-brand-day);
  box-shadow: var(--s-shadow-tooltip);
  border-radius: calc(var(--s-border-radius-mini) / 2);
  border: none;
  align-items: center;
  position: absolute;
  width: 405px;
  .el-notification {
    &__icon {
      position: relative;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--s-color-utility-surface);
      flex-shrink: 0;
      &:before {
        position: absolute;
        top: -2px;
        left: -2px;
      }
    }
    &__content {
      margin-top: 0;
      color: var(--s-color-utility-surface);
      text-align: left;
    }
    &__closeBtn {
      top: $inner-spacing-medium;
      color: var(--s-color-utility-surface);
      &:hover {
        color: var(--s-color-utility-surface);
      }
    }
  }
  .loader {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: var(--s-color-utility-surface);
    // If duration will be change we should create css variable for it
    animation: runloader 4.5s linear infinite;
    @keyframes runloader {
      0% {
        width: 100%;
      }
      100% {
        width: 0;
      }
    }
  }
  &:hover .loader {
    width: 0;
    animation: none;
  }
}

.el-form--actions {
  display: flex;
  flex-direction: column;
  align-items: center;

  $swap-input-class: '.el-input';
  .s-input--token-value,
  .s-input-amount {
    #{$swap-input-class} {
      #{$swap-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$swap-input-class}__inner {
      @include text-ellipsis;
      height: var(--s-size-small);
      padding-right: 0;
      padding-left: 0;
      border-radius: 0 !important;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-large);
      line-height: var(--s-line-height-small);
      font-weight: 800;
    }
    .s-placeholder {
      display: none;
    }
  }
}

.el-message-box {
  border-radius: var(--s-border-radius-small) !important;

  &__message {
    white-space: pre-line;
  }
}

.link {
  color: var(--s-color-base-content-primary);
}

// Icons colors
.el-tooltip[class*=' s-icon-'],
.el-button.el-tooltip i[class*=' s-icon-'] {
  @include icon-styles(true);
}
i.icon-divider {
  @include icon-styles;
}
</style>
