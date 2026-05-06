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
            <s-icon class="vaults-header__title-icon" name="info-16" size="16px"></s-icon>
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
          :model-value="selectedTab"
          @update:model-value="handleTabChange"
        ></responsive-tabs>
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
              ></pair-token-logo>
              <div class="vault-title__container s-flex-column">
                <h4 class="vault-title__name">{{ getVaultTitle(vault.lockedAsset, vault.debtAsset) }}</h4>
                <position-status :status="selectedTab"></position-status>
              </div>
              <s-button type="action" size="small" alternative :tooltip="t('assets.details')">
                <template #icon>
                  <s-icon name="arrows-chevron-right-rounded-24" size="24"></s-icon>
                </template>
              </s-button>
            </div>
            <s-divider class="vault-title__divider"></s-divider>
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
                      <s-icon name="info-16" size="11px"></s-icon>
                    </s-tooltip>
                  </p>
                  <template v-if="vault.lockedAsset">
                    <formatted-amount
                      value-can-be-hidden
                      :integer-only="isIntegerAmount(vault.lockedAmount)"
                      :value="format(vault.lockedAmount)"
                      :asset-symbol="getLockedSymbol(vault.lockedAsset)"
                    ></formatted-amount>
                    <formatted-amount
                      value-can-be-hidden
                      is-fiat-value
                      :value="formatFiat(vault.lockedAmount, vault.lockedAsset)"
                    ></formatted-amount>
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
                      <s-icon name="info-16" size="11px"></s-icon>
                    </s-tooltip>
                  </p>
                  <template v-if="vault.debtAsset">
                    <formatted-amount
                      value-can-be-hidden
                      :integer-only="isIntegerAmount(vault.debt)"
                      :value="format(vault.debt)"
                      :asset-symbol="getDebtSymbol(vault.debtAsset)"
                    ></formatted-amount>
                    <formatted-amount
                      value-can-be-hidden
                      is-fiat-value
                      :value="formatFiat(vault.debt, vault.debtAsset)"
                    ></formatted-amount>
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
                      <s-icon name="info-16" size="11px"></s-icon>
                    </s-tooltip>
                  </p>
                  <template v-if="vault.debtAsset">
                    <formatted-amount
                      value-can-be-hidden
                      :integer-only="isIntegerAmount(vault.available)"
                      :value="format(vault.available)"
                      :asset-symbol="getDebtSymbol(vault.debtAsset)"
                    ></formatted-amount>
                    <formatted-amount
                      value-can-be-hidden
                      is-fiat-value
                      :value="formatFiat(vault.available, vault.debtAsset)"
                    ></formatted-amount>
                  </template>
                </div>
              </div>
              <s-divider class="vault__divider"></s-divider>
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
                    <s-icon name="info-16" size="11px"></s-icon>
                  </s-tooltip>
                </p>
                <span class="vault__ltv-value s-flex">
                  <template v-if="vault.ltv && vault.adjustedLtv">
                    {{ format(vault.adjustedLtv) }}%
                    <value-status
                      class="vault__ltv-badge"
                      badge
                      :value="toNumber(vault.ltv)"
                      :get-status="getLtvStatus"
                    >
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
                    <s-icon name="info-16" size="11px"></s-icon>
                  </s-tooltip>
                </p>
                <template v-if="vault.lockedAsset && vault.debtAsset">
                  <formatted-amount
                    value-can-be-hidden
                    :integer-only="isIntegerAmount(vault.returned)"
                    :value="format(vault.returned)"
                    :asset-symbol="getLockedSymbol(vault.lockedAsset)"
                  ></formatted-amount>
                  <formatted-amount
                    value-can-be-hidden
                    is-fiat-value
                    :value="formatFiat(vault.returned, vault.lockedAsset)"
                  ></formatted-amount>
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
      ></history-pagination>
      <s-divider class="vaults-divider"></s-divider>
    </template>
    <explore-overall-stats></explore-overall-stats>
    <explore-collaterals
      class="vaults-stats"
      :explore-query="exploreQuery"
      @update-search="updateSearch"
      @open="handleCreateSelectedVault"
    ></explore-collaterals>
    <div class="vaults-disclaimer s-flex">
      <div class="disclaimer s-flex-column">
        <div class="disclaimer__title s-flex">
          <div class="disclaimer__badge">
            <s-icon class="disclaimer__icon" name="notifications-alert-triangle-24" size="14"></s-icon>
          </div>
          <h4>{{ t('disclaimerTitle') }}</h4>
        </div>
        <p class="disclaimer__description p4">{{ t('kensetsu.disclaimerDescription') }}</p>
        <external-link class="disclaimer__link p4" :title="t('kensetsu.readMore')" :href="link"></external-link>
      </div>
    </div>
    <create-vault-dialog v-model:visible="showCreateVaultDialog"></create-vault-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/soraneo-wallet/src/api';

