<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app" class="app">
    <header class="header">
      <div class="app-controls s-flex">
        <s-button class="polkaswap-logo" type="link" size="large" @click="goTo(PageNames.Swap)">
          <polkaswap-logo :theme="libraryTheme" class="polkaswap-logo--tablet"/>
        </s-button>
      </div>
      <div class="header-container">
        <div class="app-controls app-controls--moonpay s-flex">
          <s-button type="tertiary" size="medium" icon="various-atom-24" @click="openMoonpayDialog">
            {{ t('moonpay.buttons.buy') }}
          </s-button>
          <moonpay-history-button v-if="isLoggedIn" />
        </div>
        <div class="app-controls s-flex">
          <s-button type="action" class="theme-control s-pressed" @click="switchTheme">
            <s-icon :name="themeIcon" size="28" />
          </s-button>
          <s-button type="action" class="lang-control s-pressed" @click="openSelectLanguageDialog">
            <s-icon name="basic-globe-24" size="28" />
          </s-button>
          <s-button type="action" class="node-control s-pressed" :tooltip="nodeTooltip" @click="openSelectNodeDialog">
            <token-logo class="node-control__logo" v-bind="nodeLogo" />
          </s-button>
          <s-button type="tertiary" :class="['account-control', { 's-pressed': isLoggedIn }]" size="medium" :tooltip="accountTooltip" :disabled="loading" @click="goTo(PageNames.Wallet)">
            <div :class="['account-control-title', { name: isLoggedIn }]">{{ accountInfo }}</div>
            <div class="account-control-icon">
              <s-icon v-if="!isLoggedIn" name="finance-wallet-24" size="28" />
              <WalletAvatar v-else :address="account.address"/>
            </div>
          </s-button>
        </div>
      </div>
    </header>
    <div class="app-main">
      <s-scrollbar class="app-sidebar-scrollbar">
        <aside class="app-sidebar">
          <s-menu
            class="menu"
            mode="vertical"
            background-color="transparent"
            box-shadow="none"
            text-color="var(--s-color-base-content-primary)"
            :active-text-color="mainMenuActiveColor"
            active-hover-color="transparent"
            :default-active="getCurrentPath()"
            @select="goTo"
          >
            <s-menu-item-group v-for="(group, index) in SidebarMenuGroups" :key="index">
              <s-menu-item
                v-for="item in group"
                :key="item.title"
                :index="item.title"
                :disabled="item.disabled"
                class="menu-item"
              >
                <sidebar-item-content :icon="item.icon" :title="t(`mainMenu.${item.title}`)" />
              </s-menu-item>
            </s-menu-item-group>
          </s-menu>

          <s-menu
            class="menu"
            mode="vertical"
            background-color="transparent"
            box-shadow="none"
            text-color="var(--s-color-base-content-tertiary)"
            active-text-color="var(--s-color-base-content-tertiary)"
            active-hover-color="transparent"
          >
            <s-menu-item-group>
              <li v-for="item in SocialNetworkLinks" :key="item.title">
                <sidebar-item-content
                  :icon="item.icon"
                  :title="t(`social.${item.title}`)"
                  :href="item.href"
                  tag="a"
                  target="_blank"
                  rel="nofollow noopener"
                  class="el-menu-item menu-item--small"
                />
              </li>
            </s-menu-item-group>
            <s-menu-item-group>
              <li v-if="faucetUrl">
                <sidebar-item-content
                  :icon="FaucetLink.icon"
                  :title="t(`footerMenu.${FaucetLink.title}`)"
                  :href="faucetUrl"
                  tag="a"
                  target="_blank"
                  rel="nofollow noopener"
                  class="el-menu-item menu-item--small"
                />
              </li>
              <!-- <sidebar-item-content
                :title="t('footerMenu.help')"
                icon="notifications-info-24"
                tag="li"
                class="el-menu-item menu-item--small"
                @click.native="openHelpDialog"
              /> -->
            </s-menu-item-group>
          </s-menu>
        </aside>
      </s-scrollbar>
      <div class="app-body" :class="isAboutPage ? 'app-body__about' : ''">
        <s-scrollbar class="app-body-scrollbar">
          <div class="app-content">
            <router-view :parent-loading="loading || !nodeIsConnected" />
            <p class="app-disclaimer" v-html="t('disclaimer')" />
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

    <help-dialog :visible.sync="showHelpDialog" />
    <select-node-dialog :visible.sync="showSelectNodeDialog" />
    <select-language-dialog :visible.sync="showSelectLanguageDialog" />
    <moonpay :visible.sync="showMoonpayDialog" />
    <moonpay-notification :visible.sync="showMoonpayNotification" />
    <moonpay-confirmation :visible.sync="showMoonpayConfirmation" @confirm="handleMoonpayBridgeConfirm" />
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { WALLET_CONSTS, WalletAvatar } from '@soramitsu/soraneo-wallet-web'
import { History, KnownSymbols, connection } from '@sora-substrate/util'
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'
import type DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin'
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import PolkaswapLogo from '@/components/logo/Polkaswap.vue'
import SoraLogo from '@/components/logo/Sora.vue'

