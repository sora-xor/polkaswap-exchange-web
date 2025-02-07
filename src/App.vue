<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app" class="app" :class="dsProviderClasses">
    <app-header :loading="loading" @toggle-menu="toggleMenu" />
    <div :class="appClasses">
      <div class="app-body">
        <s-scrollbar class="app-body-scrollbar" v-loading="pageLoading">
          <div class="app-content">
            <router-view :parent-loading="loading || !nodeIsConnected" />
          </div>
        </s-scrollbar>
      </div>
    </div>
    <app-footer />
    <bridge-transfer-notification />
    <confirm-dialog
      :chain-api="chainApi"
      :account="account"
      :visibility="isSignTxDialogVisible"
      :set-visibility="setSignTxDialogVisibility"
    />
    <select-sora-account-dialog />
  </s-design-system-provider>
</template>

<script lang="ts">
import {
  api,
  components,
  mixins,
  WALLET_CONSTS,
  WALLET_TYPES,
  initWallet,
  waitForCore,
} from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import debounce from 'lodash/debounce';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import axiosInstance, { updateBaseUrl, getFullBaseUrl } from '@/api';
import AppFooter from '@/components/App/Footer/AppFooter.vue';
import AppHeader from '@/components/App/Header/AppHeader.vue';
import AppMenu from '@/components/App/Menu/AppMenu.vue';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import { PageNames, Components, Language, WalletPermissions } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { getLocale } from '@/lang';
import router, { goTo, lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import { getMobileCssClasses } from '@/utils';
import type { NodesConnection } from '@/utils/connection';

import type { EthBridgeSettings, SubNetworkApps } from './store/web3/types';
import type { History, HistoryItem } from '@sora-substrate/sdk';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type DesignSystem from '@soramitsu-ui/ui-vue2/lib/types/DesignSystem';

@Component({
  components: {
    AppHeader,
    AppFooter,
    AppMenu,
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    BridgeTransferNotification: lazyComponent(Components.BridgeTransferNotification),
    SelectSoraAccountDialog: lazyComponent(Components.SelectSoraAccountDialog),
    ConfirmDialog: components.ConfirmDialog,
  },
})
export default class App extends Mixins(mixins.TransactionMixin, NodeErrorMixin) {
  /** Product-based class fields should be like show${product}Popup */
  menuVisibility = false;

  @state.settings.screenBreakpointClass private responsiveClass!: BreakpointClass;
  @state.settings.appConnection private appConnection!: NodesConnection;
  @state.router.loading pageLoading!: boolean;

  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @getter.wallet.transactions.firstReadyTx firstReadyTransaction!: Nullable<HistoryItem>;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;
  @getter.libraryDesignSystem libraryDesignSystem!: DesignSystem;

  @mutation.wallet.settings.setSoraNetwork private setSoraNetwork!: (network: WALLET_CONSTS.SoraNetwork) => void;
  @mutation.wallet.settings.setIndexerEndpoint private setIndexerEndpoint!: (options: {
    indexer: WALLET_CONSTS.IndexerType;
    endpoint: string;
  }) => void;

  @mutation.settings.setScreenBreakpointClass private setScreenBreakpointClass!: (windowWidth: number) => void;

  @mutation.web3.setEvmNetworksApp private setEvmNetworksApp!: (data: EvmNetwork[]) => void;
  @mutation.web3.setSubNetworkApps private setSubNetworkApps!: (data: SubNetworkApps) => void;
  @mutation.web3.setEthBridgeSettings private setEthBridgeSettings!: (settings: EthBridgeSettings) => void;

  @action.wallet.settings.setApiKeys private setApiKeys!: (apiKeys: WALLET_TYPES.ApiKeysObject) => Promise<void>;
  @action.wallet.settings.subscribeOnExchangeRatesApi subscribeOnExchangeRatesApi!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.resetNetworkSubscriptions private resetNetworkSubscriptions!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.resetInternalSubscriptions private resetInternalSubscriptions!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.activateNetwokSubscriptions private activateNetwokSubscriptions!: AsyncFnWithoutArgs;
  @action.settings.setLanguage private setLanguage!: (lang: Language) => Promise<void>;

  @state.wallet.transactions.isSignTxDialogVisible public isSignTxDialogVisible!: boolean;
  @mutation.wallet.transactions.setSignTxDialogVisibility public setSignTxDialogVisibility!: (flag: boolean) => void;

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
    } else {
      this.resetNetworkSubscriptions();
    }
  }

  private setResponsiveClass(): void {
    this.setScreenBreakpointClass(window.innerWidth);
  }

  private setResponsiveClassDebounced = debounce(this.setResponsiveClass, 250);

  private subscribeOnScreenSize(): void {
    window.addEventListener('resize', this.setResponsiveClassDebounced);
  }

  private unsubscribeFromScreenSize(): void {
    window.removeEventListener('resize', this.setResponsiveClassDebounced);
  }

  async created() {
    this.setResponsiveClass();
    this.setLanguage(getLocale() as Language);
    updateBaseUrl(router);

    await this.withLoading(async () => {
      const { data } = await axiosInstance.get('/env.json');

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set');
      }

      await this.setApiKeys(data?.API_KEYS);
      this.setSoraNetwork(data.NETWORK_TYPE);
      this.setEthBridgeSettings(data.ETH_BRIDGE);
      this.setEvmNetworksApp(data.EVM_NETWORKS);
      this.setSubNetworkApps(data.SUB_NETWORKS);
      this.setIndexerEndpoint({ indexer: WALLET_CONSTS.IndexerType.SUBQUERY, endpoint: data.SUBQUERY_ENDPOINT });

      this.appConnection.setDefaultNodes(data?.DEFAULT_NETWORKS);
      this.appConnection.setNetworkChainGenesisHash(data?.CHAIN_GENESIS_HASH);

      // connection to node
      await this.runAppConnectionToNode();
    });

    this.subscribeOnExchangeRatesApi();
  }

  mounted(): void {
    this.subscribeOnScreenSize();
  }

  private get mobileCssClasses(): string[] | undefined {
    return getMobileCssClasses();
  }

  get dsProviderClasses(): string[] | BreakpointClass {
    return this.mobileCssClasses?.length ? [...this.mobileCssClasses, this.responsiveClass] : this.responsiveClass;
  }

  get appClasses(): Array<string> {
    const baseClass = 'app-main';
    const cssClasses: Array<string> = [baseClass];
    if (this.$route.name) {
      cssClasses.push(`${baseClass}--${this.$route.name.toLowerCase()}`);
    }
    return cssClasses;
  }

  get chainApi() {
    return api;
  }

  goTo(name: PageNames): void {
    goTo(name);
    this.closeMenu();
  }

  goToBridge(): void {
    this.goTo(PageNames.Bridge);
  }

  toggleMenu(): void {
    this.menuVisibility = !this.menuVisibility;
  }

  closeMenu(): void {
    this.menuVisibility = false;
  }

  async beforeDestroy(): Promise<void> {
    this.unsubscribeFromScreenSize();
    await this.resetInternalSubscriptions();
    await this.resetNetworkSubscriptions();
    this.appConnection.connection.close();
  }

  private async runAppConnectionToNode() {
    const walletOptions = {
      permissions: WalletPermissions,
      appName: 'Analog Bridge',
      connection: this.appConnection.connection,
    };

    try {
      // Run in parallel
      // 1) Wallet core initialization (node connection independent)
      // 2) Connection to node
      await Promise.all([
        waitForCore(walletOptions),
        this.appConnection.connect({
          onError: this.handleNodeError,
          onDisconnect: this.handleNodeDisconnect,
          onReconnect: this.handleNodeConnect,
        }),
      ]);
    } catch (error) {
      // we handled error using callback, do nothing
    } finally {
      // Wallet node connection dependent logic
      if (!this.isWalletLoaded) {
        await initWallet(walletOptions);
      }
    }
  }
}
</script>

