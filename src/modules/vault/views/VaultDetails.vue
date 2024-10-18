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
        <s-card class="vault details-card" border-radius="small" size="big" primary>
          <div class="vault-title s-flex">
            <pair-token-logo class="vault-icon" size="medium" :first-token="debtAsset" :second-token="lockedAsset" />
            <div class="vault-title__container s-flex-column">
              <h3>{{ vaultTitle }}</h3>
              <position-status :status="status" />
            </div>
          </div>
          <s-divider />
          <template v-if="ltv">
            <div class="vault-collateral s-flex-column">
              <h4>{{ t('kensetsu.collateralDetails') }}</h4>
              <div class="vault-collateral__details s-flex">
                <div class="vault-collateral__item s-flex-column">
                  <p class="vault-label p3">
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
                  <formatted-amount value-can-be-hidden :value="formattedLockedAmount" :asset-symbol="lockedSymbol" />
                  <formatted-amount value-can-be-hidden is-fiat-value :value="fiatLockedAmount" />
                </div>
              </div>
              <div class="vault-collateral__actions s-flex">
                <s-button
                  class="s-typography-button--small"
                  size="small"
                  :disabled="isAddCollateralUnavailable"
                  @click="addCollateral"
                >
                  {{ t('kensetsu.addCollateral') }}
                </s-button>
              </div>
            </div>
            <s-divider />
            <div class="vault-debt s-flex-column">
              <h4>{{ t('kensetsu.debtDetails') }}</h4>
              <div class="vault-debt__details s-flex">
                <div class="vault-debt__item s-flex-column">
                  <p class="vault-label p3">
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
                  <formatted-amount value-can-be-hidden :value="formattedDebtAmount" :asset-symbol="debtSymbol" />
                  <formatted-amount value-can-be-hidden is-fiat-value :value="fiatDebt" />
                </div>
                <div class="vault-debt__item s-flex-column">
                  <p class="vault-label p3">
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
                  <formatted-amount
                    value-can-be-hidden
                    :value="formattedAvailableToBorrow"
                    :asset-symbol="debtSymbol"
                  />
                  <formatted-amount value-can-be-hidden is-fiat-value :value="fiatAvailableToBorrow" />
                </div>
              </div>
              <div class="vault-debt__actions s-flex">
                <s-button
                  class="s-typography-button--small"
                  size="small"
                  :disabled="isRepayDebtUnavailable"
                  @click="repayDebt"
                >
                  {{ t('kensetsu.repayDebt') }}
                </s-button>
                <s-button
                  class="s-typography-button--small"
                  type="primary"
                  size="small"
                  :disabled="isBorrowMoreUnavailable"
                  @click="borrowMore"
                >
                  {{ t('kensetsu.borrowMore') }}
                </s-button>
              </div>
            </div>
          </template>
          <div v-else class="vault-returned s-flex-column">
            <p class="vault-label p3">
              {{ t('kensetsu.totalCollateralReturned') }}
              <s-tooltip
                slot="suffix"
                border-radius="mini"
                :content="t('kensetsu.totalCollateralReturnedDescription')"
                placement="top"
                tabindex="-1"
              >
                <s-icon name="info-16" size="12px" />
              </s-tooltip>
            </p>
            <formatted-amount value-can-be-hidden :value="formattedReturnedAmount" :asset-symbol="lockedSymbol" />
            <formatted-amount value-can-be-hidden is-fiat-value :value="fiatReturnedAmount" />
          </div>
        </s-card>
        <s-button v-if="ltv" class="close-vault-button" type="link" @click="closePosition">
          {{ t('kensetsu.closeVault') }}
        </s-button>
      </s-col>
      <s-col :xs="12" :sm="12" :md="6" :lg="6">
        <s-card class="details-card" border-radius="small" size="big" primary>
          <div class="position-info s-flex-column">
            <h4>{{ t('kensetsu.positionInfo') }}</h4>
            <div class="position-info__details s-flex">
              <div class="position-info__item s-flex-column">
                <p class="vault-label p3">
                  {{ t('kensetsu.liquidationPenalty') }}
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.liquidationPenaltyDescription')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <p class="p3">{{ formattedLiquidationPenalty }}</p>
              </div>
              <div class="position-info__item s-flex-column">
                <p class="vault-label p3">
                  {{ t('kensetsu.interest') }}
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.interestDescription')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <p class="p3">{{ formattedStabilityFee }}</p>
              </div>
              <div class="position-info__item s-flex-column">
                <p class="vault-label p3">
                  MAX LTV
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.ltvMaxTooltip')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <p class="p3">{{ formattedMaxLtv }}</p>
              </div>
            </div>
          </div>
          <template v-if="ltv">
            <s-divider />
            <div class="ltv s-flex-column">
              <h4 class="ltv__title">
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
              </h4>
              <div class="ltv__value s-flex">
                <h2>{{ formattedLtv }}</h2>
                <value-status
                  class="ltv__badge"
                  badge
                  error-icon-size="15"
                  :value="ltvNumber"
                  :getStatus="getLtvStatus"
                >
                  {{ ltvText }}
                </value-status>
              </div>
              <ltv-progress-bar :percentage="ltvNumber" />
              <div class="ltv__legend s-flex">
                <div class="ltv__legend-item">
                  <span class="ltv__legend-icon success" />
                  {{ t('kensetsu.positionSafe') }}
                </div>
                <div class="ltv__legend-item">
                  <span class="ltv__legend-icon warning" />
                  {{ t('kensetsu.liquidationClose') }}
                </div>
                <div class="ltv__legend-item">
                  <span class="ltv__legend-icon error" />
                  {{ t('kensetsu.highLiquidationRisk') }}
                </div>
              </div>
            </div>
          </template>
        </s-card>
        <vault-details-history :id="vault.id" :locked-asset="lockedAsset" :debt-asset="debtAsset" />
      </s-col>
    </s-row>
    <template v-if="ltv">
      <add-collateral-dialog
        :visible.sync="showAddCollateralDialog"
        :vault="vault"
        :locked-asset="lockedAsset"
        :debt-asset="debtAsset"
        :prev-ltv="adjustedLtv"
        :prev-available="availableToBorrow"
        :collateral="collateral"
        :max-ltv="maxLtv"
        :average-collateral-price="averageCollateralPrice"
        :borrow-tax="borrowTax"
      />
      <borrow-more-dialog
        :visible.sync="showBorrowMoreDialog"
        :vault="vault"
        :debt-asset="debtAsset"
        :prev-ltv="adjustedLtv"
        :available="availableToBorrow"
        :collateral="collateral"
        :max-safe-debt="maxSafeDebt"
        :max-ltv="maxLtv"
        :borrow-tax="borrowTax"
      />
      <repay-debt-dialog
        :visible.sync="showRepayDebtDialog"
        :vault="vault"
        :debt-asset="debtAsset"
        :prev-ltv="adjustedLtv"
        :max-safe-debt="maxSafeDebt"
        :max-ltv="maxLtv"
      />
      <close-vault-dialog
        :visible.sync="showCloseVaultDialog"
        :vault="vault"
        :locked-asset="lockedAsset"
        :debt-asset="debtAsset"
        @confirm="goToVaults"
      />
    </template>
  </div>
  <div v-else class="vault-details-container empty" />
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { XOR, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue, HundredNumber } from '@/consts';
import { LtvTranslations, VaultComponents, VaultPageNames, VaultStatuses } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import type { ClosedVault, VaultStatus } from '@/modules/vault/types';
import { getLtvStatus } from '@/modules/vault/util';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { asZeroValue, getAssetBalance, waitUntil } from '@/utils';

