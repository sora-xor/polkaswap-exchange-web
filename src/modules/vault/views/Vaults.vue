<template>
  <div class="vaults-container">
    <div v-if="isNotLoggedInOrEmptyVaults" class="no-vaults s-flex-column">
      <s-form class="no-vaults__main container el-form--actions" :show-message="false">
        <generic-page-header class="no-vaults__page-header centered" bold :title="t('kensetsu.introTitle')" />
        <p class="no-vaults__description centered p4">
          {{ t('kensetsu.introDescription') }}
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
          {{ t('kensetsu.createVaultAction') }}
        </s-button>
        <s-button class="action-button s-typography-button--large" @click="handleExploreVaults">
          VIEW STRATEGIES
        </s-button>
      </s-form>
      <s-card class="no-vaults__info" border-radius="small" shadow="always" size="medium" pressed>
        <div class="no-vaults__info-content s-flex-column">
          <h4>{{ t('disclaimerTitle') }}</h4>
          <div class="no-vaults__info-desc s-flex">
            <p class="no-vaults__description p4">
              {{ t('kensetsu.disclaimerDescription') }}
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
      <s-row class="has-vaults">
        <s-col :xs="12" :sm="12" :md="4" :lg="6">
          <h2 class="has-vaults__title s-flex">
            Kensetsu
            <s-tooltip
              slot="suffix"
              border-radius="mini"
              :content="t('kensetsu.titleDescription')"
              placement="top"
              tabindex="-1"
            >
              <s-icon class="has-vaults__title-icon" name="info-16" size="16px" />
            </s-tooltip>
          </h2>
        </s-col>
        <s-col class="s-flex has-vaults__action-container" :xs="12" :sm="12" :md="8" :lg="6">
          <s-button class="s-typography-button--large has-vaults__action" type="tertiary" @click="handleExploreVaults">
            EXPLORE POSITIONS
          </s-button>
          <s-button
            class="s-typography-button--large has-vaults__action"
            icon="various-atom-24"
            type="secondary"
            @click="handleCreateVault"
          >
            {{ t('kensetsu.createVaultAction') }}
          </s-button>
        </s-col>
      </s-row>
      <s-row>
        <s-col v-for="vault in vaultsData" :key="'vault_' + vault.id" :xs="12" :sm="6" :md="6" :lg="4">
          <s-card
            class="vault"
            border-radius="small"
            shadow="always"
            size="big"
            primary
            clickable
            @click="handleOpenVaultDetails(vault)"
          >
            <div class="vault-title s-flex">
              <pair-token-logo
                :first-token="kusdToken"
                :second-token="vault.lockedAsset"
                size="medium"
                class="vault-title__icon"
              />
              <h3 class="vault-title__name">{{ getVaultTitle(vault.lockedAsset) }}</h3>
              <s-button type="action" size="small" alternative :tooltip="t('assets.details')">
                <s-icon name="arrows-chevron-right-rounded-24" size="24" />
              </s-button>
            </div>
            <div class="vault-details s-flex">
              <div class="vault-details__item s-flex-column">
                <p class="p3 vault__label">
                  {{ t('kensetsu.yourCollateral') }}
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.yourCollateralDescription')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <formatted-amount
                  v-if="vault.lockedAsset"
                  :value="format(vault.lockedAmount)"
                  :asset-symbol="getLockedSymbol(vault.lockedAsset)"
                />
                <formatted-amount
                  v-if="vault.lockedAsset"
                  is-fiat-value
                  :value="formatFiat(vault.lockedAmount, vault.lockedAsset)"
                />
              </div>
              <div class="vault-details__item s-flex-column">
                <p class="p3 vault__label">
                  {{ t('kensetsu.yourDebt') }}
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.yourDebtDescription')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <formatted-amount v-if="kusdToken" :value="format(vault.debt)" :asset-symbol="kusdSymbol" />
                <formatted-amount v-if="kusdToken" is-fiat-value :value="formatFiat(vault.debt, kusdToken)" />
              </div>
              <div class="vault-details__item s-flex-column">
                <p class="p3 vault__label">
                  {{ t('kensetsu.availableToBorrow') }}
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.availableToBorrowDescription')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <formatted-amount v-if="kusdToken" :value="format(vault.available)" :asset-symbol="kusdSymbol" />
                <formatted-amount v-if="kusdToken" is-fiat-value :value="formatFiat(vault.available, kusdToken)" />
              </div>
            </div>
            <s-divider />
            <div class="vault__ltv s-flex">
              <p class="p3 vault__label">
                {{ t('kensetsu.ltv') }}
                <s-tooltip
                  slot="suffix"
                  border-radius="mini"
                  :content="t('kensetsu.ltvDescription')"
                  placement="top"
                  tabindex="-1"
                >
                  <s-icon name="info-16" size="12px" />
                </s-tooltip>
              </p>
              <span class="vault__ltv-value s-flex">
                <template v-if="vault.ltv">
                  {{ format(vault.ltv) }}%
                  <value-status class="vault__ltv-badge" badge :value="toNumber(vault.ltv)" :getStatus="getLtvStatus">
                    {{ getLtvText(vault.ltv) }}
                  </value-status>
                </template>
                <template v-else>n/a</template>
              </span>
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
import { Components, HundredNumber, PageNames, ZeroStringValue } from '@/consts';
import { LtvTranslations, VaultComponents, VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus } from '@/modules/vault/util';
import router, { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { FPNumber, CodecString } from '@sora-substrate/math';
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
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
  },
})
export default class Vaults extends Mixins(TranslationMixin, mixins.FormattedAmountMixin) {
  readonly link = 'https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78';
  readonly getLtvStatus = getLtvStatus;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.vault.kusdToken kusdToken!: Nullable<RegisteredAccountAsset>;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;
  @state.vault.accountVaults private vaults!: Vault[];
  @state.vault.collaterals private collaterals!: Record<string, Collateral>;
  @state.vault.averageCollateralPrices private averageCollateralPrices!: Record<string, Nullable<FPNumber>>;
  @state.vault.borrowTax private borrowTax!: number;

