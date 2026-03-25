import { TransactionStatus, Operation, type History } from '@sora-substrate/sdk';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { HiddenValue, accountIdBasedOperations } from '@/consts';
import { useWalletStore } from '@/stores/wallet';
import type { PolkadotJsAccount } from '@/types/common';
import { formatAddress, groupRewardsByAssetsList } from '@/util';

import { useNumberFormatter } from './useNumberFormatter';

const TWO_ASSET_OPERATIONS = [
  Operation.AddLiquidity,
  Operation.CreatePair,
  Operation.RemoveLiquidity,
  Operation.Swap,
  Operation.SwapAndSend,
  Operation.DemeterFarmingDepositLiquidity,
  Operation.DemeterFarmingWithdrawLiquidity,
];

const AMOUNT_BASED_OPERATIONS = [
  ...TWO_ASSET_OPERATIONS,
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
];

const ORDER_BOOK_OPERATIONS = [
  Operation.OrderBookPlaceLimitOrder,
  Operation.OrderBookCancelLimitOrder,
  Operation.OrderBookCancelLimitOrders,
];

export function useOperations() {
  const walletStore = useWalletStore();
  const { t } = useTranslation();
  const { formatStringValue } = useNumberFormatter();

  const account = computed<PolkadotJsAccount>(() => walletStore.account as PolkadotJsAccount);

  const getTitle = (value?: History): string => {
    if (!value || !Object.values(Operation).includes(value.type as Operation)) {
      return '';
    }

    const params = { ...value } as Record<string, unknown>;

    if (value.type === Operation.ReferralSetInvitedUser) {
      const isInvitedUser = account.value.address === value.from;
      const linkedRole = isInvitedUser ? 'transaction.referrer' : 'transaction.referral';
      params.role = t(linkedRole);
    }

    return t(`operations.${value.type}`, params);
  };

  const getOperationMessage = (value?: History, hideAmountValues = false): string => {
    if (!value || !Object.values(Operation).includes(value.type as Operation)) {
      return '';
    }

    const params = { ...value } as Record<string, unknown>;

    if (accountIdBasedOperations.includes(value.type)) {
      const isRecipient = account.value.address === value.to;
      const address = isRecipient ? value.from : value.to;
      const direction = isRecipient ? t('transaction.from') : t('transaction.to');
      const action = isRecipient ? t('receivedText') : t('sentText');

      params.address = address ? formatAddress(address, 10) : '';
      params.direction = direction;
      params.action = action;
    }

    if (AMOUNT_BASED_OPERATIONS.includes(value.type)) {
      params.amount = params.amount ? formatStringValue(params.amount as string, params.decimals as number) : '';
    }

    if (TWO_ASSET_OPERATIONS.includes(value.type)) {
      params.amount2 = params.amount2 ? formatStringValue(params.amount2 as string, params.decimals2 as number) : '';
    }

    if (value.type === Operation.ClaimRewards) {
      params.rewards = groupRewardsByAssetsList(params.rewards as any)
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

    if (ORDER_BOOK_OPERATIONS.includes(value.type)) {
      params.side = (params.side as string | undefined)?.toUpperCase();
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
    getTitle,
    getOperationMessage,
  };
}
