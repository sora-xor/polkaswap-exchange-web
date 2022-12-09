<template>
  <div class="app-status s-flex">
    <div v-if="blockNumber" class="app-status__item block-number">
      <s-tooltip :content="t('blockNumberText')" placement="top" tabindex="-1">
        <a class="block-number-link" :href="blockExplorerLink" target="_blank" rel="nofollow noopener">
          <span class="block-number-icon"></span><span>{{ blockNumberFormatted }}</span>
        </a>
      </s-tooltip>
    </div>
    <s-tooltip :content="nodeConnectionTooltip" placement="top" tabindex="-1">
      <div class="app-status__item node">
        <s-icon name="globe-16" size="16" :class="nodeConnectionClass" />
        <span class="app-status__text">{{ nodeConnectionText }}</span>
      </div>
    </s-tooltip>
    <s-tooltip :content="internetConnectionTooltip" placement="top" tabindex="-1">
      <div class="app-status__item internet">
        <s-icon name="wi-fi-16" size="16" :class="internetConnectionClass" />
        <span class="app-status__text">{{ internetConnectionText }}</span>
      </div>
    </s-tooltip>
    <s-tooltip :content="subqueryConnectionTooltip" placement="top" tabindex="-1">
      <div class="app-status__item statistic">
        <s-icon name="software-cloud-24" size="16" :class="subqueryConnectionClass" />
        <span class="app-status__text">{{ subqueryConnectionText }}</span>
      </div>
    </s-tooltip>
    <s-button v-if="isUnstable" size="mini" type="primary" @click="refreshPage">REFRESH</s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { getExplorerLinks, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import { Status } from '@soramitsu/soramitsu-js-ui/lib/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { state, getter, mutation } from '@/store/decorators';
import type { Node } from '@/types/nodes';

@Component
export default class AppFooter extends Mixins(TranslationMixin) {
  @mutation.settings.setInternetConnectionEnabled private setEnabled!: VoidFunction;
  @mutation.settings.setInternetConnectionDisabled private setDisabled!: VoidFunction;
  @mutation.settings.setInternetConnectionSpeed private setSpeedMb!: VoidFunction;
  @getter.settings.isInternetConnectionEnabled private isInternetConnectionEnabled!: boolean;
  @getter.settings.isInternetConnectionStable private isInternetConnectionStable!: boolean;
  @getter.settings.internetConnectionSpeedMb private internetConnectionSpeedMb!: number;

  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.settings.blockNumber blockNumber!: number;

  @state.wallet.settings.subqueryStatus private subqueryStatus!: WALLET_TYPES.ConnectionStatus;

  @getter.settings.nodeIsConnecting private isNodeConnecting!: boolean;
  @getter.settings.nodeIsConnected private isNodeConnected!: boolean;
  @state.settings.node private node!: Partial<Node>;

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

  get internetConnectionTooltip(): string {
    if (!this.isInternetConnectionEnabled) {
      return `Your Internet Connection is Disabled.\n All features are unavailable.\n\n You should connect and try again.`;
    }
    if (!this.isInternetConnectionStable) {
      return `Your Internet Connection is Unstable.\n Speed: ${this.internetConnectionSpeedMb} Mb/s.\n\n It's recommended to find better Internet Connection`;
    }
    return `Your Internet Connection is Stable.\n Speed: ${this.internetConnectionSpeedMb} Mb/s`;
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
        return `${base} stable`;
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
  &__item {
    margin-left: 10px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    > i {
      &.error {
        color: var(--s-color-status-error);
      }
      &.warning {
        color: var(--s-color-status-warning);
      }
      &.success {
        color: var(--s-color-status-success);
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
