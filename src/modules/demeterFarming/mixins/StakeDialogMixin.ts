import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Operation } from '@sora-substrate/util';

import PoolMixin from './PoolMixin';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';

import type { CodecString } from '@sora-substrate/util';

@Component
export default class StakeDialogMixin extends Mixins(PoolMixin, TranslationMixin, DialogMixin) {
  @Prop({ default: () => true, type: Boolean }) readonly isAdding!: boolean;

  get networkFee(): CodecString {
    const operation = this.isAdding
      ? Operation.DemeterFarmingDepositLiquidity
      : Operation.DemeterFarmingWithdrawLiquidity;

    return this.networkFees[operation];
  }

  get inputTitle(): string {
    const key = this.isAdding ? 'amountAdd' : 'amountRemove';

    return this.t(`demeterFarming.${key}`);
  }
}
