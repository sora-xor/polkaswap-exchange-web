<template>
  <s-card class="demeter-pool-card">
    <pool-info>
      <template #prepend>
        <div class="demeter-pool-card-title">{{ title }}</div>
      </template>

      <info-line label="APR" value="100%" />
      <info-line :label="t('demeterFarming.info.totalLiquidityLocked')" :value="totalLiquidityLocked" />
      <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol" />

      <template v-if="active">
        <info-line
          value-can-be-hidden
          :label="t('demeterFarming.info.rewardEarned', { symbol: rewardAssetSymbol })"
          :value="rewardEarned"
          :fiat-value="rewardEarnedFiat"
        />
        <info-line value-can-be-hidden :label="t('demeterFarming.info.poolShareStaked')" :value="poolShareStaked" />
      </template>
      <template v-else>
        <info-line :label="t('demeterFarming.info.fee')" :value="feePercent" />
      </template>

      <template #buttons v-if="active">
        <s-button type="secondary" class="s-typography-button--medium" @click="claim">{{
          t('demeterFarming.actions.claim')
        }}</s-button>
        <s-button type="secondary" class="s-typography-button--medium" @click="remove">{{
          t('demeterFarming.actions.remove')
        }}</s-button>
      </template>

      <template #append>
        <s-button type="primary" class="s-typography-button--large" @click="add">{{ primaryButtonText }}</s-button>

        <div class="demeter-pool-card-copyright">{{ t('demeterFarming.poweredBy') }}</div>
      </template>
    </pool-info>
  </s-card>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { Component, Prop, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';
import type { DemeterPool, DemeterAccountPool } from '@/store/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    PoolInfo: lazyComponent(Components.PoolInfo),
    InfoLine: components.InfoLine,
  },
})
export default class DemeterPoolCard extends Mixins(TranslationMixin, mixins.FormattedAmountMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: AccountLiquidity;
  @Prop({ default: () => null, type: Object }) readonly pool!: DemeterPool;
  @Prop({ default: () => null, type: Object }) readonly accountPool!: DemeterAccountPool;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;
  @getter.assets.xor private xor!: Nullable<RegisteredAccountAssetWithDecimals>;

  get active(): boolean {
    return !!this.accountPool;
  }

  get title(): string {
    return this.t(`demeterFarming.staking.${this.active ? 'active' : 'inactive'}`);
  }

  get primaryButtonText(): string {
    return this.t(`demeterFarming.actions.${this.active ? 'add' : 'start'}`);
  }

  get poolAsset(): Nullable<RegisteredAccountAssetWithDecimals> {
    return this.getAsset(this.pool.poolAsset);
  }

  get rewardAsset(): Nullable<RegisteredAccountAssetWithDecimals> {
    return this.getAsset(this.pool.rewardAsset);
  }

  get poolAssetPrice(): FPNumber {
    return FPNumber.fromCodecValue(this.getAssetFiatPrice(this.poolAsset as Asset) ?? 0);
  }

  get baseAssetPrice(): FPNumber {
    return FPNumber.fromCodecValue(this.getAssetFiatPrice(this.xor as Asset) ?? 0);
  }

  get rewardAssetSymbol(): string {
    return this.rewardAsset?.symbol ?? '';
  }

  get rewardEarned(): string {
    return this.accountPool.rewards.toLocaleString();
  }

  get rewardEarnedFiat(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.accountPool.rewards, this.rewardAsset as Asset);
  }

  get feePercent(): string {
    return `${this.pool.depositFee * 100}%`;
  }

  get liqudityLP(): FPNumber {
    return FPNumber.fromCodecValue(this.liquidity.balance);
  }

  get poolShareStaked(): string {
    return this.accountPool.pooledTokens.div(this.liqudityLP).mul(new FPNumber(100)).toLocaleString() + '%';
  }

  get totalLiquidityLocked(): string {
    const calcTotalPrice = (balance: CodecString, price: FPNumber) => {
      return FPNumber.fromCodecValue(balance).div(this.liqudityLP).mul(this.pool.totalTokensInPool).mul(price);
    };

    const baseAssetLockedPrice = calcTotalPrice(this.liquidity.firstBalance, this.baseAssetPrice);
    const poolAssetLockedPrice = calcTotalPrice(this.liquidity.secondBalance, this.poolAssetPrice);
    const totalLockedPrice = baseAssetLockedPrice.add(poolAssetLockedPrice).dp(2).toLocaleString();

    return `$${totalLockedPrice}`;
  }

  add(): void {
    this.$emit('add');
  }

  remove(): void {
    this.$emit('remove');
  }

  claim(): void {
    this.$emit('claim');
  }
}
</script>

<style lang="scss">
.demeter-pool-card.s-card.neumorphic {
  background: var(--s-color-base-on-accent);
  border: 1px solid var(--s-color-theme-accent);

  @include full-width-button('s-primary', 0);
}
</style>

<style lang="scss" scoped>
.demeter-pool-card {
  &-title {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    line-height: var(--s-line-height-reset);
    text-transform: uppercase;
  }
  &-copyright {
    font-size: var(--s-font-size-mini);
    font-weight: 400;
    line-height: var(--s-line-height-reset);
    text-transform: uppercase;
    opacity: 0.75;
  }
}
</style>
