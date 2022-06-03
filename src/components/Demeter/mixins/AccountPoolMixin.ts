import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber, Operation } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import { getter, state } from '@/store/decorators';
import { hasInsufficientXorForFee } from '@/utils';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { NetworkFeesObject } from '@sora-substrate/util';

@Component
export default class AccountPoolMixin extends Mixins(mixins.FormattedAmountMixin) {
  @Prop({ default: () => null, type: Object }) readonly pool!: DemeterPool;
  @Prop({ default: () => null, type: Object }) readonly accountPool!: DemeterAccountPool;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;

  @getter.assets.xor xor!: Nullable<AccountAsset>;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<Asset>;

  // Override it component for another use case
  get networkFee(): string {
    return this.networkFees[Operation.DemeterFarmingGetRewards];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return !!this.xor && hasInsufficientXorForFee(this.xor, this.networkFee);
  }

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get rewardAsset(): Nullable<Asset> {
    return this.getAsset(this.pool?.rewardAsset);
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
