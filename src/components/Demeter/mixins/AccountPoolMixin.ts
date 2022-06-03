import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { getter } from '@/store/decorators';

import type { DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component
export default class AccountPoolMixin extends Mixins(mixins.FormattedAmountMixin) {
  @Prop({ default: () => null, type: Object }) readonly accountPool!: DemeterAccountPool;

  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<Asset>;

  get rewardAsset(): Nullable<Asset> {
    return this.getAsset(this.accountPool?.rewardAsset);
  }

  get rewardAssetSymbol(): string {
    return this.rewardAsset?.symbol ?? '';
  }

  get rewards(): FPNumber {
    return this.accountPool?.rewards ?? FPNumber.ZERO;
  }

  get rewardsFormatted(): string {
    return this.rewards.toLocaleString();
  }

  get rewardsFiat(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.rewards, this.rewardAsset as Asset);
  }

  get hasRewards(): boolean {
    return !this.rewards.isZero();
  }
}
