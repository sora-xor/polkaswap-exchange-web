<template>
  <div id="app">
    <header class="header">
      <s-button class="polkaswap-logo" type="link" @click="goTo(PageNames.Swap)" />

      <div class="app-controls s-flex">
        <branded-tooltip :disabled="isLoggedIn" popper-class="info-tooltip wallet-tooltip" placement="bottom">
          <div slot="content" class="app-controls__wallet-tooltip">
            {{ t('connectWalletTextTooltip') }}
          </div>
          <s-button class="wallet" :disabled="loading" @click="goTo(PageNames.Wallet)">
            <div class="account">
              <div class="account-name">{{ accountInfo }}</div>
              <div class="account-icon">
                <s-icon v-if="!isLoggedIn" name="finance-wallet-24" />
                <WalletAvatar v-else :address="account.address"/>
              </div>
            </div>
          </s-button>
        </branded-tooltip>
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
            <li class="menu-link-container">
              <sidebar-item-content
                :title="t('footerMenu.memorandum')"
                :href="t('helpDialog.termsOfServiceLink')"
                tag="a"
                target="_blank"
                rel="nofollow noopener"
                class="el-menu-item menu-item--small"
              />
            </li>
            <li class="menu-link-container">
              <sidebar-item-content
                :title="t('footerMenu.privacy')"
                :href="t('helpDialog.privacyPolicyLink')"
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
          <router-view :parent-loading="loading" />
          <p v-if="!isAboutPage" class="app-disclaimer">{{ t('disclaimer') }}</p>
        </div>
        <footer class="app-footer">
          <p v-if="isAboutPage" class="app-disclaimer">{{ t('disclaimer') }}</p>
          <div class="sora-logo">
            <span class="sora-logo__title">{{ t('poweredBy') }}</span>
            <div class="sora-logo__image"></div>
          </div>
        </footer>
      </div>
    </div>

    <help-dialog :visible.sync="showHelpDialog"></help-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { connection, initWallet, WALLET_CONSTS, WalletAvatar, updateAccountAssetsSubscription } from '@soramitsu/soraneo-wallet-web'

import { PageNames, BridgeChildPages, SidebarMenuGroups, SocialNetworkLinks, FaucetLink, Components } from '@/consts'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

import router, { lazyComponent } from '@/router'
import axios from '@/api'
import { formatAddress } from '@/utils'

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet
const WALLET_CONNECTION_ROUTE = WALLET_CONSTS.RouteNames.WalletConnection

@Component({
  components: {
    WalletAvatar,
    BrandedTooltip: lazyComponent(Components.BrandedTooltip),
    HelpDialog: lazyComponent(Components.HelpDialog),
    SidebarItemContent: lazyComponent(Components.SidebarItemContent)
  }
})
export default class App extends Mixins(TransactionMixin, LoadingMixin) {
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

  @Getter firstReadyTransaction!: any
  @Getter isLoggedIn!: boolean
  @Getter account!: any
  @Getter currentRoute!: WALLET_CONSTS.RouteNames
  @Getter faucetUrl!: string

  @Action navigate // Wallet
  @Action trackActiveTransactions
  @Action setSoraNetwork
  @Action setFaucetUrl
  @Action('getAccountLiquidity', { namespace: 'pool' }) getAccountLiquidity
  @Action('updateAccountLiquidity', { namespace: 'pool' }) updateAccountLiquidity
  @Action('getAssets', { namespace: 'assets' }) getAssets
  @Action('setEthereumSmartContracts', { namespace: 'web3' }) setEthereumSmartContracts
  @Action('setSubNetworks', { namespace: 'web3' }) setSubNetworks

  async created () {
    await this.withLoading(async () => {
      const { data } = await axios.get('/env.json')
      await this.setSoraNetwork(data)
      await this.setSubNetworks(data.SUB_NETWORKS)
      await this.setEthereumSmartContracts(data.BRIDGE)

      if (data.FAUCET_URL) {
        this.setFaucetUrl(data.FAUCET_URL)
      }

      const permissions = {
        sendAssets: true, // enable 'send' button in assets list
        swapAssets: true // enable 'swap' button in assets list
      }
      await initWallet({ permissions })
      await this.getAssets()
      await this.getAccountLiquidity()
    })

    this.trackActiveTransactions()
    this.updateAccountLiquidity()
  }

  @Watch('firstReadyTransaction', { deep: true })
  private handleNotifyAboutTransaction (value): void {
    this.handleChangeTransaction(value)
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

  destroyed (): void {
    if (updateAccountAssetsSubscription) {
      updateAccountAssetsSubscription.unsubscribe()
    }
    connection.close()
  }
}
</script>

<style lang="scss">
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  line-height: $s-line-height-base;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  color: var(--s-color-base-content-primary);
  height: 100vh;
}