<style lang="scss">
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-base);
  letter-spacing: var(--s-letter-spacing-small);
  background-color: var(--s-color-utility-body);
  scrollbar-color: transparent transparent;
}

ul ul {
  list-style-type: none;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  height: 100dvh;
  color: var(--s-color-base-content-primary);
  background-color: var(--analog-background-primary-base);
  transition: background-color 500ms linear;
}

.app {
  &-main.app-main {
    &--rewards,
    &--referral {
      .app-content {
        width: 100%;
      }
    }
  }

  &-body-scrollbar {
    flex: 1;

    @include scrollbar;
  }
}

.mobile.ios {
  .el-scrollbar__bar,
  .asset-list .scrollbar {
    opacity: 0.01 !important; // Fix iOS double tap issues
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

      &.el-icon-success {
        &,
        &:hover {
          color: var(--s-color-status-success);
        }
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
  @include mobile(true) {
    width: 300px;
  }
}

.el-form--actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.el-message-box {
  border-radius: var(--s-border-radius-small) !important;

  &__message {
    white-space: pre-line;
  }
}

.container {
  @include container-styles;
  .el-loading-mask {
    border-radius: var(--s-border-radius-medium);
  }
}

.link {
  color: var(--s-color-base-content-primary);
}

// Disabled button large typography
.s-typography-button--large.is-disabled {
  font-size: var(--s-font-size-medium) !important;
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

<style lang="scss" scoped>
.app {
  &-main {
    display: flex;
    align-items: stretch;
    height: calc(100dvh - #{$header-height} - #{$footer-height});
    position: relative;
  }

  &-body {
    position: relative;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    max-width: 100%;
  }

  &-content {
    flex: 1;
    padding: $inner-spacing-medium;
  }

  &-footer {
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-end;
    padding: $basic-spacing-medium;
  }
}

.app-logo--menu {
  margin-bottom: $inner-spacing-big;

  @include large-mobile {
    display: none;
  }
}
</style>