import { HundredNumber, PaginationButton, ZeroStringValue } from '@/consts';
import { DsBreakpoints, BreakpointClass } from '@/consts/layout';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useVaultStore } from '@/stores/vault';
import { isAmountValueIntegerOnly } from '@/utils';

import type { Nullable } from '@/types/common';
import type { ResponsiveTab } from '@/types/tabs';
import type { FPNumber } from '@sora-substrate/math';
import type { RegisteredAccountAsset, Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentExternalLink from '@/lib/soraneo-wallet/src/components/shared/ExternalLink.vue';
import WalletComponentHistoryPagination from '@/lib/soraneo-wallet/src/components/HistoryPagination.vue';
import CreateVaultDialog from '@/modules/vault/components/CreateVaultDialog.vue';
import ExploreCollaterals from '@/modules/vault/components/ExploreCollaterals.vue';
import ExploreOverallStats from '@/modules/vault/components/ExploreOverallStats.vue';
import PairTokenLogo from '@/components/shared/PairTokenLogo.vue';
import PositionStatus from '@/modules/vault/components/PositionStatus.vue';
import ResponsiveTabs from '@/components/shared/ResponsiveTabs.vue';
import ValueStatus from '@/components/shared/ValueStatusWrapper.vue';
import { LtvTranslations, VaultPageNames, VaultStatuses } from '@/modules/vault/consts';
import { getLtvStatus } from '@/modules/vault/util';
import type { ClosedVault, VaultStatus } from '@/modules/vault/types';

defineOptions({
  name: 'VaultsPage',
  components: {
    TokenLogo: WalletComponentTokenLogo,
    FormattedAmount: WalletComponentFormattedAmount,
    ExternalLink: WalletComponentExternalLink,
    HistoryPagination: WalletComponentHistoryPagination,
    CreateVaultDialog,
    PairTokenLogo,
    ValueStatus,
    ResponsiveTabs,
    ExploreOverallStats,
    ExploreCollaterals,
    PositionStatus,
  },
});

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

const link = 'https://medium.com/@shibarimoto/kensetsu-ken-356077ebee78';

const { t, TranslationConsts } = useTranslation();
const { connectSoraWallet, isLoggedIn } = useInternalConnect();
const { formatCodecNumber, formatStringValue, getFiatAmountByFPNumber, getFiatAmountByCodecString, Zero } =
  useFormattedAmount();
const router = useRouter();
const settingsStore = useSettingsStore();
const assetsStore = useAssetsStore();
const vaultStore = useVaultStore();

const loading = ref(false);
const showCreateVaultDialog = ref(false);
const selectedTab = ref<VaultStatus>(VaultStatuses.Opened);
const exploreQuery = ref('');
const activeCollapseItems = ref<string[]>([]);

const currentPage = ref(1);
const pageAmount = ref(6);
const isLtrDirection = ref(true);

const windowWidth = computed(() => settingsStore.windowWidth);
const screenBreakpointClass = computed(() => settingsStore.screenBreakpointClass as BreakpointClass);

const openedVaults = computed(() => vaultStore.accountVaults);
const closedAccountVaults = computed(() => vaultStore.closedAccountVaults);
const collaterals = computed(() => vaultStore.collaterals);
const averageCollateralPrices = computed(() => vaultStore.averageCollateralPrices);

const getAsset = assetsStore.assetDataByAddress as (addr?: string) => Nullable<RegisteredAccountAsset>;
const getBorrowTax = vaultStore.getBorrowTax as (debtAsset: Asset | AccountAsset | string) => number;

const selectCollateral = (address?: string) => vaultStore.setCollateralTokenAddress(address);
const selectDebt = (address?: string) => vaultStore.setDebtTokenAddress(address);

const resolvePageAmount = (width: number): number => {
  if (width <= DsBreakpoints.sm) return 2;
  if (width <= DsBreakpoints.lg) return 4;
  if (width <= DsBreakpoints.xl) return 6;
  return 8;
};

watch(
  windowWidth,
  (width) => {
    const next = resolvePageAmount(width);
    if (next !== pageAmount.value) {
      pageAmount.value = next;
      currentPage.value = 1;
      isLtrDirection.value = true;
    }
  },
  { immediate: true }
);

const closedVaultsData = computed<ClosedVaultData[]>(() =>
  closedAccountVaults.value.map((item) => ({
    ...item,
    lockedAsset: getAsset(item.lockedAssetId),
    debtAsset: getAsset(item.debtAssetId),
  }))
);

const closedVaults = computed(() => closedVaultsData.value.filter((vault) => vault.status === VaultStatuses.Closed));
const liquidatedVaults = computed(() =>
  closedVaultsData.value.filter((vault) => vault.status === VaultStatuses.Liquidated)
);

const openedVaultsData = computed<OpenedVaultData[]>(() =>
  openedVaults.value.map((vault) => {
    const lockedAsset = getAsset(vault.lockedAssetId);
    const debtAsset = getAsset(vault.debtAssetId);
    const borrowTax = getBorrowTax(vault.debtAssetId);
    const collateralId = api.kensetsu.serializeKey(vault.lockedAssetId, vault.debtAssetId);
    const collateral = collaterals.value[collateralId];
    const averagePrice = averageCollateralPrices.value[collateralId] ?? Zero;
    const collateralVolume = averagePrice.mul(vault.lockedAmount);
    const ratio = collateral?.riskParams.liquidationRatioReversed ?? 0;
    const maxSafeDebt = collateralVolume.mul(ratio).div(HundredNumber);
    const maxSafeDebtWithoutTax = maxSafeDebt.sub(maxSafeDebt.mul(borrowTax));
    const ltvCoeff = vault.debt.div(maxSafeDebt);
    const ltv = ltvCoeff.isFinity() ? ltvCoeff.mul(HundredNumber) : null;
    const adjustedLtv = ltv ? ltvCoeff.mul(ratio) : null;
    const availableCoeff = maxSafeDebtWithoutTax.sub(vault.debt);
    let totalAvailable = collateral?.riskParams.hardCap.sub(collateral.debtSupply) ?? Zero;
    totalAvailable = totalAvailable.sub(totalAvailable.mul(borrowTax));
    let available = totalAvailable.lt(availableCoeff) ? totalAvailable : availableCoeff;
    available = !available.isFinity() || available.isLteZero() ? Zero : available.dp(2);

    return { ...vault, lockedAsset, debtAsset, ltv, adjustedLtv, available };
  })
);

const openedVaultsLength = computed(() => openedVaults.value.length);
const closedVaultsLength = computed(() => closedVaults.value.length);
const liquidatedVaultsLength = computed(() => liquidatedVaults.value.length);

const hasVaults = computed(
  () => isLoggedIn.value && Boolean(openedVaultsLength.value + closedAccountVaults.value.length)
);

const showDropdown = computed(() =>
  [BreakpointClass.Mobile, BreakpointClass.LargeMobile].includes(screenBreakpointClass.value)
);

const getVaultsLength = (status: VaultStatus): number => {
  switch (status) {
    case VaultStatuses.Closed:
      return closedVaultsLength.value;
    case VaultStatuses.Liquidated:
      return liquidatedVaultsLength.value;
    case VaultStatuses.Opened:
      return openedVaultsLength.value;
    default:
      return 0;
  }
};

const tabs = computed<ResponsiveTab[]>(() =>
  Object.values(VaultStatuses).map((status) => ({
    name: status,
    label: `${t(`kensetsu.status.${status}`)} (${getVaultsLength(status)})`,
  }))
);

const vaultsData = computed<VaultData[]>(() => {
  switch (selectedTab.value) {
    case VaultStatuses.Opened:
      return openedVaultsData.value;
    case VaultStatuses.Closed:
      return closedVaults.value;
    case VaultStatuses.Liquidated:
      return liquidatedVaults.value;
    default:
      return openedVaultsData.value;
  }
});

const total = computed(() => vaultsData.value.length);
const lastPage = computed(() => Math.max(1, Math.ceil(total.value / pageAmount.value) || 1));

const getPageItems = (items: VaultData[]): VaultData[] => {
  const start = (currentPage.value - 1) * pageAmount.value;
  const end = start + pageAmount.value;
  return items.slice(start, end);
};

const filteredVaultsData = computed(() => getPageItems(vaultsData.value));

watch(total, () => {
  currentPage.value = 1;
  isLtrDirection.value = true;
});

const handleTabChange = (tab: VaultStatus) => {
  selectedTab.value = tab;
  currentPage.value = 1;
  isLtrDirection.value = true;
};

const handlePaginationClick = (button: PaginationButton) => {
  let next = currentPage.value;

  switch (button) {
    case PaginationButton.Prev:
      next -= 1;
      break;
    case PaginationButton.Next:
      next += 1;
      if (next === lastPage.value) {
        isLtrDirection.value = false;
      }
      break;
    case PaginationButton.First:
      next = 1;
      isLtrDirection.value = true;
      break;
    case PaginationButton.Last:
      next = lastPage.value;
      isLtrDirection.value = false;
      break;
    default:
      next = 1;
  }

  currentPage.value = Math.min(Math.max(next, 1), lastPage.value);
};

const updateSearch = (search: string) => {
  exploreQuery.value = search;
};

const updateActiveCollapseItems = (items: string[]) => {
  activeCollapseItems.value = items;
};

const isOpenedVaultItem = (vault: VaultData): vault is OpenedVaultData =>
  (vault as OpenedVaultData).lockedAmount !== undefined;

const getVaultTitle = (
  lockedAsset?: Nullable<RegisteredAccountAsset>,
  debtAsset?: Nullable<RegisteredAccountAsset>
): string => {
  if (!(debtAsset && lockedAsset)) return '';
  return `${debtAsset.symbol} / ${lockedAsset.symbol}`;
};

const getLockedSymbol = (lockedAsset?: RegisteredAccountAsset): string => lockedAsset?.symbol ?? '';
const getDebtSymbol = (debtAsset?: RegisteredAccountAsset): string => debtAsset?.symbol ?? '';

const format = (value?: FPNumber): string => value?.toLocaleString(2) ?? ZeroStringValue;
const isIntegerAmount = (value?: FPNumber): boolean => isAmountValueIntegerOnly(format(value));

const formatFiat = (amount: Nullable<FPNumber>, asset: Nullable<RegisteredAccountAsset>): string => {
  if (!(amount && asset)) return ZeroStringValue;
  return getFiatAmountByFPNumber(amount, asset) ?? ZeroStringValue;
};

const getLtvText = (ltv: FPNumber): string => LtvTranslations[getLtvStatus(ltv.toNumber())];
const toNumber = (value?: FPNumber): number => value?.toNumber() ?? 0;

const handleCreateVault = () => {
  showCreateVaultDialog.value = true;
};

const handleCreateSelectedVault = async (lockedAsset: RegisteredAccountAsset, debtAsset: RegisteredAccountAsset) => {
  await selectCollateral(lockedAsset.address);
  await selectDebt(debtAsset.address);
  showCreateVaultDialog.value = true;
};

const handleOpenVaultDetails = (vault: VaultData) => {
  router.push({ name: VaultPageNames.VaultDetails, params: { vault: `${vault.id}` } });
};

defineExpose({
  connectSoraWallet,
  handleCreateVault,
  handleCreateSelectedVault,
  handleOpenVaultDetails,
  filteredVaultsData,
  tabs,
  showCreateVaultDialog,
});
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
      font-size: var(--s-heading2-font-size);
      line-height: 39px;
      font-weight: 400;

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

        h4 {
          margin: 0;
          font-size: var(--s-heading4-font-size);
          line-height: 27px;
        }
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
        font-size: var(--s-font-size-mini);
        line-height: 1.8;
        text-align: center;
      }
      &__link {
        font-size: var(--s-heading6-font-size);
        line-height: 25.2px;
        margin-top: $inner-spacing-mini;
        color: var(--s-color-status-info);
        @include focus-outline;
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
