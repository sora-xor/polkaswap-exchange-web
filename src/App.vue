<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app" class="app" :class="dsProviderClasses">
    <app-header :loading="loading" @toggle-menu="toggleMenu" />
    <div :class="appClasses">
      <div class="app-body">
        <s-scrollbar class="app-body-scrollbar" v-loading="pageLoading">
          <div class="app-content">
            <router-view :parent-loading="loading || !nodeIsConnected" />
            <app-disclaimer v-if="disclaimerVisibility" />
          </div>
        </s-scrollbar>
      </div>
    </div>
    <app-footer />
    <bridge-transfer-notification />
    <app-browser-notifs-enable-dialog :visible.sync="showBrowserNotifPopup" @set-dark-page="setDarkPage" />
    <app-browser-notifs-blocked-dialog :visible.sync="showBrowserNotifBlockedPopup" />
    <app-browser-notifs-blocked-rotate-phone :visible.sync="orientationWarningVisible" />
    <notification-enabling-page v-if="showNotifsDarkPage">
      {{ t('browserNotificationDialog.pointer') }}
    </notification-enabling-page>
    <alerts />
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
  connection,
  components,
  mixins,
  settingsStorage,
  WALLET_CONSTS,
  WALLET_TYPES,
  AlertsApiService,
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
import { BreakpointClass, Breakpoint } from '@/consts/layout';
import { getLocale } from '@/lang';
import router, { goTo, lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import { getMobileCssClasses } from '@/utils';
import type { NodesConnection } from '@/utils/connection';
import { detectSystemTheme, removeThemeListeners } from '@/utils/switchTheme';
import { tmaSdkService } from '@/utils/telegram';

import type { EthBridgeSettings, SubNetworkApps } from './store/web3/types';
import type { History, HistoryItem } from '@sora-substrate/sdk';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type DesignSystem from '@soramitsu-ui/ui-vue2/lib/types/DesignSystem';

@Component({
  components: {
    AppHeader,
    AppFooter,
    AppMenu,
    Alerts: lazyComponent(Components.Alerts),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    AppDisclaimer: lazyComponent(Components.AppDisclaimer),
    AppBrowserNotifsEnableDialog: lazyComponent(Components.AppBrowserNotifsEnableDialog),
    AppBrowserNotifsBlockedDialog: lazyComponent(Components.AppBrowserNotifsBlockedDialog),
    AppBrowserNotifsBlockedRotatePhone: lazyComponent(Components.AppBrowserNotifsBlockedRotatePhone),
    BridgeTransferNotification: lazyComponent(Components.BridgeTransferNotification),
    SelectSoraAccountDialog: lazyComponent(Components.SelectSoraAccountDialog),
    NotificationEnablingPage: components.NotificationEnablingPage,
    ConfirmDialog: components.ConfirmDialog,
  },
})
export default class App extends Mixins(mixins.TransactionMixin, NodeErrorMixin) {
  /** Product-based class fields should be like show${product}Popup */
  menuVisibility = false;
  showNotifsDarkPage = false;

  @state.settings.screenBreakpointClass private responsiveClass!: BreakpointClass;
  @state.settings.appConnection private appConnection!: NodesConnection;
  @state.settings.browserNotifPopupVisibility private browserNotifPopup!: boolean;
  @state.settings.browserNotifPopupBlockedVisibility private browserNotifPopupBlocked!: boolean;
  @state.settings.isOrientationWarningVisible private orientationWarningVisible!: boolean;
  @state.settings.isThemePreference isThemePreference!: boolean;
  @state.settings.isTMA isTMA!: boolean;
  @state.wallet.account.assetsToNotifyQueue private assetsToNotifyQueue!: Array<WhitelistArrayItem>;
  @state.settings.disclaimerVisibility disclaimerVisibility!: boolean;
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

  @mutation.settings.setBrowserNotifsPopupEnabled private setBrowserNotifsPopup!: (flag: boolean) => void;
  @mutation.settings.setBrowserNotifsPopupBlocked private setBrowserNotifsPopupBlocked!: (flag: boolean) => void;
  @mutation.settings.toggleDisclaimerDialogVisibility private toggleDisclaimerDialogVisibility!: FnWithoutArgs;
  @mutation.settings.setScreenBreakpointClass private setScreenBreakpointClass!: (windowWidth: number) => void;
  @mutation.settings.showOrientationWarning private showOrientationWarning!: FnWithoutArgs;
  @mutation.settings.hideOrientationWarning private hideOrientationWarning!: FnWithoutArgs;

  @mutation.web3.setEvmNetworksApp private setEvmNetworksApp!: (data: EvmNetwork[]) => void;
  @mutation.web3.setSubNetworkApps private setSubNetworkApps!: (data: SubNetworkApps) => void;
  @mutation.web3.setEthBridgeSettings private setEthBridgeSettings!: (settings: EthBridgeSettings) => void;

  @action.wallet.settings.setApiKeys private setApiKeys!: (apiKeys: WALLET_TYPES.ApiKeysObject) => Promise<void>;
  @action.wallet.settings.subscribeOnExchangeRatesApi subscribeOnExchangeRatesApi!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.resetNetworkSubscriptions private resetNetworkSubscriptions!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.resetInternalSubscriptions private resetInternalSubscriptions!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.activateNetwokSubscriptions private activateNetwokSubscriptions!: AsyncFnWithoutArgs;
  @action.settings.setLanguage private setLanguage!: (lang: Language) => Promise<void>;
  @action.wallet.account.notifyOnDeposit private notifyOnDeposit!: (info: {
    asset: WhitelistArrayItem;
    message: string;
  }) => Promise<void>;

  @state.wallet.transactions.isSignTxDialogVisible public isSignTxDialogVisible!: boolean;
  @mutation.wallet.transactions.setSignTxDialogVisibility public setSignTxDialogVisibility!: (flag: boolean) => void;

  @Watch('assetsToNotifyQueue')
  private handleNotifyOnDeposit(whitelistAssetArray: WhitelistArrayItem[]): void {
    if (!whitelistAssetArray.length) return;
    this.notifyOnDeposit({ asset: whitelistAssetArray[0], message: this.t('assetDeposit') });
  }

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

  @Watch('isThemePreference', { immediate: true })
  private onIsThemePreferenceChange(newVal: boolean) {
    if (newVal) {
      detectSystemTheme(this.isTMA);
    } else {
      removeThemeListeners(this.isTMA);
    }
  }

  private setResponsiveClass(): void {
    this.setScreenBreakpointClass(window.innerWidth);
  }

  private setResponsiveClassDebounced = debounce(this.setResponsiveClass, 250);

  private handleOrientationChange(): void {
    const isLandscape = screen.orientation
      ? screen.orientation.type.startsWith('landscape')
      : window.innerHeight < window.innerWidth;
    if (isLandscape) {
      this.showOrientationWarning();
    } else {
      this.hideOrientationWarning();
    }
  }

  private subscribeOnScreenOrientation(): void {
    if (window.innerWidth <= Breakpoint.LargeMobile) {
      if (screen.orientation) {
        screen.orientation.addEventListener('change', this.handleOrientationChange);
      } else {
        window.addEventListener('resize', this.handleOrientationChange);
      }
    }
  }

  private unsubscribeFromScreenOrientation(): void {
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', this.handleOrientationChange);
    } else {
      window.removeEventListener('resize', this.handleOrientationChange);
    }
  }

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
    AlertsApiService.baseRoute = getFullBaseUrl(router);

    await this.withLoading(async () => {
      const { data } = await axiosInstance.get('/env.json');

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set');
      }

      // To start running as Telegram Web App (desktop capabilities)
      if (data?.TG_BOT_URL) {
        tmaSdkService.init(data.TG_BOT_URL);
      }

      await this.setApiKeys(data?.API_KEYS);
      this.setSoraNetwork(data.NETWORK_TYPE);
      this.setEthBridgeSettings(data.ETH_BRIDGE);
      this.setEvmNetworksApp(data.EVM_NETWORKS);
      this.setSubNetworkApps(data.SUB_NETWORKS);
      this.setIndexerEndpoint({ indexer: WALLET_CONSTS.IndexerType.SUBQUERY, endpoint: data.SUBQUERY_ENDPOINT });
      this.setIndexerEndpoint({ indexer: WALLET_CONSTS.IndexerType.SUBSQUID, endpoint: data.SUBSQUID_ENDPOINT });

      this.appConnection.setDefaultNodes(data?.DEFAULT_NETWORKS);
      this.appConnection.setNetworkChainGenesisHash(data?.CHAIN_GENESIS_HASH);

      // connection to node
      await this.runAppConnectionToNode();
    });

    this.subscribeOnExchangeRatesApi();
    this.showDisclaimer();
    this.onIsThemePreferenceChange(this.isThemePreference);
  }

  mounted(): void {
    this.subscribeOnScreenSize();
    this.subscribeOnScreenOrientation();
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

  get showBrowserNotifPopup(): boolean {
    return this.browserNotifPopup;
  }

  set showBrowserNotifPopup(value) {
    this.setBrowserNotifsPopup(value);
  }

  get showBrowserNotifBlockedPopup(): boolean {
    return this.browserNotifPopupBlocked;
  }

  set showBrowserNotifBlockedPopup(value) {
    this.setBrowserNotifsPopupBlocked(value);
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

  setDarkPage(value: boolean) {
    this.showNotifsDarkPage = value;
  }

  showDisclaimer(): void {
    const disclaimerApprove = settingsStorage.get('disclaimerApprove');

    if (!disclaimerApprove) {
      setTimeout(() => this.toggleDisclaimerDialogVisibility(), 5_000);
    }
  }

  async beforeDestroy(): Promise<void> {
    this.unsubscribeFromScreenSize();
    this.unsubscribeFromScreenOrientation();
    removeThemeListeners(this.isTMA);
    tmaSdkService.destroy();
    await this.resetInternalSubscriptions();
    await this.resetNetworkSubscriptions();
    await connection.close();
  }

  private async runAppConnectionToNode() {
    const walletOptions = {
      permissions: WalletPermissions,
      appName: 'Analog Bridge',
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
