<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app">
    <header class="header">
      <s-button class="polkaswap-logo" type="link" @click="goTo(PageNames.Swap)" />
      <div class="app-controls s-flex">
        <s-button type="tertiary" alternative size="medium" class="node-control" :tooltip="t('selectNodeText')" @click="openSelectNodeDialog">
          <div class="node-control__text">
            <div class="node-control-title">{{ node.name }}</div>
            <div class="node-control-network">{{ chainAndNetworkText }}</div>
          </div>
          <token-logo class="node-control__logo" v-bind="nodeLogo" />
        </s-button>
        <s-button :type="isLoggedIn ? 'tertiary' : 'secondary'" class="account-control" alternative size="medium" :tooltip="t('connectWalletTextTooltip')" :disabled="loading" @click="goTo(PageNames.Wallet)">
          <div class="account-control-title">{{ accountInfo }}</div>
          <div class="account-control-icon">
            <s-icon v-if="!isLoggedIn" name="finance-wallet-24" size="28" />
            <WalletAvatar v-else :address="account.address"/>
          </div>
        </s-button>
      </div>
    </header>
    <div class="app-main">
      <aside class="app-sidebar">
        <s-menu
          class="menu"
          mode="vertical"
          background-color="transparent"
          box-shadow="none"
          text-color="var(--s-color-base-content-primary)"
          active-text-color="var(--s-color-theme-accent)"
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
      <div class="app-body">
        <div class="app-content">
          <router-view :parent-loading="loading || !nodeIsConnected" />
          <p class="app-disclaimer" :class="isAboutPage ? 'about-disclaimer' : ''" v-html="t('disclaimer')" />
        </div>
        <footer class="app-footer" :class="isAboutPage ? 'about-footer' : ''">
          <div class="sora-logo">
            <span class="sora-logo__title">{{ t('poweredBy') }}</span>
            <a class="sora-logo__image" href="https://sora.org" title="Sora" target="_blank" rel="nofollow noopener" />
          </div>
        </footer>
      </div>
    </div>

    <help-dialog :visible.sync="showHelpDialog" />
    <select-node-dialog :visible.sync="showSelectNodeDialog" />
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { WALLET_CONSTS, WalletAvatar, updateAccountAssetsSubscription } from '@soramitsu/soraneo-wallet-web'
import { KnownSymbols, FPNumber } from '@sora-substrate/util'

import { PageNames, BridgeChildPages, SidebarMenuGroups, SocialNetworkLinks, FaucetLink, Components, LogoSize } from '@/consts'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin'

import axios, { updateBaseUrl } from '@/api'
import router, { lazyComponent } from '@/router'
import { formatAddress, disconnectWallet } from '@/utils'
import { ConnectToNodeOptions } from '@/types/nodes'

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet
const WALLET_CONNECTION_ROUTE = WALLET_CONSTS.RouteNames.WalletConnection

