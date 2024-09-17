<template>
  <div v-if="asset" class="asset-owner-details-container">
    <s-button
      class="asset-owner-details-back"
      type="action"
      size="small"
      alternative
      :tooltip="t('assets.details')"
      @click="handleBack"
    >
      <s-icon name="arrows-chevron-left-rounded-24" size="24" />
    </s-button>
    <s-row class="asset-owner-details-main" :gutter="26">
      <s-col :xs="12" :sm="12" :md="5" :lg="5">
        <s-card class="asset details-card" border-radius="small" shadow="always" size="big" primary>
          <p class="p3">Your SBT</p>
          <div class="asset-title s-flex">
            <div class="asset-title__text s-flex-column">
              <h3 class="asset-title__name">{{ asset.name }}</h3>
              <token-address :address="asset.address" :symbol="asset.symbol" />
            </div>
            <token-logo class="asset-title__icon" size="big" :token="asset" />
          </div>
          <s-divider />
          <div class="sbt-info">
            <!-- <div>
              <span class="sbt-info-property">Accounts with permission</span>
              <span class="sbt-info-value">n/a</span>
            </div>
            <s-divider /> -->
            <div>
              <span class="sbt-info-property">Regulated assets connected</span>
              <span class="sbt-info-value">{{ sbtMetaInfo?.regulatedAssets?.length }}</span>
            </div>
            <s-divider />
            <div>
              <span class="sbt-info-property">Regulated pools</span>
              <span class="sbt-info-value">0</span>
            </div>
          </div>
        </s-card>
        <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
          <div class="asset-managers s-flex">
            <p class="p3">SBT Managers <span class="asset-managers-number">(1)</span></p>
          </div>
          <account-card class="details-card-issuer">
            <template #avatar>
              <wallet-avatar slot="avatar" class="account-gravatar" :address="asset.address" :size="28" />
            </template>
            <template #description>
              <div class="asset-details-instition-mark">{{ t('sbtDetails.regulatedInsitution') }}</div>
              <formatted-address :value="accountAddress" :symbols="24" :tooltip-text="t('account.walletAddress')" />
            </template>
            <span class="details-card-issuer-self">(You)</span>
          </account-card>
        </s-card>
      </s-col>
      <s-col :xs="12" :sm="12" :md="7" :lg="7">
        <s-card
          class="details-card asset-manager-account-list"
          border-radius="small"
          shadow="always"
          size="big"
          primary
        >
          <div class="asset-managers-issue s-flex">
            <p class="p3">Account with SBT access <span class="asset-managers-number">(0)</span></p>
            <s-button
              class="asset-managers-issue-access-btn s-typography-button--small"
              size="mini"
              type="primary"
              @click="openGrantPrivilegeDialog"
            >
              Issue SBT access
            </s-button>
          </div>
          <div class="asset-managers-issue--empty-list">
            <h4 class="asset-managers-start-title">Start issuing access for the SBT to accounts</h4>
            <s-button
              class="asset-managers-issue-access-btn s-typography-button--small"
              size="mini"
              type="primary"
              @click="openGrantPrivilegeDialog"
            >
              Issue SBT access
            </s-button>
          </div>
        </s-card>
        <s-card
          class="details-card asset-manager-token-list"
          border-radius="small"
          shadow="always"
          size="big"
          primary
          :style="sbtMetaInfo.regulatedAssets?.length ? { 'min-height': '540px' } : ''"
        >
          <div class="asset-managers-issue s-flex">
            <p class="p3">Permissioned assets</p>
            <s-button
              class="asset-managers-issue-access-btn s-typography-button--small"
              size="mini"
              type="primary"
              @click="openAssetCreateDialog"
            >
              Add regulated assets
            </s-button>
          </div>
          <div v-if="!sbtMetaInfo.regulatedAssets?.length" class="asset-managers-options">
            <div class="asset-managers-options-add-new" @click="openAssetCreate('new')">
              <s-button type="action" icon="plus-16" :disabled="loading" />
              <h4>Create a new asset</h4>
              <p>Set up a new permissioned asset for the SBT</p>
            </div>
            <div class="asset-managers-options-add-new" @click="openAssetCreate('existing')">
              <s-button type="action" icon="search-16" :disabled="loading" />
              <h4>Add an existing asset</h4>
              <p>Add an already created asset for the SBT</p>
            </div>
          </div>
          <div v-else>
            <search-input
              ref="search"
              v-model="queryTokens"
              class="asset-managers__tokens-search"
              autofocus
              :placeholder="t('addAsset.searchInputText')"
              @clear="handleClearSearchTokens"
            />
            <s-table
              ref="table"
              v-loading="loadingState"
              :data="tableItems"
              :highlight-current-row="false"
              size="small"
              class="explore-table"
            >
              <!-- Index -->
              <s-table-column min-width="290" label="#">
                <template #header>
                  <div class="explore-table-item-index"></div>
                  <div class="explore-table-item-logo">
                    <s-icon name="various-bone-24" size="14px" class="explore-table-item-logo--head" />
                  </div>
                  <div class="explore-table-item-info explore-table-item-info--head">
                    <span class="explore-table__primary">{{ t('nameText') }}</span>
                    <span class="explore-table__secondary">({{ t('tokens.assetId') }})</span>
                  </div>
                </template>
                <template v-slot="{ $index, row }">
                  <span class="explore-table-item-index explore-table-item-index--body">{{
                    $index + startIndex + 1
                  }}</span>
                  <token-logo class="explore-table-item-logo" :token-symbol="row.symbol" />
                  <div class="explore-table-item-info explore-table-item-info--body">
                    <div class="explore-table-item-name">{{ row.symbol }}</div>
                    <div class="explore-table__secondary explore-table__token-name">{{ row.name }}</div>
                    <div class="explore-table-item-address">
                      <token-address
                        class="explore-table-item-address__value"
                        :show-name="false"
                        :name="row.name"
                        :symbol="row.symbol"
                        :address="row.address"
                      />
                    </div>
                  </div>
                </template>
              </s-table-column>
              <!-- Price -->
              <s-table-column key="price" min-width="130" header-align="left" align="left">
                <template #header>
                  <span class="explore-table__primary">Price</span>
                </template>
                <template v-slot="{ row }">
                  <formatted-amount
                    is-fiat-value
                    fiat-default-rounding
                    :font-weight-rate="FontWeightRate.MEDIUM"
                    :value="row.priceFormatted"
                    class="explore-table-item-price"
                  />
                </template>
              </s-table-column>

              <template v-if="hasTokensData">
                <!-- 1D Volume -->
                <s-table-column min-width="104" header-align="right" align="right">
                  <template #header>
                    <span class="explore-table__primary">1D %</span>
                  </template>
                  <template v-slot="{ row }">
                    <formatted-amount
                      is-fiat-value
                      :font-weight-rate="FontWeightRate.MEDIUM"
                      :value="row.volumeDayFormatted.amount"
                      class="explore-table-item-price explore-table-item-amount"
                    >
                      {{ row.volumeDayFormatted.suffix }}
                    </formatted-amount>
                  </template>
                </s-table-column>
              </template>
            </s-table>

            <history-pagination
              class="explore-table-pagination"
              :current-page="currentPage"
              :page-amount="pageAmount"
              :total="filteredRegulatedAssets?.length"
              :last-page="lastPage"
              :loading="loadingState"
              @pagination-click="handlePaginationClick"
            />
          </div>
        </s-card>
      </s-col>
    </s-row>
    <grant-privilege :visible.sync="showGrantPrivilegeDialog" :sbt-address="asset.address" />
    <attach-regulated :visible.sync="showCreateAssetDialog" />
  </div>

  <div v-else class="asset-owner-details-container empty" />
