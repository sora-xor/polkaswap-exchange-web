<template>
  <div class="app-status s-flex">
    <a v-if="blockNumber" class="block-number s-flex" :href="blockExplorerLink" target="_blank" rel="nofollow noopener">
      <span class="block-number-icon" /><span>{{ blockNumberFormatted }}</span>
    </a>
    <footer-popper
      icon="globe-16"
      panel-class="node"
      :panel-text="nodeConnectionText"
      :status="nodeConnectionClass"
      :action-text="t('selectNodeText')"
      @action="openNodeSelectionDialog"
    >
      <template #label>
        <span>{{ t('selectNodeConnected') }}</span>
        <span>{{ node.chain }}</span>
      </template>
      <template>
        <span>{{ node.address }}</span>
        <span v-if="formattedNodeLocation">
          {{ formattedNodeLocation.name }} <span class="flag-emodji">{{ formattedNodeLocation.flag }}</span>
        </span>
      </template>
    </footer-popper>
    <footer-popper
      icon="wi-fi-16"
      panel-class="internet"
      :panel-text="internetConnectionText"
      :status="internetConnectionClass"
      :action-text="t('footer.internet.action')"
      @action="refreshPage"
    >
      <template #label>
        <span>{{ t('footer.internet.label') }}</span>
        <span>{{ internetConnectionSpeedMbText }}</span>
      </template>
      <template>
        <span>{{ internetConnectionDesc }}</span>
      </template>
    </footer-popper>
    <footer-popper
      icon="software-cloud-24"
      panel-class="statistics"
      :panel-text="statisticsConnectionText"
      :status="statisticsConnectionClass"
      :action-text="t('footer.statistics.action')"
      @action="openStatisticsDialog"
    >
      <template #label>
        <span>{{ t('footer.statistics.label') }}</span>
        <span>{{ statisticsConnectionDesc }}</span>
      </template>
    </footer-popper>
    <div class="sora-logo">
      <span class="sora-logo__title">{{ t('poweredBy') }}</span>
      <a class="sora-logo__image" href="https://sora.org" title="Sora" target="_blank" rel="nofollow noopener">
        <sora-logo :theme="libraryTheme" />
      </a>
    </div>
    <select-node-dialog />
    <no-internet-dialog />
    <statistics-dialog :visible.sync="showStatisticsDialog" />
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { Status } from '@soramitsu/soramitsu-js-ui/lib/types';
import { getExplorerLinks, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SoraLogo from '@/components/shared/Logo/Sora.vue';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter, mutation } from '@/store/decorators';
import type { Node } from '@/types/nodes';

import FooterPopper from './FooterPopper.vue';
import { formatLocation } from './Node/utils';
import NoInternetDialog from './NoInternetDialog.vue';

import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

/** Max limit provided by navigator.connection.downlink */
const MAX_INTERNET_CONNECTION_LIMIT = 10;

@Component({
  components: {
    SoraLogo,
    FooterPopper,
    NoInternetDialog,
    StatisticsDialog: lazyComponent(Components.StatisticsDialog),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
  },
})
export default class AppFooter extends Mixins(TranslationMixin) {
  // Block explorer
  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.settings.blockNumber blockNumber!: number;
  @getter.libraryTheme libraryTheme!: Theme;

  get blockExplorerLink(): Nullable<string> {
    const links = getExplorerLinks(this.soraNetwork);
    if (!links.length) {
      return null;
    }
    return links[0].value;
  }

  get blockNumberFormatted(): string {
    return new FPNumber(this.blockNumber).toLocaleString();
  }

  // Node connection
  @getter.settings.nodeIsConnecting isNodeConnecting!: boolean;
  @getter.settings.nodeIsConnected isNodeConnected!: boolean;
  @state.settings.node node!: Partial<Node>;
  @mutation.settings.setSelectNodeDialogVisibility private setSelectNodeDialogVisibility!: (flag: boolean) => void;

  private get nodeConnectionStatusKey(): string {
    if (this.isNodeConnected) return 'connected';
    if (this.isNodeConnecting) return 'loading';
    return 'disconnected';
  }

  get nodeConnectionClass(): Status {
    if (this.isNodeConnected) return Status.SUCCESS;
    if (this.isNodeConnecting) return Status.DEFAULT;
    return Status.ERROR;
  }

  get nodeConnectionText(): string {
    return this.t(`footer.node.title.${this.nodeConnectionStatusKey}`);
  }

  get formattedNodeLocation() {
    if (!this.node?.location) {
      return null;
    }
    return formatLocation(this.node.location);
  }

  openNodeSelectionDialog(): void {
    this.setSelectNodeDialogVisibility(true);
  }

