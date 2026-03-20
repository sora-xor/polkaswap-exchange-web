<template>
  <div class="asset-owner-container">
    <s-row v-if="isNotLoggedInOrEmptyAssets">
      <s-col class="no-assets__first-col" :xs="12" :sm="12" :md="6" :lg="6">
        <s-card class="no-assets" border-radius="small" shadow="always" size="big" primary>
          <s-image lazy fit="cover" draggable="false" :src="noAssetsImg"></s-image>
          <h2 class="no-assets-text negative-margin--top">Create & launch your token on SORA Network in seconds!</h2>
          <p class="p1 no-assets-text">
            Launch your unique token efficiently and securely using the established infrastructure of the SORA Network.
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14"></s-icon>
            Full token ownership
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14"></s-icon>
            Management dashboard with charts
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14"></s-icon>
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
          <s-image class="negative-margin--left" lazy fit="cover" draggable="false" :src="noAssetsImgDemo"></s-image>
          <h2 class="no-assets-text">Dashboard preview</h2>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14"></s-icon>
            Burn & mint supply
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14"></s-icon>
            Provide liquidity
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14"></s-icon>
            Send token
          </p>
          <p class="p1">
            <s-icon class="item-icon" name="basic-check-mark-24" size="14"></s-icon>
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
              <token-logo class="asset-title__icon" size="big" :token="asset"></token-logo>
              <div class="asset-title__text s-flex-column">
                <h3 class="asset-title__name">{{ asset.name }}</h3>
                <p class="p3 asset-title__symbol asset__label">{{ asset.symbol }}</p>
              </div>
              <s-button type="action" size="small" alternative :tooltip="t('assets.details')">
                <template #icon>
                  <s-icon name="arrows-chevron-right-rounded-24" size="24"></s-icon>
                </template>
              </s-button>
            </div>
            <p class="p3 asset-text asset__label">Mint & burn, send the token in the details page</p>
            <s-divider></s-divider>
            <div class="asset-details s-flex">
              <div class="asset-details__item s-flex-column">
                <p class="p3 asset__label">Price</p>
                <formatted-amount v-if="asset.fiat" is-fiat-value :value="asset.fiat"></formatted-amount>
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
    <create-token-dialog v-model:visible="showCreateTokenDialog"></create-token-dialog>
  </div>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { computed, getCurrentInstance, ref } from 'vue';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTranslation } from '@/composables/useTranslation';
import { Theme } from '@/consts/theme';
import { DashboardComponents, DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import type { OwnedAsset } from '@/modules/dashboard/types';
import router from '@/router';
import store from '@/store';
import { resolveLibraryTheme } from '@/utils/resolveLibraryTheme';
import { resolveStaticAssetUrl } from '@/utils/staticAssets';

defineOptions({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    CreateTokenDialog: dashboardLazyComponent(DashboardComponents.CreateTokenDialog),
  },
});

const { isLoggedIn, connectSoraWallet } = useInternalConnect();
const { t } = useTranslation();

const libraryTheme = computed(() => resolveLibraryTheme(store) as Theme);
const assets = computed(() => store.getters.dashboard.ownedAssets as OwnedAsset[]);

const showCreateTokenDialog = ref(false);

const isNotLoggedInOrEmptyAssets = computed(() => !(isLoggedIn.value && assets.value.length));

const resolvedTheme = computed(() => (libraryTheme.value === Theme.DARK ? Theme.DARK : Theme.LIGHT));
const noAssetsImg = computed(() => resolveStaticAssetUrl(`asset-owner/${resolvedTheme.value}-hero.png`));
const noAssetsImgDemo = computed(() => resolveStaticAssetUrl(`asset-owner/${resolvedTheme.value}.png`));

function handleCreateAsset(): void {
  showCreateTokenDialog.value = true;
}

function handleOpenAssetDetails(asset: OwnedAsset): void {
  router.push({ name: DashboardPageNames.AssetOwnerDetails, params: { asset: asset.address } });
}

defineExpose({
  showCreateTokenDialog,
  handleCreateAsset,
  isNotLoggedInOrEmptyAssets,
  assets,
  isLoggedIn,
  handleOpenAssetDetails,
});

const instance = getCurrentInstance();
if (instance?.proxy) {
  Object.defineProperties(instance.proxy, {
    showCreateTokenDialog: { value: showCreateTokenDialog },
    handleCreateAsset: { value: handleCreateAsset },
    isNotLoggedInOrEmptyAssets: { value: isNotLoggedInOrEmptyAssets },
    assets: { value: assets },
    isLoggedIn: { value: isLoggedIn },
    handleOpenAssetDetails: { value: handleOpenAssetDetails },
  });
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
