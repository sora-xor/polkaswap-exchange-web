import { FPNumber, Operation, type NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import { NetworkFeeWarningOptions } from '../consts';
import { getWalletStore } from '../store/instance';
import type { AccountAssetsTable } from '@/types/common';

import { useNumberFormatter } from './useNumberFormatter';

const PREDEFINED_OPERATIONS = [
  Operation.Transfer,
  Operation.EthBridgeOutgoing,
  Operation.RegisterAsset,
  Operation.CreatePair,
  Operation.AddLiquidity,
];

export function useNetworkFeeWarning() {
  const store = getWalletStore();
  const { Zero, getFPNumberFromCodec } = useNumberFormatter();

  const networkFees = computed<NetworkFeesObject>(() => store.state.wallet.settings.networkFees);
  const allowFeePopup = computed<boolean>(() => store.state.wallet.settings.allowFeePopup);
  const accountAssetsAddressTable = computed<AccountAssetsTable>(
    () => store.getters['wallet/account/accountAssetsAddressTable']
  );

  const xorBalance = computed(() => {
    const accountXor = accountAssetsAddressTable.value[XOR.address];

    if (!accountXor) {
      return Zero;
    }

    return getFPNumberFromCodec(accountXor.balance.transferable);
  });

  const isXorSufficientForNextTx = ({ type, isXor, amount }: NetworkFeeWarningOptions): boolean => {
    const balanceIsEmpty = !xorBalance.value || !xorBalance.value.isFinity();

    if (type === Operation.EthBridgeIncoming || balanceIsEmpty) return true;

    let fpRemainingBalance: FPNumber;

    const requiredFeeForNextTx =
      type === Operation.AddLiquidity ? networkFees.value.RemoveLiquidity : networkFees.value[type];
    const networkFee = getFPNumberFromCodec(requiredFeeForNextTx);
    const fpAmount = amount || Zero;

    if (PREDEFINED_OPERATIONS.includes(type)) {
      if (isXor) {
        fpRemainingBalance = xorBalance.value.sub(fpAmount).sub(networkFee);
      } else {
        fpRemainingBalance = xorBalance.value.sub(networkFee);
      }

      return FPNumber.gte(fpRemainingBalance, networkFee);
    }

    if (type === Operation.RemoveLiquidity) {
      if (isXor) {
        fpRemainingBalance = xorBalance.value.add(fpAmount).sub(networkFee);
      } else {
        fpRemainingBalance = xorBalance.value.sub(networkFee);
      }

      return FPNumber.gte(fpRemainingBalance, networkFee);
    }

    return true;
  };

  return {
    allowFeePopup,
    networkFees,
    xorBalance,
    isXorSufficientForNextTx,
  };
}