  showCreateVaultDialog = false;

  get isNotLoggedInOrEmptyVaults(): boolean {
    return !(this.isLoggedIn && this.vaults.length);
  }

  get kusdSymbol(): string {
    return this.kusdToken?.symbol ?? '';
  }

  get vaultsData() {
    return this.vaults.map((vault) => {
      const lockedAsset = this.getAsset(vault.lockedAssetId);
      const collateral = this.collaterals[vault.lockedAssetId];
      const averagePrice = this.averageCollateralPrices[vault.lockedAssetId] ?? this.Zero;
      const collateralVolume = averagePrice.mul(vault.lockedAmount);
      const maxSafeDebt = collateralVolume.mul(collateral?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
      const maxSafeDebtWithoutTax = maxSafeDebt.sub(maxSafeDebt.mul(this.borrowTax));
      const ltvCoeff = vault.debt.div(maxSafeDebt);
      const ltv = ltvCoeff.isFinity() ? ltvCoeff.mul(HundredNumber) : null;
      const availableCoeff = maxSafeDebtWithoutTax.sub(vault.debt);
      const available = !availableCoeff.isFinity() || availableCoeff.isLteZero() ? this.Zero : availableCoeff;
      return { ...vault, lockedAsset, ltv, available };
    });
  }

  getVaultTitle(lockedAsset?: RegisteredAccountAsset): string {
    if (!(this.kusdSymbol && lockedAsset)) return '';
    return `${this.kusdSymbol} / ${lockedAsset.symbol}`;
  }

  getLockedSymbol(lockedAsset?: RegisteredAccountAsset): string {
    return lockedAsset?.symbol ?? '';
  }

  format(number?: FPNumber): string {
    return number?.toLocaleString(2) ?? ZeroStringValue;
  }

  formatFiat(amount: Nullable<FPNumber>, asset: Nullable<RegisteredAccountAsset>): string {
    if (!(amount && asset)) return ZeroStringValue;
    return this.getFiatAmountByFPNumber(amount, asset) ?? ZeroStringValue;
  }

  toCodec(number: FPNumber): CodecString {
    return number.codec;
  }

  getLtvText(ltv: FPNumber): string {
    return LtvTranslations[getLtvStatus(ltv.toNumber())];
  }

  toNumber(number?: FPNumber): number {
    return number?.toNumber() ?? 0;
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
.vaults-container {
  margin-left: 32px;
  margin-right: $inner-spacing-mini;

  @include desktop {
    margin-left: 0;
  }
}
.no-vaults {
  align-items: center;

  .el-form--actions {
    @include buttons;
    @include full-width-button('action-button');
    flex: 1;
    width: 100%;

    .action-button + .action-button {
      margin-left: 0;
    }
  }

  &__description {
    font-size: 13px;
  }

  &__info {
    margin-top: $basic-spacing;
    max-width: $inner-window-width;
    width: 100%;
    flex: 1;

    &-desc {
      margin-top: $inner-spacing-mini;
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
    margin-top: $inner-spacing-mini;
    color: var(--s-color-status-info);
  }
}

.has-vaults {
  @include desktop {
    &__action-container {
      justify-content: flex-end;
    }
  }

  @media (max-width: 639px) {
    // responsive breakpoint from DS
    &__action-container {
      flex-direction: column;
    }
    &__action + &__action {
      margin-left: 0;
    }
  }

  &__action {
    margin-right: $inner-spacing-big;
  }

  &__title,
  &__action {
    margin-bottom: $inner-spacing-big;
  }

  &__title {
    align-items: center;
    &-icon {
      margin-left: 4px;
    }
  }
}

.vault {
  margin-bottom: $inner-spacing-big;
  margin-right: $inner-spacing-big;

  &-title {
    align-items: center;
    justify-content: space-between;

    &__name {
      flex: 1;
      margin: 0 $inner-spacing-mini;
      @include text-ellipsis;
    }
  }

  &__label {
    color: var(--s-color-base-content-secondary);
  }

  &__ltv {
    align-items: center;
    justify-content: space-between;

    &-value {
      font-weight: 500;
    }

    &-badge {
      margin-left: $inner-spacing-mini;
    }
  }

  &-details {
    justify-content: space-between;
    flex-wrap: wrap;

    &__item {
      flex: 1 1 50%;
      margin-top: $inner-spacing-medium;

      > * {
        line-height: var(--s-line-height-big);
      }
    }

    &__fiat {
      color: var(--s-color-fiat-value);
    }

    &__fiat,
    &__item {
      @include text-ellipsis;
    }
  }
}
</style>
