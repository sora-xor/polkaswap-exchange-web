import { TransactionStatus, Operation, type HistoryItem } from '@sora-substrate/sdk';
import findLast from 'lodash/fp/findLast';
import { computed } from 'vue';

import { api } from '@/api';
import { useWalletStore } from '@/stores/wallet';
import { delay } from '@/util';

import { useLoading } from './useLoading';
import { useNotification, type AsyncFnWithoutArgs } from './useNotification';
import { useOperations } from './useOperations';

export function useTransaction() {
  const walletStore = useWalletStore();
  const loadingApi = useLoading({
    isWalletLoaded: () => walletStore.isWalletLoaded,
  });
  const { loading, withLoading, withApi, withChainApi, withParentLoading } = loadingApi;
  const notification = useNotification();
  const operations = useOperations();
  const { getOperationMessage } = operations;
  const { t } = notification;

  const shouldBalanceBeHidden = computed(() => walletStore.shouldBalanceBeHidden);

  const addAsset = (address: string) => walletStore.addAsset(address);
  const addActiveTransaction = (id: string) => walletStore.addActiveTransaction(id);
  const removeActiveTxs = (ids: string[]) => walletStore.removeActiveTransactions(ids);
  const accountAssetsAddressTable = computed(() => walletStore.accountAssetsAddressTable);

  const getLastTransaction = async (time: number): Promise<HistoryItem> => {
    const tx = findLast((item: HistoryItem) => Number(item.startTime) > time, api.historyList as HistoryItem[]);

    if (!tx) {
      await delay();
      return getLastTransaction(time);
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
      if (value.status === TransactionStatus.InBlock) return;
    } else if (value.type === Operation.RegisterAsset && value.assetAddress) {
      const alreadyExists = accountAssetsAddressTable.value[value.assetAddress];
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

    removeActiveTxs([value.id as string]);
  };

  const withNotifications = async (func: AsyncFnWithoutArgs): Promise<void> => {
    await withLoading(async () => {
      await notification.withAppNotification(async () => {
        await walletStore.beforeTransactionSign(api);

        const time = Date.now();
        await func();
        notification.showAppNotification(t('transactionSubmittedText'), 'info');
        const tx = await getLastTransaction(time);
        addActiveTransaction(tx.id as string);
      });
    });
  };

  return {
    ...loadingApi,
    ...notification,
    ...operations,
    loading,
    withLoading,
    withApi,
    withChainApi,
    withParentLoading,
    handleChangeTransaction,
    withNotifications,
  };
}
