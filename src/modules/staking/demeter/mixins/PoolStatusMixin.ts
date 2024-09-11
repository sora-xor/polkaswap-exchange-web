import { FPNumber } from '@sora-substrate/sdk';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { DemeterAsset } from '@/modules/staking/demeter/types';
import { getAssetBalance, getLiquidityBalance } from '@/utils';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/sdk/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

@Component
export default class PoolStatusMixin extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: Nullable<AccountLiquidity>;
  @Prop({ default: () => null, type: Object }) readonly pool!: DemeterPool;
  @Prop({ default: () => null, type: Object }) readonly accountPool!: DemeterAccountPool;
  @Prop({ default: () => null, type: Object }) readonly poolAsset!: DemeterAsset;
  @Prop({ default: () => null, type: Object }) readonly rewardAsset!: DemeterAsset;
  @Prop({ default: () => '', type: String }) readonly apr!: string;

  get pricesAvailable(): boolean {
    return Object.keys(this.fiatPriceObject).length > 0;
  }

  get isFarm(): boolean {
    return !!this.pool?.isFarm;
  }

  get activeStatus(): boolean {
    return !this.pool?.isRemoved;
  }

  get lockedFunds(): FPNumber {
    return this.accountPool?.pooledTokens ?? FPNumber.ZERO;
  }

  get hasStake(): boolean {
    return this.accountPool ? !this.lockedFunds.isZero() : false;
  }

  get poolAssetBalance(): FPNumber {
    return FPNumber.fromCodecValue(getAssetBalance(this.poolAsset) ?? 0, this.poolAsset?.decimals);
  }

  get lpBalance(): FPNumber {
    return FPNumber.fromCodecValue(getLiquidityBalance(this.liquidity) ?? 0);
  }

  get funds(): FPNumber {
    return this.isFarm ? this.lpBalance : this.poolAssetBalance;
  }

  get availableFunds(): FPNumber {
    return this.isFarm ? (FPNumber.max(this.lockedFunds, this.funds) as FPNumber).sub(this.lockedFunds) : this.funds;
  }

  get depositDisabled(): boolean {
    return !this.activeStatus || this.availableFunds.isZero();
  }

  get emitParams() {
    return {
      baseAsset: this.pool.baseAsset,
      poolAsset: this.pool.poolAsset,
      rewardAsset: this.pool.rewardAsset,
    };
  }

  add(): void {
    this.$emit('add', this.emitParams);
  }
}
