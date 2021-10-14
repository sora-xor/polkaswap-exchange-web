<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app">
    <app-header :loading="loading" @toggle-menu="toggleMenu" />
    <div class="app-main">
      <s-scrollbar
        :class="['app-menu', 'app-sidebar-scrollbar', { visible: menuVisibility }]"
        @click.native="handleAppMenuClick"
      >
        <aside class="app-sidebar">
          <s-button class="polkaswap-logo" type="link" size="large" @click="goTo(PageNames.Swap)">
            <polkaswap-logo :theme="libraryTheme" class="polkaswap-logo__image" />
          </s-button>
          <div class="app-sidebar-menu">
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
          </div>
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

    <!-- <help-dialog :visible.sync="showHelpDialog" /> -->
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { History, connection } from '@sora-substrate/util';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem';

import TransactionMixin from '@/components/mixins/TransactionMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import PolkaswapLogo from '@/components/logo/Polkaswap.vue';
import SoraLogo from '@/components/logo/Sora.vue';

import {
  PageNames,
  BridgeChildPages,
  SidebarMenuGroups,
  SocialNetworkLinks,
  FaucetLink,
  Components,
  Language,
} from '@/consts';
import axiosInstance, { updateBaseUrl } from '@/api';
import router, { goTo, lazyComponent } from '@/router';
import { preloadFontFace } from '@/utils';
import { getLocale } from '@/lang';
import type { ConnectToNodeOptions } from '@/types/nodes';
import type { SubNetwork } from '@/utils/ethers-util';

@Component({
  components: {
    PolkaswapLogo,
    SoraLogo,
    AppHeader: lazyComponent(Components.AppHeader),
    SidebarItemContent: lazyComponent(Components.SidebarItemContent),
    // HelpDialog: lazyComponent(Components.HelpDialog),
  },
})
export default class App extends Mixins(TransactionMixin, NodeErrorMixin) {
  readonly SidebarMenuGroups = SidebarMenuGroups;
  readonly SocialNetworkLinks = SocialNetworkLinks;
  readonly FaucetLink = FaucetLink;
  readonly PageNames = PageNames;

  readonly PoolChildPages = [PageNames.AddLiquidity, PageNames.RemoveLiquidity, PageNames.CreatePair];

  menuVisibility = false;
  // showHelpDialog = false;

  @State((state) => state.settings.faucetUrl) faucetUrl!: string;
  @State((state) => state.settings.selectNodeDialogVisibility) selectNodeDialogVisibility!: boolean;

  @Getter libraryTheme!: Theme;
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
  @Action('setSubNetworks', { namespace: 'web3' }) setSubNetworks!: (data: Array<SubNetwork>) => Promise<void>;
  @Action('setSmartContracts', { namespace: 'web3' }) setSmartContracts!: (data: Array<SubNetwork>) => Promise<void>;

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

    await this.setLanguage(getLocale() as any);

    await this.withLoading(async () => {
      const { data } = await axiosInstance.get('/env.json');

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set');
      }

      await this.setSoraNetwork(data.NETWORK_TYPE);
      await this.setDefaultNodes(data?.DEFAULT_NETWORKS);
      await this.setSubNetworks(data.SUB_NETWORKS);
      await this.setSmartContracts(data.SUB_NETWORKS);

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

  get mainMenuActiveColor(): string {
    return this.libraryTheme === Theme.LIGHT ? 'var(--s-color-theme-accent)' : 'var(--s-color-theme-accent-focused)';
  }

  get isAboutPage(): boolean {
    return this.$route.name === PageNames.About;
  }

  goTo(name: PageNames): void {
    goTo(name);
    this.menuVisibility = false;
  }

  getCurrentPath(): string {
    if (this.PoolChildPages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Pool;
    }
    if (BridgeChildPages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Bridge;
    }
    return router.currentRoute.name as string;
  }

  toggleMenu(): void {
    this.menuVisibility = !this.menuVisibility;
  }

  closeMenu(): void {
    this.menuVisibility = false;
  }

  handleAppMenuClick(e: Event): void {
    const target = e.target as any;
    const sidebar = !!target.closest('.app-sidebar');

    if (!sidebar) {
      this.closeMenu();
    }
  }

  // openHelpDialog(): void {
  //   this.showHelpDialog = true;
  // }

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

.app {
  &-body-scrollbar,
  &-sidebar-scrollbar {
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
  .link {
    color: var(--s-color-base-content-primary);
  }
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
$sora-logo-height: 36px;
$sora-logo-width: 173.7px;

@include polkaswap-logo;

.app {
  &-main {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    height: calc(100vh - #{$header-height});
    position: relative;
  }

  &-menu {
    visibility: hidden;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 3;

    @include mobile {
      position: fixed;

      &.visible {
        visibility: visible;
        background-color: rgba(42, 23, 31, 0.1);
        backdrop-filter: blur(4px);

        .app-sidebar {
          transform: translateX(0);
          transition-duration: 0.2s;
        }
      }

      .app-sidebar {
        width: 50%;
        min-width: $breakpoint_mobile / 2;
        background-color: var(--s-color-utility-body);
        padding: $inner-spacing-mini $inner-spacing-medium;
        filter: drop-shadow(32px 0px 64px rgba(0, 0, 0, 0.1));
        transform: translateX(-100%);
      }
    }

    @include large-mobile {
      visibility: visible;
      position: relative;

      .app-sidebar {
        max-width: initial;
      }
    }

    @include tablet {
      position: absolute;
      right: initial;
    }
  }

  &-sidebar {
    overflow-x: hidden;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    padding-top: $inner-spacing-small;
    padding-bottom: $inner-spacing-medium;
    border-right: none;

    &-menu {
      display: flex;
      flex: 1;
      flex-flow: column nowrap;
      justify-content: space-between;
    }

    .polkaswap-logo.el-button {
      width: 172px;
      height: 46px;
      margin-bottom: $inner-spacing-big;

      @include large-mobile {
        display: none;
      }
    }
  }

  &-body {
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
      margin-left: $basic-spacing-medium;
      margin-bottom: $inner-spacing-big;
      margin-right: $basic-spacing-medium;
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

    @include mobile {
      display: block;
    }

    .el-menu-item {
      white-space: normal;
    }
  }
  .el-menu-item {
    padding-top: $inner-spacing-mini;
    padding-bottom: $inner-spacing-mini;
    padding-left: 0 !important;
    padding-right: 0;
    height: initial;
    font-size: var(--s-font-size-medium);
    font-weight: 300;
    line-height: var(--s-line-height-medium);

    @include large-mobile {
      padding-left: $inner-spacing-mini !important;
      padding-right: $inner-spacing-mini;
    }

    @include tablet {
      padding-left: $inner-spacing-mini * 2.5 !important;
      padding-right: $inner-spacing-mini * 2.5;
    }

    &.menu-item--small {
      font-size: var(--s-font-size-extra-mini);
      font-weight: 300;
      padding: 0;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
      color: var(--s-color-base-content-secondary);

      @include large-mobile {
        padding: 0 10px;
      }
      @include tablet {
        padding: 0 13px;
      }
    }
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

@include tablet {
  .app-footer {
    flex-direction: row;
    .app-disclaimer {
      padding-right: $inner-spacing-large;
    }
  }
}
</style>
