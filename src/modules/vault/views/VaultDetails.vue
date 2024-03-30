<template>
  <div v-if="vault" class="vault-details-container">
    <s-button
      class="vault-details-back"
      type="action"
      size="small"
      alternative
      :tooltip="t('backText')"
      @click="handleBack"
    >
      <s-icon name="arrows-chevron-left-rounded-24" size="24" />
    </s-button>
    <s-row class="vault-details-main" :gutter="20">
      <s-col :xs="12" :sm="12" :md="6" :lg="6">
        <s-card class="vault details-card" border-radius="small" shadow="always" size="big" primary>
          <div class="vault-title s-flex">
            <pair-token-logo class="vault-icon" size="medium" :first-token="kusdToken" :second-token="lockedAsset" />
            <h3>{{ vaultTitle }}</h3>
          </div>
          <s-divider />
          <div class="vault-collateral s-flex-column">
            <h4>Collateral details</h4>
            <div class="vault-collateral__details s-flex">
              <div class="vault-collateral__item s-flex-column">
                <p class="vault-label p3">
                  Your collateral
                  <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <formatted-amount :value="formattedLockedAmount" :asset-symbol="lockedSymbol" />
                <formatted-amount is-fiat-value :value="fiatLockedAmount" />
              </div>
            </div>
            <div class="vault-collateral__actions s-flex">
              <s-button class="s-typography-button--small" size="small" @click="addCollateral">
                <s-icon name="finance-send-24" size="16" />
                Add collateral
              </s-button>
            </div>
          </div>
          <s-divider />
          <div class="vault-debt s-flex-column">
            <h4>Debt details</h4>
            <div class="vault-debt__details s-flex">
              <div class="vault-debt__item s-flex-column">
                <p class="vault-label p3">
                  Your debt
                  <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <formatted-amount :value="formattedDebtAmount" :asset-symbol="kusdSymbol" />
                <formatted-amount is-fiat-value :value="fiatDebt" />
              </div>
              <div class="vault-debt__item s-flex-column">
                <p class="vault-label p3">
                  Available to borrow
                  <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <formatted-amount :value="formattedAvailableToBorrow" :asset-symbol="kusdSymbol" />
                <formatted-amount is-fiat-value :value="fiatAvailableToBorrow" />
              </div>
            </div>
            <div class="vault-debt__actions s-flex">
              <s-button class="s-typography-button--small" size="small">
                <s-icon name="finance-send-24" size="16" />
                Repay debt
              </s-button>
              <s-button
                class="s-typography-button--small"
                type="primary"
                size="small"
                :disable="isBorrowMoreUnavailable"
                @click="borrowMore"
              >
                <s-icon name="finance-send-24" size="16" />
                Borrow more
              </s-button>
            </div>
          </div>
        </s-card>
        <s-button class="close-vault-button" type="link" @click="closePosition">Close my position</s-button>
      </s-col>
      <s-col :xs="12" :sm="12" :md="6" :lg="6">
        <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
          <div class="position-info s-flex-column">
            <h4>Position information</h4>
            <div class="position-info__details s-flex">
              <div class="position-info__item s-flex-column">
                <p class="vault-label p3">
                  Liquidation penalty
                  <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <p class="p3">{{ formattedLiquidationPenalty }}</p>
              </div>
              <div class="position-info__item s-flex-column">
                <p class="vault-label p3">
                  Stability fee
                  <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <p class="p3">{{ formattedStabilityFee }}</p>
              </div>
            </div>
          </div>
          <s-divider />
          <div class="ltv s-flex-column">
            <h4 class="ltv__title">
              Loan to value
              <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                <s-icon name="info-16" size="12px" />
              </s-tooltip>
            </h4>
            <div class="ltv__value s-flex">
              <h2>{{ formattedLtv }}</h2>
              <value-status class="ltv__badge" badge :value="ltvNumber" :getStatus="getLtvStatus">
                {{ ltvText }}
              </value-status>
            </div>
            <ltv-progress-bar :percentage="ltvNumber" />
            <div class="ltv__legend s-flex">
              <div class="ltv__legend-item"><span class="ltv__legend-icon success" />Position safe</div>
              <div class="ltv__legend-item"><span class="ltv__legend-icon warning" />Liquidation close</div>
              <div class="ltv__legend-item"><span class="ltv__legend-icon error" />High liquidation risk</div>
            </div>
          </div>
        </s-card>
      </s-col>
    </s-row>
    <add-collateral-dialog
      :visible.sync="showAddCollateralDialog"
      :vault="vault"
      :asset="lockedAsset"
      :prev-ltv="ltv"
      :prev-available="availableToBorrow"
      :collateral="collateral"
      :average-collateral-price="averageCollateralPrice"
    />
    <borrow-more-dialog
      :visible.sync="showBorrowMoreDialog"
      :vault="vault"
      :prev-ltv="ltv"
      :available="availableToBorrow"
      :max-safe-debt="maxSafeDebt"
    />
    <remove-vault-dialog :visible.sync="showRemoveVaultDialog" />
  </div>
  <div v-else class="vault-details-container empty" />
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue, HundredNumber } from '@/consts';
import { LtvTranslations, VaultComponents, VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus } from '@/modules/vault/util';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { waitUntil } from '@/utils';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
    AddCollateralDialog: vaultLazyComponent(VaultComponents.AddCollateralDialog),
    BorrowMoreDialog: vaultLazyComponent(VaultComponents.BorrowMoreDialog),
    RemoveVaultDialog: vaultLazyComponent(VaultComponents.RemoveVaultDialog),
    LtvProgressBar: vaultLazyComponent(VaultComponents.LtvProgressBar),
  },
})
export default class VaultDetails extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  readonly getLtvStatus = getLtvStatus;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.vault.kusdToken kusdToken!: Nullable<RegisteredAccountAsset>;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;
  @state.vault.accountVaults private accountVaults!: Vault[];
  @state.vault.collaterals private collaterals!: Record<string, Collateral>;
  @state.vault.averageCollateralPrices private averageCollateralPrices!: Record<string, Nullable<FPNumber>>;
  @state.vault.liquidationPenalty private liquidationPenalty!: number;
  @state.settings.percentFormat private percentFormat!: Nullable<Intl.NumberFormat>;

  showRemoveVaultDialog = false;
  showAddCollateralDialog = false;
  showBorrowMoreDialog = false;

  get vault(): Nullable<Vault> {
    const vaultId = this.$route.params.vault;
    if (!vaultId) return null;
    return this.accountVaults.find(({ id }) => id === +vaultId);
  }

  get lockedAsset(): Nullable<RegisteredAccountAsset> {
    if (!this.vault) return null;
    return this.getAsset(this.vault.lockedAssetId);
  }

  get kusdSymbol(): string {
    return this.kusdToken?.symbol ?? '';
  }

  get lockedSymbol(): string {
    return this.lockedAsset?.symbol ?? '';
  }

  get vaultTitle(): string {
    if (!(this.kusdSymbol && this.lockedAsset)) return '';
    return `${this.kusdSymbol} / ${this.lockedAsset.symbol}`;
  }

  get collateral(): Nullable<Collateral> {
    if (!this.vault) return null;

    return this.collaterals[this.vault.lockedAssetId];
  }

  get averageCollateralPrice(): FPNumber {
    if (!this.vault) return this.Zero;
    return this.averageCollateralPrices[this.vault.lockedAssetId] ?? this.Zero;
  }

  get maxSafeDebt(): Nullable<FPNumber> {
    if (!this.vault) return null;
    const collateralVolume = this.averageCollateralPrice.mul(this.vault.lockedAmount);
    return collateralVolume.mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
  }

  get ltv(): Nullable<FPNumber> {
    if (!(this.maxSafeDebt && this.vault)) return null;
    const ltvCoeff = this.vault.debt.div(this.maxSafeDebt);
    return ltvCoeff.isFinity() ? ltvCoeff.mul(HundredNumber) : null;
  }

  get ltvNumber(): number {
    return this.ltv?.toNumber() ?? 0;
  }

  get formattedLtv(): string {
    const percent = this.ltv?.div(HundredNumber).toNumber() ?? 0;
    return this.percentFormat?.format?.(percent) ?? `${percent * HundredNumber}%`;
  }

  get ltvText(): string {
    return LtvTranslations[getLtvStatus(this.ltvNumber)];
  }

  private get availableToBorrow(): Nullable<FPNumber> {
    if (!(this.maxSafeDebt && this.vault)) return null;
    const available = this.maxSafeDebt.sub(this.vault.debt);
    return !available.isFinity() || available.isLteZero() ? this.Zero : available;
  }

  get formattedAvailableToBorrow(): string {
    return this.availableToBorrow?.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatAvailableToBorrow(): string {
    if (!(this.kusdToken && this.availableToBorrow)) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.availableToBorrow, this.kusdToken) ?? ZeroStringValue;
  }

  get isBorrowMoreUnavailable(): boolean {
    return this.availableToBorrow?.isLteZero() ?? true;
  }

  get formattedLockedAmount(): string {
    return this.vault?.lockedAmount.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatLockedAmount(): string {
    if (!(this.vault && this.lockedAsset)) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.vault.lockedAmount, this.lockedAsset) ?? ZeroStringValue;
  }

  get formattedDebtAmount(): string {
    return this.vault?.debt.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatDebt(): string {
    if (!(this.kusdToken && this.vault)) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.vault.debt, this.kusdToken) ?? ZeroStringValue;
  }

  get formattedLiquidationPenalty(): string {
    const percent = this.liquidationPenalty / HundredNumber;
    return this.percentFormat?.format?.(percent) ?? `${percent * HundredNumber}%`;
  }

  private get stabilityFee(): Nullable<FPNumber> {
    return this.collateral?.riskParams.rateAnnual;
  }

  get formattedStabilityFee(): string {
    const percent = this.stabilityFee?.div(HundredNumber).toNumber() ?? 0;
    return this.percentFormat?.format?.(percent) ?? `${percent * HundredNumber}%`;
  }

  mounted(): void {
    this.withApi(async () => {
      if (!this.isLoggedIn) {
        router.push({ name: VaultPageNames.Vaults });
        return;
      }
      await waitUntil(() => !this.parentLoading);
      if (!this.vault) {
        router.push({ name: VaultPageNames.Vaults });
      }
    });
  }

  handleBack(): void {
    router.back();
  }

  closePosition(): void {
    this.showRemoveVaultDialog = true;
  }

  addCollateral(): void {
    this.showAddCollateralDialog = true;
  }

  borrowMore(): void {
    this.showBorrowMoreDialog = true;
  }
}
</script>

