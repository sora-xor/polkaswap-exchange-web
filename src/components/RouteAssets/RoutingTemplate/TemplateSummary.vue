<template>
  <div class="container routing-template-summary">
    <div class="routing-template-summary__header">
      <div>
        <generic-page-header :title="t('adar.routeAssets.routingTemplate.summary.title')" class="page-header__title" />
      </div>
      <div class="routing-template-summary__accept-button">
        <s-button type="primary" class="s-typography-button--big" @click="onRouteAssetsButtonClick">
          {{ submitButtonTitle }}
        </s-button>
      </div>
    </div>
    <div class="routing-template-summary__info">
      <div>
        <p>{{ t('adar.routeAssets.routingTemplate.summary.asset') }}</p>
        <div>
          <token-select-button
            :token="asset"
            :icon="processed ? '' : 'chevron-down-rounded-16'"
            :disabled="processed"
            @click.stop="$emit('onTokenSelectClick')"
          />
        </div>
      </div>
      <s-divider />
      <div>
        <p>
          {{
            processed
              ? t('adar.routeAssets.routingTemplate.summary.usdRouted')
              : t('adar.routeAssets.routingTemplate.summary.usdCount')
          }}
        </p>
        <div class="usd-property">
          <span class="usd-property__data">{{ summaryData.totalUsd.toLocaleString('en-US') }}</span>
        </div>
      </div>
      <s-divider v-if="processed" />
      <div v-if="processed">
        <p>{{ t('adar.routeAssets.routingTemplate.summary.usdAuthorized') }}</p>
        <div class="usd-property">
          <span class="usd-property__data">{{ summaryData.totalUsd.toLocaleString('en-US') }}</span>
        </div>
      </div>
      <s-divider />
      <div class="amount-property">
        <p>
          {{
            processed
              ? t('adar.routeAssets.routingTemplate.summary.tokenRouted', { token: asset.symbol })
              : t('adar.routeAssets.routingTemplate.summary.estimatedTokes', { token: asset.symbol })
          }}
        </p>
        <div>
          <span class="amount-property__symbol">{{ asset.symbol }}</span>
          <span class="amount-property__amount">{{
            Number(summaryData.totalAssetRequired).toLocaleString('en-US')
          }}</span>
        </div>
      </div>
      <s-divider v-if="!processed" />
      <div v-if="!processed" class="available-field">
        <p>{{ t('adar.routeAssets.routingTemplate.summary.available', { token: asset.symbol }) }}</p>
        <div class="available-field__value">
          <div>
            <span class="amount-property__symbol">{{ asset.symbol }}</span>
            <span class="amount-property__amount">{{ balance }}</span>
          </div>
          <div v-if="Number(assetsNeeded) > 0" class="available-field__add-info">
            <div>
              {{
                `${t('adar.routeAssets.routingTemplate.summary.add')} ${asset.symbol} ${Number(
                  assetsNeeded
                ).toLocaleString('en-US')}`
              }}
            </div>
            <div @click="handleCopyAmount"><s-icon class="icon-divider scale-icon" name="basic-copy-24" /></div>
            <div @click="onSwapIconClick"><s-icon class="icon-divider scale-icon" name="arrows-swap-24" /></div>
          </div>
          <div v-else>
            <span>
              <s-icon class="status__icon" :class="`status__icon_successed`" :name="'basic-check-marks-24'" />
            </span>
          </div>
        </div>
      </div>
      <s-divider />
      <div v-if="processed" class="total-transactions">
        <p>{{ 'total transaction success' }}</p>
        <div>
          <span class="total-transactions__completed">{{ 24 }}</span>
          /
          <span class="total-transactions__total">{{ 25 }}</span>
          <span><s-icon class="status__icon" :class="`status__icon_successed`" :name="'basic-check-marks-24'" /></span>
        </div>
      </div>
      <s-divider v-if="processed" />
    </div>
    <div class="routing-template-summary__summary-details">
      <div @click="toggleShowTable">
        <p>{{ t('adar.routeAssets.routingTemplate.summary.detailsToggle') }}</p>
        <div class="arrow" :class="arrowState">
          <s-icon class="icon-divider scale-icon" name="chevron-bottom-16" />
        </div>
      </div>
    </div>
    <div v-if="showTable" class="routing-template-summary__table">
      <s-table
        :data="summaryData.tableData"
        :highlight-current-row="false"
        size="big"
        class="summary-table"
        @row-click="(template) => $emit('onRowClick', template)"
      >
        <!-- OUTPUT ASSETS -->
        <s-table-column>
          <template #header>
            <span class="summary-table__header">{{ t('adar.routeAssets.routingTemplate.summary.table.asset') }}</span>
          </template>
          <template v-slot="{ row }">
            <token-select-button :token="row.asset" disabled />
          </template>
        </s-table-column>
        <!-- USD EQUIVALENT -->
        <s-table-column class="usd-property" prop="usd">
          <template #header>
            <span class="summary-table__header">{{ t('adar.routeAssets.routingTemplate.summary.table.usd') }}</span>
          </template>
          <template v-slot="{ row }">
            <div>
              <span class="usd-property__data">{{ Number(row.usd).toLocaleString('en-US') }}</span>
            </div>
          </template>
        </s-table-column>
        <!-- TOTAL ESTIMATED -->
        <s-table-column>
          <template #header>
            <span class="summary-table__header">{{ t('adar.routeAssets.routingTemplate.summary.table.total') }}</span>
          </template>
          <template v-slot="{ row }">
            <div class="amount-property">
              <span class="amount-property__symbol">{{ row.asset.symbol }}</span>
              <span class="amount-property__amount">{{ row.total }}</span>
            </div>
          </template>
        </s-table-column>
        <!-- ESTIMATED REQUIRED-->
        <s-table-column>
          <template #header>
            <span class="summary-table__header">{{
              processed
                ? t('adar.routeAssets.routingTemplate.summary.table.totalRouted', { token: asset.symbol })
                : t('adar.routeAssets.routingTemplate.summary.table.required', { token: asset.symbol })
            }}</span>
          </template>
          <template v-slot="{ row }">
            <div class="amount-property">
              <span class="amount-property__symbol">{{ asset.symbol }}</span>
              <span class="amount-property__amount">{{ formatNumber(row.required) }}</span>
            </div>
          </template>
        </s-table-column>
        <!-- TOTAL TRANSACTION SUCCESS-->
        <s-table-column v-if="processed">
          <template #header>
            <span class="summary-table__header">{{
              t('adar.routeAssets.routingTemplate.summary.table.transactions')
            }}</span>
          </template>
          <template v-slot="{ row }">
            <div class="amount-property">
              <span> {{ getTotalTransactionsSuccess(row).successed }} </span>/{{
                getTotalTransactionsSuccess(row).total
              }}
            </div>
          </template>
        </s-table-column>
      </s-table>
      <s-divider />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { Components, PageNames } from '@/consts';
