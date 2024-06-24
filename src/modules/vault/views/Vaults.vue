<template>
  <div class="vaults-container">
    <s-row class="vaults-header">
      <s-col :xs="12" :sm="6" :md="6" :lg="6">
        <h2 class="vaults-header__title s-flex">
          Kensetsu
          <s-tooltip
            slot="suffix"
            border-radius="mini"
            :content="t('kensetsu.introDescription')"
            placement="top"
            tabindex="-1"
          >
            <s-icon class="vaults-header__title-icon" name="info-16" size="16px" />
          </s-tooltip>
        </h2>
      </s-col>
      <s-col class="s-flex vaults-header__action-container" :xs="12" :sm="6" :md="6" :lg="6">
        <s-button
          v-if="isLoggedIn"
          class="vaults-header__action s-typography-button--large"
          icon="various-atom-24"
          type="primary"
          @click="handleCreateVault"
        >
          {{ t('kensetsu.createVaultAction') }}
        </s-button>
        <s-button
          v-else
          class="vaults-header__action s-typography-button--large"
          type="primary"
          @click="connectSoraWallet"
        >
          {{ t('connectWalletText') }}
        </s-button>
      </s-col>
      <s-col v-if="hasVaults" :xs="12" :sm="12" :md="12" :lg="12">
        <responsive-tabs
          class="vaults-header__tabs"
          :is-mobile="showDropdown"
          :tabs="tabs"
          :value="selectedTab"
          @input="handleTabChange"
        />
      </s-col>
    </s-row>
    <template v-if="hasVaults">
      <s-row class="vaults-content" :gutter="24">
        <s-col v-for="vault in filteredVaultsData" :key="'vault_' + vault.id" :xs="12" :sm="6" :md="6" :lg="4" :xl="3">
          <s-card
            class="vault"
            border-radius="mini"
            size="medium"
            primary
            clickable
            @click="handleOpenVaultDetails(vault)"
          >
            <div class="vault-title s-flex">
              <pair-token-logo
                :first-token="vault.debtAsset"
                :second-token="vault.lockedAsset"
                size="medium"
                class="vault-title__icon"
              />
              <div class="vault-title__container s-flex-column">
                <h4 class="vault-title__name">{{ getVaultTitle(vault.lockedAsset, vault.debtAsset) }}</h4>
                <position-status :status="selectedTab" />
              </div>
              <s-button type="action" size="small" alternative :tooltip="t('assets.details')">
                <s-icon name="arrows-chevron-right-rounded-24" size="24" />
              </s-button>
            </div>
            <s-divider class="vault-title__divider" />
            <template v-if="isOpenedVault(vault)">
              <div class="vault-details s-flex">
                <div class="vault-details__item s-flex-column">
                  <p class="p4 vault__label">
                    {{ t('kensetsu.yourCollateral') }}
                    <s-tooltip
                      slot="suffix"
                      border-radius="mini"
                      :content="t('kensetsu.yourCollateralDescription')"
                      placement="top"
                      tabindex="-1"
                    >
                      <s-icon name="info-16" size="11px" />
                    </s-tooltip>
                  </p>
                  <template v-if="vault.lockedAsset">
                    <formatted-amount
                      value-can-be-hidden
                      :value="format(vault.lockedAmount)"
                      :asset-symbol="getLockedSymbol(vault.lockedAsset)"
                    />
                    <formatted-amount
                      value-can-be-hidden
                      is-fiat-value
                      :value="formatFiat(vault.lockedAmount, vault.lockedAsset)"
                    />
                  </template>
                </div>
                <div class="vault-details__item s-flex-column">
                  <p class="p4 vault__label">
                    {{ t('kensetsu.yourDebt') }}
                    <s-tooltip
                      slot="suffix"
                      border-radius="mini"
                      :content="t('kensetsu.yourDebtDescription')"
                      placement="top"
                      tabindex="-1"
                    >
                      <s-icon name="info-16" size="11px" />
                    </s-tooltip>
                  </p>
                  <template v-if="vault.debtAsset">
                    <formatted-amount
                      value-can-be-hidden
                      :value="format(vault.debt)"
                      :asset-symbol="getDebtSymbol(vault.debtAsset)"
                    />
                    <formatted-amount
                      value-can-be-hidden
                      is-fiat-value
                      :value="formatFiat(vault.debt, vault.debtAsset)"
                    />
                  </template>
                </div>
                <div class="vault-details__item s-flex-column">
                  <p class="p4 vault__label">
                    {{ t('kensetsu.availableToBorrow') }}
                    <s-tooltip
                      slot="suffix"
                      border-radius="mini"
                      :content="t('kensetsu.availableToBorrowDescription')"
                      placement="top"
                      tabindex="-1"
                    >
                      <s-icon name="info-16" size="11px" />
                    </s-tooltip>
                  </p>
                  <template v-if="vault.debtAsset">
                    <formatted-amount
                      value-can-be-hidden
                      :value="format(vault.available)"
                      :asset-symbol="getDebtSymbol(vault.debtAsset)"
                    />
                    <formatted-amount
                      value-can-be-hidden
                      is-fiat-value
                      :value="formatFiat(vault.available, vault.debtAsset)"
                    />
                  </template>
                </div>
              </div>
              <s-divider class="vault__divider" />
              <div class="vault__ltv s-flex">
                <p class="p4 vault__label">
                  {{ TranslationConsts.LTV }}
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.ltvDescription')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="11px" />
                  </s-tooltip>
                </p>
                <span class="vault__ltv-value s-flex">
                  <template v-if="vault.ltv && vault.adjustedLtv">
                    {{ format(vault.adjustedLtv) }}%
                    <value-status class="vault__ltv-badge" badge :value="toNumber(vault.ltv)" :getStatus="getLtvStatus">
                      {{ getLtvText(vault.ltv) }}
                    </value-status>
                  </template>
                  <template v-else>n/a</template>
                </span>
              </div>
            </template>
            <div v-else class="vault-details s-flex">
              <div class="vault-details__item centered s-flex-column">
                <p class="p4 vault__label">
                  {{ t('kensetsu.totalCollateralReturned') }}
                  <s-tooltip
                    slot="suffix"
                    border-radius="mini"
                    :content="t('kensetsu.totalCollateralReturnedDescription')"
                    placement="top"
                    tabindex="-1"
                  >
                    <s-icon name="info-16" size="11px" />
                  </s-tooltip>
                </p>
                <template v-if="vault.lockedAsset && vault.debtAsset">
                  <formatted-amount
                    value-can-be-hidden
                    :value="format(vault.returned)"
                    :asset-symbol="getLockedSymbol(vault.lockedAsset)"
                  />
                  <formatted-amount
                    value-can-be-hidden
                    is-fiat-value
                    :value="formatFiat(vault.returned, vault.lockedAsset)"
                  />
                  <s-button
                    class="vault-details__action"
                    size="small"
                    @click.stop="handleCreateSelectedVault(vault.lockedAsset, vault.debtAsset)"
                  >
                    {{ t('kensetsu.reopen') }}
                  </s-button>
                </template>
              </div>
            </div>
          </s-card>
        </s-col>
      </s-row>
      <history-pagination
        class="vaults-pagination"
        :current-page="currentPage"
        :page-amount="pageAmount"
        :loading="loading"
        :total="total"
        :last-page="lastPage"
        @pagination-click="handlePaginationClick"
      />
      <s-divider class="vaults-divider" />
    </template>
    <explore-overall-stats />
    <explore-collaterals class="vaults-stats" @open="handleCreateSelectedVault" />
    <div class="vaults-disclaimer s-flex">
      <div class="disclaimer s-flex-column">
        <div class="disclaimer__title s-flex">
          <div class="disclaimer__badge">
            <s-icon class="disclaimer__icon" name="notifications-alert-triangle-24" size="14" />
          </div>
          <h4>{{ t('disclaimerTitle') }}</h4>
        </div>
        <p class="disclaimer__description p4">{{ t('kensetsu.disclaimerDescription') }}</p>
        <external-link class="disclaimer__link p4" :title="t('kensetsu.readMore')" :href="link" />
      </div>
    </div>
    <create-vault-dialog :visible.sync="showCreateVaultDialog" />
  </div>