  // Internet connection
  @mutation.settings.setInternetConnectionEnabled private setEnabled!: VoidFunction;
  @mutation.settings.setInternetConnectionDisabled private setDisabled!: VoidFunction;
  @mutation.settings.setInternetConnectionSpeed private setSpeedMb!: VoidFunction;
  @getter.settings.isInternetConnectionEnabled private isInternetConnectionEnabled!: boolean;
  @getter.settings.isInternetConnectionStable private isInternetConnectionStable!: boolean;
  @getter.settings.internetConnectionSpeedMb internetConnectionSpeedMb!: number;

  private get internetStatusKey(): string {
    if (!this.isInternetConnectionEnabled) return 'disabled';
    if (!this.isInternetConnectionStable) return 'unstable';
    return 'stable';
  }

  get internetConnectionClass(): Status {
    if (!this.isInternetConnectionEnabled) return Status.ERROR;
    if (!this.isInternetConnectionStable) return Status.WARNING;
    return Status.SUCCESS;
  }

  get internetConnectionText(): string {
    return this.t(`footer.internet.title.${this.internetStatusKey}`);
  }

  get internetConnectionDesc(): string {
    return this.t(`footer.internet.desc.${this.internetStatusKey}`);
  }

  get internetConnectionSpeedMbText(): string {
    if (!this.internetConnectionSpeedMb) return '';
    const suffix = this.internetConnectionSpeedMb === MAX_INTERNET_CONNECTION_LIMIT ? '≥ ' : '';
    return `${suffix}${this.internetConnectionSpeedMb} ${this.TranslationConsts.mbps}`;
  }

  refreshPage(): void {
    window.location.reload();
  }

  // Statistics connection
  @state.wallet.settings.subqueryStatus private subqueryStatus!: WALLET_TYPES.ConnectionStatus;

  showStatisticsDialog = false;

  get statisticsConnectionClass(): Status {
    switch (this.subqueryStatus) {
      case WALLET_TYPES.ConnectionStatus.Unavailable:
        return Status.ERROR;
      case WALLET_TYPES.ConnectionStatus.Loading:
        return Status.DEFAULT;
      case WALLET_TYPES.ConnectionStatus.Available:
        return Status.SUCCESS;
      default:
        return Status.DEFAULT;
    }
  }

  private get statisticsStatusKey(): string {
    switch (this.subqueryStatus) {
      case WALLET_TYPES.ConnectionStatus.Unavailable:
        return 'unavailable';
      case WALLET_TYPES.ConnectionStatus.Loading:
        return 'loading';
      case WALLET_TYPES.ConnectionStatus.Available:
        return 'available';
      default:
        return 'loading';
    }
  }

  get statisticsConnectionText(): string {
    return this.t(`footer.statistics.title.${this.statisticsStatusKey}`);
  }

  get statisticsConnectionDesc(): string {
    return this.t(`footer.statistics.desc.${this.statisticsStatusKey}`);
  }

  openStatisticsDialog(): void {
    this.showStatisticsDialog = true;
  }

  created(): void {
    window.addEventListener('offline', this.setDisabled);
    window.addEventListener('online', this.setEnabled);
    (navigator as any)?.connection?.addEventListener('change', this.setSpeedMb);
  }

  beforeDestroy(): void {
    window.removeEventListener('offline', this.setDisabled);
    window.removeEventListener('online', this.setEnabled);
    (navigator as any)?.connection?.removeEventListener('change', this.setSpeedMb);
  }
}
</script>

<style lang="scss" scoped>
$block-icon-size: 7px;
$sora-logo-height: 36px;
$sora-logo-width: 115px;

.app-status {
  font-size: var(--s-font-size-extra-mini);
  font-weight: 300;
  height: $footer-height;
  border-top: 1px solid var(--s-color-base-border-secondary);
  background-color: var(--s-color-utility-surface);
  justify-content: center;
  align-items: center;
}
.block-number {
  color: var(--s-color-status-success);
  text-decoration: none;
  @include app-status-item;

  &-icon {
    background-color: var(--s-color-status-success);
    border-radius: 50%;
    height: $block-icon-size;
    width: $block-icon-size;
    margin-right: 2px;
  }
}

.sora-logo {
  display: flex;
  align-items: center;
  align-self: flex-end;
  position: absolute;
  right: 0;

  &__title {
    text-transform: uppercase;
    font-weight: 200;
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
    line-height: 12px;
    margin-right: $basic-spacing / 2;
    margin-top: 2px;
    white-space: nowrap;
  }

  &__image {
    width: $sora-logo-width;
    height: $sora-logo-height;
    @include focus-outline;
  }
}

@include desktop(true) {
  .sora-logo {
    display: none;
  }
}
</style>
