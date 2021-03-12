<template>
  <div id="app">
    <header class="header">
      <s-button class="polkaswap-logo" type="link" @click="goTo(PageNames.Exchange)" />

      <div class="app-controls s-flex">
        <branded-tooltip :disabled="accountConnected" placement="bottom">
          <div slot="content" class="app-controls__wallet-tooltip">
            {{ t('connectWalletTextTooltip') }}
          </div>
          <s-button class="wallet" :disabled="loading" @click="goTo(PageNames.Wallet)">
            <div class="account">
              <div class="account-name">{{ accountInfo }}</div>
              <div class="account-icon">
                <s-icon v-if="!accountConnected" name="wallet" size="20" />
                <div v-else class="account-avatar"/>
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
          <s-menu-item
            v-for="item in MainMenu"
            :key="item.title"
            :index="item.title"
            class="menu-item"
          >
            <div class="menu-item__icon-container">
              <s-icon :name="item.icon" size="24" class="menu-item-icon" />
            </div>
            <span>{{ t(`mainMenu.${item.title}`) }}</span>
          </s-menu-item>
        </s-menu>

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
          <s-menu-item-group v-for="(group, index) in FooterMenuGroups" :key="index">
            <s-menu-item
              v-for="item in MainMenu"
              :key="item.title"
              :index="item.title"
              class="menu-item"
            >
              <div class="menu-item__icon-container">
                <s-icon :name="item.icon" size="24" class="menu-item-icon" />
              </div>
              <span>{{ t(`mainMenu.${item.title}`) }}</span>
            </s-menu-item>
          </s-menu-item-group>
        </s-menu>
      </aside>
      <div class="app-body">
        <div class="app-content">
          <router-view :parent-loading="loading" />
        </div>
        <footer class="app-footer">
          <div class="sora-logo">
            <span class="sora-logo__title">Powered by</span>
            <div class="sora-logo__image"></div>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { connection, initWallet, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web'

import { PageNames, MainMenu, FooterMenuGroups, Components } from '@/consts'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

import router, { lazyComponent } from '@/router'
import axios from '@/api'
import { formatAddress, isWalletConnected } from '@/utils'

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet
const WALLET_CONNECTION_ROUTE = WALLET_CONSTS.RouteNames.WalletConnection

@Component({
  components: {
    BrandedTooltip: lazyComponent(Components.BrandedTooltip)
  }
})
export default class App extends Mixins(TransactionMixin, LoadingMixin) {
  readonly MainMenu = MainMenu
  readonly FooterMenuGroups = FooterMenuGroups
  readonly PageNames = PageNames
  readonly exchangePages = [
    PageNames.Swap,
    PageNames.Pool,
    PageNames.AddLiquidity,
    PageNames.AddLiquidityId,
    PageNames.RemoveLiquidity,
    PageNames.CreatePair,
    PageNames.Wallet
  ]

  @Getter firstReadyTransaction!: any
  @Getter account!: any
  @Getter currentRoute!: WALLET_CONSTS.RouteNames
  @Action navigate
  @Action trackActiveTransactions
  @Action('getAccountLiquidity', { namespace: 'pool' }) getAccountLiquidity
  @Action('updateAccountLiquidity', { namespace: 'pool' }) updateAccountLiquidity
  @Action('getAssets', { namespace: 'assets' }) getAssets

  async created () {
    const { data } = await axios.get('/env.json')
    connection.endpoint = data.DEFAULT_NETWORKS?.length ? data.DEFAULT_NETWORKS[0].address : ''
    if (!connection.endpoint) {
      throw new Error('Network is not set')
    }
    await this.withLoading(async () => {
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

  get accountConnected (): boolean {
    return !!this.account.address
  }

  get accountInfo (): string {
    if (!this.accountConnected) {
      return this.t('connectWalletText')
    }
    return this.account.name || formatAddress(this.account.address, 8)
  }

  getCurrentPath (): string {
    if (this.exchangePages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Exchange
    }
    return router.currentRoute.name as string
  }

  goTo (name: PageNames): void {
    if (name === PageNames.Wallet) {
      if (!isWalletConnected()) {
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
    if (name !== PageNames.Exchange) {
      router.push({ name })
      return
    }
    if (name === PageNames.Exchange && router.currentRoute.name !== PageNames.Swap) {
      router.push({ name: PageNames.Swap })
    }
  }

  destroyed (): void {
    connection.close()
  }
}
</script>

<style lang="scss">
@font-face {
  font-family: "SoraB";
  src: url("~@/assets/fonts/Sora-Bold.otf");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "SoraEB";
  src: url("~@/assets/fonts/Sora-ExtraBold.otf");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "SoraSB";
  src: url("~@/assets/fonts/Sora-SemiBold.otf");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "Sora";
  src: url("~@/assets/fonts/Sora-Regular.otf");
  font-weight: normal;
  font-style: normal;
}
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
}

.el-tooltip__popper.info-tooltip {
  padding: $inner-spacing-mini;
  max-width: 320px;
  border: none !important;
  box-shadow: var(--s-shadow-tooltip);
  font-size: var(--s-font-size-small);
  line-height: $s-line-height-medium;
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
      color: var(--s-color-utility-surface);
      text-align: left;
    }
    &__closeBtn {
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
    width: 160px;
    border-right: 1px solid #ECEFF0;
    padding-top: $inner-spacing-small;
    padding-bottom: $inner-spacing-medium;
    overflow-y: auto;
  }

  &-body {
    position: relative;
    overflow: hidden;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
  }

  &-content {
    flex: 1;
    overflow-y: auto;
  }

  &-footer {
    display: flex;
    justify-content: flex-end;
    padding: 40px;
  }
}

.header {
  display: flex;
  align-items: center;
  padding: 2px $inner-spacing-medium;
  min-height: $header-height;
  box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.05), 0px 1px 4px rgba(0, 0, 0, 0.05), 0px 1px 25px rgba(0, 0, 0, 0.1);
}

.menu {
  padding: 0;
  border-right: none;

  &.s-menu {
    border-bottom: none;

    .el-menu-item {
      margin-right: 0;
      margin-bottom: 0;
      border: none;
      border-radius: 0;
    }
  }
  .el-menu-item {
    padding: 16px 20px;
    height: 57px;
    font-size: var(--s-heading6-font-size);
    font-feature-settings: $s-font-feature-settings-title;
    font-weight: 600;

    &.menu-item--small {
      height: 41px;
    }

    &.is-active:hover {
      color: var(--s-color-theme-accent-hover) !important;
    }
    &:hover {
      background-color: var(--s-color-base-background-hover) !important;

      & i {
        color: inherit !important;
      }
    }
    &:focus {
      background-color: transparent !important;
    }
  }

  &-item__icon-container {
    width: 24px;
    margin-right: 12px;
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

    &:hover,
    &:active,
    &:focus {
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
    margin: 0 $inner-spacing-mini;
  }
  &-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
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
    color: var(--s-color-base-content-tertiary);
    font-size: 15px;
    line-height: 16px;
    margin-right: 8px;
  }

  &__image {
    width: 171px;
    height: 40px;
    background-image: url('~@/assets/img/sora-logo.svg');
    background-size: cover;
  }
}

@include tablet {
  .polkaswap-logo {
    width: $logo-width-big;
    background-image: url('~@/assets/img/polkaswap-logo.svg');
  }
}

@media (max-width: 460px) {
  .polkaswap-logo {
    display: none;
  }
}
</style>
