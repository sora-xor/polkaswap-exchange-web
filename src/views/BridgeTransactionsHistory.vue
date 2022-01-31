<template>
  <div class="history-container">
    <s-card v-loading="parentLoading" class="history-content" border-radius="medium" shadow="always" primary>
      <generic-page-header has-button-back :title="t('bridgeHistory.title')" @back="handleBack">
        <!-- <s-button
          class="base-title_settings"
          type="action"
          icon="basic-trash-24"
          :disabled="!hasHistory"
          :tooltip="t('bridgeHistory.clearHistory')"
          tooltip-placement="bottom-end"
          @click="handleClearHistory"
        /> -->
      </generic-page-header>
      <s-form class="history-form" :show-message="false">
        <s-form-item v-if="history.length" class="history--search">
          <s-input
            v-model="query"
            :placeholder="t('bridgeHistory.filterPlaceholder')"
            prefix="s-icon-search-16"
            size="big"
          >
            <template #suffix v-if="query">
              <s-button type="link" class="s-button--clear" icon="clear-X-16" @click="handleResetSearch" />
            </template>
          </s-input>
        </s-form-item>
        <div v-loading="loading" class="history-items">
          <template v-if="hasHistory">
            <div
              class="history-item"
              v-for="item in filteredHistoryItems"
              :key="`history-${item.id}`"
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
        </div>
        <s-pagination
          v-if="hasHistory"
          :layout="'total, prev, next'"
          :current-page.sync="currentPage"
          :page-size="pageAmount"
          :total="filteredHistory.length"
          @prev-click="handlePrevClick"
          @next-click="handleNextClick"
        />
      </s-form>
      <s-button
        v-if="!restored"
        class="s-button--restore s-typography-button--large"
        :disabled="loading"
        @click="handleRestoreHistory"
      >
        {{ t('bridgeHistory.restoreHistory') }}
      </s-button>
    </s-card>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Getter, Action, State } from 'vuex-class';
import { BridgeTxStatus } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import PaginationSearchMixin from '@/components/mixins/PaginationSearchMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { isUnsignedToPart } from '@/utils/bridge';

import type { BridgeHistory, RegisteredAccountAsset } from '@sora-substrate/util';

const namespace = 'bridge';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class BridgeTransactionsHistory extends Mixins(
  TranslationMixin,
  BridgeHistoryMixin,
  NetworkFormatterMixin,
  PaginationSearchMixin,
  mixins.NumberFormatterMixin
) {
  @State((state) => state[namespace].restored) restored!: boolean;

  @Getter('registeredAssets', { namespace: 'assets' }) registeredAssets!: Array<RegisteredAccountAsset>;

  @Action('getRestoredFlag', { namespace }) getRestoredFlag!: AsyncVoidFn;
  @Action('getRestoredHistory', { namespace }) getRestoredHistory!: AsyncVoidFn;
  @Action('clearHistory', { namespace }) clearHistory!: AsyncVoidFn;

  @Action('updateRegisteredAssets', { namespace: 'assets' }) updateRegisteredAssets!: AsyncVoidFn;

  PageNames = PageNames;
  pageAmount = 8; // override PaginationSearchMixin

  get filteredHistory(): Array<BridgeHistory> {
    if (!this.history?.length) return [];

    const historyCopy = [...this.history].sort((a: BridgeHistory, b: BridgeHistory) =>
      a.startTime && b.startTime ? b.startTime - a.startTime : 0
    );

    return this.getFilteredHistory(historyCopy);
  }

  get hasHistory(): boolean {
    return this.filteredHistory && this.filteredHistory.length > 0;
  }

  get filteredHistoryItems(): Array<BridgeHistory> {
    return this.getPageItems(this.filteredHistory);
  }

  async created(): Promise<void> {
    this.withApi(async () => {
      await this.updateRegisteredAssets();
      await this.getRestoredFlag();
      await this.getHistory();
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

  historyStatusClasses(item: BridgeHistory): string {
    const iconClass = 'history-item-status';
    const classes = [iconClass];

    if (item.status === BridgeTxStatus.Failed && isUnsignedToPart(item)) {
      classes.push(`${iconClass}--warning`);
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
    if (item.status === BridgeTxStatus.Failed && isUnsignedToPart(item)) {
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
    if (item.status === BridgeTxStatus.Failed && isUnsignedToPart(item)) {
      return this.t('bridgeHistory.statusAction');
    } else {
      return '';
    }
  }

  async handleClearHistory(): Promise<void> {
    await this.clearHistory();
  }

  async handleRestoreHistory(): Promise<void> {
    await this.withLoading(async () => {
      await this.getRestoredHistory();
      await this.getRestoredFlag();
      await this.getHistory();
    });
  }

  handleBack(): void {
    router.push({ name: PageNames.Bridge });
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
  &-content {
    .el-pagination {
      .btn {
        &-prev,
        &-next {
          padding-right: 0;
          padding-left: 0;
          min-width: $inner-spacing-big;
        }
        &-prev {
          margin-left: auto;
          margin-right: $inner-spacing-mini;
        }
      }
    }
  }
  &--search {
    .el-input__inner {
      padding-right: var(--s-size-medium);
    }
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
  &--search.el-form-item {
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
    min-height: #{$history-item-height * $page-amount};
  }
  &-empty {
    text-align: center;
    @include empty-search;
  }
}
@include search-item('history--search');
.history-item {
  display: flex;
  align-items: center;
  margin-right: -#{$inner-spacing-small};
  margin-left: -#{$inner-spacing-small};
  min-height: $history-item-height;
  padding: $inner-spacing-mini $inner-spacing-medium;
  border-radius: var(--s-border-radius-small);

  &:not(:first-child) {
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
  &-info {
    font-size: var(--s-font-size-mini);
  }
  &-title,
  &-date {
    width: 100%;
  }
  &-title {
    line-height: var(--s-line-height-big);
    word-break: break-all;
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
    &--warning {
      color: var(--s-color-status-warning);
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
      margin-left: $inner-spacing-mini / 2;
    }
  }
}
.el-pagination {
  display: flex;
  margin-top: $inner-spacing-medium;
  padding-left: 0;
  padding-right: 0;
}
.s-button--restore {
  margin-top: $inner-spacing-medium;
  width: 100%;
}
</style>