import { PageNames, BridgeChildPages, SidebarMenuGroups, SocialNetworkLinks, FaucetLink, Components, LogoSize, Language } from '@/consts'
import axios, { updateBaseUrl } from '@/api'
import router, { lazyComponent } from '@/router'
import { formatAddress, preloadFontFace } from '@/utils'
import { getLocale } from '@/lang'
import type { ConnectToNodeOptions } from '@/types/nodes'
import type { SubNetwork } from '@/utils/ethers-util'

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet
const WALLET_CONNECTION_ROUTE = WALLET_CONSTS.RouteNames.WalletConnection

@Component({
  components: {
    WalletAvatar,
    PolkaswapLogo,
    SoraLogo,
    HelpDialog: lazyComponent(Components.HelpDialog),
    SidebarItemContent: lazyComponent(Components.SidebarItemContent),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    TokenLogo: lazyComponent(Components.TokenLogo),
    Moonpay: lazyComponent(Components.Moonpay),
    MoonpayNotification: lazyComponent(Components.MoonpayNotification),
    MoonpayHistoryButton: lazyComponent(Components.MoonpayHistoryButton),
    MoonpayConfirmation: lazyComponent(Components.MoonpayConfirmation)
  }
})
export default class App extends Mixins(TransactionMixin, NodeErrorMixin, WalletConnectMixin) {
  readonly nodesFeatureEnabled = true

  readonly SidebarMenuGroups = SidebarMenuGroups
  readonly SocialNetworkLinks = SocialNetworkLinks
  readonly FaucetLink = FaucetLink
  readonly PageNames = PageNames

  readonly PoolChildPages = [
    PageNames.AddLiquidity,
    PageNames.RemoveLiquidity,
    PageNames.CreatePair
  ]

  showHelpDialog = false
  showSelectLanguageDialog = false

  switchTheme: AsyncVoidFn = switchTheme

  @State(state => state.settings.faucetUrl) faucetUrl!: string
  @State(state => state.settings.selectNodeDialogVisibility) selectNodeDialogVisibility!: boolean
  @State(state => state.moonpay.dialogVisibility) moonpayDialogVisibility!: boolean
  @State(state => state.moonpay.notificationVisibility) moonpayNotificationVisibility!: boolean
  @State(state => state.moonpay.confirmationVisibility) moonpayConfirmationVisibility!: boolean

  @Getter libraryTheme!: Theme
  @Getter libraryDesignSystem!: DesignSystem

  @Getter firstReadyTransaction!: History
  @Getter isLoggedIn!: boolean
  @Getter account!: any
  @Getter currentRoute!: WALLET_CONSTS.RouteNames
  @Getter chainAndNetworkText!: string
  @Getter language!: Language

  // Wallet
  @Action navigate!: (options: { name: string; params?: object }) => Promise<void>
  @Action resetAccountAssetsSubscription!: AsyncVoidFn
  @Action trackActiveTransactions!: AsyncVoidFn
  @Action resetActiveTransactions!: AsyncVoidFn
  @Action resetFiatPriceAndApySubscription!: AsyncVoidFn

  @Action updateAccountAssets!: AsyncVoidFn
  @Action setSoraNetwork!: (networkType: string) => Promise<void> // wallet
  @Action setDefaultNodes!: (nodes: any) => Promise<void>
  @Action setNetworkChainGenesisHash!: (hash: string) => Promise<void>
  @Action connectToNode!: (options: ConnectToNodeOptions) => Promise<void>
  @Action setFaucetUrl!: (url: string) => Promise<void>
  @Action setLanguage!: (lang: Language) => Promise<void>
  @Action setApiKeys!: (options: any) => Promise<void>
  @Action('setSubNetworks', { namespace: 'web3' }) setSubNetworks!: (data: Array<SubNetwork>) => Promise<void>
  @Action('setSmartContracts', { namespace: 'web3' }) setSmartContracts!: (data: Array<SubNetwork>) => Promise<void>
  @Action('setDialogVisibility', { namespace: 'moonpay' }) setMoonpayDialogVisibility!: (flag: boolean) => Promise<void>
  @Action('setNotificationVisibility', { namespace: 'moonpay' }) setMoonpayNotificationVisibility!: (flag: boolean) => Promise<void>
  @Action('setConfirmationVisibility', { namespace: 'moonpay' }) setMoonpayConfirmationVisibility!: (flag: boolean) => Promise<void>
  @Action('setReadyBridgeTransactionId', { namespace: 'moonpay' }) setReadyBridgeTransactionId!: (id?: string) => Promise<void>

