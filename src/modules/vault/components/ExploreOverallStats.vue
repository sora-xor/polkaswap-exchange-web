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
      <s-card class="stats-card" size="small" border-radius="mini" primary>
        <div slot="header" class="stats-card-title">
          <span>{{ title }}</span>
          <s-tooltip border-radius="mini" :content="tooltip">
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </div>
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

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, getter } from '@/store/decorators';
import { formatAmountWithSuffix } from '@/utils';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral, StablecoinInfo } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ExploreOverallStats extends Mixins(TranslationMixin, mixins.FormattedAmountMixin) {
  @state.vault.collaterals private collateralsObj!: Record<string, Collateral>;
  @state.vault.stablecoinInfos private stablecoinInfos!: Record<string, StablecoinInfo>;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;
  @getter.wallet.settings.exchangeRate private exchangeRate!: number;
  @getter.wallet.settings.currencySymbol currencySymbol!: string;

  private get collaterals() {
    return Object.values(this.collateralsObj);
  }

  get badDebt(): FPNumber {
    return Object.entries(this.stablecoinInfos).reduce((acc, [id, info]) => {
      const debtAsset = this.getAsset(id);
      if (!debtAsset) return acc;

      const value = this.getFPNumberFiatAmountByFPNumber(info.badDebt, debtAsset);
      if (!value) return acc;

      return acc.add(value.mul(this.exchangeRate));
    }, FPNumber.ZERO);
  }

  private get total(): { debt: FPNumber; collateral: FPNumber; available: FPNumber } {
    return this.collaterals.reduce(
      (acc, { totalLocked, lockedAssetId, debtSupply, debtAssetId, riskParams: { hardCap } }) => {
        const lockedAsset = this.getAsset(lockedAssetId);
        if (lockedAsset) {
          const fiatLocked = this.getFPNumberFiatAmountByFPNumber(totalLocked, lockedAsset);
          if (fiatLocked) {
            acc.collateral = acc.collateral.add(fiatLocked.mul(this.exchangeRate));
          }
        }

        const debtAsset = this.getAsset(debtAssetId);
        if (debtAsset) {
          const fiatDebt = this.getFPNumberFiatAmountByFPNumber(debtSupply, debtAsset);
          if (fiatDebt) {
            acc.debt = acc.debt.add(fiatDebt.mul(this.exchangeRate));
          }
          const fiatAvailable = this.getFPNumberFiatAmountByFPNumber(hardCap.sub(debtSupply), debtAsset);
          if (fiatAvailable) {
            acc.available = acc.available.add(fiatAvailable.mul(this.exchangeRate));
          }
        }

        return acc;
      },
      { debt: FPNumber.ZERO, collateral: FPNumber.ZERO, available: FPNumber.ZERO }
    );
  }

  get columns() {
    return [
      {
        title: this.t('kensetsu.overallTotalCollateral'),
        tooltip: this.t('kensetsu.overallTotalCollateralDescription'),
        amount: this.total.collateral,
      },
      {
        title: this.t('kensetsu.overallTotalDebt'),
        tooltip: this.t('kensetsu.overallTotalDebtDescription'),
        amount: this.total.debt,
      },
      {
        title: this.t('kensetsu.overallAvailable'),
        tooltip: this.t('kensetsu.overallAvailableDescription'),
        amount: this.total.available,
      },
      {
        title: this.t('kensetsu.overallBadDebt'),
        tooltip: this.t('kensetsu.overallBadDebtDescription'),
        amount: this.badDebt,
      },
    ];
  }

  get statsColumns() {
    return this.columns.map(({ amount, title, tooltip }) => {
      const value = formatAmountWithSuffix(amount);
      return { title, tooltip, value };
    });
  }
}
</script>

<style lang="scss" scoped>
.stats-card {
  margin-bottom: $inner-spacing-big;
  box-shadow: var(--s-shadow-element-pressed);

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
