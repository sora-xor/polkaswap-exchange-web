<template>
  <div v-loading="!tableData" class="container routing-template-transactions">
    <div class="routing-template-transactions__header">
      <!-- <div> -->
      <generic-page-header :title="`Transaction overview (${recipients.length})`" class="page-header__title">
      </generic-page-header>
      <search-input
        v-model="query"
        :placeholder="'Search...'"
        autofocus
        @clear="handleResetSearch"
        class="routing-template-transactions__search"
      />
      <!-- </div> -->
    </div>
    <div>
      <s-table :data="tableData" :highlight-current-row="false" size="big" class="transactions-table">
        <!-- INDEX -->
        <s-table-column width="40">
          <template #header>
            <span>{{ '#' }}</span>
          </template>
          <template v-slot="{ row }">
            <div>
              <span>{{ row.num }}</span>
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
                    <div><s-icon class="icon-divider" name="copy-16" /></div>
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

        <!-- MENU -->
        <!-- <s-table-column width="40">
          <template v-slot="{ row }">
            <s-dropdown
              class="s-dropdown--hash-menu"
              borderRadius="mini"
              type="ellipsis"
              icon="basic-more-vertical-24"
              placement="bottom-end"
              @select="(action) => action(row)"
              @click="() => {}"
            >
              <template slot="menu">
                <s-dropdown-item
                  v-for="(link, idx) in dropdownMenuItems"
                  :key="idx"
                  :value="link.action"
                  :disabled="true"
                  class="s-dropdown-menu__item menu__link"
                >
                  {{ link.title }}
                </s-dropdown-item>
              </template>
            </s-dropdown>
          </template>
        </s-table-column> -->
      </s-table>
      <s-pagination
        class="transactions-table-pagination"
        :layout="'prev, total, next'"
        :current-page.sync="currentPage"
        :page-size="pageAmount"
        :total="filteredItems.length"
        @prev-click="handlePrevClick"
        @next-click="handleNextClick"
      />
    </div>
    <div class="buttons-container">
      <s-button type="secondary" class="s-typography-button--big" @click.stop="previousStage">
        {{ `back` }}
      </s-button>
      <s-button type="primary" class="s-typography-button--big" @click.stop="onContinueClick">
        {{ 'Continue' }}
      </s-button>
    </div>
    <select-input-asset-dialog
      :visible.sync="showSelectInputAssetDialog"
      @onInputAssetSelected="onInputAssetSelected"
    ></select-input-asset-dialog>
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import { AdarComponents } from '@/modules/ADAR/consts';
import { adarLazyComponent } from '@/modules/ADAR/router';
import router, { lazyComponent } from '@/router';
import { action, getter, state } from '@/store/decorators';
import { RecipientStatus } from '@/store/routeAssets/types';
import validate from '@/store/routeAssets/utils';
import { copyToClipboard, formatAddress } from '@/utils';
@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectInputAssetDialog: adarLazyComponent(AdarComponents.RouteAssetsSelectInputAssetDialog),
    TokenLogo: components.TokenLogo,
    SearchInput: components.SearchInput,
  },
})
export default class TransactionOverview extends Mixins(TranslationMixin, mixins.PaginationSearchMixin) {
  @getter.routeAssets.recipients recipients!: Array<any>;
  @action.routeAssets.setInputToken setInputToken!: any;
  @action.routeAssets.processingNextStage nextStage!: any;
  @action.routeAssets.processingPreviousStage previousStage!: any;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  showSelectInputAssetDialog = false;

  dropdownMenuItems = [
    {
      title: 'SoraScan',
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

  onContinueClick() {
    if (this.isLoggedIn) {
      this.showSelectInputAssetDialog = true;
      return;
    }
    this.handleConnectWallet();
  }

  handleConnectWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  formatAddress(wallet) {
    return formatAddress(wallet, 10);
  }

  onInputAssetSelected(asset) {
    this.setInputToken(asset);
    this.showSelectInputAssetDialog = false;
    this.nextStage();
  }

  getStatus(recipient) {
    return validate.wallet(recipient.wallet) ? RecipientStatus.ADDRESS_VALID : RecipientStatus.ADDRESS_INVALID;
  }

  getStatusClass(recipient) {
    return !validate.wallet(recipient.wallet) ? 'invalid' : 'success';
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

  get filteredItems() {
    const search = this.query.toLowerCase().trim();

    if (!search) return this.recipients;
    return (
      this.recipients?.filter((recipient) => recipient.name.toLowerCase().includes(this.query.toLowerCase())) || []
    );
  }

  get tableData() {
    return this.getPageItems(this.filteredItems?.map((item, idx) => ({ num: idx + 1, ...item }))) || [];
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
    text-align: left;

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
      &_success::after {
        content: '✓';
        display: inline;
        color: var(--s-color-status-success);
      }
      &_invalid::after {
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

  .transactions-table-pagination {
    @include pagination;
  }

  .buttons-container {
    @include flex-between;
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
.routing-template-transactions {
  font-weight: 600;
  font-size: var(--s-font-size-medium);

  &__header {
    @include flex-between;
  }

  &__search {
    width: 300px;
  }
}

.ellipsis {
  @include text-ellipsis;
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
</style>
