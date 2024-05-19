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
            <pair-token-logo class="vault-icon" size="medium" :first-token="kusdToken" :second-token="lockedAsset" />
            <h3>{{ vaultTitle }}</h3>
          </div>
          <s-divider />
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
                <formatted-amount value-can-be-hidden :value="formattedDebtAmount" :asset-symbol="kusdSymbol" />
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
                <formatted-amount value-can-be-hidden :value="formattedAvailableToBorrow" :asset-symbol="kusdSymbol" />
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
        </s-card>
        <s-button class="close-vault-button" type="link" @click="closePosition">
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
                  <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON" placement="top" tabindex="-1">
                    <s-icon name="info-16" size="12px" />
                  </s-tooltip>
                </p>
                <p class="p3">{{ formattedMaxLtv }}</p>
              </div>
            </div>
          </div>
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
              <value-status class="ltv__badge" badge error-icon-size="15" :value="ltvNumber" :getStatus="getLtvStatus">
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
        </s-card>
        <vault-details-history
          :history-loading="historyLoading"
          :history="history"
          :locked-asset="lockedAsset"
          :debt-asset="kusdToken"
        />
      </s-col>
    </s-row>
    <add-collateral-dialog
      :visible.sync="showAddCollateralDialog"
      :vault="vault"
      :asset="lockedAsset"
      :prev-ltv="adjustedLtv"
      :prev-available="availableToBorrow"
      :collateral="collateral"
      :max-ltv="maxLtv"
      :average-collateral-price="averageCollateralPrice"
      @confirm="updateHistoryWithDelay"
    />
    <borrow-more-dialog
      :visible.sync="showBorrowMoreDialog"
      :vault="vault"
      :prev-ltv="adjustedLtv"
      :available="availableToBorrow"
      :collateral="collateral"
      :max-safe-debt="maxSafeDebt"
      :max-ltv="maxLtv"
      @confirm="updateHistoryWithDelay"
    />
    <repay-debt-dialog
      :visible.sync="showRepayDebtDialog"
      :vault="vault"
      :prev-ltv="adjustedLtv"
      :max-safe-debt="maxSafeDebt"
      :max-ltv="maxLtv"
      @confirm="updateHistoryWithDelay"
    />
    <close-vault-dialog
      :visible.sync="showCloseVaultDialog"
      :vault="vault"
      :asset="lockedAsset"
      @confirm="goToVaults"
    />
  </div>
  <div v-else class="vault-details-container empty" />
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue, HundredNumber } from '@/consts';
import { fetchVaultEvents } from '@/indexer/queries/kensetsu';
import { LtvTranslations, VaultComponents, VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import type { VaultEvent } from '@/modules/vault/types';
import { getLtvStatus } from '@/modules/vault/util';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { asZeroValue, delay, getAssetBalance, waitUntil } from '@/utils';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';

const INDEXER_DELAY = 4 * 6_000;

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
  @state.vault.borrowTax private borrowTax!: number;
  @state.settings.percentFormat private percentFormat!: Nullable<Intl.NumberFormat>;

  showCloseVaultDialog = false;
  showAddCollateralDialog = false;
  showBorrowMoreDialog = false;
  showRepayDebtDialog = false;

  history: VaultEvent[] = [];
  historyLoading = false;

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

  private get ltvCoeff(): Nullable<FPNumber> {
    if (!(this.maxSafeDebt && this.vault)) return null;
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
    if (!(this.maxSafeDebt && this.vault)) return null;

    let available = this.maxSafeDebt.sub(this.vault.debt);
    available = available.sub(available.mul(this.borrowTax));

    let totalAvailable = this.collateral?.riskParams.hardCap.sub(this.collateral.kusdSupply) ?? this.Zero;
    totalAvailable = totalAvailable.sub(totalAvailable.mul(this.borrowTax));

    available = totalAvailable.lt(available) ? totalAvailable : available;
    return !available.isFinity() || available.isLteZero() ? this.Zero : available.dp(2);
  }

  get formattedAvailableToBorrow(): string {
    return this.availableToBorrow?.toLocaleString(2) ?? ZeroStringValue;
  }

  get fiatAvailableToBorrow(): string {
    if (!(this.kusdToken && this.availableToBorrow)) return ZeroStringValue;

    return this.getFiatAmountByFPNumber(this.availableToBorrow, this.kusdToken) ?? ZeroStringValue;
  }

  get isAddCollateralUnavailable(): boolean {
    if (!this.lockedAsset) return true;
    return asZeroValue(getAssetBalance(this.lockedAsset));
  }

  get isBorrowMoreUnavailable(): boolean {
    return this.availableToBorrow?.isLessThan(FPNumber.ONE) ?? true;
  }

  get isRepayDebtUnavailable(): boolean {
    return this.vault?.debt.isLessThan(FPNumber.ONE) ?? true;
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
    return this.percentFormat?.format?.(this.liquidationPenalty / HundredNumber) ?? `${this.liquidationPenalty}%`;
  }

  private get stabilityFee(): Nullable<FPNumber> {
    return this.collateral?.riskParams.stabilityFeeAnnual;
  }

  get formattedStabilityFee(): string {
    const percent = this.stabilityFee?.toNumber() ?? 0;
    return this.percentFormat?.format?.(percent / HundredNumber) ?? `${percent}%`;
  }

  goToVaults(): void {
    router.push({ name: VaultPageNames.Vaults });
  }

  private async updateHistory(id: number): Promise<void> {
    this.history = await fetchVaultEvents(id);
  }

  async updateHistoryWithDelay(): Promise<void> {
    if (!this.vault) return;
    await delay(INDEXER_DELAY);
    await this.updateHistory(this.vault.id);
  }

  mounted(): void {
    this.withApi(async () => {
      if (!this.isLoggedIn) {
        this.goToVaults();
        return;
      }
      await waitUntil(() => !this.parentLoading);
      if (!this.vault) {
        this.goToVaults();
        return;
      }
      this.historyLoading = true;
      await this.updateHistory(this.vault.id);
      this.historyLoading = false;
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
    height: calc(100vh - #{$header-height} - #{$footer-height});
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
