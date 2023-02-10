<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app" class="app">
    <app-header :loading="loading" @toggle-menu="toggleMenu" />
    <div :class="appClasses">
      <app-menu
        :visible="menuVisibility"
        :on-select="goTo"
        :is-about-page-opened="isAboutPage"
        @open-download-dialog="openDownloadDialog"
        @click.native="handleAppMenuClick"
      >
        <app-logo-button slot="head" class="app-logo--menu" :theme="libraryTheme" @click="goToSwap" />
      </app-menu>
      <div class="app-body" :class="{ 'app-body__about': isAboutPage }">
        <s-scrollbar class="app-body-scrollbar" v-loading="pageLoading">
          <div class="app-content">
            <router-view :parent-loading="loading || !nodeIsConnected" />
            <div class="app-disclaimer-container">
              <p
                class="app-disclaimer"
                v-html="
                  t('disclaimer', {
                    disclaimerPrefix,
                    polkaswapFaqLink,
                    memorandumLink,
                    privacyLink,
                  })
                "
              />
            </div>
          </div>
          <footer class="app-footer">
            <div class="sora-logo">
              <span class="sora-logo__title">{{ t('poweredBy') }}</span>
              <a class="sora-logo__image" href="https://sora.org" title="Sora" target="_blank" rel="nofollow noopener">
                <sora-logo :theme="libraryTheme" />
              </a>
            </div>
          </footer>
        </s-scrollbar>
      </div>
    </div>
    <app-footer />
    <referrals-confirm-invite-user :visible.sync="showConfirmInviteUser" />
    <bridge-transfer-notification />
    <mobile-popup :visible.sync="showMobilePopup" />
    <browser-notifs-enable-dialog :visible.sync="showBrowserNotifPopup" @set-dark-page="setDarkPage" />
    <browser-notifs-blocked-dialog :visible.sync="showBrowserNotifBlockedPopup" />
    <notification-enabling-page v-if="showNotifsDarkPage">
      {{ t('browserNotificationDialog.pointer') }}
    </notification-enabling-page>
    <confirm-dialog v-if="isDesktop" />
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { FPNumber, History, connection, HistoryItem } from '@sora-substrate/util';
import { components, mixins, getExplorerLinks, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem';
import type { WhitelistArrayItem } from '@sora-substrate/util/build/assets/types';

import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import SoraLogo from '@/components/logo/Sora.vue';
import MobilePopup from '@/components/MobilePopup/MobilePopup.vue';

import { PageNames, Components, Language, Links } from '@/consts';
import axiosInstance, { updateBaseUrl } from '@/api';
import router, { goTo, lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import { preloadFontFace, updateDocumentTitle } from '@/utils';
import { getLocale } from '@/lang';
import type { ConnectToNodeOptions } from '@/types/nodes';
import type { SubNetwork } from '@/utils/ethers-util';
import type { FeatureFlags } from '@/store/settings/types';

@Component({
  components: {
    SoraLogo,
    AppHeader: lazyComponent(Components.AppHeader),
    AppMenu: lazyComponent(Components.AppMenu),
    AppFooter: lazyComponent(Components.AppFooter),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    ReferralsConfirmInviteUser: lazyComponent(Components.ReferralsConfirmInviteUser),
    BridgeTransferNotification: lazyComponent(Components.BridgeTransferNotification),
    BrowserNotifsEnableDialog: lazyComponent(Components.BrowserNotifsEnableDialog),
    BrowserNotifsBlockedDialog: lazyComponent(Components.BrowserNotifsBlockedDialog),
    NotificationEnablingPage: components.NotificationEnablingPage,
    ConfirmDialog: components.ConfirmDialog,
    MobilePopup,
  },
})
export default class App extends Mixins(mixins.TransactionMixin, NodeErrorMixin) {
  menuVisibility = false;
  showConfirmInviteUser = false;
  showMobilePopup = false;
  showNotifsDarkPage = false;

  @state.wallet.account.assetsToNotifyQueue assetsToNotifyQueue!: Array<WhitelistArrayItem>;
  @state.referrals.storageReferrer storageReferrer!: string;
  @state.settings.browserNotifPopupVisibility browserNotifPopup!: boolean;
  @state.settings.browserNotifPopupBlockedVisibility browserNotifPopupBlocked!: boolean;
  @state.router.loading pageLoading!: boolean;

  @getter.wallet.transactions.firstReadyTx firstReadyTransaction!: Nullable<HistoryItem>;
  @getter.wallet.account.isLoggedIn isSoraAccountConnected!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;
  @getter.libraryDesignSystem libraryDesignSystem!: DesignSystem;
  @getter.settings.chartsEnabled chartsEnabled!: boolean;

  @mutation.wallet.settings.setSoraNetwork private setSoraNetwork!: (network: WALLET_CONSTS.SoraNetwork) => void;
  @mutation.wallet.settings.setSubqueryEndpoint private setSubqueryEndpoint!: (endpoint: string) => void;
  @mutation.settings.setDefaultNodes private setDefaultNodes!: (nodes: Array<Node>) => void;
  @mutation.settings.setNetworkChainGenesisHash private setNetworkChainGenesisHash!: (hash?: string) => void;
  @mutation.settings.setFaucetUrl private setFaucetUrl!: (url: string) => void;
  @mutation.settings.setFeatureFlags private setFeatureFlags!: (data: FeatureFlags) => void;
  @mutation.settings.setBrowserNotifsPopupEnabled private setBrowserNotifsPopup!: (flag: boolean) => void;
  @mutation.settings.setBrowserNotifsPopupBlocked private setBrowserNotifsPopupBlocked!: (flag: boolean) => void;
  @mutation.settings.resetBlockNumberSubscription private resetBlockNumberSubscription!: FnWithoutArgs;
  @mutation.referrals.unsubscribeFromInvitedUsers private unsubscribeFromInvitedUsers!: FnWithoutArgs;
  @mutation.web3.setSubNetworks private setSubNetworks!: (data: Array<SubNetwork>) => void;
  @mutation.referrals.resetStorageReferrer private resetStorageReferrer!: FnWithoutArgs;

  @action.wallet.settings.setApiKeys private setApiKeys!: (apiKeys: WALLET_TYPES.ApiKeysObject) => Promise<void>;
  @action.wallet.subscriptions.resetNetworkSubscriptions private resetNetworkSubscriptions!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.resetInternalSubscriptions private resetInternalSubscriptions!: AsyncFnWithoutArgs;
  @action.wallet.subscriptions.activateNetwokSubscriptions private activateNetwokSubscriptions!: AsyncFnWithoutArgs;
  @action.settings.connectToNode private connectToNode!: (options: ConnectToNodeOptions) => Promise<void>;
  @action.settings.setLanguage private setLanguage!: (lang: Language) => Promise<void>;
  @action.settings.setBlockNumber private setBlockNumber!: AsyncFnWithoutArgs;
  @action.web3.setSmartContracts private setSmartContracts!: (data: Array<SubNetwork>) => Promise<void>;
  @action.referrals.getReferrer private getReferrer!: AsyncFnWithoutArgs;
  @action.wallet.account.notifyOnDeposit private notifyOnDeposit!: (info: {
    asset: WhitelistArrayItem;
    message: string;
  }) => Promise<void>;

  // [DESKTOP] To Enable Desktop
  // @mutation.wallet.account.setIsDesktop private setIsDesktop!: (v: boolean) => void;

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
      this.setBlockNumber();
    } else {
      this.resetNetworkSubscriptions();
    }
  }

  @Watch('isSoraAccountConnected')
  private async confirmInviteUserIfConnected(isSoraConnected: boolean): Promise<void> {
    if (isSoraConnected) {
      await this.confirmInvititation();
    }
  }

  @Watch('storageReferrer', { immediate: true })
  private async confirmInviteUserIfHasStorage(storageReferrerValue: string): Promise<void> {
    if (this.isSoraAccountConnected && !!storageReferrerValue) {
      await this.confirmInvititation();
    }
  }

  get disclaimerPrefix(): string {
    return `<span class="app-disclaimer__title">${this.t('disclaimerTitle')}</span>`;
  }

  get memorandumLink(): string {
    return this.generateDisclaimerLink(Links.terms, this.t('memorandum'));
  }

  get privacyLink(): string {
    return this.generateDisclaimerLink(Links.privacy, this.t('helpDialog.privacyPolicy'));
  }

  get polkaswapFaqLink(): string {
    return this.generateDisclaimerLink(Links.faq, this.t('FAQ'));
  }

  generateDisclaimerLink(href: string, content: string): string {
    return `<a href="${href}" target="_blank" rel="nofollow noopener" class="link" title="${content}">${content}</a>`;
  }

  async confirmInvititation(): Promise<void> {
    await this.getReferrer();
    if (this.storageReferrer) {
      if (this.storageReferrer === this.account.address) {
        this.resetStorageReferrer();
      } else {
        this.withApi(() => {
          this.showConfirmInviteUser = true;
        });
      }
    }
  }

  async created() {
    // [DESKTOP] To Enable Desktop
    // this.setIsDesktop(true);
    // element-icons is not common used, but should be visible after network connection lost
    preloadFontFace('element-icons');

    updateBaseUrl(router);

    await this.setLanguage(getLocale() as Language);

    await this.withLoading(async () => {
      const { data } = await axiosInstance.get('/env.json');

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set');
      }

      await this.setApiKeys(data?.API_KEYS);
      this.setFeatureFlags(data?.FEATURE_FLAGS);
      this.setSoraNetwork(data.NETWORK_TYPE);
      this.setSubqueryEndpoint(data.SUBQUERY_ENDPOINT);
      this.setDefaultNodes(data?.DEFAULT_NETWORKS);
      this.setSubNetworks(data.SUB_NETWORKS);
      await this.setSmartContracts(data.SUB_NETWORKS);

      if (data.FAUCET_URL) {
        this.setFaucetUrl(data.FAUCET_URL);
      }
      if (data.CHAIN_GENESIS_HASH) {
        this.setNetworkChainGenesisHash(data.CHAIN_GENESIS_HASH);
      }

      // connection to node
      await this.runAppConnectionToNode();
      updateDocumentTitle(); // For the first load
    });
  }

  private get isSwapPageWithCharts(): boolean {
    return this.$route.name === PageNames.Swap && this.chartsEnabled;
  }

  get isAboutPage(): boolean {
    return this.$route.name === PageNames.About;
  }

  get isCurrentPageTooWide(): boolean {
    return this.isAboutPage || this.isSwapPageWithCharts || this.$route.name === PageNames.Tokens;
  }

  get appClasses(): Array<string> {
    const baseClass = 'app-main';
    const cssClasses: Array<string> = [baseClass];
    if (this.$route.name) {
      cssClasses.push(`${baseClass}--${this.$route.name.toLowerCase()}`);
    }
    if (this.isSwapPageWithCharts) {
      cssClasses.push(`${baseClass}--has-charts`);
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

  goTo(name: PageNames): void {
    goTo(name);
    this.closeMenu();
  }

  goToSwap(): void {
    this.goTo(PageNames.Swap);
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

  handleAppMenuClick(e: Event): void {
    const target = e.target as any;
    const sidebar = !!target.closest('.app-sidebar');

    if (!sidebar) {
      this.closeMenu();
    }
  }

  openDownloadDialog(): void {
    this.showMobilePopup = true;
  }

  async beforeDestroy(): Promise<void> {
    await this.resetInternalSubscriptions();
    await this.resetNetworkSubscriptions();
    this.resetBlockNumberSubscription();
    this.unsubscribeFromInvitedUsers();
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
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-base);
}

ul ul {
  list-style-type: none;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  height: 100vh;
  color: var(--s-color-base-content-primary);
  background-color: var(--s-color-utility-body);
  transition: background-color 500ms linear;
}

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

  &-main.app-main {
    &--rewards,
    &--referral {
      .app-content {
        width: 100%;
      }
    }
  }

  &-body-scrollbar {
    @include scrollbar;
  }
  &-body {
    &-scrollbar {
      flex: 1;
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

.container {
  @include container-styles;
  .el-loading-mask {
    border-radius: var(--s-border-radius-medium);
  }
}
.app-disclaimer {
  &__title {
    color: var(--s-color-theme-accent);
  }
  a:not(:active) {
    @include focus-outline;
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

@include large-desktop(true) {
  .app-main[class*='app-main--explore/'] {
    .app-menu {
      position: relative;

      @include large-mobile(true) {
        position: fixed;
      }
    }
  }
}

@include tablet {
  .app-footer {
    flex-direction: row;
    .app-disclaimer-container {
      padding-right: $inner-spacing-large;
    }
  }
}

@include desktop {
  .app-main {
    &.app-main--swap.app-main--has-charts {
      .app-menu {
        position: relative;
      }
    }

    &.app-main--has-charts {
      .app-content {
        width: 100%;
        padding-left: $basic-spacing * 2;
        .app-disclaimer {
          $margin-left: 10px;
          max-width: calc(#{$bridge-width} + #{$margin-left});
          padding-right: $inner-spacing-big;
          padding-left: calc(#{$inner-spacing-big} + #{$margin-left});
          &-container {
            margin-left: auto;
            margin-right: auto;
            max-width: calc(#{$bridge-width} * 2 + #{$basic-spacing-small});
          }
        }
      }
    }
  }
}

@include large-desktop {
  .app-main {
    &.app-main--has-charts {
      .app-content {
        .app-disclaimer {
          &-container {
            max-width: calc(#{$bridge-width} * 3 + #{$basic-spacing-small} * 4);
          }
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
$sora-logo-height: 36px;
$sora-logo-width: 173.7px;

.app {
  &-main {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    height: calc(100vh - #{$header-height} - #{$footer-height});
    position: relative;
  }

  &-body {
    position: relative;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    &__about {
      overflow: hidden;

      .app-content .app-disclaimer-container {
        width: 100%;
        max-width: 900px;
        padding: 0 20px;
        margin: 0 auto 120px;
      }
      .app-footer {
        justify-content: center;
      }
    }
  }

  &-content {
    flex: 1;
    margin: auto;

    .app-disclaimer-container {
      margin-left: auto;
      margin-bottom: $inner-spacing-big;
      margin-right: auto;
      max-width: calc(#{$inner-window-width} - #{$basic-spacing-medium * 2});
      text-align: justify;
    }
  }

  &-disclaimer {
    margin-top: $basic-spacing-medium;
    font-size: var(--s-font-size-extra-mini);
    font-weight: 300;
    line-height: var(--s-line-height-extra-small);
    letter-spacing: var(--s-letter-spacing-small);
    color: var(--s-color-base-content-secondary);
  }

  &-footer {
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-end;
    padding: 0 $basic-spacing-medium $basic-spacing-medium;
  }
}

.app-logo--menu {
  margin-bottom: $inner-spacing-big;

  @include large-mobile {
    display: none;
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
</style>
