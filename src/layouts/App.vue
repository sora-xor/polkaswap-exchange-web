<template>
  <s-design-system-provider :value="libraryDesignSystem" class="app">
    <app-header :loading="loading" @toggle-menu="toggleMenu" />
    <div class="app-main">
      <app-menu @click.native="handleAppMenuClick" :visible="menuVisibility" :on-select="goTo">
        <app-logo-button slot="head" class="app-logo--menu" :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
      </app-menu>
      <div class="app-body" :class="{ 'app-body__about': isAboutPage }">
        <s-scrollbar class="app-body-scrollbar">
          <div v-if="blockNumber" class="block-number">
            <s-tooltip :content="t('blockNumberText')" placement="bottom">
              <a class="block-number-link" :href="soraExplorerLink" target="_blank" rel="nofollow noopener">
                <span class="block-number-icon"></span><span>{{ blockNumberFormatted }}</span>
              </a>
            </s-tooltip>
          </div>
          <div class="app-content">
            <router-view :parent-loading="loading || !nodeIsConnected" />
            <p class="app-disclaimer" v-html="t('disclaimer')" />
          </div>
          <footer class="app-footer">
            <app-powered-by-sora :theme="libraryTheme" />
          </footer>
        </s-scrollbar>
      </div>
    </div>
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { FPNumber, History, connection } from '@sora-substrate/util';
import { mixins, getExplorerLinks, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem';

import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import AppUpdateMixin from '@/components/mixins/AppUpdateMixin';

import { PageNames, Components, Language } from '@/consts';
import axiosInstance from '@/api';
import { goTo, lazyComponent } from '@/router';
import { getLocale } from '@/lang';
import type { ConnectToNodeOptions } from '@/types/nodes';
import type { SubNetwork } from '@/utils/ethers-util';

@Component({
  components: {
    AppHeader: lazyComponent(Components.AppHeader),
    AppMenu: lazyComponent(Components.AppMenu),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    AppPoweredBySora: lazyComponent(Components.AppPoweredBySora),
  },
})
export default class AppLayout extends Mixins(mixins.TransactionMixin, NodeErrorMixin, AppUpdateMixin) {
  readonly PageNames = PageNames;
  readonly PoolChildPages = [PageNames.AddLiquidity, PageNames.RemoveLiquidity, PageNames.CreatePair];

  menuVisibility = false;

  @Getter soraNetwork!: WALLET_CONSTS.SoraNetwork;
  @Getter libraryTheme!: Theme;
  @Getter libraryDesignSystem!: DesignSystem;
  @Getter firstReadyTransaction!: History;
  @Getter blockNumber!: number;

  // Wallet
  @Action resetAccountAssetsSubscription!: AsyncVoidFn;
  @Action trackActiveTransactions!: AsyncVoidFn;
  @Action resetActiveTransactions!: AsyncVoidFn;
  @Action resetRuntimeVersionSubscription!: AsyncVoidFn;
  @Action resetFiatPriceAndApySubscription!: AsyncVoidFn;

  @Action updateAccountAssets!: AsyncVoidFn;
  @Action setSoraNetwork!: (networkType: string) => Promise<void>; // wallet
  @Action setDefaultNodes!: (nodes: any) => Promise<void>;
  @Action setNetworkChainGenesisHash!: (hash: string) => Promise<void>;
  @Action connectToNode!: (options: ConnectToNodeOptions) => Promise<void>;
  @Action setFaucetUrl!: (url: string) => Promise<void>;
  @Action setLanguage!: (lang: Language) => Promise<void>;
  @Action setApiKeys!: (options: any) => Promise<void>;
  @Action setFeatureFlags!: (options: any) => Promise<void>;
  @Action setBlockNumber!: () => Promise<void>;
  @Action resetBlockNumberSubscription!: () => Promise<void>;
  @Action('unsubscribeAccountMarketMakerInfo', { namespace: 'rewards' }) unsubscribeMarketMakerInfo!: AsyncVoidFn;
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
    await this.setLanguage(getLocale() as any);

    await this.withLoading(async () => {
      const { data } = await axiosInstance.get('/env.json');

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set');
      }

      await this.setApiKeys(data?.API_KEYS);
      await this.setFeatureFlags(data?.FEATURE_FLAGS);
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

  get isAboutPage(): boolean {
    return this.$route.name === PageNames.About;
  }

  get blockNumberFormatted(): string {
    return new FPNumber(this.blockNumber).toLocaleString();
  }

  get soraExplorerLink(): string {
    return getExplorerLinks(this.soraNetwork)[0].value;
  }

  goTo(name: PageNames): void {
    goTo(name);
    this.closeMenu();
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

  async beforeDestroy(): Promise<void> {
    await this.resetFiatPriceAndApySubscription();
    await this.resetActiveTransactions();
    await this.resetAccountAssetsSubscription();
    await this.resetRuntimeVersionSubscription();
    await this.resetBlockNumberSubscription();
    await this.unsubscribeMarketMakerInfo();
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

  &-body-scrollbar {
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

.block-number {
  display: none;

  &-link {
    display: flex;
    align-items: center;
    color: var(--s-color-status-success);
    font-size: var(--s-font-size-extra-mini);
    text-decoration: none;
    font-weight: 300;
    position: absolute;
    top: 10px;
    right: 24px;
    line-height: 150%;
  }
  &-icon {
    $block-icon-size: 7px;
    background-color: var(--s-color-status-success);
    border-radius: 50%;
    height: $block-icon-size;
    width: $block-icon-size;
    margin-right: 2px;
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

  .link {
    color: inherit;
    cursor: pointer;
    text-decoration: underline;
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
    overflow: hidden;
    height: calc(100vh - #{$header-height});
    position: relative;
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

.app-logo--menu {
  margin-bottom: $inner-spacing-big;

  @include large-mobile {
    display: none;
  }
}

@include tablet {
  .app-footer {
    flex-direction: row;
    .app-disclaimer {
      padding-right: $inner-spacing-large;
    }
  }

  .block-number {
    display: block;
  }
}
</style>