@Component({
  components: {
    WalletAvatar,
    HelpDialog: lazyComponent(Components.HelpDialog),
    SidebarItemContent: lazyComponent(Components.SidebarItemContent),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class App extends Mixins(TransactionMixin, NodeErrorMixin) {
  readonly nodesFeatureEnabled = true

  readonly SidebarMenuGroups = SidebarMenuGroups
  readonly SocialNetworkLinks = SocialNetworkLinks
  readonly FaucetLink = FaucetLink
  readonly PageNames = PageNames

  readonly PoolChildPages = [
    PageNames.AddLiquidity,
    PageNames.AddLiquidityId,
    PageNames.RemoveLiquidity,
    PageNames.CreatePair
  ]

  showHelpDialog = false

  @State(state => state.settings.faucetUrl) faucetUrl!: string
  @State(state => state.settings.selectNodeDialogVisibility) selectNodeDialogVisibility!: boolean

  @Getter libraryDesignSystem!: string
  @Getter firstReadyTransaction!: any
  @Getter isLoggedIn!: boolean
  @Getter account!: any
  @Getter currentRoute!: WALLET_CONSTS.RouteNames
  @Getter chainAndNetworkText!: string
  @Getter nodeIsConnected!: boolean

  @Action navigate // Wallet
  @Action updateAccountAssets!: () => Promise<void>
  @Action trackActiveTransactions!: () => Promise<void>
  @Action setSoraNetwork!: (data: any) => () => Promise<void>
  @Action setDefaultNodes!: (nodes: any) => () => Promise<void>
  @Action connectToNode!: (options: ConnectToNodeOptions) => () => Promise<void>
  @Action setFaucetUrl!: (url: string) => void
  @Action('setEvmSmartContracts', { namespace: 'web3' }) setEvmSmartContracts
  @Action('setSubNetworks', { namespace: 'web3' }) setSubNetworks
  @Action('setSmartContracts', { namespace: 'web3' }) setSmartContracts

  @Watch('firstReadyTransaction', { deep: true })
  private handleNotifyAboutTransaction (value): void {
    this.handleChangeTransaction(value)
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions (nodeConnected: boolean) {
    if (nodeConnected) {
      this.updateAccountAssets()
    } else {
      if (updateAccountAssetsSubscription) {
        updateAccountAssetsSubscription.unsubscribe()
      }
    }
  }

  async created () {
    updateBaseUrl(router)

    const localeLanguage = navigator.language
    const thousandSymbol = Number(1000).toLocaleString(localeLanguage).substring(1, 2)
    if (thousandSymbol !== '0') {
      FPNumber.DELIMITERS_CONFIG.thousand = Number(1234).toLocaleString(localeLanguage).substring(1, 2)
    }
    FPNumber.DELIMITERS_CONFIG.decimal = Number(1.2).toLocaleString(localeLanguage).substring(1, 2)

    await this.withLoading(async () => {
      const { data } = await axios.get('/env.json')

      await this.setSoraNetwork(data)
      await this.setDefaultNodes(data?.DEFAULT_NETWORKS)
      await this.setSubNetworks(data.SUB_NETWORKS)
      await this.setSmartContracts(data.SUB_NETWORKS)

      if (data.FAUCET_URL) {
        this.setFaucetUrl(data.FAUCET_URL)
      }

      // connection to node
      await this.runAppConnectionToNode()
    })

    this.trackActiveTransactions()
  }

  get showSelectNodeDialog (): boolean {
    return this.selectNodeDialogVisibility
  }

  set showSelectNodeDialog (flag: boolean) {
    this.setSelectNodeDialogVisibility(flag)
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

  get accountInfo (): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText')
    }
    return this.account.name || formatAddress(this.account.address, 8)
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

  destroyed (): void {
    disconnectWallet()
  }

  private async runAppConnectionToNode () {
    try {
      await this.connectToNode({
        onError: this.handleNodeError,
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
  color: var(--s-color-base-content-primary);
  height: 100vh;
}

.node-control {
  &.el-button.neumorphic.el-button--plain {
    padding-left: 5px;
    box-shadow: var(--s-shadow-element);
  }
  > span {
   flex-direction: row-reverse;
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
  .link {
    color: var(--s-color-base-content-primary);
  }
}

// Disabled button large typography
.s-typography-button--large.is-disabled {
  font-size: var(--s-font-size-medium) !important;
}
</style>

<style lang="scss" scoped>
$logo-horizontal-margin: $inner-spacing-mini / 2;
$header-height: 64px;
$sidebar-width: 160px;
$sora-logo-height: 36px;
$sora-logo-width: 173.7px;

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
    flex-flow: column nowrap;
    justify-content: space-between;
    padding-top: $inner-spacing-small;
    padding-bottom: $inner-spacing-medium;
    border-right: none;
  }

  &-body {
    position: relative;
    overflow-y: auto;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
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
  display: flex;
  align-items: center;
  padding: 2px $inner-spacing-medium;
  min-height: $header-height;
  box-shadow: 240px 16px 32px -16px #e5dce0;
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
      white-space: initial;
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
    &:hover:not(.is-active):not(.is-disabled) {
      background-color: var(--s-color-base-background-hover) !important;
    }
    &:focus {
      background-color: transparent !important;
    }
  }
}

.polkaswap-logo {
  margin-right: $logo-horizontal-margin;
  margin-left: $logo-horizontal-margin;
  margin-bottom: 1.5px;
  background-image: url('~@/assets/img/pswap.svg');
  background-size: cover;
  width: var(--s-size-medium);
  height: var(--s-size-medium);
  border-radius: 0;
  &.el-button {
    padding: 0;
  }
}

.app-controls {
  margin-left: auto;

  & > *:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }

  .el-button {
    + .el-button {
      margin-left: 0;
    }
    &.s-tertiary {
      color: var(--s-color-base-content-secondary);
      &:hover, &:focus, &:active, &.focusing, &.s-pressed {
        color: var(--s-color-base-content-primary);
      }
    }
  }
}

.account-control {
  &-title {
    font-size: var(--s-font-size-small);
  }
  &.s-secondary {
    &.el-button.s-alternative {
      padding-right: $inner-spacing-medium;
      padding-left: $inner-spacing-small;
    }
    .account-control-title {
      margin-left: $inner-spacing-small / 2;
      font-weight: 800;
      letter-spacing: var(--s-letter-spacing-small);
    }
  }
  &.s-tertiary {
    &.el-button {
      padding-left: $basic-spacing-mini;
    }
    text-transform: none;
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

  &:hover, &:focus, &:active, &.focusing, &.s-pressed {
    .account-control-icon i {
      color: var(--s-color-base-on-accent) !important;
    }
  }
}

.node-control {
  &__text {
    padding-left: calc(var(--s-basic-spacing) / 2);
    text-align: left;
    font-size: var(--s-font-size-extra-small);
    text-transform: none;
  }
  &-title {
    font-weight: 700;
  }
  @include element-size('token-logo', 26px);
}

.node-control,
.account-control {
  letter-spacing: var(--s-letter-spacing-small);
}

.node-control-network,
.account-control-network {
  font-weight: 600;
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
    background-image: url('~@/assets/img/sora-logo.svg');
    background-size: cover;
  }
}

@include large-mobile {
  .app-sidebar {
    overflow-y: auto;
    margin-right: 0;
    width: $sidebar-width;
    border-right: 1px solid #e5dce0 !important;
    border-image: linear-gradient(#FAF4F8, #D5CDD0, #FAF4F8) 30;
  }
  .menu .menu-link-container {
    display: block;
  }
}

@include tablet {
  .polkaswap-logo {
    margin-top: $basic-spacing-small;
    margin-bottom: 0;
    width: 165px;
    height: 44px;
    background-image: url('~@/assets/img/polkaswap-logo.svg');
  }
  .app-footer {
    flex-direction: row;
    .app-disclaimer {
      padding-right: $inner-spacing-large;
    }
  }
}
</style>
