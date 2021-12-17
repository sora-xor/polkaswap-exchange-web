<template>
  <s-design-system-provider :value="libraryDesignSystem" id="app" class="app">
    <app-header :loading="loading" @toggle-menu="toggleMenu" />
    <div class="app-main">
      <app-menu @click.native="handleAppMenuClick" :visible="menuVisibility" :on-select="goTo">
        <app-logo-button slot="head" class="app-logo--menu" :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
      </app-menu>
      <div class="app-body" :class="isAboutPage ? 'app-body__about' : ''">
        <s-scrollbar class="app-body-scrollbar">
          <div v-if="blockNumber" class="block-number">
            <a
              class="block-number-link"
              :href="soraExplorerLink"
              title="SORAScan"
              target="_blank"
              rel="nofollow noopener"
            >
              <span class="block-number-icon"></span><span>{{ blockNumberFormatted }}</span>
            </a>
          </div>
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
    <referrals-confirm-invite-user :visible.sync="showConfirmInviteUser" @confirm="confirmInviteUser" />
  </s-design-system-provider>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { FPNumber, History, connection } from '@sora-substrate/util';
import { mixins, getExplorerLinks, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type DesignSystem from '@soramitsu/soramitsu-js-ui/lib/types/DesignSystem';

import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import SoraLogo from '@/components/logo/Sora.vue';

import { PageNames, Components, Language } from '@/consts';
import axiosInstance, { updateBaseUrl } from '@/api';
import router, { goTo, lazyComponent } from '@/router';
import { preloadFontFace } from '@/utils';
import { getLocale } from '@/lang';
import type { ConnectToNodeOptions } from '@/types/nodes';
import type { SubNetwork } from '@/utils/ethers-util';

@Component({
  components: {
    SoraLogo,
    AppHeader: lazyComponent(Components.AppHeader),
    AppMenu: lazyComponent(Components.AppMenu),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    ReferralsConfirmInviteUser: lazyComponent(Components.ReferralsConfirmInviteUser),
  },
})
export default class App extends Mixins(mixins.TransactionMixin, NodeErrorMixin) {
  readonly PageNames = PageNames;
  readonly PoolChildPages = [PageNames.AddLiquidity, PageNames.RemoveLiquidity, PageNames.CreatePair];

  menuVisibility = false;
  showConfirmInviteUser = false;

  @Getter soraNetwork!: WALLET_CONSTS.SoraNetwork;
  @Getter libraryTheme!: Theme;
  @Getter libraryDesignSystem!: DesignSystem;
  @Getter firstReadyTransaction!: History;
  @Getter blockNumber!: number;
  @Getter storageReferral!: string;
  @Getter('isLoggedIn') isSoraAccountConnected!: boolean;
  @Getter('referral', { namespace: 'referrals' }) referral!: string;

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
  @Action resetBlockNumberSubscription!: () => Promise<void>;
  @Action setReferral!: (value: string) => Promise<void>;
  @Action('setSubNetworks', { namespace: 'web3' }) setSubNetworks!: (data: Array<SubNetwork>) => Promise<void>;
  @Action('setSmartContracts', { namespace: 'web3' }) setSmartContracts!: (data: Array<SubNetwork>) => Promise<void>;
  @Action('getReferral', { namespace: 'referrals' }) getReferral!: (invitedUserId: string) => Promise<void>;
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

      if (this.isSoraAccountConnected) {
        await this.getReferral(this.account.address);
        if (this.referral || this.referral === this.account.address) {
          this.setReferral('');
        } else {
          this.handleConfirmInviteUser();
        }
      }
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

  handleConfirmInviteUser(): void {
    this.showConfirmInviteUser = true;
  }

  async confirmInviteUser(isInviteUserConfirmed: boolean): Promise<void> {
    if (isInviteUserConfirmed) {
      this.setReferral('');
    }
  }

  async beforeDestroy(): Promise<void> {
    await this.resetFiatPriceAndApySubscription();
    await this.resetActiveTransactions();
    await this.resetAccountAssetsSubscription();
    await this.resetRuntimeVersionSubscription();
    await this.resetBlockNumberSubscription();
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
    font-size: var(--s-font-size-small);
    text-decoration: none;
    font-weight: 300;
    position: absolute;
    top: 2.5%;
    right: 0;
    line-height: 150%;
    width: 100px;
  }

  &-icon {
    background-color: var(--s-color-status-success);
    border-radius: 50%;
    height: 9px;
    width: 9px;
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

  .block-number {
    display: block;
  }
}
</style>
