import { Operation, TransactionStatus, type History } from '@/lib/substrate/sdk/types';
import { computed } from 'vue';

import { HiddenValue, accountIdBasedOperations } from '@/lib/soraneo-wallet/src/consts';
import { formatAddress, groupRewardsByAssetsList } from '@/lib/soraneo-wallet/src/util';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useTranslation } from '@/composables/useTranslation';
import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';

const twoAssetsBasedOperations = [
  Operation.AddLiquidity,
  Operation.CreatePair,
  Operation.RemoveLiquidity,
  Operation.Swap,
  Operation.SwapAndSend,
  Operation.DemeterFarmingDepositLiquidity,
  Operation.DemeterFarmingWithdrawLiquidity,
];

const amountBasedOperations = [
  ...twoAssetsBasedOperations,
  Operation.Burn,
  Operation.Mint,
  Operation.Transfer,
  Operation.VestedTransfer,
  Operation.SwapTransferBatch,
  Operation.DemeterFarmingGetRewards,
  Operation.DemeterFarmingStakeToken,
  Operation.DemeterFarmingUnstakeToken,
  Operation.EthBridgeIncoming,
  Operation.EthBridgeOutgoing,
  Operation.ReferralReserveXor,
  Operation.ReferralUnreserveXor,
  Operation.PolkamarktCreateMarket,
  Operation.PolkamarktBuy,
  Operation.PolkamarktSell,
  Operation.PolkamarktReportEarlyResolution,
];

const orderBookOperations = [
  Operation.OrderBookPlaceLimitOrder,
  Operation.OrderBookCancelLimitOrder,
  Operation.OrderBookCancelLimitOrders,
];

/**
 * Simplified version of the wallet `OperationsMixin` for Composition API usage.
 */
export function useOperations() {
  const { t } = useTranslation();
  const { formatStringValue } = useNumberFormatter();
  const walletStore = useWalletStore(pinia);
  const account = computed(() => walletStore.account as PolkadotJsAccount);

  const getOperationMessage = (value?: History, hideAmountValues = false): string => {
    if (!value || !Object.values(Operation).includes(value.type as Operation)) return '';

    const params: Record<string, any> = { ...value };

    if (accountIdBasedOperations.includes(value.type)) {
      const isRecipient = account.value.address === value.to;
      const address = isRecipient ? value.from : value.to;
      const direction = isRecipient ? t('transaction.from') : t('transaction.to');
      const action = isRecipient ? t('receivedText') : t('sentText');

      params.address = address ? formatAddress(address, 10) : '';
      params.direction = direction;
      params.action = action;
    }

    if (amountBasedOperations.includes(value.type)) {
      params.amount = params.amount ? formatStringValue(params.amount, params.decimals) : '';
    }

    if (twoAssetsBasedOperations.includes(value.type)) {
      params.amount2 = params.amount2 ? formatStringValue(params.amount2, params.decimals2) : '';
    }

    if (value.type === Operation.ClaimRewards) {
      params.rewards = groupRewardsByAssetsList(params.rewards)
        .map(({ amount, asset }) => `${hideAmountValues ? HiddenValue : formatStringValue(amount)} ${asset.symbol}`)
        .join(` ${t('operations.andText')} `);
    }

    if (value.type === Operation.ReferralSetInvitedUser) {
      const isInvitedUser = account.value.address === value.from;
      const linkedAddress = isInvitedUser ? value.to : value.from;
      const linkedRole = isInvitedUser ? 'transaction.referrer' : 'transaction.referral';
      params.role = t(linkedRole);
      params.address = linkedAddress ? formatAddress(linkedAddress, 10) : '';
    }

    if (orderBookOperations.includes(value.type)) {
      params.side = params.side?.toUpperCase();
    }

    let status = value.status as TransactionStatus;
    if ([TransactionStatus.Invalid, TransactionStatus.Usurped].includes(status)) {
      status = TransactionStatus.Error;
    } else if (status !== TransactionStatus.Error) {
      status = TransactionStatus.Finalized;
    }

    if (hideAmountValues) {
      params.amount = HiddenValue;
      params.amount2 = HiddenValue;
    }

    return t(`operations.${status}.${value.type}`, params);
  };

  return {
    account,
    getOperationMessage,
  };
}

export type OperationsComposable = ReturnType<typeof useOperations>;
