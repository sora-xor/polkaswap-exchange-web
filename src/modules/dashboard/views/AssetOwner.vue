<template>
  <div class="asset-owner-container">
    <s-row v-if="isNotLoggedInOrEmptyAssets">
      <s-col class="no-assets__first-col" :xs="12" :sm="12" :md="6" :lg="6">
        <s-card class="no-assets" border-radius="small" shadow="always" size="big" primary>
          <s-image lazy fit="cover" draggable="false" :src="noAssetsImg" />
          <h2 class="no-assets-text negative-margin--top">Create & launch your token on SORA Network in seconds!</h2>
          <p class="p1 no-assets-text">
            Launch your unique token efficiently and securely using the established infrastructure of the SORA Network.
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14" />
            Full token ownership
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14" />
            Management dashboard with charts
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14" />
            Enable decentralization
          </p>
          <s-button
            v-if="!isLoggedIn"
            class="no-assets-action s-typography-button--large"
            type="primary"
            @click="connectSoraWallet"
          >
            {{ t('connectWalletText') }}
          </s-button>
          <s-button
            v-else
            class="no-assets-action s-typography-button--large"
            type="primary"
            icon="various-atom-24"
            @click="handleCreateAsset"
          >
            CREATE ASSET
          </s-button>
        </s-card>
      </s-col>
      <s-col :xs="12" :sm="12" :md="6" :lg="6">
        <s-card class="no-assets-demo" border-radius="small" shadow="always" size="big" primary>
          <s-image class="negative-margin--left" lazy fit="cover" draggable="false" :src="noAssetsImgDemo" />
          <h2 class="no-assets-text">Dashboard preview</h2>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14" />
            Burn & mint supply
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14" />
            Provide liquidity
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14" />
            Send token
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14" />
            See statistics
          </p>
        </s-card>
      </s-col>
    </s-row>
    <template v-else>
      <s-row>
        <s-col :xs="12" :sm="6" :md="6" :lg="6">
          <h3 class="has-assets__title">Your managed tokens</h3>
        </s-col>
        <s-col class="s-flex has-assets__action-container" :xs="12" :sm="6" :md="6" :lg="6">
          <s-button
            class="s-typography-button--large has-assets__action"
            icon="various-atom-24"
            type="secondary"
            @click="handleCreateAsset"
          >
            CREATE ASSET
          </s-button>
        </s-col>
      </s-row>
      <s-row>
        <s-col v-for="asset in assets" :key="asset.address" :xs="12" :sm="6" :md="6" :lg="4">
          <s-card
            class="asset"
            border-radius="small"
            shadow="always"
            size="big"
            primary
            clickable
            @click="handleOpenAssetDetails(asset)"
          >
            <div class="asset-title s-flex">
              <token-logo class="asset-title__icon" size="big" :token="asset" />
              <div class="asset-title__text s-flex-column">
                <h3 class="asset-title__name">{{ asset.name }}</h3>
                <p class="p3 asset-title__symbol asset__label">{{ asset.symbol }}</p>
              </div>
              <s-button type="action" size="small" alternative :tooltip="t('assets.details')">
                <s-icon name="arrows-chevron-right-rounded-24" size="24" />
              </s-button>
            </div>
            <p class="p3 asset-text asset__label">Mint & burn, send the token in the details page</p>
            <s-divider />
            <div class="asset-details s-flex">
              <div class="asset-details__item s-flex-column">
                <p class="p3 asset__label">Price</p>
                <formatted-amount v-if="asset.fiat" is-fiat-value :value="asset.fiat" />
                <p v-else class="p3 asset-details__fiat">n/a</p>
              </div>
              <div class="asset-details__item s-flex-column">
                <p class="p3 asset__label">1D Change</p>
                <p class="p3 asset-details__fiat">n/a</p>
              </div>
              <div class="asset-details__item s-flex-column">
                <p class="p3 asset__label">1D Volume</p>
                <p class="p3 asset-details__fiat">n/a</p>
              </div>
            </div>
          </s-card>
        </s-col>
      </s-row>
    </template>
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { DashboardComponents, DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import type { OwnedAsset } from '@/modules/dashboard/types';
import router from '@/router';
import { getter } from '@/store/decorators';

import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class AssetOwner extends Mixins(InternalConnectMixin, mixins.FormattedAmountMixin) {
  @getter.libraryTheme private libraryTheme!: Theme;
  @getter.dashboard.ownedAssets assets!: OwnedAsset[];

  showCreateTokenDialog = false;

  get isNotLoggedInOrEmptyAssets(): boolean {
    return !(this.isLoggedIn && this.assets.length);
  }

  handleCreateAsset(): void {
    router.push({ name: DashboardPageNames.AssetOwnerCreate });
  }

  handleOpenAssetDetails(asset: OwnedAsset): void {
    // TODO: [Rustem] migrate to AsssetInfosV2 and rely on AssetType
    const isSBT = true;

    if (isSBT) {
      router.push({ name: DashboardPageNames.AssetOwnerDetailsSBT, params: { asset: asset.address } });
    } else {
      router.push({ name: DashboardPageNames.AssetOwnerDetails, params: { asset: asset.address } });
    }
  }

  get noAssetsImg(): string {
    return `/asset-owner/${this.libraryTheme}-hero.png`;
  }

  get noAssetsImgDemo(): string {
    return `/asset-owner/${this.libraryTheme}.png`;
  }
}
</script>

<style lang="scss" scoped>
.asset-owner-container {
  margin-left: 32px;
  margin-right: 8px;

  @include desktop {
    margin-left: 0;
  }

  .no-assets {
    padding-top: 0;
    margin-bottom: 24px;
    &-text {
      text-align: center;
      margin-bottom: 14px;
    }
    &-action {
      margin-top: 14px;
      width: 100%;
    }
    &,
    &-demo {
      margin-right: 24px;
    }
    @include large-desktop {
      &,
      &-demo {
        max-width: 700px;
      }
      &__first-col {
        display: flex;
        justify-content: flex-end;
      }
    }
  }

  .has-assets {
    @include tablet {
      &__action-container {
        justify-content: flex-end;
      }
    }
    &__action {
      margin-right: 24px;
    }
    &__title,
    &__action {
      margin-bottom: 24px;
    }
  }

  .asset {
    margin-bottom: 24px;
    margin-right: 24px;
    &-title {
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;

      &__text {
        flex: 1;
        margin: 0 8px;
      }

      &__name,
      &__text {
        @include text-ellipsis;
      }
    }

    &__label {
      color: var(--s-color-base-content-secondary);
    }

    &-details {
      justify-content: space-between;

      &__fiat {
        color: var(--s-color-fiat-value);
      }

      &__item {
        flex: 1;
      }

      &__fiat,
      &__item {
        @include text-ellipsis;
      }
    }
  }
  // To prevent images related issues
  .negative-margin {
    &--top {
      margin-top: -32px;
    }
    &--left {
      margin-left: -24px;
    }
  }
  .item-icon {
    color: var(--s-color-theme-accent);
  }
}
</style>