</template>

<script lang="ts">
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { BreakpointClass } from '@/consts/layout';
import { fetchTokensData } from '@/indexer/queries/assets';
import { DashboardComponents, DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import type { OwnedAsset, AssetCreationType } from '@/modules/dashboard/types';
import router from '@/router';
import { getter, state } from '@/store/decorators';
import { waitUntil, formatAmountWithSuffix } from '@/utils';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    TokenAddress: components.TokenAddress,
    AccountCard: components.AccountCard,
    WalletAvatar: components.WalletAvatar,
    FormattedAddress: components.FormattedAddress,
    SearchInput: components.SearchInput,
    HistoryPagination: components.HistoryPagination,
    GrantPrivilege: dashboardLazyComponent(DashboardComponents.GrantPrivilegeDialog),
    AttachRegulated: dashboardLazyComponent(DashboardComponents.AttachRegulatedDialog),
  },
})
export default class AssetOwnerDetailsSBT extends Mixins(
  TranslationMixin,
  ExplorePageMixin,
  mixins.LoadingMixin,
  mixins.FormattedAmountMixin
) {
  @state.settings.screenBreakpointClass private responsiveClass!: BreakpointClass;
  @state.wallet.account.address accountAddress!: string;
  @getter.dashboard.ownedAssets private assets!: OwnedAsset[];

  showGrantPrivilegeDialog = false;
  showCreateAssetDialog = false;
  sbtMetaInfo = {} as any;
  queryTokens = '';
  queryAccounts = '';
  regulatedAssetsAttached = [] as any;

  currentPage = 1;
  pageAmount = 4;

  private tokensData: Record<string, any> = {};

  get tableItems() {
    return this.getPageItems(this.filteredRegulatedAssets);
  }

  get lastPage(): number {
    const total = this.filteredRegulatedAssets?.length;
    return total ? Math.ceil(total / this.pageAmount) : 1;
  }

  get hasTokensData(): boolean {
    return Object.keys(this.tokensData).length !== 0;
  }

  get filteredRegulatedAssets() {
    this.currentPage = 1;
    const ownerAssetsList = this.items;

    if (this.queryTokens) {
      const query = this.queryTokens.toLowerCase().trim();

      return ownerAssetsList.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.symbol.toLowerCase().includes(query) ||
          item.address.toLowerCase().includes(query)
      );
    }

    return ownerAssetsList;
  }

  get items() {
    return Object.entries(this.tokensData).reduce<any[]>((buffer, [address, tokenData]) => {
      const asset = this.getAsset(address);

      if (!asset) return buffer;

      buffer.push({
        ...asset,
        price: tokenData.priceUSD.toNumber(),
        priceFormatted: tokenData.priceUSD.toLocaleString(7),
        volumeDay: tokenData.volumeDayUSD.toNumber(),
        volumeDayFormatted: formatAmountWithSuffix(tokenData.volumeDayUSD),
      });

      return buffer;
    }, []);
  }

  get asset(): Nullable<any> {
    const assetId = this.$route.params.asset;
    if (!assetId) return null;
    const asset = this.assets.find(({ address }) => address === assetId);
    return {
      isSBT: true,
      ...asset,
    };
  }

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  async created(): Promise<void> {
    this.withApi(async () => {
      this.sbtMetaInfo = await api.extendedAssets.getSbtMetaInfo(this.$route.params.asset);
      this.updateExploreData();
    });
  }

  openAssetCreateDialog(): void {
    if (!this.sbtMetaInfo.regulatedAssets?.length) {
      this.openAssetCreate('new');
      return;
    }

    this.showCreateAssetDialog = true;
  }

  async mounted(): Promise<void> {
    this.withApi(async () => {
      if (!this.isLoggedIn) {
        router.push({ name: DashboardPageNames.AssetOwner });
        return;
      }

      await waitUntil(() => !this.parentLoading);

      if (!this.asset) {
        router.push({ name: DashboardPageNames.AssetOwner });
      }
    });
  }

  handleClearSearchAccounts(): void {
    this.queryAccounts = '';
  }

  handleClearSearchTokens(): void {
    this.queryTokens = '';
  }

  handleBack(): void {
    router.back();
  }

  openAssetCreate(type: AssetCreationType): void {
    router.push({ name: DashboardPageNames.AssetOwnerCreate, params: { type, sbtAddress: this.$route.params.asset } });
  }

  openGrantPrivilegeDialog(): void {
    this.showGrantPrivilegeDialog = true;
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        const assets = await fetchTokensData([]);

        const filtered = Object.fromEntries(
          Object.entries(assets).filter(([key, val]) => this.sbtMetaInfo.regulatedAssets.includes(key))
        );

        this.tokensData = Object.freeze(filtered);
      });
    });
  }
}
</script>

