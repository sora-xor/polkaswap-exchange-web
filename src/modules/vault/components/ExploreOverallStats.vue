<template>
  <s-row :gutter="24">
    <s-col
      v-for="{ title, tooltip, value } in statsColumns"
      :key="title"
      class="stats-column"
      :xs="12"
      :sm="6"
      :md="4"
      :lg="3"
    >
      <s-card class="stats-card" size="small" border-radius="mini" shadow="never" primary>
        <template #header>
          <div class="stats-card-title">
            <span>{{ title }}</span>
            <s-tooltip border-radius="mini" :content="tooltip">
              <s-icon name="info-16" size="14px"></s-icon>
            </s-tooltip>
          </div>
        </template>
        <div class="stats-card-data">
          <formatted-amount
            class="stats-card-value"
            :font-weight-rate="FontWeightRate.MEDIUM"
            :font-size-rate="FontSizeRate.MEDIUM"
            :value="value.amount"
            :asset-symbol="value.suffix"
            symbol-as-decimal
          >
            <template #prefix>{{ currencySymbol }}</template>
          </formatted-amount>
        </div>
      </s-card>
    </s-col>
  </s-row>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/math';
import { computed } from 'vue';

import { FontSizeRate, FontWeightRate } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { useAssetsStore } from '@/stores/assets';
import { useVaultStore } from '@/stores/vault';
import { useWalletStore } from '@/stores/wallet';
import { formatAmountWithSuffix } from '@/utils';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, StablecoinInfo } from '@sora-substrate/sdk/build/kensetsu/types';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';

const FormattedAmount = WalletComponentFormattedAmount;

const { t } = useTranslation();
const { getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
const assetsStore = useAssetsStore();
const vaultStore = useVaultStore();
const walletStore = useWalletStore();

const collaterals = computed(() => Object.values(vaultStore.collaterals as Record<string, Collateral>));
const stablecoinInfos = computed(() => vaultStore.stablecoinInfos as Record<string, StablecoinInfo>);

const getAsset = assetsStore.assetDataByAddress as (addr?: string) => Nullable<RegisteredAccountAsset>;
const exchangeRate = computed(() => walletStore.exchangeRate);
const currencySymbol = computed(() => walletStore.currencySymbol);

const badDebt = computed(() =>
  Object.entries(stablecoinInfos.value).reduce((acc, [id, info]) => {
    const debtAsset = getAsset(id);
    if (!debtAsset) return acc;

    const value = getFPNumberFiatAmountByFPNumber(info.badDebt, debtAsset);
    if (!value) return acc;

    return acc.add(value.mul(exchangeRate.value));
  }, FPNumber.ZERO)
);

const total = computed(() =>
  collaterals.value.reduce(
    (acc, { totalLocked, lockedAssetId, debtSupply, debtAssetId, riskParams: { hardCap } }) => {
      const lockedAsset = getAsset(lockedAssetId);
      if (lockedAsset) {
        const fiatLocked = getFPNumberFiatAmountByFPNumber(totalLocked, lockedAsset);
        if (fiatLocked) {
          acc.collateral = acc.collateral.add(fiatLocked.mul(exchangeRate.value));
        }
      }

      const debtAsset = getAsset(debtAssetId);
      if (debtAsset) {
        const fiatDebt = getFPNumberFiatAmountByFPNumber(debtSupply, debtAsset);
        if (fiatDebt) {
          acc.debt = acc.debt.add(fiatDebt.mul(exchangeRate.value));
        }
        const fiatAvailable = getFPNumberFiatAmountByFPNumber(hardCap.sub(debtSupply), debtAsset);
        if (fiatAvailable) {
          acc.available = acc.available.add(fiatAvailable.mul(exchangeRate.value));
        }
      }

      return acc;
    },
    { debt: FPNumber.ZERO, collateral: FPNumber.ZERO, available: FPNumber.ZERO }
  )
);

const columns = computed(() => [
  {
    title: t('kensetsu.overallTotalCollateral'),
    tooltip: t('kensetsu.overallTotalCollateralDescription'),
    amount: total.value.collateral,
  },
  {
    title: t('kensetsu.overallTotalDebt'),
    tooltip: t('kensetsu.overallTotalDebtDescription'),
    amount: total.value.debt,
  },
  {
    title: t('kensetsu.overallAvailable'),
    tooltip: t('kensetsu.overallAvailableDescription'),
    amount: total.value.available,
  },
  {
    title: t('kensetsu.overallBadDebt'),
    tooltip: t('kensetsu.overallBadDebtDescription'),
    amount: badDebt.value,
  },
]);

const statsColumns = computed(() =>
  columns.value.map(({ amount, title, tooltip }) => ({
    title,
    tooltip,
    value: formatAmountWithSuffix(amount),
  }))
);
</script>

<style lang="scss" scoped>
.stats-column {
  border-style: none;

  @include desktop {
    flex-basis: calc(var(--s-col-span-width-current) + 6px);
    max-width: calc(var(--s-col-span-width-current) + 6px);
  }
}

.stats-card {
  padding: $inner-spacing-mini $inner-spacing-small;
  margin-bottom: $inner-spacing-big;
  box-shadow: var(--s-shadow-element-pressed);

  :deep(.el-card__header) {
    border-bottom: 1px solid transparent;
    padding: 0;
  }

  :deep(.el-card__body) {
    border-style: none;
    padding: 0;
  }

  &-title {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;

    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    font-weight: 800;
    text-transform: uppercase;
  }
  &-data {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    margin-top: $inner-spacing-small;
  }
  &-value {
    font-size: var(--s-font-size-big);
  }
}
</style>
