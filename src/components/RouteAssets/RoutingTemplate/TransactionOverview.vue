<template>
  <div class="container routing-template-transactions">
    <div class="routing-template-transactions__header">
      <div>
        <generic-page-header :title="t('adar.routeAssets.routingTemplate.overview.title')" class="page-header__title" />
      </div>
    </div>
    <div>
      <s-table :data="tableData" :highlight-current-row="false" size="big" class="transactions-table">
        <s-table-column prop="name">
          <template #header>
            <span>{{ t('adar.routeAssets.routingTemplate.overview.name') }}</span>
          </template>
        </s-table-column>

        <!-- WALLET -->
        <s-table-column prop="wallet" width="130">
          <template #header>
            <span>{{ t('adar.routeAssets.routingTemplate.overview.wallet') }}</span>
          </template>
          <template v-slot="{ row }">
            <s-dropdown
              type="button"
              buttonType="link"
              placement="bottom-start"
              class="wallet-address"
              @select="handleCopyAddress(row.wallet)"
            >
              <div class="ellipsis">{{ row.wallet }}</div>
              <template slot="menu">
                <s-dropdown-item>
                  <div class="wallet-tooltip">
                    <div>{{ row.wallet }}</div>
                    <div><s-icon class="icon-divider scale-icon" name="copy-16" /></div>
                  </div>
                </s-dropdown-item>
              </template>
            </s-dropdown>
          </template>
        </s-table-column>

        <!-- USD -->
        <s-table-column prop="usd" class="usd-column">
          <template #header>
            <span>{{ t('adar.routeAssets.routingTemplate.overview.usd') }}</span>
          </template>
          <template v-slot="{ row }">
            <div>
              <span class="usd-column__data">{{ Number(row.usd).toLocaleString('en-US') }}</span>
            </div>
          </template>
        </s-table-column>

        <!-- ASSET -->
        <s-table-column prop="asset">
          <template #header>
            <span>{{ t('adar.routeAssets.routingTemplate.overview.asset') }}</span>
          </template>
          <template v-slot="{ row }">
            <token-select-button :token="row.asset" disabled />
          </template>
        </s-table-column>

        <!-- AMOUNT -->
        <s-table-column prop="total" width="180">
          <template #header>
            <span>{{ t('adar.routeAssets.routingTemplate.overview.amount') }}</span>
          </template>
          <template v-slot="{ row }">
            <div class="amount-property">
              <span class="amount-property__symbol">{{ row.asset.symbol }}</span>
              <span class="amount-property__amount">{{ row.amount }}</span>
            </div>
          </template>
        </s-table-column>

        <!-- STATUS -->
        <s-table-column prop="status" class="status-property" width="158">
          <template #header>
            <span>{{ t('adar.routeAssets.routingTemplate.overview.status') }}</span>
          </template>
          <template v-slot="{ row }">
            <div class="status-property__data">
              <div :class="`status-property__label status-property__label_${getStatusClass(row)}`">
                {{ getStatus(row) || 'valid' }}
              </div>
            </div>
          </template>
        </s-table-column>

        <!-- MENU -->
        <s-table-column width="40">
          <template v-slot="{ row }">
            <s-dropdown
              class="s-dropdown--hash-menu"
              borderRadius="mini"
              type="ellipsis"
              icon="basic-more-vertical-24"
              placement="bottom-end"
              :disabled="!processed"
              @select="(action) => action(row.id)"
            >
              <template slot="menu">
                <s-dropdown-item
                  v-for="(link, idx) in dropdownMenuItems"
                  :key="idx"
                  :value="link.action"
                  class="s-dropdown-menu__item menu__link"
                >
                  {{ link.title }}
                </s-dropdown-item>
              </template>
            </s-dropdown>
          </template>
        </s-table-column>
      </s-table>
      <s-pagination
        class="transactions-table-pagination"
        :layout="'prev, total, next'"
        :current-page.sync="currentPage"
        :page-size="pageAmount"
        :total="tableData.length"
        @prev-click="handlePrevClick"
        @next-click="handleNextClick"
      />
      <s-divider />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { copyToClipboard } from '@/utils';
@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
  },
})
export default class TransactionOverview extends Mixins(TranslationMixin, mixins.PaginationSearchMixin) {
  @Prop() readonly processed!: boolean;
  @Prop() recipients!: Array<any>;

  showTable = false;
  showFullWalletAddress = false;

  toggleShowFullWalletAddress() {}

  dropdownMenuItems = [
    {
      title: 'SoraScan',
      action: () => {},
    },
    {
      title: 'Repeat',
      action: () => {},
    },
  ];

  async handleCopyAddress(address): Promise<void> {
    try {
      await copyToClipboard(address);
      this.$notify({
        message: `${this.t('account.successCopy')}`,
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

  pageAmount = 10;

  toggleShowTable() {
    this.showTable = !this.showTable;
  }

  addressIsValid(address) {
    return api.validateAddress(address);
  }

  getStatus(recipient) {
    if (!this.processed) return this.addressIsValid(recipient.wallet) ? 'Address valid' : 'Address invalid';
    else return 'pending';
  }

  getStatusClass(recipient) {
    if (!this.processed) return this.addressIsValid(recipient.wallet) ? 'valid' : 'invalid';
  }

  get tableData() {
    return this.recipients || [];
  }

  get arrowState() {
    return this.showTable ? 'reverse' : '';
  }

  get xor() {
    return XOR;
  }
}
</script>

<style lang="scss">
.routing-template-transactions {
  .transactions-table.el-table {
    @include routes-table;

    tr {
      cursor: default;
      button {
        cursor: default;
      }
    }
    td .ellipsis {
      @include text-ellipsis;
    }
    .usd-column {
      &__data::before {
        content: '$';
        display: inline;
        color: var(--s-color-brand-day);
        margin-right: 4px;
      }
    }

    .wallet-address {
      width: 100%;

      > button {
        width: 100%;
        padding: 0;
        text-transform: lowercase;

        i {
          display: none;
        }
      }
    }
  }
  .status-property {
    &__data {
      display: flex;
    }
    &__label {
      border-radius: var(--s-border-radius-mini);
      padding: 4px 16px;
      text-transform: capitalize;
      border: 2px solid var(--s-color-status-warning);
      color: var(--s-color-status-warning);
      white-space: nowrap;
      &_valid,
      &_successed {
        border: 2px solid var(--s-color-status-success);
        color: var(--s-color-status-success);
      }
      &_invalid,
      &_error {
        border: 2px solid var(--s-color-status-error);
        color: var(--s-color-status-error);
      }
    }
  }

  .transactions-table-pagination {
    @include pagination;
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}
.routing-template-transactions {
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
    margin-top: 20px;
    display: inline-flex;
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

.amount-property {
  &__symbol {
    color: var(--s-color-brand-day);
    margin-right: 4px;
  }
}

.scale-icon {
  transform: scale(0.75) !important;
}

.ellipsis {
  @include text-ellipsis;
}

.wallet-tooltip {
  @include flex-start;
  display: inline-flex;
  gap: 4px;
}

.scale-icon {
  transform: scale(0.75) !important;
}

.available-field {
  &__value {
    @include flex-start;
    gap: 16px;
  }

  &__add-info {
    @include flex-start;
    gap: 4px;
  }
}
</style>
