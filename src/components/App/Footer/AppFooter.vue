<template>
  <div class="app-status s-flex">
    <div v-if="blockNumber" class="app-status__item block-number" :class="blockNumberClass">
      <a class="block-number-link" :href="blockExplorerLink" target="_blank" rel="nofollow noopener">
        <span class="block-number-icon" /><span>{{ blockNumberFormatted }}</span>
      </a>
    </div>
    <footer-popper :status="nodeConnectionClass" :action-text="t('selectNodeText')" @action="openNodeSelectionDialog">
      <div slot="reference" class="app-status__item node" :class="nodeConnectionClass">
        <s-icon name="globe-16" size="16" />
        <span class="app-status__text">{{ nodeConnectionText }}</span>
      </div>
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
      :status="internetConnectionClass"
      :action-text="t('connection.action.refresh')"
      @action="refreshPage"
    >
      <div slot="reference" class="app-status__item internet" :class="internetConnectionClass">
        <s-icon name="wi-fi-16" size="16" />
        <span class="app-status__text">{{ internetConnectionText }}</span>
      </div>
      <template #label>
        <span>{{ 'Your internet speed' }}</span>
        <span>{{ internetConnectionSpeedMb + ' mbps' }}</span>
      </template>
      <template>
        <span>{{ internetConnectionDesc }}</span>
      </template>
    </footer-popper>
    <footer-popper :status="subqueryConnectionClass" :action-text="'Select services'" @action="refreshPage">
      <div slot="reference" class="app-status__item internet" :class="subqueryConnectionClass">
        <s-icon name="software-cloud-24" size="16" />
        <span class="app-status__text">{{ subqueryConnectionText }}</span>
      </div>
      <template #label>
        <span>{{ 'LOL' }}</span>
        <span>{{ 'lol' }}</span>
      </template>
      <template>
        <span>{{ 'VERY LOL' }}</span>
      </template>
    </footer-popper>
    <app-footer-no-internet-dialog />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { getExplorerLinks, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import { Status } from '@soramitsu/soramitsu-js-ui/lib/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import FooterPopper from './FooterPopper.vue';
import AppFooterNoInternetDialog from './AppFooterNoInternetDialog.vue';

import { state, getter, mutation } from '@/store/decorators';
import type { Node } from '@/types/nodes';
import { formatLocation } from '@/components/Settings/Node/utils';

@Component({
  components: {
    FooterPopper,
    AppFooterNoInternetDialog,
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
        return Status.WARNING;
      case WALLET_TYPES.ConnectionStatus.Available:
        return Status.SUCCESS;
      default:
        return Status.ERROR;
    }
  }

  get subqueryConnectionText(): string {
    const base = 'Statistics service';
    switch (this.subqueryStatus) {
      case WALLET_TYPES.ConnectionStatus.Unavailable:
        return `${base} unavailable`;
      case WALLET_TYPES.ConnectionStatus.Loading:
        return `${base} loading`;
      case WALLET_TYPES.ConnectionStatus.Available:
        return `${base} available`;
      default:
        return `${base} unavailable`;
    }
  }

  get subqueryConnectionTooltip(): string {
    const base = 'Statistics service';
    switch (this.subqueryStatus) {
      case WALLET_TYPES.ConnectionStatus.Unavailable:
        return `${base} is unavailable.\n So, charts, history & other historical data might be wrong or unavailable.\n You might try to refresh a page.`;
      case WALLET_TYPES.ConnectionStatus.Loading:
        return `${base} is loading.\n Charts, hitsory & other historical data will be loaded soon`;
      case WALLET_TYPES.ConnectionStatus.Available:
        return `${base} is stable`;
      default:
        return `${base} is unavailable.\n So, charts & history & other historical data might be wrong or unavailable.\n You might try to refresh a page.`;
    }
  }

  get nodeConnectionClass(): Status {
    if (this.isNodeConnected) return Status.SUCCESS;
    if (this.isNodeConnecting) return Status.WARNING;
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

  readonly blockNumberClass = Status.SUCCESS;

  getPopoverClass(status: string): string {
    return `app-status__tooltip ${status}`;
  }

  refreshPage(): void {
    window.location.reload();
  }
}
</script>

<style lang="scss" scoped>
// icons: globe-16 software-cloud-checked-24 software-cloud-24 notifications-alert-triangle-24 refresh-16
$status-classes: 'error', 'warning', 'success';

.app-status {
  font-size: var(--s-font-size-extra-mini);
  font-weight: 300;
  height: $footer-height;
  border-top: 1px solid var(--s-color-base-border-secondary);
  background-color: var(--s-color-utility-surface);
  justify-content: center;
  align-items: center;
  &__item {
    margin-left: 10px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    &:hover {
      opacity: 0.5;
      cursor: pointer;
    }
    @each $status in $status-classes {
      &.#{$status} i {
        color: var(--s-color-status-#{$status});
      }
    }
  }
  &__text {
    margin-left: 6px;
  }
}
.block-number {
  &-link {
    display: flex;
    align-items: center;
    color: var(--s-color-status-success);
    text-decoration: none;
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
</style>