.menu.el-menu {
  .el-menu-item-group__title {
    display: none;
  }

  &:not(.el-menu--horizontal) > :not(:last-child) {
    margin-bottom: $inner-spacing-small;
  }

  .menu-link-container .el-menu-item:hover span {
    // TODO: Remove important marks after design redevelopment
    color: var(--s-color-base-on-accent) !important;
  }

  .el-menu-item {
    &.is-disabled {
      opacity: 1;
      color: var(--s-color-base-content-tertiary) !important;

      i {
        color: var(--s-color-base-content-tertiary);
      }
    }
    &:not(.is-disabled):hover i {
      color: inherit;
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
  $swap-input-class: ".el-input";
  .s-input--token-value {
    #{$swap-input-class} {
      #{$swap-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$swap-input-class}__inner {
      height: var(--s-size-small);
      padding-right: 0;
      padding-left: 0;
      border-radius: 0 !important;
      color: var(--s-color-base-content-primary);
      font-size: $s-font-size-input;
      line-height: $s-line-height-small;
      &, &:hover, &:focus {
        background-color: var(--s-color-base-background);
        border-color: var(--s-color-base-background);
      }
      &:disabled {
        color: var(--s-color-base-content-tertiary);
      }
      &:not(:disabled) {
        &:hover, &:focus {
          color: var(--s-color-base-content-primary);
        }
      }
    }
    .s-placeholder {
      display: none;
    }
  }
  .el-button {
    // TODO: Check all icons settings after fix in UI Lib
    &--choose-token,
    &--empty-token {
      > span {
        display: inline-flex;
        align-items: center;
        > i[class^=s-icon-] {
          font-size: $s-font-size-input;
        }
      }
    }
    &.el-button--empty-token {
      > span {
        > i[class^=s-icon-] {
          margin-left: $inner-spacing-mini / 2;
        }
      }
    }
    &--choose-token {
      font-feature-settings: $s-font-feature-settings-title;
      > span {
        > i[class^=s-icon-] {
          margin-left: $inner-spacing-mini;
        }
      }
    }
  }
}
.container {
  @include container-styles;
  .el-loading-mask {
    border-radius: var(--s-border-radius-medium);
  }
}
</style>

<style lang="scss" scoped>
$logo-width: 40px;
$logo-width-big: 150px;
$logo-horizontal-margin: $inner-spacing-mini / 2;
$header-height: 64px;
$sidebar-witdh: 160px;
$sora-logo-height: 36px;
$sora-logo-width: 173.7px;
$account-name-margin: -2px 8px 0 12px;
$menu-horizontal-padding: $inner-spacing-mini * 1.25;

// TODO: Move disclaimer's variables to appropriate place after design redevelopment
$disclaimer-font-size: 11px;
$disclaimer-font-weight: 200;
$disclaimer-letter-spacing: -0.03em;

.app {
  &-main {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    height: calc(100vh - #{$header-height});
    position: relative;
  }

  &-sidebar {
    display: flex;
    flex-flow: column nowrap;
    justify-content: space-between;
    width: $sidebar-witdh;
    border-right: 1px solid var(--s-color-base-border-secondary);
    padding-top: $inner-spacing-small;
    padding-bottom: $inner-spacing-medium;
    overflow-y: auto;
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
    .app-disclaimer {
      margin-left: auto;
      margin-bottom: $inner-spacing-big;
      margin-right: auto;
      width: calc(#{$inner-window-width} - #{$inner-spacing-medium * 2});
      text-align: justify;
    }
  }

  &-disclaimer {
    margin-top: $inner-spacing-mini * 2.5;
    font-size: $disclaimer-font-size;
    font-weight: $disclaimer-font-weight;
    line-height: var(--s-line-height-mini);
    letter-spacing: $disclaimer-letter-spacing;
    color: var(--s-color-base-content-secondary);
  }

  &-footer {
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-end;
    padding-right: $inner-spacing-mini * 5;
    padding-left: $inner-spacing-mini * 5;
    padding-bottom: $inner-spacing-mini * 5;
  }
}

.header {
  display: flex;
  align-items: center;
  padding: 2px $inner-spacing-medium;
  min-height: $header-height;
  box-shadow: none;
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
    .el-menu-item {
      white-space: initial;
    }
    + .menu-link-container {
      position: relative;
      margin-top: $inner-spacing-mini;
      &:before {
        position: absolute;
        left: $menu-horizontal-padding;
        top: -$inner-spacing-mini / 2;
        content: '';
        display: block;
        height: 1px;
        width: calc(100% - #{$menu-horizontal-padding} * 2);
        background-color: var(--s-color-theme-secondary);
      }
    }
  }
  .el-menu-item {
    padding: $inner-spacing-medium #{$menu-horizontal-padding};
    height: initial;
    font-size: var(--s-heading6-font-size);
    font-feature-settings: $s-font-feature-settings-title;
    font-weight: 600;
    line-height: $s-line-height-big;
    &.menu-item--small {
      padding: $inner-spacing-mini #{$menu-horizontal-padding};
      color: var(--s-color-base-content-tertiary);
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
  padding: 0;
  border-radius: 0;
}

.app-controls {
  margin-left: auto;

  .wallet-section {
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-size-small);
    background: var(--s-color-base-background);
    align-items: center;
  }

  .wallet {
    padding: $inner-spacing-mini / 2;
    background-color: var(--s-color-base-background);
    border-color: var(--s-color-base-background);

    &:hover, &.focusing, &.s-pressed {
      color: inherit;
      background-color: var(--s-color-base-background-hover);
      border-color: var(--s-color-base-background-hover);
    }
  }

  &__wallet-tooltip {
    max-width: 181px;
  }

  .el-button + .el-button {
    margin-left: $inner-spacing-mini;
  }
}

.account {
  display: flex;
  align-items: center;

  &-name {
    font-size: var(--s-font-size-small);
    font-feature-settings: $s-font-feature-settings-common;
    color: var(--s-color-base-content-primary);
    margin: $account-name-margin;
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

  &-avatar {
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16C32 24.8366 24.8366 32 16 32C7.16344 32 0 24.8366 0 16Z' fill='white'/%3E%3Cellipse cx='16.0001' cy='4.79999' rx='2.4' ry='2.4' fill='%2331DF57'/%3E%3Ccircle cx='11.2' cy='7.19999' r='2.4' fill='%239A1892'/%3E%3Cellipse cx='20.7999' cy='7.19999' rx='2.4' ry='2.4' fill='%2331DF57'/%3E%3Cellipse cx='16.0001' cy='10.4' rx='2.4' ry='2.4' fill='%230A2342'/%3E%3Cellipse cx='25.6' cy='10.4' rx='2.4' ry='2.4' fill='%232D4DDC'/%3E%3Ccircle cx='6.4' cy='10.4' r='2.4' fill='%232D4DDC'/%3E%3Ccircle cx='11.2' cy='12.8' r='2.4' fill='%23EB90EB'/%3E%3Cellipse cx='20.7999' cy='12.8' rx='2.4' ry='2.4' fill='%23EB90EB'/%3E%3Ccircle cx='16.0001' cy='21.6' r='2.4' fill='%23EB90EB'/%3E%3Ccircle cx='25.6' cy='21.6' r='2.4' fill='%2331DF57'/%3E%3Cellipse cx='6.4' cy='21.6' rx='2.4' ry='2.4' fill='%2331DF57'/%3E%3Cellipse cx='11.2' cy='24' rx='2.4' ry='2.4' fill='%239A1892'/%3E%3Cellipse cx='20.7999' cy='24' rx='2.4' ry='2.4' fill='%2331DF57'/%3E%3Cellipse cx='16.0001' cy='27.2' rx='2.4' ry='2.4' fill='%232D4DDC'/%3E%3Ccircle cx='16.0001' cy='16' r='2.4' fill='%23433F10'/%3E%3Ccircle cx='25.6' cy='16' r='2.4' fill='%239A1892'/%3E%3Cellipse cx='6.4' cy='16' rx='2.4' ry='2.4' fill='%2331DF57'/%3E%3Cellipse cx='11.2' cy='18.4' rx='2.4' ry='2.4' fill='%230A2342'/%3E%3Cellipse cx='20.7999' cy='18.4' rx='2.4' ry='2.4' fill='%230A2342'/%3E%3Cpath d='M16 31C7.71573 31 1 24.2843 1 16H-1C-1 25.3888 6.61116 33 16 33V31ZM31 16C31 24.2843 24.2843 31 16 31V33C25.3888 33 33 25.3888 33 16H31ZM16 1C24.2843 1 31 7.71573 31 16H33C33 6.61116 25.3888 -1 16 -1V1ZM16 -1C6.61116 -1 -1 6.61116 -1 16H1C1 7.71573 7.71573 1 16 1V-1Z' fill='%23DDE0E1'/%3E%3C/svg%3E")
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
    font-feature-settings: var(--s-font-feature-settings-singleline);
    white-space: nowrap;
  }

  &__image {
    width: $sora-logo-width;
    height: $sora-logo-height;
    background-image: url('~@/assets/img/sora-logo.svg');
    background-size: cover;
  }
}

@include tablet {
  .polkaswap-logo {
    width: $logo-width-big;
    background-image: url('~@/assets/img/polkaswap-logo.svg');
  }
  .app-footer {
    flex-direction: row;
    .app-disclaimer {
      padding-right: $inner-spacing-mini * 5;
    }
  }
}

@media (max-width: 460px) {
  .polkaswap-logo {
    display: none;
  }
}
</style>