<style lang="scss" scoped>
.vault-details-container {
  display: flex;
  gap: $inner-spacing-medium;

  &.empty {
    height: calc(100vh - #{$header-height} - #{$footer-height});
  }

  .details-card {
    margin-bottom: $inner-spacing-big;
  }
}

.vault-details-main {
  flex: 1;
  .close-vault-button {
    text-transform: none;
    color: var(--s-color-theme-accent);
    margin-bottom: $inner-spacing-big;
  }
}

.vault {
  &-title {
    align-items: center;
  }
  &-label {
    color: var(--s-color-base-content-secondary);
  }
}

.position-info,
.vault-collateral,
.vault-debt {
  &__details {
    margin-top: $inner-spacing-mini;
    margin-bottom: $inner-spacing-medium;
  }

  &__item {
    flex: 1 1 50%;

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

@mixin ltv-status($status: 'success', $property: 'background-color') {
  &.#{$status} {
    #{$property}: var(--s-color-status-#{$status});
  }
}

.ltv {
  &__value {
    align-items: center;
    font-size: var(--s-font-size-big);
    margin-bottom: $inner-spacing-medium;
  }
  &__badge {
    margin-left: $inner-spacing-mini;
  }
  &__legend {
    margin-top: $inner-spacing-medium;
    flex-wrap: wrap;

    &-item {
      flex: 1 1 50%;
      display: flex;
      align-items: baseline;
      line-height: var(--s-line-height-big);
    }

    &-icon {
      $icon-size: 12px;

      @include ltv-status('success');
      @include ltv-status('warning');
      @include ltv-status('error');
      border-radius: 50%;
      height: $icon-size;
      width: $icon-size;
      margin-right: 2px;
    }
  }
}
</style>
