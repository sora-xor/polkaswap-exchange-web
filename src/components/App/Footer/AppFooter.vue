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
        <span v-if="formattedLocation">{{ formattedLocation }}</span>
      </template>
    </footer-popper>
    <footer-popper
      icon="wi-fi-16"
      panel-class="internet"
      :panel-text="internetConnectionText"
      :status="internetConnectionClass"
      :action-text="t('connection.action.refresh')"
      @action="refreshPage"
    >
      <template #label>
        <span>{{ 'Your internet speed' }}</span>
        <span>{{ internetConnectionSpeedMb + ' mbps' }}</span>
      </template>
      <template>
        <span>{{ internetConnectionDesc }}</span>
      </template>
    </footer-popper>
    <footer-popper
      icon="software-cloud-24"
      panel-class="statistics"
      :panel-text="subqueryConnectionText"
      :status="subqueryConnectionClass"
      :action-text="'Select services'"
      @action="openStatisticsDialog"
    >
      <template #label>
        <span>{{ 'LOL' }}</span>
        <span>{{ 'lol' }}</span>
      </template>
      <template>
        <span>{{ 'VERY LOL' }}</span>
      </template>
    </footer-popper>
    <no-internet-dialog />
    <statistics-dialog :visible.sync="showStatisticsDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { getExplorerLinks, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import { Status } from '@soramitsu/soramitsu-js-ui/lib/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import FooterPopper from './FooterPopper.vue';
import NoInternetDialog from './NoInternetDialog.vue';
import StatisticsDialog from './StatisticsDialog.vue';

import { state, getter, mutation } from '@/store/decorators';
import type { Node } from '@/types/nodes';
import { formatLocation } from '@/components/Settings/Node/utils';

@Component({
  components: {
    FooterPopper,
    NoInternetDialog,
    StatisticsDialog,
  },
})
export default class AppFooter extends Mixins(TranslationMixin) {
  @mutation.settings.setInternetConnectionEnabled private setEnabled!: VoidFunction;
  @mutation.settings.setInternetConnectionDisabled private setDisabled!: VoidFunction;
  @mutation.settings.setInternetConnectionSpeed private setSpeedMb!: VoidFunction;
  @getter.settings.isInternetConnectionEnabled private isInternetConnectionEnabled!: boolean;
  @getter.settings.isInternetConnectionStable private isInternetConnectionStable!: boolean;
  @getter.settings.internetConnectionSpeedMb internetConnectionSpeedMb!: number;

  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.settings.blockNumber blockNumber!: number;

  @state.wallet.settings.subqueryStatus private subqueryStatus!: WALLET_TYPES.ConnectionStatus;

  @getter.settings.nodeIsConnecting isNodeConnecting!: boolean;
  @getter.settings.nodeIsConnected isNodeConnected!: boolean;
  @state.settings.node node!: Partial<Node>;
  @mutation.settings.setSelectNodeDialogVisibility private setSelectNodeDialogVisibility!: (flag: boolean) => void;

  showStatisticsDialog = false;

  get internetConnectionClass(): Status {
    if (!this.isInternetConnectionEnabled) return Status.ERROR;
    if (!this.isInternetConnectionStable) return Status.WARNING;
    return Status.SUCCESS;
  }

  get internetConnectionText(): string {
    const base = 'Internet';
    if (!this.isInternetConnectionEnabled) return `${base} disabled`;
    if (!this.isInternetConnectionStable) return `${base} unstable`;
    return `${base} stable`;
  }

  get internetConnectionDesc(): string {
    if (!this.isInternetConnectionEnabled) {
      return 'Disconnected';
    }
    if (!this.isInternetConnectionStable) {
      return 'Slow connection';
    }
    return 'Optimal speed';
  }

  get subqueryConnectionClass(): Status {
    switch (this.subqueryStatus) {
      case WALLET_TYPES.ConnectionStatus.Unavailable:
        return Status.ERROR;
      case WALLET_TYPES.ConnectionStatus.Loading:
        return Status.DEFAULT;
      case WALLET_TYPES.ConnectionStatus.Available:
        return Status.SUCCESS;
      default:
        return Status.ERROR;
    }
  }

  get subqueryConnectionText(): string {
    const base = 'Statistics';
    switch (this.subqueryStatus) {
      case WALLET_TYPES.ConnectionStatus.Unavailable:
        return `${base} unavailable`;
      case WALLET_TYPES.ConnectionStatus.Loading:
        return `${base} loading`;
      case WALLET_TYPES.ConnectionStatus.Available:
        return `${base} available`;
      default:
        return `${base} loading`;
    }
  }

  get nodeConnectionClass(): Status {
    if (this.isNodeConnected) return Status.SUCCESS;
    if (this.isNodeConnecting) return Status.DEFAULT;
    return Status.ERROR;
  }

  get nodeConnectionText(): string {
    const base = 'Node';
    if (this.isNodeConnected) return `${base} connected`;
    if (this.isNodeConnecting) return `${base} re-connecting`;
    return `${base} disconnected`;
  }

  get nodeConnectionTooltip(): string {
    if (this.isNodeConnected) {
      return this.t('selectNodeConnected', { chain: this.node.chain });
    }
    if (this.isNodeConnecting) {
      return `Node is connecting.\n You will be able to use all features until it is connected`;
    }
    return `Node is disconnected.\n You cannot use all features. \nYou might try to select another node or refresh a page.`;
  }

  get formattedLocation(): Nullable<string> {
    if (!this.node?.location) {
      return null;
    }
    return formatLocation(this.node.location);
  }

  openNodeSelectionDialog(): void {
    this.setSelectNodeDialogVisibility(true);
  }

  openStatisticsDialog(): void {
    this.showStatisticsDialog = true;
  }

  get isUnstable(): boolean {
    return (
      !this.isInternetConnectionStable ||
      this.subqueryStatus === WALLET_TYPES.ConnectionStatus.Unavailable ||
      !(this.isNodeConnected || this.isNodeConnecting)
    );
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

  refreshPage(): void {
    window.location.reload();
  }
}
</script>

<style lang="scss" scoped>
// icons: globe-16 software-cloud-checked-24 software-cloud-24 notifications-alert-triangle-24 refresh-16
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
    $block-icon-size: 7px;
    background-color: var(--s-color-status-success);
    border-radius: 50%;
    height: $block-icon-size;
    width: $block-icon-size;
    margin-right: 2px;
  }
}
</style>
