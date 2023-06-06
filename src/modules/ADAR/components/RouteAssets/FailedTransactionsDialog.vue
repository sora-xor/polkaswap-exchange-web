<template>
  <div class="failed-transaction-dialog">
    <dialog-base :visible.sync="isVisible" :title="'Failed transactions'" custom-class="dialog__failed-transaction">
      <div>
        <s-table :data="tableData" :highlight-current-row="false" size="big" class="failed-transactions-table">
          <!-- INDEX -->
          <s-table-column width="40">
            <template #header>
              <span>{{ '#' }}</span>
            </template>
            <template v-slot="{ $index }">
              <div>
                <span>{{ $index + 1 }}</span>
              </div>
            </template>
          </s-table-column>
          <!-- LABEL -->
          <s-table-column width="60">
            <template #header>
              <span>⬥</span>
            </template>
            <template v-slot="{ row }">
              <div class="name-label">
                <div>{{ getInitials(row) }}</div>
              </div>
            </template>
          </s-table-column>

          <!-- NAME -->
          <s-table-column prop="name" sortable>
            <template #header>
              <span>{{ 'name' }}</span>
            </template>
          </s-table-column>

          <!-- WALLET -->
          <s-table-column prop="wallet" width="130">
            <template #header>
              <span>{{ 'wallet' }}</span>
            </template>
            <template v-slot="{ row }">
              <s-dropdown
                type="button"
                buttonType="link"
                placement="bottom-start"
                class="wallet-address"
                @select="handleCopyAddress(row.wallet)"
              >
                <div>{{ formatAddress(row.wallet) }}</div>
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
          <s-table-column prop="usd" class="usd-column" sortable>
            <template #header>
              <span>{{ 'usd' }}</span>
            </template>
            <template v-slot="{ row }">
              <div>
                <span class="usd-column__data">{{ formatNumber(row.usd) }}</span>
              </div>
            </template>
          </s-table-column>

          <s-table-column>
            <template #header>
              <span>{{ 'In tokens' }}</span>
            </template>
            <template v-slot="{ row }">
              <div class="in-tokens">
                <div>{{ getAmount(row) }}</div>
                <div class="in-tokens__asset">
                  <div><token-logo class="token-logo" :token="row.asset" /></div>
                  <div>{{ row.asset.symbol }}</div>
                </div>
              </div>
            </template>
          </s-table-column>

          <!-- STATUS -->
          <s-table-column prop="status" class="status-property" width="158">
            <template #header>
              <span>{{ 'status' }}</span>
            </template>
            <template v-slot="{ row }">
              <div class="status-property__data">
                <div :class="`status-property__label status-property__label_${getStatusClass(row)}`">
                  {{ getStatus(row) || 'valid' }}
                </div>
              </div>
            </template>
          </s-table-column>

          <!-- BUTTON -->
          <!-- <s-table-column>
            <template v-slot="{ row }">
              <s-button
                type="primary"
                class="s-typography-button--big rerun-button"
                :disabled="isButtonDisabled(row)"
                @click.stop="reRunTransaction(row)"
              >
                {{ 'RE-RUN' }}
              </s-button>
            </template>
          </s-table-column> -->
        </s-table>
        <s-pagination
          class="failed-transactions-table-pagination"
          :layout="'prev, total, next'"
          :current-page.sync="currentPage"
          :page-size="pageAmount"
          :total="filteredItems.length"
          @prev-click="handlePrevClick"
          @next-click="handleNextClick"
        />
      </div>
      <s-button
        type="primary"
        class="s-typography-button--big rerun-all-button"
        @click.stop="reRunAll"
        :disabled="rerunAllButtonDisabled"
      >
        {{ 'RE-RUN ALL' }}
      </s-button>
    </dialog-base>
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { action, getter } from '@/store/decorators';
import { Recipient, RecipientStatus } from '@/store/routeAssets/types';
import { copyToClipboard, formatAddress } from '@/utils';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
  },
})
export default class FailedTransactionsDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.PaginationSearchMixin
) {
  @getter.routeAssets.incompletedRecipients private recipients!: Array<Recipient>;
  @action.routeAssets.repeatTransaction private repeatTransaction!: ({ inputAsset, id }) => Promise<void>;
  @action.routeAssets.runAssetsRouting runAssetsRouting!: () => Promise<void>;

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

  async reRunTransaction(recipient) {
    this.repeatTransaction(recipient.id).catch((error) => {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: '',
      });
    });
  }

  async reRunAll() {
    this.runAssetsRouting()
      .then(() => {
        if (this.recipients.length < 1) {
          this.$emit('update:visible', false);
        }
      })
      .catch((error) => {
        this.$notify({
          message: `${this.t('warningText')} ${error}`,
          type: 'warning',
          title: '',
        });
      });
  }

  formatAddress(wallet) {
    return formatAddress(wallet, 10);
  }

  getStatus(recipient) {
    return recipient.status;
  }

  getStatusClass(recipient) {
    return recipient.status.toLowerCase().split(' ').join('-');
  }

  getAmount(recipient) {
    return this.formatNumber(recipient.amount);
  }

  getInitials(recipient) {
    return recipient.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 3)
      .join('');
  }

  formatNumber(num) {
    return num.toLocaleString('en-US', {
      maximumFractionDigits: 4,
    });
  }

  handleResetSearch(): void {
    this.resetPage();
    this.resetSearch();
  }

  isButtonDisabled(recipient) {
    return recipient.status !== RecipientStatus.FAILED;
  }

  get rerunAllButtonDisabled() {
    return this.recipients.some((item) => item.status === RecipientStatus.PENDING);
  }

  get filteredItems() {
    const search = this.query.toLowerCase().trim();

    if (!search) return this.recipients;
    return (
      this.recipients?.filter((recipient) => recipient.name.toLowerCase().includes(this.query.toLowerCase())) || []
    );
  }

  get tableData() {
    return this.getPageItems(this.filteredItems) || [];
  }

  get xor() {
    return XOR;
  }

  get recipientsLength() {
    return this.recipients.length;
  }

  @Watch('recipientsLength')
  recipientsLengthHandler(newVal) {
    if (newVal === 0) this.$emit('update:visible', false);
  }
}
</script>

