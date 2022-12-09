<template>
  <div class="app-status s-flex">
    <div v-if="blockNumber" class="app-status__item block-number">
      <s-tooltip :content="t('blockNumberText')" placement="top" tabindex="-1">
        <a class="block-number-link" :href="blockExplorerLink" target="_blank" rel="nofollow noopener">
          <span class="block-number-icon"></span><span>{{ blockNumberFormatted }}</span>
        </a>
      </s-tooltip>
    </div>
    <div class="app-status__item node">
      <s-icon name="globe-16" size="16" />
      <!-- globe-16 software-cloud-checked-24 software-cloud-24 notifications-alert-triangle-24 refresh-16-->
      <span class="app-status__text">Node re-connecting</span>
    </div>
    <s-tooltip :content="internetConnectionTooltip" placement="top" tabindex="-1">
      <div class="app-status__item internet">
        <s-icon name="wi-fi-16" size="16" />
        <span class="app-status__text">Internet {{ isInternetConnectionStable ? 'stable' : 'unstable' }}</span>
      </div>
    </s-tooltip>
    <div class="app-status__item statistic">
      <s-icon name="software-cloud-24" size="16" />
      <span class="app-status__text">Statistic service unstable</span>
    </div>
    <s-button v-if="isUnstable" size="mini" type="primary" @click="refreshPage">REFRESH</s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { getExplorerLinks, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { state } from '@/store/decorators';

@Component
export default class AppFooter extends Mixins(TranslationMixin) {
  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.settings.blockNumber blockNumber!: number;

  // Maybe check less than 1 Mb and say unstable and disabled for offline
  private internetConnection: Nullable<boolean> = null;
  private internetConnectionSpeed: Nullable<number> = null;

  get internetConnectionSpeedMb(): number {
    return this.internetConnectionSpeed ?? ((navigator as any)?.connection?.downlink as number) ?? 0;
  }

  get isInternetConnectionStable(): boolean {
    return this.internetConnection ?? navigator.onLine;
  }

  get internetConnectionTooltip(): string {
    if (!this.internetConnectionSpeedMb) {
      return `Your connection is ${this.isInternetConnectionStable ? 'stable' : 'unstable'}`;
    }
    return `Your speed: ${this.internetConnectionSpeedMb} Mb/s`;
  }

  get isUnstable(): boolean {
    return !this.isInternetConnectionStable;
  }

  private setInternetConnectionStable(event: Event): void {
    this.internetConnection = true;
  }

  private setInternetConnectionUnstable(event: Event): void {
    this.internetConnection = false;
  }

  private setInternetConnectionSpeed(event: Event): void {
    this.internetConnectionSpeed = ((navigator as any)?.connection?.downlink as number) ?? 0;
  }

  created(): void {
    window.addEventListener('offline', this.setInternetConnectionUnstable);
    window.addEventListener('online', this.setInternetConnectionStable);
    (navigator as any)?.connection?.addEventListener('change', this.setInternetConnectionSpeed);
  }

  beforeDestroy(): void {
    window.removeEventListener('offline', this.setInternetConnectionUnstable);
    window.removeEventListener('online', this.setInternetConnectionStable);
    (navigator as any)?.connection?.removeEventListener('change', this.setInternetConnectionSpeed);
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
