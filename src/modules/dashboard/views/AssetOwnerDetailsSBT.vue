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
            <div>
              <span class="sbt-info-property">Accounts with permission</span>
              <span class="sbt-info-value">30</span>
            </div>
            <s-divider />
            <div>
              <span class="sbt-info-property">Regulated assets connected</span>
              <span class="sbt-info-value">0</span>
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
          class="details-card asset-managers-issue-container"
          border-radius="small"
          shadow="always"
          size="big"
          primary
        >
          <div class="asset-managers-issue s-flex">
            <p class="p3">Account with SBT access <span class="asset-managers-number">(0)</span></p>
            <s-button class="asset-managers-issue-access-btn s-typography-button--small" size="mini" type="primary">
              Issue SBT access
            </s-button>
          </div>
          <div class="asset-managers-issue--empty-list">
            <h4 class="asset-managers-start-title">Start issuing access for the SBT to accounts</h4>
            <s-button class="asset-managers-issue-access-btn s-typography-button--small" size="mini" type="primary">
              Issue SBT access
            </s-button>
          </div>
        </s-card>
        <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
          <div class="asset-managers-issue s-flex">
            <p class="p3">Permissioned assets</p>
            <s-button class="asset-managers-issue-access-btn s-typography-button--small" size="mini" type="primary">
              Add permissioned assets
            </s-button>
          </div>
          <div class="asset-managers-options">
            <div class="asset-managers-options-add-new">
              <s-button type="action" icon="plus-16" :disabled="loading" @click="createRegulatedAsset" />
              <h4>Create a new asset</h4>
              <p>Set up a new permissioned asset for the SBT</p>
            </div>
            <div class="asset-managers-options-add-new">
              <s-button type="action" icon="search-16" :disabled="loading" @click="createRegulatedAsset" />
              <h4>Add an existing asset</h4>
              <p>Add an already created asset for the SBT</p>
            </div>
          </div>
        </s-card>
      </s-col>
    </s-row>
    <!-- <grant-privilege :visible.sync="showGrantPrivilegeDialog" /> -->
  </div>

  <div v-else class="asset-owner-details-container empty" />
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { BreakpointClass } from '@/consts/layout';
import { DashboardComponents, DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import type { OwnedAsset } from '@/modules/dashboard/types';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { waitUntil } from '@/utils';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    TokenAddress: components.TokenAddress,
    AccountCard: components.AccountCard,
    WalletAvatar: components.WalletAvatar,
    FormattedAddress: components.FormattedAddress,
    // GrantPrivilege: lazyComponent(DashboardComponents.GrantPrivilegeDialog)
  },
})
export default class AssetOwnerDetailsSBT extends Mixins(
  TranslationMixin,
  mixins.LoadingMixin,
  mixins.FormattedAmountMixin
) {
  @state.settings.screenBreakpointClass private responsiveClass!: BreakpointClass;
  @state.wallet.account.address accountAddress!: string;
  @getter.dashboard.ownedAssets private assets!: OwnedAsset[];
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  showGrantPrivilegeDialog = false;

  get asset(): Nullable<any> {
    const assetId = this.$route.params.asset;
    if (!assetId) return null;
    const asset = this.assets.find(({ address }) => address === assetId);
    return {
      isSBT: true,
      ...asset,
    };
  }

  mounted(): void {
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

  handleBack(): void {
    router.back();
  }

  openGrantPrivilegeDialog(): void {
    this.showGrantPrivilegeDialog = true;
  }
}
</script>

<style lang="scss" scoped>
.asset-owner-details {
  &-container {
    display: flex;
    gap: 16px;
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
  }
}
</style>

<style lang="scss">
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

  &-number {
    color: var(--s-color-base-content-secondary);
  }

  &-issue {
    display: flex;
    justify-content: space-between;

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
    span {
      font-size: 12px;
      text-transform: none;
      font-variation-settings: 'wght' 550 !important;
    }
  }

  &-start-title {
    text-align: center;
  }
}
</style>
