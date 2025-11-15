import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins, Options } from 'vue-property-decorator';

import { NetworkFeeWarningOptions } from '../../consts';
import { state, getter } from '../../store/decorators';

import NumberFormatterMixin from './NumberFormatterMixin';

import type { AccountAssetsTable } from '../../types/common';
import type { NetworkFeesObject } from '@sora-substrate/sdk';

const PredefinedOperations = [
  Operation.Transfer,
  Operation.EthBridgeOutgoing,
  Operation.RegisterAsset,
  Operation.CreatePair,
  Operation.AddLiquidity,
];

@Options({})
export default class NetworkFeeWarningMixin extends mixins(NumberFormatterMixin) {
  @state.settings.networkFees networkFees!: NetworkFeesObject;
  @state.settings.allowFeePopup allowFeePopup!: boolean;
  @getter.account.accountAssetsAddressTable accountAssetsAddressTable!: AccountAssetsTable;

  get xorBalance(): FPNumber {
    const accountXor = this.accountAssetsAddressTable[XOR.address];

    if (accountXor) {
      return this.getFPNumberFromCodec(accountXor.balance.transferable);
    }

    return this.Zero;
  }

  isXorSufficientForNextTx({ type, isXor, amount }: NetworkFeeWarningOptions): boolean {
    const balanceIsEmpty = !this.xorBalance || !this.xorBalance.isFinity();

    if (type === Operation.EthBridgeIncoming || balanceIsEmpty) return true;

    let fpRemainingBalance: FPNumber;

    const requiredFeeForNextTx =
      type === Operation.AddLiquidity ? this.networkFees.RemoveLiquidity : this.networkFees[type];
    const networkFee = this.getFPNumberFromCodec(requiredFeeForNextTx);
    const fpAmount = amount || this.Zero;

    if (PredefinedOperations.includes(type)) {
      if (isXor) {
        fpRemainingBalance = this.xorBalance.sub(fpAmount).sub(networkFee);
      } else {
        fpRemainingBalance = this.xorBalance.sub(networkFee);
      }

      return FPNumber.gte(fpRemainingBalance, networkFee);
    }

    if (type === Operation.RemoveLiquidity) {
      if (isXor) {
        fpRemainingBalance = this.xorBalance.add(fpAmount).sub(networkFee);
      } else {
        fpRemainingBalance = this.xorBalance.sub(networkFee);
      }

      return FPNumber.gte(fpRemainingBalance, networkFee);
    }

    return true;
  }
}
