<template>
  <div class="history-container">
    <s-card v-loading="parentLoading" class="history-content" border-radius="medium" shadow="always" primary>
      <generic-page-header has-button-back :title="t('bridgeHistory.title')" @back="handleBack">
        <s-button
          type="action"
          icon="arrows-swap-90-24"
          :disabled="historyLoading"
          :tooltip="t('bridgeHistory.restoreHistory')"
          @click="updateHistory(true)"
        />
      </generic-page-header>
      <s-form class="history-form" :show-message="false">
        <search-input
          v-if="history.length"
          v-model="query"
          :placeholder="t('bridgeHistory.filterPlaceholder')"
          autofocus
          @clear="handleResetSearch"
          class="history--search"
        />
        <div v-loading="loading" class="history-items">
          <template v-if="hasHistory">
            <div
              v-button
              class="history-item"
              v-for="item in filteredHistoryItems"
              :key="`history-${item.id}`"
              tabindex="0"
              @click="showHistory(item.id)"
            >
              <div class="history-item-info">
                <div class="history-item-title p4">
                  <formatted-amount value-can-be-hidden :value="formatAmount(item)" :asset-symbol="item.symbol" />
                  <i
                    :class="`s-icon--network s-icon-${
                      isOutgoingType(item.type) ? 'sora' : getEvmIcon(item.externalNetwork)
                    }`"
                  />
                  <span class="history-item-title-separator"> {{ t('bridgeTransaction.for') }} </span>
                  <formatted-amount value-can-be-hidden :value="formatAmount(item)" :asset-symbol="item.symbol" />
                  <i
                    :class="`s-icon--network s-icon-${
                      !isOutgoingType(item.type) ? 'sora' : getEvmIcon(item.externalNetwork)
                    }`"
                  />
                </div>
                <div class="history-item-date">{{ formatHistoryDate(item) }}</div>
              </div>
              <div :class="historyStatusClasses(item)">
                <div class="history-item-status-text">{{ historyStatusText(item) }}</div>
                <s-icon class="history-item-status-icon" :name="historyStatusIconName(item)" size="16" />
              </div>
            </div>
          </template>
          <p v-else class="history-empty p4">{{ t('bridgeHistory.empty') }}</p>
          <history-pagination
            v-if="hasHistory"
            :current-page="currentPage"
            :page-amount="pageAmount"
            :loading="loading"
            :total="total"
            :last-page="lastPage"
            @pagination-click="handlePaginationClick"
          />
        </div>
      </s-form>
    </s-card>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { BridgeTxStatus } from '@sora-substrate/util';
import type { BridgeHistory, RegisteredAccountAsset } from '@sora-substrate/util';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import BridgeMixin from '@/components/mixins/BridgeMixin';
import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { state, action, getter } from '@/store/decorators';
import { isUnsignedToPart } from '@/utils/bridge';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SearchInput: components.SearchInput,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class BridgeTransactionsHistory extends Mixins(
  TranslationMixin,
  BridgeMixin,
  BridgeHistoryMixin,
  NetworkFormatterMixin,
  mixins.PaginationSearchMixin,
  mixins.NumberFormatterMixin
) {
  @state.assets.registeredAssets private registeredAssets!: Array<RegisteredAccountAsset>;
  @state.bridge.historyLoading historyLoading!: boolean;
  @action.bridge.updateHistory private updateHistory!: (clearHistory?: boolean) => Promise<void>;

  @getter.bridge.historyPage historyPage!: number;

  pageAmount = 8; // override PaginationSearchMixin
  loading = true;

  get filteredHistory(): Array<BridgeHistory> {
    if (!this.history?.length) return [];

    return this.getFilteredHistory(this.sortTransactions([...this.history], this.isLtrDirection));
  }

  get total(): number {
    return this.filteredHistory.length;
  }

  get hasHistory(): boolean {
    return this.filteredHistoryItems && this.total > 0;
  }

  get filteredHistoryItems(): Array<BridgeHistory> {
    const end = this.isLtrDirection
      ? Math.min(this.currentPage * this.pageAmount, this.filteredHistory.length)
      : Math.max((this.lastPage - this.currentPage + 1) * this.pageAmount - this.directionShift, 0);

    const start = this.isLtrDirection
      ? Math.max(end - this.pageAmount, 0)
      : Math.max((this.lastPage - this.currentPage) * this.pageAmount - this.directionShift, 0);

    return this.sortTransactions(this.getPageItems(this.filteredHistory, start, end), true);
  }

  created(): void {
    this.withParentLoading(async () => {
      this.setHistory();
      await this.updateHistory();
      if (this.historyPage !== 1) {
        this.currentPage = this.historyPage;
        if (this.currentPage !== 1 && this.currentPage === this.lastPage) {
          this.isLtrDirection = false;
        }
      }
    }).finally(() => {
      this.loading = false;
    });
  }

  getFilteredHistory(history: Array<BridgeHistory>): Array<BridgeHistory> {
    if (this.query) {
      const query = this.query.toLowerCase().trim();
      return history.filter(
        (item) =>
          `${item.assetAddress}`.toLowerCase().includes(query) ||
          `${this.registeredAssets.find((asset) => asset.address === item.assetAddress)?.externalAddress}`
            .toLowerCase()
            .includes(query) ||
          `${item.symbol}`.toLowerCase().includes(query)
      );
    }

    return history;
  }

  formatAmount(historyItem: any): string {
    if (!historyItem.amount) return '';

    const decimals = this.registeredAssets?.find((asset) => asset.address === historyItem.address)?.decimals;

    return this.formatStringValue(historyItem.amount, decimals);
  }

  formatHistoryDate(response: any): string {
    // We use current date if request is failed
    return this.formatDate(response?.startTime ?? Date.now());
  }

  isWaitingForAction(tx: BridgeHistory): boolean {
    return tx.status === BridgeTxStatus.Failed && isUnsignedToPart(tx);
  }

  historyStatusClasses(item: BridgeHistory): string {
    const iconClass = 'history-item-status';
    const classes = [iconClass];

    if (this.isWaitingForAction(item)) {
      classes.push(`${iconClass}--info`);
    } else if (item.status === BridgeTxStatus.Failed) {
      classes.push(`${iconClass}--error`);
    } else if (item.status === BridgeTxStatus.Done) {
      classes.push(`${iconClass}--success`);
    } else {
      classes.push(`${iconClass}--pending`);
    }

    return classes.join(' ');
  }

  historyStatusIconName(item: BridgeHistory): string {
    if (this.isWaitingForAction(item)) {
      return 'notifications-alert-triangle-24';
    } else if (item.status === BridgeTxStatus.Failed) {
      return 'basic-clear-X-24';
    } else if (item.status === BridgeTxStatus.Done) {
      return 'basic-check-marks-24';
    } else {
      return 'time-time-24';
    }
  }

  historyStatusText(item: BridgeHistory): string {
    if (this.isWaitingForAction(item)) {
      return this.t('bridgeHistory.statusAction');
    } else {
      return '';
    }
  }

  async handlePaginationClick(button: WALLET_CONSTS.PaginationButton): Promise<void> {
    let current = 1;

    switch (button) {
      case WALLET_CONSTS.PaginationButton.Prev:
        current = this.currentPage - 1;
        break;
      case WALLET_CONSTS.PaginationButton.Next:
        current = this.currentPage + 1;
        if (current === this.lastPage) {
          this.isLtrDirection = false;
        }
        break;
      case WALLET_CONSTS.PaginationButton.First:
        this.isLtrDirection = true;
        break;
      case WALLET_CONSTS.PaginationButton.Last:
        current = this.lastPage;
        this.isLtrDirection = false;
    }

    await this.updateHistory();
    this.currentPage = current;
    this.setHistoryPage(this.currentPage);
  }

  handleBack(): void {
    this.setHistoryPage(1);
    router.push({ name: PageNames.Bridge });
  }

  handleResetSearch(): void {
    this.resetPage();
    this.resetSearch();
  }
}
</script>

<style lang="scss">
.history {
  &-container {
    @include bridge-container;
    .el-card .el-card__body .history-form {
      padding: 0 $inner-spacing-mini;
    }
  }
  &-item-title {
    display: flex;
    align-items: baseline;
    font-weight: 600;
    letter-spacing: var(--s-letter-spacing-small);
  }
  &--search {
    .el-input__inner {
      padding-right: var(--s-size-medium);
    }
  }
  &-items .history-pagination.el-pagination {
    margin-top: auto;
  }
}
</style>

<style lang="scss" scoped>
$history-item-horizontal-space: $inner-spacing-medium;
$history-item-height: 48px;
$page-amount: 8;
$history-item-top-border-height: 1px;
$separator-margin: calc(var(--s-basic-spacing) / 2);
.history {
  &--search {
    margin-bottom: $inner-spacing-medium;
  }
  &-container {
    flex-direction: column;
    align-items: center;
    margin-top: $inner-spacing-large;
    margin-right: auto;
    margin-left: auto;
  }
  &-content {
    min-height: $bridge-height;
    @include bridge-content;
  }
  &-items {
    display: flex;
    flex-direction: column;
    min-height: calc(#{$history-item-height * $page-amount} + 50px);
  }
  &-empty {
    text-align: center;
    @include empty-search;
  }
}

.history-item {
  display: flex;
  align-items: center;
  margin-right: -#{$inner-spacing-small};
  margin-left: -#{$inner-spacing-small};
  min-height: $history-item-height;
  padding: $inner-spacing-mini $inner-spacing-medium;
  border-radius: var(--s-border-radius-small);

  &:not(:first-child):not(:focus) {
    position: relative;
    &:before {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: block;
      margin-right: auto;
      margin-left: auto;
      height: 1px;
      width: calc(100% - #{$history-item-horizontal-space * 2});
      content: '';
      background-color: var(--s-color-base-border-secondary);
    }
  }
  &:hover {
    background-color: var(--s-color-base-background-hover);
    cursor: pointer;
  }
  &:focus + .history-item:before {
    background-color: transparent;
  }
  &-info {
    font-size: var(--s-font-size-mini);
  }
  &-title,
  &-date {
    width: 100%;
  }
  &-title {
    line-height: var(--s-line-height-big);
    white-space: nowrap;

    .s-icon {
      &--network {
        margin-left: $separator-margin;
      }
      &-sora,
      &-eth {
        position: relative;
        top: 1px;
      }
    }
    &-separator {
      font-weight: normal;
      margin-left: $separator-margin;
      margin-right: $separator-margin;
    }
  }
  &-date {
    color: var(--s-color-base-content-secondary);
    line-height: var(--s-line-height-mini);
  }
  &-status {
    display: flex;
    align-items: center;
    margin-left: auto;
    max-width: 25%;

    &--success {
      color: var(--s-color-status-success);
    }
    &--error {
      color: var(--s-color-status-error);
    }
    &--info {
      color: var(--s-color-status-info);
    }
    &--pending {
      color: var(--s-color-base-content-secondary);
    }

    &-text {
      text-transform: uppercase;
      font-size: $s-heading3-caps-font-size;
      line-height: var(--s-line-height-reset);
      text-align: right;
    }

    &-icon {
      flex-shrink: 0;
      color: inherit;
    }

    &-text + &-icon {
      margin-left: $inner-spacing-tiny;
    }
  }
}
.s-button--restore {
  margin-top: $inner-spacing-medium;
  width: 100%;
}
</style>