  @Watch('firstReadyTransaction', { deep: true })
  private handleNotifyAboutTransaction (value: History): void {
    this.handleChangeTransaction(value)
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions (nodeConnected: boolean): void {
    if (nodeConnected) {
      this.updateAccountAssets()
    } else {
      this.resetAccountAssetsSubscription()
    }
  }

  async created () {
    // element-icons is not common used, but should be visible after network connection lost
    preloadFontFace('element-icons')

    updateBaseUrl(router)

    await this.setLanguage(getLocale() as any)

    await this.withLoading(async () => {
      const { data } = await axios.get('/env.json')

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set')
      }

      await this.setSoraNetwork(data.NETWORK_TYPE)
      await this.setDefaultNodes(data?.DEFAULT_NETWORKS)
      await this.setSubNetworks(data.SUB_NETWORKS)
      await this.setSmartContracts(data.SUB_NETWORKS)
      await this.setApiKeys(data?.API_KEYS)

      if (data.FAUCET_URL) {
        this.setFaucetUrl(data.FAUCET_URL)
      }
      if (data.CHAIN_GENESIS_HASH) {
        await this.setNetworkChainGenesisHash(data.CHAIN_GENESIS_HASH)
      }

      // connection to node
      await this.runAppConnectionToNode()
    })

    this.trackActiveTransactions()
  }

  get selectedLanguage (): string {
    return this.language.toUpperCase()
  }

  get showSelectNodeDialog (): boolean {
    return this.selectNodeDialogVisibility
  }

  set showSelectNodeDialog (flag: boolean) {
    this.setSelectNodeDialogVisibility(flag)
  }

  get showMoonpayDialog (): boolean {
    return this.moonpayDialogVisibility
  }

  set showMoonpayDialog (flag: boolean) {
    this.setMoonpayDialogVisibility(flag)
  }

  get showMoonpayNotification (): boolean {
    return this.moonpayNotificationVisibility
  }

  set showMoonpayNotification (flag: boolean) {
    this.setMoonpayNotificationVisibility(flag)
  }

  get showMoonpayConfirmation (): boolean {
    return this.moonpayConfirmationVisibility
  }

  set showMoonpayConfirmation (flag: boolean) {
    this.setMoonpayConfirmationVisibility(flag)
  }

  get themeIcon (): string {
    return this.libraryTheme === Theme.LIGHT ? 'various-brightness-low-24' : 'various-moon-24'
  }

  get mainMenuActiveColor (): string {
    return this.libraryTheme === Theme.LIGHT ? 'var(--s-color-theme-accent)' : 'var(--s-color-theme-accent-focused)'
  }

  get nodeTooltip (): string {
    if (this.nodeIsConnected) {
      return this.t('selectNodeConnected', { chain: this.node.chain })
    }
    return this.t('selectNodeText')
  }

  get nodeLogo (): any {
    return {
      size: LogoSize.MEDIUM,
      tokenSymbol: KnownSymbols.XOR
    }
  }

  get isAboutPage (): boolean {
    return this.$route.name === PageNames.About
  }

  get accountTooltip (): string {
    return this.t(`${this.isLoggedIn ? 'connectedAccount' : 'connectWalletTextTooltip'}`)
  }

