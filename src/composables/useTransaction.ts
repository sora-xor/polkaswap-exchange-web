import { Operation, TransactionStatus, type HistoryItem } from '@sora-substrate/sdk';
import findLast from 'lodash/fp/findLast';
import { computed } from 'vue';

import { api } from '@/shims/wallet-api';
import { delay } from '@/shims/wallet-util';
import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { useNotification } from './useNotification';
import { useLoading } from './useLoading';
import { useOperations } from './useOperations';
import { useTranslation } from './useTranslation';

import type { AsyncFnWithoutArgs } from './useNotification';

/**
 * Lightweight transaction helper extracted from the wallet's
 * `TransactionMixin`.
 */
export function useTransaction(options?: Parameters<typeof useLoading>[0]) {
  const loadingApi = useLoading(options);
  const { loading, withLoading, withApi, withChainApi, withParentLoading } = loadingApi;
  const { t } = useTranslation();
  const notification = useNotification();
  const { getOperationMessage } = useOperations();

  const walletStore = useWalletStore(pinia);
  const shouldBalanceBeHidden = computed(() => walletStore.shouldBalanceBeHidden);
  const addAsset = walletStore.addAsset;
  const addActiveTransaction = walletStore.addActiveTransaction;
  const removeActiveTransactions = walletStore.removeActiveTransactions;
  const accountAssetsAddressTable = computed(() => walletStore.accountAssetsAddressTable);

  const getLastTransaction = async (time: number): Promise<HistoryItem> => {
    const tx = findLast((item: HistoryItem) => Number(item.startTime) > time, api.historyList);
    if (!tx) {
      await delay();
      return await getLastTransaction(time);
    }
    return tx;
  };

  const handleChangeTransaction = (value: Nullable<HistoryItem>, oldValue: Nullable<HistoryItem>): void => {
    if (
      !value ||
      !value.status ||
      ![TransactionStatus.InBlock, TransactionStatus.Finalized, TransactionStatus.Error].includes(
        value.status as TransactionStatus
      )
    ) {
      return;
    }

    const message = getOperationMessage(value, shouldBalanceBeHidden.value);
    const isNewTx = !oldValue || oldValue.id !== value.id;

    if (value.status === TransactionStatus.Error) {
      notification.showAppNotification(message, 'error');
    } else if (value.status === TransactionStatus.InBlock || isNewTx) {
      if (isNewTx) {
        notification.showAppNotification(message, 'success');
      }
      if (value.status === TransactionStatus.InBlock) {
        return;
      }
    } else if (value.type === Operation.RegisterAsset && value.assetAddress) {
      const alreadyExists = accountAssetsAddressTable.value?.[value.assetAddress];

      if (!alreadyExists) {
        addAsset(value.assetAddress)
          .then(() => {
            notification.showAppNotification(t('addAsset.success', { symbol: value.symbol || '' }), 'success');
          })
          .catch((error: unknown) => {
            console.error('Failed to add asset after registration:', error);
          });
      }
    }

    removeActiveTransactions([value.id as string]);
  };

  const withNotifications = async (handler: AsyncFnWithoutArgs): Promise<void> => {
    await withLoading(async () => {
      await notification.withAppNotification(async () => {
        await walletStore.beforeTransactionSign(api);
        const time = Date.now();
        await handler();
        const tx = await getLastTransaction(time);
        addActiveTransaction(tx.id as string);
        notification.showAppNotification(t('transactionSubmittedText'));
      });
    });
  };

  return {
    loading,
    withLoading,
    withApi,
    withChainApi,
    withParentLoading,
    handleChangeTransaction,
    withNotifications,
  };
}

export type TransactionComposable = ReturnType<typeof useTransaction>;