<style lang="scss">
.dialog__failed-transaction {
  .el-dialog {
    max-width: 988px;
    &__body {
      > div > div {
        margin-bottom: $inner-spacing-medium;
      }
    }
  }

  .failed-transactions-table.el-table {
    @include routes-table;

    tr {
      cursor: default;
    }
    td .ellipsis {
      @include text-ellipsis;
    }

    .usd-column {
      &__data {
        color: var(--s-color-status-warning);
      }
      &__data::before {
        content: '$';
        display: inline;
        margin-right: 4px;
      }
    }

    .wallet-address {
      width: 100%;
      > button {
        width: 100%;
        padding: 0;
        text-transform: none;

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
      text-transform: uppercase;
      white-space: nowrap;
      &_success::after,
      &_address-valid::after {
        content: '✓';
        display: inline;
        color: var(--s-color-status-success);
      }
      &_pending::after {
        content: '...';
        display: inline;
        color: var(--s-color-status-warning);
      }
      &_invalid::after,
      &_address-invalid::after,
      &_failed::after {
        content: '✕';
        display: inline;
        color: var(--s-color-status-error);
      }
    }
  }

  .token-logo {
    > span {
      width: 24px;
      height: 24px;
    }
  }

  .failed-transactions-table-pagination {
    @include pagination;
  }

  .buttons-container {
    @include flex-between;
    // box-shadow: 0px -10px 20px rgba(0, 0, 0, 0.04);
    margin-top: 16px;

    button {
      width: 200px;
    }
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}
.failed-transaction-dialog {
  font-weight: 600;
  font-size: var(--s-font-size-medium);
}

.wallet-tooltip {
  @include flex-start;
  display: inline-flex;
  gap: 4px;
}

.name-label {
  border: 1px solid #e2e8f0;
  border-radius: 1000px;
  background: #334155;
  width: 32px;
  height: 32px;
  color: white;
  font-size: 9px;
  @include flex-center;
}

.in-tokens {
  &__asset {
    @include flex-start;
    gap: 8px;
  }
}

.rerun-all-button {
  margin-left: auto;
  margin-bottom: 16px;
  display: block;
}

.rerun-button {
  box-shadow: none !important;
  cursor: pointer;
}
</style>