  get accountInfo (): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText')
    }
    return this.account.name || formatAddress(this.account.address, 8)
  }

  async handleMoonpayBridgeConfirm (): Promise<void> {
    await this.setMoonpayConfirmationVisibility(false)
    await this.setReadyBridgeTransactionId()

    this.goTo(PageNames.BridgeTransaction)
  }

  getCurrentPath (): string {
    if (this.PoolChildPages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Pool
    }
    if (BridgeChildPages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Bridge
    }
    return router.currentRoute.name as string
  }

  goTo (name: PageNames): void {
    if (name === PageNames.Wallet) {
      if (!this.isLoggedIn) {
        this.navigate({ name: WALLET_CONNECTION_ROUTE })
      } else if (this.currentRoute !== WALLET_DEFAULT_ROUTE) {
        this.navigate({ name: WALLET_DEFAULT_ROUTE })
      }
    }

    this.changePage(name)
  }

  private changePage (name: PageNames): void {
    if (router.currentRoute.name === name) {
      return
    }
    router.push({ name })
  }

  openHelpDialog (): void {
    this.showHelpDialog = true
  }

  openSelectNodeDialog (): void {
    this.setSelectNodeDialogVisibility(true)
  }

  openSelectLanguageDialog (): void {
    this.showSelectLanguageDialog = true
  }

  async openMoonpayDialog (): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet()
    }
    await this.checkConnectionToExternalAccount(async () => {
      await this.setMoonpayDialogVisibility(true)
    })
  }

  async beforeDestroy (): Promise<void> {
    await this.resetFiatPriceAndApySubscription()
    await this.resetActiveTransactions()
    await this.resetAccountAssetsSubscription()
    await connection.close()
  }

  private async runAppConnectionToNode () {
    try {
      await this.connectToNode({
        onError: (error) => this.handleNodeError(error, true), // prefer notification on connection success
        onDisconnect: this.handleNodeDisconnect,
        onReconnect: this.handleNodeReconnect
      })
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

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  height: 100vh;
  min-width: 528px;
  color: var(--s-color-base-content-primary);
  background-color: var(--s-color-utility-body);
  transition: background-color 500ms linear;
}

.app {
  .el-loading-mask {
    background-color: var(--s-color-utility-body);
  }

  &-body-scrollbar, &-sidebar-scrollbar {
    @include scrollbar;
  }
  &-body {
    &-scrollbar {
      flex: 1;
    }
    &__about &-scrollbar .el-scrollbar__wrap {
      overflow-x: auto;
    }
  }
}

.account-control {
  &-icon {
    svg circle:first-child {
      fill: var(--s-color-utility-surface);
    }
  }
  span {
    flex-direction: row-reverse;
  }
  [class^="s-icon-"] {
    @include icon-styles;
  }
}

.menu.el-menu {
  .el-menu-item-group__title {
    display: none;
  }

  &:not(.el-menu--horizontal) > :not(:last-child) {
    margin-bottom: 0;
  }

  .el-menu-item {
    .icon-container {
      box-shadow: var(--s-shadow-element-pressed);
    }

    &.menu-item--small {
      .icon-container {
        box-shadow: none;
        margin: 0;
        background-color: unset;
      }
    }

    &.is-disabled {
      opacity: 1;
      color: var(--s-color-base-content-secondary) !important;

      i {
        color: var(--s-color-base-content-tertiary);
      }
    }
    &:hover:not(.is-active):not(.is-disabled) {
      i {
        color: var(--s-color-base-content-secondary) !important;
      }
    }
    &:active,
    &.is-disabled,
    &.is-active {
      .icon-container {
        box-shadow: var(--s-shadow-element);
      }
    }
    &.is-active {
      i {
        color: var(--s-color-theme-accent) !important;
      }
      span {
        font-weight: 400;
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

  $swap-input-class: ".el-input";
  .s-input--token-value, .s-input-amount {
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
}

.link {
  color: var(--s-color-base-content-primary);
}

// Disabled button large typography
.s-typography-button--large.is-disabled {
  font-size: var(--s-font-size-medium) !important;
}

// Icons colors
.el-tooltip[class*=" s-icon-"],
.el-button.el-tooltip i[class*=" s-icon-"] {
  @include icon-styles(true);
}
i.icon-divider {
  @include icon-styles;
}
</style>

<style lang="scss" scoped>
$header-height: 64px;
$sora-logo-height: 36px;
$sora-logo-width: 173.7px;
$account-control-name-max-width: 200px;

.app {
  &-main {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    height: calc(100vh - #{$header-height});
    position: relative;
  }

  &-sidebar {
    overflow-x: hidden;
    margin-right: $basic-spacing-small;
    width: 70px;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    justify-content: space-between;
    padding-top: $inner-spacing-small;
    padding-bottom: $inner-spacing-medium;
    border-right: none;
  }

  &-body {
    min-width: 464px;
    position: relative;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    &__about {
      .app-content .app-disclaimer {
        min-width: 800px;
        width: 100%;
        max-width: 900px;
        padding: 0 20px;
        margin: 0 auto 120px;
      }
      .app-footer {
        min-width: 800px;
        justify-content: center;
      }
    }
  }

  &-content {
    flex: 1;
    margin: auto;
    .app-disclaimer {
      margin-left: auto;
      margin-bottom: $inner-spacing-big;
      margin-right: auto;
      width: calc(#{$inner-window-width} - #{$basic-spacing-medium * 2});
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
    padding-right: $inner-spacing-large;
    padding-left: $inner-spacing-large;
    padding-bottom: $inner-spacing-large;
  }
}

.header {
  $header-box-shadow: 240px 16px 32px -16px;
  $header-box-shadow-light: #{$header-box-shadow} #e5dce0;
  $header-box-shadow-dark: #{$header-box-shadow} rgba(73, 32, 103, 0.5);
  display: flex;
  align-items: center;
  padding: $inner-spacing-mini $inner-spacing-medium;
  min-height: $header-height;
  box-shadow: $header-box-shadow-light;
  [design-system-theme="dark"] & {
    box-shadow: $header-box-shadow-dark;
  }

  &-container {
    display: flex;
    flex: 1;
    align-items: center;
    position: relative;
  }
}

.menu {
  padding: 0;
  border-right: none;

  & + .menu {
    margin-top: $inner-spacing-small;
  }

  &.s-menu {
    border-bottom: none;

    .el-menu-item {
      margin-right: 0;
      margin-bottom: 0;
      border: none;
      border-radius: 0;
    }
  }
  .menu-link-container {
    display: none;
    .el-menu-item {
      white-space: normal;
    }
  }
  .el-menu-item {
    padding: $inner-spacing-mini $inner-spacing-mini * 2.5;
    height: initial;
    font-size: var(--s-font-size-medium);
    font-weight: 300;
    line-height: var(--s-line-height-medium);

    &.menu-item--small {
      font-size: var(--s-font-size-extra-mini);
      font-weight: 300;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
      padding: 0 13px;
      color: var(--s-color-base-content-secondary);
    }
  }
}

.polkaswap-logo {
  background-image: url('~@/assets/img/pswap.svg');
  background-size: cover;
  width: var(--s-size-medium);
  height: var(--s-size-medium);
  border-radius: 0;
  &.el-button {
    padding: 0;
  }

  &--tablet {
    visibility: hidden;
  }
}

.app-controls {
  &:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }

  &:last-child {
    margin-left: auto;
  }

  & > *:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }

  .el-button {
    + .el-button {
      margin-left: 0;
    }
  }
}

.node-control {
  @include element-size('token-logo', 28px);
  .token-logo {
    display: block;
    margin: auto;
  }
}

.account-control {
  letter-spacing: var(--s-letter-spacing-small);

  &-title {
    font-size: var(--s-font-size-small);
    max-width: $account-control-name-max-width;
    overflow: hidden;
    text-overflow: ellipsis;
    &.name {
      text-transform: none;
    }
  }
  &.s-tertiary {
    &.el-button {
      padding-left: $basic-spacing-mini;
    }
    .account-control-title {
      margin-left: $basic-spacing-mini;
    }
  }
  &-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--s-size-small);
    height: var(--s-size-small);
    overflow: hidden;
    border-radius: 50%;
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

@include large-desktop {
  .app-controls--moonpay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

@include large-mobile {
  $border-image-light: linear-gradient(#FAF4F8, #D5CDD0, #FAF4F8) 30;
  $border-image-dark: linear-gradient(180deg, rgba(36, 2, 65, 0) 0%, rgba(36, 2, 65, 0.5) 50.45%, rgba(36, 2, 65, 0) 100%) 30;

  .app-sidebar {
    overflow-y: auto;
    margin-right: 0;
    width: auto;
    border-right: 1px solid;
    border-image: $border-image-light;
    [design-system-theme="dark"] & {
      border-image: $border-image-dark;
    }
  }
  .menu .menu-link-container {
    display: block;
  }
}

@include tablet {
  .polkaswap-logo {
    margin-bottom: 0;
    width: 172px;
    height: 46px;
    background-image: none;
    &--tablet {
      visibility: visible;
    }
  }
  .app-footer {
    flex-direction: row;
    padding-right: 22px;
    padding-bottom: 20px;
    .app-disclaimer {
      padding-right: $inner-spacing-large;
    }
  }
}

@media screen and (max-width: 460px) {
  .app-body {
    margin-left: -10px;
  }
}
</style>
