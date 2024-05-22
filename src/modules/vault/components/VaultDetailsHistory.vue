<template>
  <s-card class="details-history" border-radius="small" size="big" primary>
    <template #header>
      <h4>{{ $t('kensetsu.positionHistory') }}</h4>
    </template>
    <template v-if="hasItems">
      <div class="details-history__items s-flex-column" v-loading="loadingState">
        <div v-for="(item, index) in items" :key="index" class="history-item s-flex-column">
          <div class="history-item-info s-flex">
            <div class="history-item-operation ch3" :data-type="item.type">{{ getTitle(item.type) }}</div>
            <div class="history-item-title p4">{{ getOperationMessage(item) }}</div>
          </div>
          <div class="history-item-date">{{ formatDate(item.timestamp, DateFormat) }}</div>
        </div>
      </div>
      <history-pagination
        :current-page="currentPage"
        :page-amount="pageAmount"
        :loading="loading"
        :total="total"
        :last-page="lastPage"
        @pagination-click="onPaginationClick"
      />
    </template>
    <div v-else v-loading="loadingState" class="details-history__empty p4">{{ t('noDataText') }}</div>
  </s-card>
</template>

<script lang="ts">
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import IndexerDataFetchMixin from '@/components/mixins/IndexerDataFetchMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ObjectInit } from '@/consts';
import { fetchVaultEvents } from '@/indexer/queries/kensetsu';
import { VaultEventTypes } from '@/modules/vault/consts';
import type { VaultEvent, VaultEventType } from '@/modules/vault/types';
import { state } from '@/store/decorators';
import { type FetchVariables } from '@/types/indexers';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    HistoryPagination: components.HistoryPagination,
  },
})
export default class VaultDetailsHistory extends Mixins(TranslationMixin, IndexerDataFetchMixin) {
  /** Date format without seconds */
  readonly DateFormat = 'll LT';

  @Prop({ default: undefined, type: Number }) readonly id!: number;
  @Prop({ default: ObjectInit, type: Object }) readonly lockedAsset!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: ObjectInit, type: Object }) readonly debtAsset!: Nullable<RegisteredAccountAsset>;

  @state.wallet.settings.shouldBalanceBeHidden private shouldBalanceBeHidden!: boolean;

  @Watch('id', { immediate: true })
  private async updateHistory(curr: number, prev: number) {
    this.checkTriggerUpdate(curr, prev);
  }

  pageAmount = 5; // override PaginationSearchMixin

  get lockedAssetSymbol(): string {
    return this.lockedAsset?.symbol ?? '';
  }

  get debtAssetSymbol(): string {
    return this.debtAsset?.symbol ?? '';
  }

  // override IndexerDataFetchMixin
  get dataVariables(): FetchVariables {
    return {
      id: this.id,
      first: this.pageAmount,
      offset: this.pageAmount * (this.currentPage - 1),
    };
  }

  // override IndexerDataFetchMixin
  get updateVariables(): FetchVariables {
    return {
      id: this.id,
      fromTimestamp: this.intervalTimestamp,
    };
  }

  // override IndexerDataFetchMixin
  getItemTimestamp(item: Nullable<VaultEvent>): number {
    return item?.timestamp ?? 0;
  }

  // override IndexerDataFetchMixin
  async requestData(variables: FetchVariables): Promise<{ items: VaultEvent[]; totalCount: number }> {
    return await fetchVaultEvents(variables);
  }

  getTitle(type: VaultEventType): string {
    switch (type) {
      case VaultEventTypes.Created:
        return this.t('operations.CreateVault');
      case VaultEventTypes.Closed:
        return this.t('operations.CloseVault');
      case VaultEventTypes.DebtIncreased:
        return this.t('operations.BorrowVaultDebt');
      case VaultEventTypes.CollateralDeposit:
        return this.t('operations.DepositCollateral');
      case VaultEventTypes.DebtPayment:
        return this.t('operations.RepayVaultDebt');
      case VaultEventTypes.Liquidated:
        return this.t('kensetsu.liquidated');
      default:
        return '';
    }
  }

  getOperationMessage(item: VaultEvent): string {
    const hidden = this.shouldBalanceBeHidden;
    switch (item.type) {
      case VaultEventTypes.Created:
        return this.t('operations.finalized.CreateVault', {
          symbol: this.debtAssetSymbol,
          symbol2: this.lockedAssetSymbol,
        });
      case VaultEventTypes.Closed:
        return this.t('operations.finalized.CloseVault', {
          symbol: this.debtAssetSymbol,
          symbol2: this.lockedAssetSymbol,
        });
      case VaultEventTypes.DebtIncreased:
        return this.t('operations.finalized.BorrowVaultDebt', {
          symbol: this.debtAssetSymbol,
          amount: hidden ? WALLET_CONSTS.HiddenValue : item.amount?.toLocaleString(),
        });
      case VaultEventTypes.CollateralDeposit:
        return this.t('operations.finalized.DepositCollateral', {
          symbol: this.lockedAssetSymbol,
          amount: hidden ? WALLET_CONSTS.HiddenValue : item.amount?.toLocaleString(),
        });
      case VaultEventTypes.DebtPayment:
        return this.t('operations.finalized.RepayVaultDebt', {
          symbol: this.debtAssetSymbol,
          amount: hidden ? WALLET_CONSTS.HiddenValue : item.amount?.toLocaleString(),
        });
      case VaultEventTypes.Liquidated:
        return this.t('kensetsu.liquidatedMessage', {
          symbol: this.lockedAssetSymbol,
          amount: hidden ? WALLET_CONSTS.HiddenValue : item.amount?.toLocaleString(),
        });
      default:
        return '';
    }
  }
}
</script>

<style lang="scss">
.details-history .el-loading-mask {
  background-color: var(--s-color-utility-surface);
}
</style>

<style lang="scss" scoped>
$history-item-height: 48px;
$history-items-length: 5;

.details-history {
  box-shadow: var(--s-shadow-element-pressed);

  &__items {
    height: $history-item-height * $history-items-length;
  }

  &__empty {
    margin: $basic-spacing 0;
    text-align: center;
  }

  .history-item {
    font-size: var(--s-font-size-mini);
    min-height: $history-item-height;
    padding: calc(var(--s-basic-spacing) + 1px) 0;
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
        width: 100%;
        content: '';
        background-color: var(--s-color-base-border-secondary);
      }
    }
    &-info {
      align-items: flex-start;
    }
    &-title {
      padding-right: var(--s-basic-spacing);
      line-height: var(--s-line-height-mini);
    }
    &-operation {
      flex-shrink: 0;
      color: var(--s-color-theme-accent-hover);
      margin-right: calc(var(--s-basic-spacing) / 2);
    }
    &-date {
      color: var(--s-color-base-content-secondary);
      line-height: var(--s-line-height-mini);
      margin-top: calc(var(--s-basic-spacing) / 2);
    }
  }
}
</style>