import type { RegisteredAccountAsset, Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';

type AnyVault = Vault | ClosedVault;

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
    AddCollateralDialog: vaultLazyComponent(VaultComponents.AddCollateralDialog),
    BorrowMoreDialog: vaultLazyComponent(VaultComponents.BorrowMoreDialog),
    RepayDebtDialog: vaultLazyComponent(VaultComponents.RepayDebtDialog),
    CloseVaultDialog: vaultLazyComponent(VaultComponents.CloseVaultDialog),
    LtvProgressBar: vaultLazyComponent(VaultComponents.LtvProgressBar),
    VaultDetailsHistory: vaultLazyComponent(VaultComponents.VaultDetailsHistory),
    PositionStatus: vaultLazyComponent(VaultComponents.PositionStatus),
  },
})
export default class VaultDetails extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  readonly getLtvStatus = getLtvStatus;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;
  @getter.vault.getBorrowTax private getTax!: (debtAsset: Asset | AccountAsset | string) => number;
  @state.vault.accountVaults private accountVaults!: Vault[];
  @state.vault.closedAccountVaults private closedAccountVaults!: ClosedVault[];
  @state.vault.collaterals private collaterals!: Record<string, Collateral>;
  @state.vault.averageCollateralPrices private averageCollateralPrices!: Record<string, Nullable<FPNumber>>;
  @state.vault.liquidationPenalty private liquidationPenalty!: number;
  @state.settings.percentFormat private percentFormat!: Nullable<Intl.NumberFormat>;

  showCloseVaultDialog = false;
  showAddCollateralDialog = false;
  showBorrowMoreDialog = false;
  showRepayDebtDialog = false;

  /**
   * Skeleton that will be used when vault will become null.
   * Cannot be readonly because we need to get the right id (and other details) during component mount.
   */
  private vaultSkeleton: ClosedVault = {
    id: 0,
    lockedAssetId: XOR.address,
    debtAssetId: KUSD.address,
    vaultType: VaultTypes.V2,
    status: VaultStatuses.Closed,
    returned: this.Zero,
  };

  private get foundVault(): Nullable<AnyVault> {
    const vaultId = this.$route.params.vault;
    if (!vaultId) return null;
    const opened = this.accountVaults.find(({ id }) => id === +vaultId);
    if (opened) return opened;
    return this.closedAccountVaults.find(({ id }) => id === +vaultId);
  }

  get vault(): Nullable<AnyVault> {
    return this.foundVault ?? this.vaultSkeleton;
  }

  isOpened(vault: AnyVault): vault is Vault {
    return (vault as Vault).lockedAmount !== undefined;
  }

  isClosed(vault: AnyVault): vault is ClosedVault {
    return (vault as Vault).lockedAmount === undefined;
  }

  get status(): VaultStatus {
    if (!this.vault) return VaultStatuses.Closed; // temporary skeleton solution
    return this.isOpened(this.vault) ? VaultStatuses.Opened : this.vault.status;
  }

  get lockedAsset(): Nullable<RegisteredAccountAsset> {
    if (!this.vault) return null;
    return this.getAsset(this.vault.lockedAssetId);
  }

  get debtAsset(): Nullable<RegisteredAccountAsset> {
    if (!this.vault) return null;
    return this.getAsset(this.vault.debtAssetId);
  }

  get debtSymbol(): string {
    return this.debtAsset?.symbol ?? '';
  }

  get lockedSymbol(): string {
    return this.lockedAsset?.symbol ?? '';
  }

  get vaultTitle(): string {
    if (!(this.debtSymbol && this.lockedSymbol)) return '';
    return `${this.debtSymbol} / ${this.lockedSymbol}`;
  }

  private get collateralId(): string {
    if (!this.vault) return '';
    return api.kensetsu.serializeKey(this.vault.lockedAssetId, this.vault.debtAssetId);
  }

  get borrowTax(): number {
    if (!this.vault) return 0;
    return this.getTax(this.vault.debtAssetId);
  }

  get collateral(): Nullable<Collateral> {
    if (!this.collateralId) return null;

    return this.collaterals[this.collateralId];
  }

  get averageCollateralPrice(): FPNumber {
    if (!this.collateralId) return this.Zero;
    return this.averageCollateralPrices[this.collateralId] ?? this.Zero;
  }

  get maxSafeDebt(): Nullable<FPNumber> {
    if (!(this.vault && this.isOpened(this.vault))) return null;
    const collateralVolume = this.averageCollateralPrice.mul(this.vault.lockedAmount);
    return collateralVolume.mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
  }

  private get ltvCoeff(): Nullable<FPNumber> {
    if (!(this.maxSafeDebt && this.vault && this.isOpened(this.vault))) return null;
    return this.vault.debt.div(this.maxSafeDebt);
  }

  get maxLtv(): number {
    return this.collateral?.riskParams.liquidationRatioReversed ?? HundredNumber;
  }

  get adjustedLtv(): Nullable<FPNumber> {
    if (!this.ltvCoeff) return null;
    return this.ltvCoeff.mul(this.maxLtv);
  }

  get ltv(): Nullable<FPNumber> {
    return this.ltvCoeff?.isFinity() ? this.ltvCoeff.mul(HundredNumber) : null;
  }

  get ltvNumber(): number {
    return this.ltv?.toNumber() ?? 0;
  }

  get formattedLtv(): string {
    const percent = this.adjustedLtv?.toNumber() ?? 0;
    return this.percentFormat?.format?.(percent / HundredNumber) ?? `${percent}%`;
  }

  get ltvText(): string {
    return LtvTranslations[getLtvStatus(this.ltvNumber)];
  }

  get formattedMaxLtv(): string {
    return this.percentFormat?.format?.(this.maxLtv / HundredNumber) ?? `${this.maxLtv}%`;
  }

  get availableToBorrow(): Nullable<FPNumber> {
    if (!(this.maxSafeDebt && this.vault && this.isOpened(this.vault))) return null;

    let available = this.maxSafeDebt.sub(this.vault.debt);
    available = available.sub(available.mul(this.borrowTax));

    let totalAvailable = this.collateral?.riskParams.hardCap.sub(this.collateral.debtSupply) ?? this.Zero;
    totalAvailable = totalAvailable.sub(totalAvailable.mul(this.borrowTax));

    available = totalAvailable.lt(available) ? totalAvailable : available;
    return !available.isFinity() || available.isLteZero() ? this.Zero : available.dp(2);
  }

  get formattedAvailableToBorrow(): string {
    return this.availableToBorrow?.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatAvailableToBorrow(): string {
    if (!(this.debtAsset && this.availableToBorrow)) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.availableToBorrow, this.debtAsset) ?? ZeroStringValue;
  }

  get isAddCollateralUnavailable(): boolean {
    if (!this.lockedAsset) return true;
    return asZeroValue(getAssetBalance(this.lockedAsset));
  }

  get isBorrowMoreUnavailable(): boolean {
    if (!(this.debtAsset && this.availableToBorrow)) return true;
    const availableUsd = this.getFPNumberFiatAmountByFPNumber(this.availableToBorrow, this.debtAsset);
    return availableUsd?.isLessThan(FPNumber.ONE) ?? false; // Set it to available if fiat is unavailable
  }

  get isRepayDebtUnavailable(): boolean {
    if (!this.vault || !this.debtAsset || this.isClosed(this.vault)) return true;
    const debtUsd = this.getFPNumberFiatAmountByFPNumber(this.vault.debt, this.debtAsset);
    return debtUsd?.isLessThan(FPNumber.ONE) ?? false; // Set it to available if fiat is unavailable
  }

  get formattedLockedAmount(): string {
    if (!this.vault || this.isClosed(this.vault)) return ZeroStringValue;
    return this.vault.lockedAmount.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatLockedAmount(): string {
    if (!(this.vault && this.lockedAsset && this.isOpened(this.vault))) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.vault.lockedAmount, this.lockedAsset) ?? ZeroStringValue;
  }

  get formattedDebtAmount(): string {
    if (!this.vault || this.isClosed(this.vault)) return ZeroStringValue;
    return this.vault.debt.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatDebt(): string {
    if (!(this.debtAsset && this.vault && this.isOpened(this.vault))) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.vault.debt, this.debtAsset) ?? ZeroStringValue;
  }

  get formattedLiquidationPenalty(): string {
    return this.percentFormat?.format?.(this.liquidationPenalty / HundredNumber) ?? `${this.liquidationPenalty}%`;
  }

  private get stabilityFee(): Nullable<FPNumber> {
    return this.collateral?.riskParams.stabilityFeeAnnual;
  }

  get formattedStabilityFee(): string {
    const percent = this.stabilityFee?.toNumber() ?? 0;
    return this.percentFormat?.format?.(percent / HundredNumber) ?? `${percent}%`;
  }

  get formattedReturnedAmount(): string {
    if (!(this.vault && this.isClosed(this.vault))) return ZeroStringValue;
    return this.vault.returned?.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatReturnedAmount(): string {
    if (!(this.vault && this.lockedAsset && this.isClosed(this.vault))) return ZeroStringValue;

    return this.vault.returned
      ? this.getFiatAmountByFPNumber(this.vault.returned, this.lockedAsset) ?? ZeroStringValue
      : ZeroStringValue;
  }

  goToVaults(): void {
    router.push({ name: VaultPageNames.Vaults });
  }

  mounted(): void {
    this.withApi(async () => {
      if (!this.isLoggedIn) {
        this.goToVaults();
        return;
      }
      await waitUntil(() => !this.parentLoading);
      if (!this.foundVault) {
        this.goToVaults();
        return;
      }
      // Setting vaultSkeleton prop in case vault will become unavailable (closed/liquidated)
      this.vaultSkeleton.id = this.foundVault.id;
      this.vaultSkeleton.lockedAssetId = this.foundVault.lockedAssetId;
      this.vaultSkeleton.debtAssetId = this.foundVault.debtAssetId;
      this.vaultSkeleton.vaultType = this.foundVault.vaultType;
    });
  }

  handleBack(): void {
    router.back();
  }

  closePosition(): void {
    this.showCloseVaultDialog = true;
  }

  addCollateral(): void {
    this.showAddCollateralDialog = true;
  }

  borrowMore(): void {
    this.showBorrowMoreDialog = true;
  }

  repayDebt(): void {
    this.showRepayDebtDialog = true;
  }
}
</script>

<style lang="scss" scoped>
.vault-details-container {
  display: flex;
  gap: $inner-spacing-medium;

  &.empty {
    height: calc(100dvh - #{$header-height} - #{$footer-height});
  }

  .details-card {
    margin-bottom: $inner-spacing-big;
    box-shadow: var(--s-shadow-element-pressed);
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

    &__container {
      flex: 1;
      align-items: flex-start;
      margin: 0 $inner-spacing-mini;
    }
  }
  &-label {
    color: var(--s-color-base-content-secondary);
  }
}

.position-info,
.vault-collateral,
.vault-debt {
  &__details {
    margin-bottom: $inner-spacing-medium;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  &__item {
    flex: 1 1 50%;
    margin-top: $inner-spacing-mini;

    @include text-ellipsis;

    > * {
      line-height: var(--s-line-height-big);
    }
  }
}

.vault-returned {
  align-items: center;

  > * {
    line-height: var(--s-line-height-big);
  }
}

.position-info__details {
  margin-bottom: 0;
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

      border-radius: 50%;
      height: $icon-size;
      width: $icon-size;
      margin-right: 2px;

      @include ltv-status('success');
      @include ltv-status('warning');
      @include ltv-status('error');
    }
  }
}
</style>
