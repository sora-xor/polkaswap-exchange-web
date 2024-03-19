<template>
  <div class="vaults-container">
    <div v-if="isNotLoggedInOrEmptyVaults" class="no-vaults s-flex-column">
      <s-form class="no-vaults__main container el-form--actions" :show-message="false">
        <generic-page-header
          class="no-vaults__page-header centered"
          bold
          title="Open borrow positions & Earn with Kensetsu"
        />
        <p class="no-vaults__description centered p4">
          Power up your portfolio using SORA Network's cutting-edge automation tools, making borrowing, lending, and
          multiplying your favorite assets both safe and effortless.
        </p>
        <s-button
          v-if="!isLoggedIn"
          type="primary"
          class="action-button s-typography-button--large"
          @click="handleConnectWallet"
        >
          {{ t('connectWalletText') }}
        </s-button>
        <s-button v-else type="primary" class="action-button s-typography-button--large" @click="handleCreateVault">
          OPEN POSITION
        </s-button>
        <s-button class="action-button s-typography-button--large" @click="handleExploreVaults">
          VIEW STRATEGIES
        </s-button>
      </s-form>
      <s-card class="no-vaults__info" border-radius="small" shadow="always" size="medium" pressed>
        <div class="no-vaults__info-content s-flex-column">
          <h4>Disclaimer</h4>
          <div class="no-vaults__info-desc s-flex">
            <p class="no-vaults__description p4">
              Borrowing digital assets through Polkaswap carries significant risk and is entirely at your own risk. The
              value of digital assets is highly volatile, and any changes in the market prices of the assets you have
              borrowed or used as collateral can lead to substantial financial losses, possibly even...
            </p>
            <div class="no-vaults__info-badge">
              <s-icon class="no-vaults__info-icon" name="notifications-alert-triangle-24" size="24" />
            </div>
          </div>
          <external-link class="p4 link" title="Read more" :href="link" />
        </div>
      </s-card>
    </div>
    <template v-else>
      <s-row>
        <s-col :xs="12" :sm="6" :md="6" :lg="6">
          <h3 class="has-assets__title">Your managed vaults</h3>
        </s-col>
        <s-col class="s-flex has-assets__action-container" :xs="12" :sm="6" :md="6" :lg="6">
          <s-button
            class="s-typography-button--large has-assets__action"
            icon="various-atom-24"
            type="secondary"
            @click="handleCreateVault"
          >
            CREATE VAULT
          </s-button>
        </s-col>
      </s-row>
      <s-row>
        <s-col v-for="vault in vaultsData" :key="'vault_' + vault.id" :xs="12" :sm="6" :md="6" :lg="4">
          <s-card
            class="asset"
            border-radius="small"
            shadow="always"
            size="big"
            primary
            clickable
            @click="handleOpenVaultDetails(vault)"
          >
            <div class="asset-title s-flex">
              <pair-token-logo
                :first-token="vault.lockedAsset"
                :second-token="kusdToken"
                size="small"
                class="explore-table-item-logo"
              />
              <!-- <token-logo class="asset-title__icon" size="big" :token="asset" /> -->
              <div class="asset-title__text s-flex-column">
                <h3 class="asset-title__name">{{ vault.id }}</h3>
                <p class="p3 asset-title__symbol asset__label">{{ vault.id }}</p>
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
                <!--<formatted-amount v-if="asset.fiat" is-fiat-value :value="asset.fiat" />-->
                <p class="p3 asset-details__fiat">n/a</p>
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
    <create-vault-dialog :visible.sync="showCreateVaultDialog" />
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import { VaultComponents, VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import router, { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    ExternalLink: components.ExternalLink,
    CreateVaultDialog: vaultLazyComponent(VaultComponents.CreateVaultDialog),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
  },
})
export default class Vaults extends Mixins(TranslationMixin, mixins.FormattedAmountMixin) {
  readonly link = 'https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78';

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.assets.assetDataByAddress public getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;
  @getter.vault.kusdToken kusdToken!: Nullable<RegisteredAccountAsset>;
  @state.vault.accountVaults vaults!: Vault[];
  @state.vault.collaterals collaterals!: Record<string, Collateral>;

  showCreateVaultDialog = false;

  get isNotLoggedInOrEmptyVaults(): boolean {
    return !(this.isLoggedIn && this.vaults.length);
  }

  get vaultsData() {
    return this.vaults.map((vault) => {
      const lockedAsset = this.getAsset(vault.lockedAssetId);
      return { ...vault, lockedAsset };
    });
  }

  handleConnectWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  handleExploreVaults(): void {}

  handleCreateVault(): void {
    this.showCreateVaultDialog = true;
  }

  handleOpenVaultDetails(vault: Vault): void {
    router.push({ name: VaultPageNames.VaultDetails, params: { vault: `${vault.id}` } });
  }
}
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
  flex: 1;
  width: 100%;

  .action-button + .action-button {
    margin-left: 0;
  }
}
.no-vaults {
  align-items: center;

  &__description {
    font-size: 13px;
  }
  &__info {
    margin-top: $basic-spacing;
    max-width: $inner-window-width;
    width: 100%;
    flex: 1;
    &-desc {
      margin-top: 8px;
      align-items: flex-start;
      .no-vaults__description {
        flex: 1;
      }
    }
    &-badge {
      border-radius: 50%;
      background-color: var(--s-color-status-info);
      padding: $inner-spacing-mini;
      box-shadow: var(--s-shadow-element-pressed);
      margin-left: $inner-spacing-mini;
    }
    &-icon {
      color: white;
    }
  }
  .centered {
    text-align: center;
  }

  .link {
    @include focus-outline;
    font-size: var(--s-heading6-font-size);
    margin-top: 8px;
    color: var(--s-color-status-info);
  }
}

//
.vaults-container {
  // margin-left: 32px;
  // margin-right: 8px;

  // @include desktop {
  //   margin-left: 0;
  // }

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
  .item-icon {
    color: var(--s-color-theme-accent);
  }
}
</style>
