<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app" class="page">
    <img src="/img/greed.png" alt="" class="greed-img" />

    <app-header :loading="loading" />

    <div class="wrap-floats">
      <div class="blur-circle-3"></div>
      <div class="new-circle"></div>
    </div>

    <div class="wrap-cart app-main">
      <cart />
    </div>

    <footer class="app-footer">
      <div class="sora-logo">
        <span class="sora-logo__title">{{ t('poweredBy') }}</span>
        <a class="sora-logo__image" href="https://sora.org" title="Sora" target="_blank" rel="nofollow noopener">
          <sora-logo theme="dark" />
        </a>
      </div>
    </footer>

    <wallet-dialog />
    <edition-dialog />
    <redeem-dialog />
    <congratulations-dialog />
    <select-node-dialog />
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { History, connection } from '@sora-substrate/util';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem';

import SoraLogo from '@/components/Logo/Sora.vue';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';

import { Components, Language } from '@/consts';
import axiosInstance, { updateBaseUrl } from '@/api';
import router, { lazyComponent } from '@/router';
import { preloadFontFace } from '@/utils';
import type { ConnectToNodeOptions } from '@/types/nodes';

@Component({
  components: {
    SoraLogo,
    AppHeader: lazyComponent(Components.AppHeader),
    Cart: lazyComponent(Components.Cart),
    WalletDialog: lazyComponent(Components.WalletDialog),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    EditionDialog: lazyComponent(Components.EditionDialog),
    RedeemDialog: lazyComponent(Components.RedeemDialog),
    CongratulationsDialog: lazyComponent(Components.CongratulationsDialog),
  },
})
export default class App extends Mixins(mixins.TransactionMixin, NodeErrorMixin) {
  @Getter isLoggedIn!: boolean;
  @Getter libraryDesignSystem!: DesignSystem;
  @State((state) => state.wallet.settings.soraNetwork) soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @Getter('firstReadyTransaction', { namespace: 'wallet/transactions' }) firstReadyTransaction!: History;

  // Wallet
  @Action resetAccountAssetsSubscription!: AsyncVoidFn;
  @Action trackActiveTransactions!: AsyncVoidFn;
  @Action resetActiveTransactions!: AsyncVoidFn;
  @Action resetRuntimeVersionSubscription!: AsyncVoidFn;
  @Action resetFiatPriceAndApySubscription!: AsyncVoidFn;
  @Action activateNetwokSubscriptions!: AsyncVoidFn;
  @Action resetNetworkSubscriptions!: AsyncVoidFn;

  @Action updateAccountAssets!: AsyncVoidFn;
  @Action setSoraNetwork!: (networkType: string) => Promise<void>; // wallet
  @Action setDefaultNodes!: (nodes: any) => Promise<void>;
  @Action setNetworkChainGenesisHash!: (hash: string) => Promise<void>;
  @Action connectToNode!: (options: ConnectToNodeOptions) => Promise<void>;
  @Action setFaucetUrl!: (url: string) => Promise<void>;
  @Action setLanguage!: (lang: Language) => Promise<void>;
  @Action('noir/subscribeOnRedemptionDataUpdates') subscribeOnRedemptionDataUpdates!: AsyncVoidFn;
  @Action('noir/resetRedemptionDataSubscription') resetRedemptionDataSubscription!: AsyncVoidFn;

  @Watch('firstReadyTransaction', { deep: true })
  private handleNotifyAboutTransaction(value: History, oldValue: History): void {
    this.handleChangeTransaction(value, oldValue);
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean): void {
    if (nodeConnected) {
      // after app load, the first connection to the node occurs before the wallet is loaded
      if (this.isWalletLoaded) {
        this.activateNetwokSubscriptions();
      }
      this.subscribeOnRedemptionDataUpdates();
    } else {
      this.resetNetworkSubscriptions();
      this.resetRedemptionDataSubscription();
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

  async beforeDestroy(): Promise<void> {
    await this.resetNetworkSubscriptions();
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
$sora-logo-height: 36px;
$sora-logo-width: 173.7px;

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

  &-footer {
    min-width: 800px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0 $basic-spacing-medium $basic-spacing-medium;
  }
}

.sora-logo {
  display: flex;
  align-items: center;
  align-self: flex-end;
  &__title {
    text-transform: uppercase;
    font-weight: 200;
    color: var(--s-color-base-content-secondary);
    font-size: 15px;
    line-height: 16px;
    margin-right: $basic-spacing;
    white-space: nowrap;
  }
  &__image {
    width: $sora-logo-width;
    height: $sora-logo-height;
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
      background: var(--s-color-base-content-primary);
      flex-shrink: 0;
      &:before {
        position: absolute;
        top: -2px;
        left: -2px;
      }
    }
    &__content {
      margin-top: 0;
      color: var(--s-color-base-content-primary);
      text-align: left;
    }
    &__closeBtn {
      top: $inner-spacing-medium;
      color: var(--s-color-base-content-primary);
      &:hover {
        color: var(--s-color-base-content-primary);
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
  background-color: var(--s-color-brand-day) !important;
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

// Scrollbar
.custom-scroll {
  @include scrollbar();
}
</style>