</template>

<script lang="ts">
import { mixins, components, WALLET_CONSTS, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { BreakpointClass, Components, DsBreakpoints, HundredNumber, ZeroStringValue } from '@/consts';
import { LtvTranslations, VaultComponents, VaultPageNames, VaultStatuses } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import type { ClosedVault, VaultStatus } from '@/modules/vault/types';
import { getLtvStatus } from '@/modules/vault/util';
import router, { lazyComponent } from '@/router';
import { state, getter, action } from '@/store/decorators';
import type { ResponsiveTab } from '@/types/tabs';

import type { FPNumber, CodecString } from '@sora-substrate/math';
import type { RegisteredAccountAsset, Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';

type OpenedVaultData = Vault & {
  lockedAsset: Nullable<RegisteredAccountAsset>;
  debtAsset: Nullable<RegisteredAccountAsset>;
  ltv: Nullable<FPNumber>;
  adjustedLtv: Nullable<FPNumber>;
  available: FPNumber;
};

type ClosedVaultData = ClosedVault & {
  lockedAsset: Nullable<RegisteredAccountAsset>;
  debtAsset: Nullable<RegisteredAccountAsset>;
};

type VaultData = OpenedVaultData | ClosedVaultData;

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    ExternalLink: components.ExternalLink,
    HistoryPagination: components.HistoryPagination,
    CreateVaultDialog: vaultLazyComponent(VaultComponents.CreateVaultDialog),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
    ResponsiveTabs: lazyComponent(Components.ResponsiveTabs),
    ExploreOverallStats: vaultLazyComponent(VaultComponents.ExploreOverallStats),
    ExploreCollaterals: vaultLazyComponent(VaultComponents.ExploreCollaterals),
    PositionStatus: vaultLazyComponent(VaultComponents.PositionStatus),
  },
})
export default class Vaults extends Mixins(
  InternalConnectMixin,
  mixins.FormattedAmountMixin,
  mixins.PaginationSearchMixin
) {
  readonly link = 'https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78';
  readonly getLtvStatus = getLtvStatus;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;
  @getter.vault.getBorrowTax private getTax!: (debtAsset: Asset | AccountAsset | string) => number;
  @state.vault.closedAccountVaults private closedAccountVaults!: ClosedVault[];
  @state.vault.accountVaults private openedVaults!: Vault[];
  @state.vault.collaterals private collaterals!: Record<string, Collateral>;
  @state.vault.averageCollateralPrices private averageCollateralPrices!: Record<string, Nullable<FPNumber>>;
  @state.settings.screenBreakpointClass private screenBreakpointClass!: BreakpointClass;
  @state.settings.windowWidth windowWidth!: number;

  @action.vault.setCollateralTokenAddress private selectCollateral!: (address?: string) => Promise<void>;
  @action.vault.setDebtTokenAddress private selectDebt!: (address?: string) => Promise<void>;

  showCreateVaultDialog = false;
  selectedTab: VaultStatus = VaultStatuses.Opened;

  pageAmount = 6; // override PaginationSearchMixin, getter cannot be used, that's why @Watch is used

  @Watch('windowWidth')
  onWindowWidthChange(): void {
    let pageAmount: number;
    if (this.windowWidth <= DsBreakpoints.sm) {
      pageAmount = 2;
    } else if (this.windowWidth <= DsBreakpoints.lg) {
      pageAmount = 4;
    } else if (this.windowWidth <= DsBreakpoints.xl) {
      pageAmount = 6;
    } else {
      pageAmount = 8;
    }
    if (pageAmount !== this.pageAmount) {
      this.pageAmount = pageAmount;
      this.resetPage();
    }
  }

  @Watch('total')
  onTotalChange(): void {
    this.resetPage();
  }

  get showDropdown(): boolean {
    return [BreakpointClass.Mobile, BreakpointClass.LargeMobile].includes(this.screenBreakpointClass);
  }

  get tabs(): Array<ResponsiveTab> {
    return Object.values(VaultStatuses).map((el) => ({
      name: el,
      label: this.t(`kensetsu.status.${el}`) + ' ' + `(${this.getVaultsLength(el)})`,
    }));
  }

  isOpenedVault(vault: VaultData): vault is OpenedVaultData {
    return (vault as OpenedVaultData).lockedAmount !== undefined;
  }

  isClosedVault(vault: VaultData): vault is ClosedVaultData {
    return (vault as OpenedVaultData).lockedAmount === undefined;
  }

  private getVaultsLength(status: VaultStatus): number {
    switch (status) {
      case VaultStatuses.Closed:
        return this.closedVaultsLength;
      case VaultStatuses.Liquidated:
        return this.liquidatedVaultsLength;
      case VaultStatuses.Opened:
        return this.openedVaultsLength;
      default:
        return 0;
    }
  }

  handleTabChange(tab: VaultStatus): void {
    this.selectedTab = tab;
    this.resetPage();
  }

  handlePaginationClick(button: WALLET_CONSTS.PaginationButton): void {
    let current = 1;

    switch (button) {
      case WALLET_CONSTS.PaginationButton.Prev:
        current = this.currentPage - 1;
        break;
      case WALLET_CONSTS.PaginationButton.Next:
        current = this.currentPage + 1;
        if (current === this.lastPage) {
          this.isLtrDirection = false;
        }
        break;
      case WALLET_CONSTS.PaginationButton.First:
        this.isLtrDirection = true;
        break;
      case WALLET_CONSTS.PaginationButton.Last:
        current = this.lastPage;
        this.isLtrDirection = false;
    }

    this.currentPage = current;
  }

  private get closedVaultsData(): ClosedVaultData[] {
    return this.closedAccountVaults.map((item) => {
      const lockedAsset = this.getAsset(item.lockedAssetId);
      const debtAsset = this.getAsset(item.debtAssetId);
      return { ...item, lockedAsset, debtAsset };
    });
  }

  private get closedVaults(): ClosedVaultData[] {
    return this.closedVaultsData.filter((vault) => vault.status === VaultStatuses.Closed);
  }

  private get liquidatedVaults(): ClosedVaultData[] {
    return this.closedVaultsData.filter((vault) => vault.status === VaultStatuses.Liquidated);
  }

  private get closedVaultsLength(): number {
    return this.closedVaults.length;
  }

  private get liquidatedVaultsLength(): number {
    return this.liquidatedVaults.length;
  }

  private get openedVaultsLength(): number {
    return this.openedVaults.length;
  }

  get hasVaults(): boolean {
    return this.isLoggedIn && !!(this.openedVaultsLength + this.closedAccountVaults.length);
  }

  private get openedVaultsData(): OpenedVaultData[] {
    return this.openedVaults.map((vault) => {
      const lockedAsset = this.getAsset(vault.lockedAssetId);
      const debtAsset = this.getAsset(vault.debtAssetId);
      const borrowTax = this.getTax(vault.debtAssetId);
      const collateralId = api.kensetsu.serializeKey(vault.lockedAssetId, vault.debtAssetId);
      const collateral = this.collaterals[collateralId];
      const averagePrice = this.averageCollateralPrices[collateralId] ?? this.Zero;
      const collateralVolume = averagePrice.mul(vault.lockedAmount);
      const ratio = collateral?.riskParams.liquidationRatioReversed ?? 0;
      const maxSafeDebt = collateralVolume.mul(ratio).div(HundredNumber);
      const maxSafeDebtWithoutTax = maxSafeDebt.sub(maxSafeDebt.mul(borrowTax));
      const ltvCoeff = vault.debt.div(maxSafeDebt);
      const ltv = ltvCoeff.isFinity() ? ltvCoeff.mul(HundredNumber) : null;
      const adjustedLtv = ltv ? ltvCoeff.mul(ratio) : null;
      const availableCoeff = maxSafeDebtWithoutTax.sub(vault.debt);
      let totalAvailable = collateral?.riskParams.hardCap.sub(collateral.debtSupply) ?? this.Zero;
      totalAvailable = totalAvailable.sub(totalAvailable.mul(borrowTax));
      let available = totalAvailable.lt(availableCoeff) ? totalAvailable : availableCoeff;
      available = !available.isFinity() || available.isLteZero() ? this.Zero : available.dp(2);
      return { ...vault, lockedAsset, debtAsset, ltv, adjustedLtv, available };
    });
  }

  get vaultsData(): VaultData[] {
    switch (this.selectedTab) {
      case VaultStatuses.Opened:
        return this.openedVaultsData;
      case VaultStatuses.Closed:
        return this.closedVaults;
      case VaultStatuses.Liquidated:
        return this.liquidatedVaults;
      default:
        return this.openedVaultsData;
    }
  }

  get filteredVaultsData(): VaultData[] {
    return this.getPageItems(this.vaultsData);
  }

  get total(): number {
    return this.vaultsData.length;
  }

  getVaultTitle(lockedAsset?: Nullable<RegisteredAccountAsset>, debtAsset?: Nullable<RegisteredAccountAsset>): string {
    if (!(debtAsset && lockedAsset)) return '';
    return `${debtAsset.symbol} / ${lockedAsset.symbol}`;
  }

  getLockedSymbol(lockedAsset?: RegisteredAccountAsset): string {
    return lockedAsset?.symbol ?? '';
  }

  getDebtSymbol(debtAsset?: RegisteredAccountAsset): string {
    return debtAsset?.symbol ?? '';
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

  handleCreateVault(): void {
    this.showCreateVaultDialog = true;
  }

  async handleCreateSelectedVault(
    lockedAsset: RegisteredAccountAsset,
    debtAsset: RegisteredAccountAsset
  ): Promise<void> {
    await this.selectCollateral(lockedAsset.address);
    await this.selectDebt(debtAsset.address);
    this.showCreateVaultDialog = true;
  }

  handleOpenVaultDetails(vault: VaultData): void {
    router.push({ name: VaultPageNames.VaultDetails, params: { vault: `${vault.id}` } });
  }
}
</script>

<style lang="scss">
.no-vaults__page-header > .page-header-title.bold {
  line-height: var(--s-size-small);
}
</style>

<style lang="scss" scoped>
.vaults {
  &-container {
    margin-left: 0;
    margin-right: $inner-spacing-big;

    @include tablet(true) {
      margin-right: $inner-spacing-mini;
      margin-left: $inner-spacing-mini;
    }
  }

  &-header {
    @media (max-width: 639px) {
      // responsive breakpoint from DS
      &__action-container {
        flex-direction: column;
      }
    }

    &__action-container {
      justify-content: flex-end;
    }

    &__title,
    &__action {
      margin-bottom: $inner-spacing-medium;
    }

    &__tabs {
      margin-bottom: $inner-spacing-big;
    }

    &__title {
      align-items: center;
      &-icon {
        margin-left: 4px;
      }
    }
  }

  &-stats {
    margin-bottom: $inner-spacing-big;
  }

  &-pagination {
    margin-top: 0;
  }

  &-divider {
    margin-top: $inner-spacing-mini;
  }

  &-disclaimer {
    justify-content: center;
    .disclaimer {
      max-width: $inner-window-width;
      align-items: center;
      &__title {
        align-items: center;
        margin-bottom: $inner-spacing-medium;
      }
      &__icon {
        color: white;
      }
      &__badge {
        border-radius: 50%;
        background-color: var(--s-color-status-info);
        padding: 6px $inner-spacing-mini;
        box-shadow: var(--s-shadow-element-pressed);
        margin-right: $inner-spacing-mini;
      }
      &__description {
        text-align: center;
      }
      &__link {
        @include focus-outline;
        font-size: var(--s-heading6-font-size);
        margin-top: $inner-spacing-mini;
        color: var(--s-color-status-info);
      }
    }
  }
}

.vault {
  margin-bottom: $inner-spacing-big;
  box-shadow: var(--s-shadow-element-pressed);

  &-title {
    align-items: center;
    justify-content: space-between;

    &__container {
      flex: 1;
      align-items: flex-start;
      margin: 0 $inner-spacing-mini;
    }

    &__name {
      @include text-ellipsis;
    }

    &__divider {
      margin-bottom: 0;
      margin-top: $basic-spacing-small;
    }
  }

  &__label {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-small);
  }

  &__divider {
    margin-top: $inner-spacing-small;
    margin-bottom: $inner-spacing-small;
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
      margin-top: $inner-spacing-small;

      &.centered {
        align-items: center;
      }

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

    &__action {
      margin: $inner-spacing-small 0;
    }
  }
}
</style>