import { lazyComponent, goTo } from '@/router';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import { getter, state } from '@/store/decorators';
import { FPNumber } from '@sora-substrate/util';
import { copyToClipboard, formatAssetBalance } from '@/utils';
@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
  },
})
export default class TemplateSummary extends Mixins(TranslationMixin) {
  @state.wallet.account.accountAssets private accountAssets!: Array<AccountAsset>;
  @state.wallet.account.fiatPriceAndApyObject private fiatPriceAndApyObject!: any;
  @getter.routeAssets.isProcessed processed!: boolean;

  @Prop({ default: () => XOR }) readonly asset!: Asset;
  @Prop() summaryData!: any;

  showTable = false;

  toggleShowTable() {
    this.showTable = !this.showTable;
  }

  async handleCopyAmount(): Promise<void> {
    try {
      await copyToClipboard(this.summaryData.totalAssetRequired);
      this.$notify({
        message: `${this.t('assets.copied')}`,
        type: 'success',
        title: '',
      });
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: '',
      });
    }
  }

  get assetsNeeded() {
    return this.formatNumber(this.summaryData.totalAssetRequired - Number(this.balance));
  }

  formatNumber(num: number | FPNumber) {
    return num.toFixed(2);
  }

  get balance(): string {
    const asset = this.accountAssets.find((item) => item.address === this.asset.address);
    return formatAssetBalance(asset) || '0';
  }

  getAssetUSDPrice(asset) {
    return this.formatNumber(FPNumber.fromCodecValue(this.fiatPriceAndApyObject[asset.address]?.price, 18));
  }

  getTotalTransactionsSuccess(tableRow) {
    return {
      total: 8,
      successed: 8,
    };
  }

  onSwapIconClick() {
    goTo(PageNames.Swap);
  }

  onRouteAssetsButtonClick() {
    if (!this.processed) this.$emit('onRouteAssetsClick');
  }

  get arrowState() {
    return this.showTable ? 'reverse' : '';
  }

  get xor() {
    return XOR;
  }

  get submitButtonTitle() {
    return this.processed
      ? this.t('adar.routeAssets.routingTemplate.downloadOverviewButton')
      : this.t('adar.routeAssets.routingTemplate.submitButton');
  }
}
</script>

<style lang="scss">
.routing-template-summary {
  .summary-table.el-table {
    @include routes-table;

    tr {
      cursor: default;
      button {
        cursor: default;
      }
    }

    thead {
      th > .cell {
        text-overflow: clip;
        > span {
          white-space: normal !important;
        }
      }
    }
  }

  .amount-property {
    &__symbol {
      color: var(--s-color-brand-day);
      margin-right: 4px;
    }
  }

  .usd-property {
    &__data::before {
      content: '$';
      display: inline;
      color: var(--s-color-brand-day);
      margin-right: 4px;
    }
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}
.routing-template-summary {
  font-weight: 600;
  font-size: var(--s-font-size-medium);

  &__header {
    @include flex-between;
  }

  &__info {
    > div {
      @include flex-start;
      gap: 16px;
      > p {
        width: 35%;
        text-transform: uppercase;
        font-weight: 800;
        font-size: var(--s-font-size-small);
        color: var(--s-color-brand-day);
      }

      > div {
        font-size: var(--s-font-size-big);
        width: 65%;
      }
    }
  }

  &__summary-details {
    display: inline-flex;
    font-weight: 300;
    > div {
      @include flex-start;
      gap: 4px;
      cursor: pointer;
    }
    .arrow {
      width: 18px;
      height: 18px;
      background: var(--s-color-base-content-tertiary);
      color: white;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: 0.3s;
      &.reverse {
        transform: rotate(180deg);
      }

      > i {
        color: inherit;
      }
    }
  }
}

.scale-icon {
  transform: scale(0.75) !important;
}

.status {
  &__value {
    @include flex-start;
    gap: 4px;
    text-transform: capitalize;
  }
  &__icon {
    &_pending {
      color: var(--s-color-status-warning);
    }
    &_successed {
      color: var(--s-color-status-success);
    }
    &_error {
      color: var(--s-color-status-error);
    }
  }
}

.available-field {
  &__value {
    @include flex-start;
    gap: 16px;
  }

  &__add-info {
    @include flex-start;
    gap: 4px;
    font-size: 14px;
  }
}
</style>
