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
            v-if="value.suffix"
            class="stats-card-value"
            :font-weight-rate="FontWeightRate.MEDIUM"
            :font-size-rate="FontSizeRate.MEDIUM"
            :value="value.amount"
            :asset-symbol="value.suffix"
            symbol-as-decimal
          />
          <p v-else class="stats-card-value">{{ value.amount }}</p>
        </div>
      </s-card>
    </s-col>
  </s-row>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { KEN } from '@sora-substrate/util/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { HundredNumber } from '@/consts';
import { state, getter } from '@/store/decorators';
import { AmountWithSuffix } from '@/types/formats';
import { formatAmountWithSuffix } from '@/utils';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ExploreOverallStats extends Mixins(TranslationMixin, mixins.FormattedAmountMixin) {
  @state.vault.collaterals private collateralsObj!: Record<string, Collateral>;
  @state.vault.borrowTax private borrowTax!: number;
  @state.vault.badDebt private badDebt!: FPNumber;
  @state.settings.percentFormat private percentFormat!: Nullable<Intl.NumberFormat>;

  @getter.vault.kusdToken private kusdToken!: Nullable<RegisteredAccountAsset>;
  @getter.assets.assetDataByAddress public getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  private get collaterals() {
    return Object.entries(this.collateralsObj).map(([lockedAssetId, value]) => ({ lockedAssetId, ...value }));
  }

  private get totalDebt(): FPNumber {
    return this.collaterals.reduce((acc, { kusdSupply }) => {
      if (!this.kusdToken) return acc;
      const usdDebt = this.getFPNumberFiatAmountByFPNumber(kusdSupply, this.kusdToken);
      if (!usdDebt) return acc;
      return acc.add(usdDebt);
    }, FPNumber.ZERO);
  }

  private get totalCollateral(): FPNumber {
    return this.collaterals.reduce((acc, { totalLocked, lockedAssetId }) => {
      const lockedAsset = this.getAsset(lockedAssetId);
      if (!lockedAsset) return acc;
      const lockedAmount = this.getFPNumberFiatAmountByFPNumber(totalLocked, lockedAsset);
      if (!lockedAmount) return acc;
      return acc.add(lockedAmount);
    }, FPNumber.ZERO);
  }

  get columns() {
    return [
      {
        title: this.t('kensetsu.overallTotalCollateral'),
        tooltip: this.t('kensetsu.overallTotalCollateralDescription'),
        amount: this.totalCollateral,
      },
      {
        title: this.t('kensetsu.overallTotalDebt'),
        tooltip: this.t('kensetsu.overallTotalDebtDescription'),
        amount: this.totalDebt,
      },
      {
        title: this.t('kensetsu.overallBadDebt'),
        tooltip: this.t('kensetsu.overallBadDebtDescription'),
        amount: this.badDebt,
      },
      {
        title: this.t('kensetsu.overallBorrowTax'),
        tooltip: this.t('kensetsu.overallBorrowTaxDescription', { KEN: KEN.symbol }),
        amount: this.borrowTax,
      },
    ];
  }

  get statsColumns() {
    return this.columns.map(({ amount, title, tooltip }) => {
      let value: AmountWithSuffix = { amount: '0', suffix: '' };

      if (typeof amount === 'number') {
        value.amount = this.percentFormat?.format?.(amount) ?? `${amount * HundredNumber}%`;
      } else {
        value = formatAmountWithSuffix(amount);
      }
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
