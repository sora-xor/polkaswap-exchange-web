import { FPNumber, Operation, type NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

type NetworkFeeWarningOptions = {
  type: Operation;
  isXor?: boolean;
  amount?: FPNumber;
};

const PREDEFINED_OPERATIONS = new Set<Operation>([
  Operation.Transfer,
  Operation.EthBridgeOutgoing,
  Operation.RegisterAsset,
  Operation.CreatePair,
  Operation.AddLiquidity,
]);

/**
 * Provides fee warning checks previously sourced from the wallet mixin.
 */
export function useNetworkFeeWarning() {
  const { Zero, getFPNumberFromCodec } = useNumberFormatter();
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();

  const networkFees = computed<NetworkFeesObject>(() => settingsStore.networkFees);
  const allowFeePopup = computed<boolean>(() => settingsStore.allowFeePopup);
  const accountAssetsAddressTable = computed<Record<string, AccountAsset>>(
    () => walletStore.accountAssetsAddressTable as Record<string, AccountAsset>
  );

  const xorBalance = computed<FPNumber>(() => {
    const accountXor = accountAssetsAddressTable.value[XOR.address];

    if (!accountXor?.balance?.transferable) {
      return Zero;
    }

    return getFPNumberFromCodec(accountXor.balance.transferable);
  });

  const isXorSufficientForNextTx = ({ type, isXor, amount }: NetworkFeeWarningOptions): boolean => {
    const balance = xorBalance.value;

    if (type === Operation.EthBridgeIncoming || !balance.isFinity()) return true;

    const networkFee = getFPNumberFromCodec(
      type === Operation.AddLiquidity ? networkFees.value.RemoveLiquidity : networkFees.value[type]
    );
    const fpAmount = amount ?? Zero;

    const nextBalance = (() => {
      if (PREDEFINED_OPERATIONS.has(type)) {
        return isXor ? balance.sub(fpAmount).sub(networkFee) : balance.sub(networkFee);
      }

      if (type === Operation.RemoveLiquidity) {
        return isXor ? balance.add(fpAmount).sub(networkFee) : balance.sub(networkFee);
      }

      return balance;
    })();

    return FPNumber.gte(nextBalance, networkFee);
  };

  return {
    allowFeePopup,
    accountAssetsAddressTable,
    networkFees,
    xorBalance,
    isXorSufficientForNextTx,
  };
}

export type NetworkFeeWarningComposable = ReturnType<typeof useNetworkFeeWarning>;
