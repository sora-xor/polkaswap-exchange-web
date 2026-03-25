import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { defineComponent } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import { NetworkFeeWarningOptions } from '../../consts';

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

export default defineComponent({
  mixins: [NumberFormatterMixin],
  computed: {
    networkFees(this: any) {
      return useWalletStore(this.$pinia).networkFees;
    },
    allowFeePopup(this: any) {
      return useWalletStore(this.$pinia).allowFeePopup;
    },
    accountAssetsAddressTable(this: any) {
      return useWalletStore(this.$pinia).accountAssetsAddressTable;
    },
    xorBalance(this: any): FPNumber {
      const accountXor = (this.accountAssetsAddressTable as AccountAssetsTable)[XOR.address];

      if (accountXor) {
        return this.getFPNumberFromCodec(accountXor.balance.transferable);
      }

      return this.Zero;
    },
  },
  methods: {
    isXorSufficientForNextTx(this: any, { type, isXor, amount }: NetworkFeeWarningOptions): boolean {
      const balanceIsEmpty = !this.xorBalance || !this.xorBalance.isFinity();

      if (type === Operation.EthBridgeIncoming || balanceIsEmpty) return true;

      let fpRemainingBalance: FPNumber;

      const requiredFeeForNextTx =
        type === Operation.AddLiquidity
          ? (this.networkFees as NetworkFeesObject).RemoveLiquidity
          : (this.networkFees as NetworkFeesObject)[type];
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
    },
  },
});
