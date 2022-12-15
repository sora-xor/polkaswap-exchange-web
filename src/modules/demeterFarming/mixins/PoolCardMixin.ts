import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';

import AccountPoolMixin from './AccountPoolMixin';

import { formatDecimalPlaces } from '@/utils';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class PoolCardMixin extends Mixins(AccountPoolMixin) {
  get poolShare(): FPNumber {
    if (!this.isFarm) return this.lockedFunds;

    if (this.funds.isZero()) return FPNumber.ZERO;
    // use .min because pooled LP could be greater that liquiduty LP
    return (FPNumber.min(this.lockedFunds, this.funds) as FPNumber).div(this.funds).mul(FPNumber.HUNDRED);
  }

  get poolShareFormatted(): string {
    return this.poolShare.toLocaleString() + (this.isFarm ? '%' : '');
  }

  get poolShareFiat(): Nullable<string> {
    if (this.isFarm) return null;

    return this.getFiatAmountByFPNumber(this.poolShare, this.poolAsset as unknown as AccountAsset);
  }

  get poolShareText(): string {
    return this.isFarm
      ? this.t('demeterFarming.info.poolShare')
      : this.t('demeterFarming.info.stake', { symbol: this.poolAssetSymbol });
  }

  get tvlFormatted(): string {
    return `$${formatDecimalPlaces(this.tvl)}`;
  }

  get depositFeeFormatted(): string {
    return `${this.depositFee * 100}%`;
  }
}
