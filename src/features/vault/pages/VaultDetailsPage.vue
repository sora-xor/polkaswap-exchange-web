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
      <s-icon name="arrows-chevron-left-rounded-24" size="24"></s-icon>
    </s-button>
    <s-row class="vault-details-main" :gutter="20">
      <s-col :xs="12" :sm="12" :md="6" :lg="6">
        <s-card class="vault details-card" border-radius="small" size="big" primary>
          <div class="vault-title s-flex">
            <pair-token-logo
              class="vault-icon"
              size="medium"
              :first-token="debtAsset"
              :second-token="lockedAsset"
            ></pair-token-logo>
            <div class="vault-title__container s-flex-column">
              <h3>{{ vaultTitle }}</h3>
              <position-status :status="status"></position-status>
            </div>
          </div>
          <s-divider></s-divider>
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
                      <s-icon name="info-16" size="12px"></s-icon>
                    </s-tooltip>
                  </p>
                  <formatted-amount
                    value-can-be-hidden
                    :integer-only="isAmountValueIntegerOnly(formattedLockedAmount)"
                    :value="formattedLockedAmount"
                    :asset-symbol="lockedSymbol"
                  ></formatted-amount>
                  <formatted-amount value-can-be-hidden is-fiat-value :value="fiatLockedAmount"></formatted-amount>
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
            <s-divider></s-divider>
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
                      <s-icon name="info-16" size="12px"></s-icon>
                    </s-tooltip>
                  </p>
                  <formatted-amount
                    value-can-be-hidden
                    :integer-only="isAmountValueIntegerOnly(formattedDebtAmount)"
                    :value="formattedDebtAmount"
                    :asset-symbol="debtSymbol"
                  ></formatted-amount>
                  <formatted-amount value-can-be-hidden is-fiat-value :value="fiatDebt"></formatted-amount>
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
                      <s-icon name="info-16" size="12px"></s-icon>
                    </s-tooltip>
                  </p>
                  <formatted-amount
                    value-can-be-hidden
                    :integer-only="isAmountValueIntegerOnly(formattedAvailableToBorrow)"
                    :value="formattedAvailableToBorrow"
                    :asset-symbol="debtSymbol"
                  ></formatted-amount>
                  <formatted-amount value-can-be-hidden is-fiat-value :value="fiatAvailableToBorrow"></formatted-amount>
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
                <s-icon name="info-16" size="12px"></s-icon>
              </s-tooltip>
            </p>
            <formatted-amount
              value-can-be-hidden
              :integer-only="isAmountValueIntegerOnly(formattedReturnedAmount)"
              :value="formattedReturnedAmount"
              :asset-symbol="lockedSymbol"
            ></formatted-amount>
            <formatted-amount value-can-be-hidden is-fiat-value :value="fiatReturnedAmount"></formatted-amount>
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
                    <s-icon name="info-16" size="12px"></s-icon>
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
                    <s-icon name="info-16" size="12px"></s-icon>
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
                    <s-icon name="info-16" size="12px"></s-icon>
                  </s-tooltip>
                </p>
                <p class="p3">{{ formattedMaxLtv }}</p>
              </div>
            </div>
          </div>
          <template v-if="ltv">
            <s-divider></s-divider>
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
                  <s-icon name="info-16" size="12px"></s-icon>
                </s-tooltip>
              </h4>
              <div class="ltv__value s-flex">
                <h2>{{ formattedLtv }}</h2>
                <value-status
                  class="ltv__badge"
                  badge
                  error-icon-size="15"
                  :value="ltvNumber"
                  :get-status="getLtvStatus"
                >
                  {{ ltvText }}
                </value-status>
              </div>
              <ltv-progress-bar :percentage="ltvNumber"></ltv-progress-bar>
              <div class="ltv__legend s-flex">
                <div class="ltv__legend-item">
                  <span class="ltv__legend-icon success"></span>
                  {{ t('kensetsu.positionSafe') }}
                </div>
                <div class="ltv__legend-item">
                  <span class="ltv__legend-icon warning"></span>
                  {{ t('kensetsu.liquidationClose') }}
                </div>
                <div class="ltv__legend-item">
                  <span class="ltv__legend-icon error"></span>
                  {{ t('kensetsu.highLiquidationRisk') }}
                </div>
              </div>
            </div>
          </template>
        </s-card>
        <vault-details-history
          :id="vault.id"
          :locked-asset="lockedAsset"
          :debt-asset="debtAsset"
        ></vault-details-history>
      </s-col>
    </s-row>
    <template v-if="ltv">
      <add-collateral-dialog
        v-model:visible="showAddCollateralDialog"
        :vault="vault"
        :locked-asset="lockedAsset"
        :debt-asset="debtAsset"
        :prev-ltv="adjustedLtv"
        :prev-available="availableToBorrow"
        :collateral="collateral"
        :max-ltv="maxLtv"
        :average-collateral-price="averageCollateralPrice"
        :borrow-tax="borrowTax"
      ></add-collateral-dialog>
      <borrow-more-dialog
        v-model:visible="showBorrowMoreDialog"
        :vault="vault"
        :debt-asset="debtAsset"
        :prev-ltv="adjustedLtv"
        :available="availableToBorrow"
        :collateral="collateral"
        :max-safe-debt="maxSafeDebt"
        :max-ltv="maxLtv"
        :borrow-tax="borrowTax"
      ></borrow-more-dialog>
      <repay-debt-dialog
        v-model:visible="showRepayDebtDialog"
        :vault="vault"
        :debt-asset="debtAsset"
        :prev-ltv="adjustedLtv"
        :max-safe-debt="maxSafeDebt"
        :max-ltv="maxLtv"
      ></repay-debt-dialog>
      <close-vault-dialog
        v-model:visible="showCloseVaultDialog"
        :vault="vault"
        :locked-asset="lockedAsset"
        :debt-asset="debtAsset"
        @confirm="goToVaults"
      ></close-vault-dialog>
    </template>
  </div>
  <div v-else class="vault-details-container empty"></div>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { XOR, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { HundredNumber, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useVaultStore } from '@/stores/vault';
import { useWalletStore } from '@/stores/wallet';
import { asZeroValue, getAssetBalance, isAmountValueIntegerOnly } from '@/utils';

import type { RegisteredAccountAsset, Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';
import type { Nullable } from '@/types/common';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import AddCollateralDialog from '@/modules/vault/components/AddCollateralDialog.vue';
import BorrowMoreDialog from '@/modules/vault/components/BorrowMoreDialog.vue';
import CloseVaultDialog from '@/modules/vault/components/CloseVaultDialog.vue';
import LtvProgressBar from '@/modules/vault/components/LtvProgressBar.vue';
import PairTokenLogo from '@/components/shared/PairTokenLogo.vue';
import PositionStatus from '@/modules/vault/components/PositionStatus.vue';
import RepayDebtDialog from '@/modules/vault/components/RepayDebtDialog.vue';
import ValueStatus from '@/components/shared/ValueStatusWrapper.vue';
import VaultDetailsHistory from '@/modules/vault/components/VaultDetailsHistory.vue';
import { LtvTranslations, VaultStatuses } from '@/modules/vault/consts';
import type { ClosedVault, VaultStatus } from '@/modules/vault/types';
import { getLtvStatus } from '@/modules/vault/util';

type AnyVault = Vault | ClosedVault;

defineOptions({
  name: 'VaultDetailsPage',
  inheritAttrs: false,
});

const FormattedAmount = WalletComponentFormattedAmount;

const { t } = useTranslation();
const { Zero, getFiatAmountByFPNumber, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
const { withApi } = useLoading();
const walletStore = useWalletStore();
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();
const vaultStore = useVaultStore();

const route = useRoute();
const routerInstance = useRouter();

const showCloseVaultDialog = ref(false);
const showAddCollateralDialog = ref(false);
const showBorrowMoreDialog = ref(false);
const showRepayDebtDialog = ref(false);

const vaultSkeleton = reactive<ClosedVault>({
  id: 0,
  lockedAssetId: XOR.address,
  debtAssetId: KUSD.address,
  vaultType: VaultTypes.V2,
  status: VaultStatuses.Closed,
  returned: Zero,
});

const isLoggedIn = computed(() => walletStore.isLoggedIn);
const assetByAddress = computed(
  () => assetsStore.assetDataByAddress as (addr?: string) => Nullable<RegisteredAccountAsset>
);
const borrowTaxResolver = computed(
  () => vaultStore.getBorrowTax as (debtAsset: Asset | AccountAsset | string) => number
);
const accountVaults = computed(() => vaultStore.accountVaults);
const accountVaultsLoaded = computed(() => vaultStore.accountVaultsLoaded);
const closedAccountVaults = computed(() => vaultStore.closedAccountVaults);
const closedAccountVaultsLoaded = computed(() => vaultStore.closedAccountVaultsLoaded);
const collaterals = computed(() => vaultStore.collaterals);
const averageCollateralPrices = computed(() => vaultStore.averageCollateralPrices);
const liquidationPenalty = computed(() => vaultStore.liquidationPenalty);
const percentFormat = computed(() => settingsStore.percentFormat as Nullable<Intl.NumberFormat>);

const routeVaultId = computed(() => {
  const id = route.params.vault;
  if (id === undefined || id === null) return null;
  const numeric = Number(id);
  return Number.isFinite(numeric) ? numeric : null;
});

const foundVault = computed<Nullable<AnyVault>>(() => {
  const vaultId = routeVaultId.value;
  if (vaultId === null) return null;

  const opened = accountVaults.value.find(({ id }) => id === vaultId);
  if (opened) return opened;

  return closedAccountVaults.value.find(({ id }) => id === vaultId) ?? null;
});
const hasVaultLookupSettled = computed(() => accountVaultsLoaded.value && closedAccountVaultsLoaded.value);

const vault = computed<Nullable<AnyVault>>(() => foundVault.value ?? vaultSkeleton);

const isOpenedVault = (value: AnyVault | null | undefined): value is Vault => {
  return Boolean(value && (value as Vault).lockedAmount !== undefined);
};

const isClosedVault = (value: AnyVault | null | undefined): value is ClosedVault => !isOpenedVault(value);

const status = computed<VaultStatus>(() => {
  const current = vault.value;
  if (!current) return VaultStatuses.Closed;
  return isOpenedVault(current) ? VaultStatuses.Opened : current.status;
});

const lockedAsset = computed<Nullable<RegisteredAccountAsset>>(() => {
  const current = vault.value;
  if (!current) return null;
  return assetByAddress.value(current.lockedAssetId);
});

const debtAsset = computed<Nullable<RegisteredAccountAsset>>(() => {
  const current = vault.value;
  if (!current) return null;
  return assetByAddress.value(current.debtAssetId);
});

const debtSymbol = computed(() => debtAsset.value?.symbol ?? '');
const lockedSymbol = computed(() => lockedAsset.value?.symbol ?? '');

const vaultTitle = computed(() => {
  if (!(debtSymbol.value && lockedSymbol.value)) return '';
  return `${debtSymbol.value} / ${lockedSymbol.value}`;
});

const collateralId = computed(() => {
  const current = vault.value;
  if (!current) return '';
  return api.kensetsu.serializeKey(current.lockedAssetId, current.debtAssetId);
});

const borrowTax = computed(() => {
  const current = vault.value;
  if (!current) return 0;
  return borrowTaxResolver.value(current.debtAssetId);
});

const collateral = computed<Nullable<Collateral>>(() => {
  const id = collateralId.value;
  if (!id) return null;
  return collaterals.value[id] ?? null;
});

const averageCollateralPrice = computed(() => {
  const id = collateralId.value;
  if (!id) return Zero;
  return averageCollateralPrices.value[id] ?? Zero;
});

const maxSafeDebt = computed<Nullable<FPNumber>>(() => {
  const current = vault.value;
  if (!(current && isOpenedVault(current))) return null;
  const collateralVolume = averageCollateralPrice.value.mul(current.lockedAmount);
  return collateralVolume.mul(collateral.value?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
});

const ltvCoeff = computed<Nullable<FPNumber>>(() => {
  const current = vault.value;
  if (!(maxSafeDebt.value && current && isOpenedVault(current))) return null;
  return current.debt.div(maxSafeDebt.value);
});

const maxLtv = computed(() => collateral.value?.riskParams.liquidationRatioReversed ?? HundredNumber);

const adjustedLtv = computed<Nullable<FPNumber>>(() => {
  if (!ltvCoeff.value) return null;
  return ltvCoeff.value.mul(maxLtv.value);
});

const ltv = computed<Nullable<FPNumber>>(() => (ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null));

const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);

const formattedLtv = computed(() => {
  const percent = adjustedLtv.value?.toNumber() ?? 0;
  return percentFormat.value?.format?.(percent / HundredNumber) ?? `${percent}%`;
});

const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);

const formattedMaxLtv = computed(
  () => percentFormat.value?.format?.(maxLtv.value / HundredNumber) ?? `${maxLtv.value}%`
);

const availableToBorrow = computed<Nullable<FPNumber>>(() => {
  const current = vault.value;
  if (!(maxSafeDebt.value && current && isOpenedVault(current))) return null;

  let available = maxSafeDebt.value.sub(current.debt);
  available = available.sub(available.mul(borrowTax.value));

  let totalAvailable = collateral.value?.riskParams.hardCap.sub(collateral.value.debtSupply) ?? Zero;
  totalAvailable = totalAvailable.sub(totalAvailable.mul(borrowTax.value));

  available = totalAvailable.lt(available) ? totalAvailable : available;
  return !available.isFinity() || available.isLteZero() ? Zero : available.dp(2);
});

const formattedAvailableToBorrow = computed(() => availableToBorrow.value?.toLocaleString(2) ?? ZeroStringValue);

const fiatAvailableToBorrow = computed(() => {
  if (!(debtAsset.value && availableToBorrow.value)) return ZeroStringValue;
  return getFiatAmountByFPNumber(availableToBorrow.value, debtAsset.value) ?? ZeroStringValue;
});

const isAddCollateralUnavailable = computed(() => {
  const asset = lockedAsset.value;
  if (!asset) return true;
  return asZeroValue(getAssetBalance(asset));
});

const isBorrowMoreUnavailable = computed(() => {
  if (!(debtAsset.value && availableToBorrow.value)) return true;
  const availableUsd = getFPNumberFiatAmountByFPNumber(availableToBorrow.value, debtAsset.value);
  return availableUsd?.isLessThan(FPNumber.ONE) ?? false;
});

const isRepayDebtUnavailable = computed(() => {
  const current = vault.value;
  if (!current || !debtAsset.value || isClosedVault(current)) return true;
  const debtUsd = getFPNumberFiatAmountByFPNumber(current.debt, debtAsset.value);
  return debtUsd?.isLessThan(FPNumber.ONE) ?? false;
});

const formattedLockedAmount = computed(() => {
  const current = vault.value;
  if (!current || isClosedVault(current)) return ZeroStringValue;
  return current.lockedAmount.toLocaleString(2) ?? ZeroStringValue;
});

const fiatLockedAmount = computed(() => {
  const current = vault.value;
  if (!(current && lockedAsset.value && isOpenedVault(current))) return ZeroStringValue;
  return getFiatAmountByFPNumber(current.lockedAmount, lockedAsset.value) ?? ZeroStringValue;
});

const formattedDebtAmount = computed(() => {
  const current = vault.value;
  if (!current || isClosedVault(current)) return ZeroStringValue;
  return current.debt.toLocaleString(2) ?? ZeroStringValue;
});

const fiatDebt = computed(() => {
  const current = vault.value;
  if (!(debtAsset.value && current && isOpenedVault(current))) return ZeroStringValue;
  return getFiatAmountByFPNumber(current.debt, debtAsset.value) ?? ZeroStringValue;
});

const formattedLiquidationPenalty = computed(
  () => percentFormat.value?.format?.(liquidationPenalty.value / HundredNumber) ?? `${liquidationPenalty.value}%`
);

const stabilityFee = computed<Nullable<FPNumber>>(() => collateral.value?.riskParams.stabilityFeeAnnual ?? null);

const formattedStabilityFee = computed(() => {
  const percent = stabilityFee.value?.toNumber() ?? 0;
  return percentFormat.value?.format?.(percent / HundredNumber) ?? `${percent}%`;
});

const formattedReturnedAmount = computed(() => {
  const current = vault.value;
  if (!(current && isClosedVault(current))) return ZeroStringValue;
  return current.returned?.toLocaleString(2) ?? ZeroStringValue;
});

const fiatReturnedAmount = computed(() => {
  const current = vault.value;
  if (!(current && lockedAsset.value && isClosedVault(current))) return ZeroStringValue;
  return current.returned
    ? (getFiatAmountByFPNumber(current.returned, lockedAsset.value) ?? ZeroStringValue)
    : ZeroStringValue;
});

const goToVaults = () => {
  routerInstance.push({ path: '/kensetsu/' });
};

const handleBack = () => {
  routerInstance.back();
};

const closePosition = () => {
  showCloseVaultDialog.value = true;
};

const addCollateral = () => {
  showAddCollateralDialog.value = true;
};

const borrowMore = () => {
  showBorrowMoreDialog.value = true;
};

const repayDebt = () => {
  showRepayDebtDialog.value = true;
};

const updateVaultSkeleton = (value: AnyVault) => {
  vaultSkeleton.id = value.id;
  vaultSkeleton.lockedAssetId = value.lockedAssetId;
  vaultSkeleton.debtAssetId = value.debtAssetId;
  vaultSkeleton.vaultType = value.vaultType;
  vaultSkeleton.status = isOpenedVault(value) ? VaultStatuses.Opened : value.status;
  vaultSkeleton.returned = isClosedVault(value) ? (value.returned ?? Zero) : Zero;
};

watch(
  [foundVault, hasVaultLookupSettled],
  ([value, settled]) => {
    if (value) {
      updateVaultSkeleton(value);
      return;
    }

    if (settled && routeVaultId.value !== null) {
      goToVaults();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await withApi(async () => {
    if (!isLoggedIn.value) {
      goToVaults();
      return;
    }
  });
});
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