<style lang="scss" scoped>
.asset-owner-details {
  &-container {
    display: flex;
    gap: $basic-spacing;
    justify-content: center;

    &.empty {
      height: calc(100dvh - #{$header-height} - #{$footer-height});
    }

    .details-card {
      margin-bottom: 24px;
    }
  }
}
.asset-title,
.asset-balance,
.asset-supply {
  align-items: center;
}
.asset-title__text,
.asset-balance__info,
.asset-supply__info {
  flex: 1;
}
.asset__value {
  font-size: 20px;
}
.asset-supply-actions {
  margin-bottom: 8px;
}

.sbt-info {
  &-property {
    color: var(--s-color-base-content-secondary);
  }

  div {
    display: flex;
    justify-content: space-between;
  }
}

.details-card {
  &-issuer {
    margin-top: $basic-spacing;

    &-self {
      font-weight: 500;
      color: var(--s-color-base-content-secondary);
    }
  }
}

.asset-manager {
  &-account-list {
    min-width: 600px;
  }
  &-token-list {
    width: 600px;
  }
}

.explore-table-pagination {
  position: absolute;
  bottom: 35px;
  width: 96%;
}
</style>

<style lang="scss">
@include explore-table;

.asset-managers {
  &-options {
    display: flex;

    &-add-new {
      background-color: var(--s-color-utility-body);
      margin: $basic-spacing;
      padding: 32px;
      border-radius: 16px;
      box-shadow: var(--s-shadow-dialog);
      text-align: center;

      p {
        color: var(--s-color-base-content-secondary);
      }

      &:hover {
        cursor: pointer;
      }

      .el-button {
        margin-bottom: $basic-spacing;

        .s-icon-plus-16 {
          color: var(--s-color-theme-accent);
        }

        .s-icon-search-16 {
          color: var(--s-color-status-info);
        }
      }
    }
  }

  &__tokens-search {
    margin-bottom: $basic-spacing;
  }

  &-number {
    color: var(--s-color-base-content-secondary);
  }

  &-issue {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $basic-spacing;

    &-container {
      min-height: 300px;
    }

    &--empty-list {
      margin: auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 225px;
      width: 210px;

      .asset-managers-issue-access-btn {
        margin-top: $basic-spacing;
        margin-left: auto;
        margin-right: auto;
      }
    }
  }

  &-issue-access-btn.el-button--primary {
    height: 32px !important;
    span {
      font-size: 13px;
      padding: 0 4px;
      text-transform: none;
      font-variation-settings: 'wght' 550 !important;
    }
  }

  &-start-title {
    text-align: center;
  }
}
</style>
