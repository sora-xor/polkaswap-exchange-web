import { TransactionStatus, Operation, type HistoryItem } from '@sora-substrate/sdk';
import findLast from 'lodash/fp/findLast';
import { computed } from 'vue';

import { useWalletStore } from '@/stores/wallet';
import { delay } from '@/util';

import { api } from '../api';
import { useLoading } from './useLoading';
import { useNotification, type AsyncFnWithoutArgs } from './useNotification';
import { useOperations } from './useOperations';

/**
 * Describes whether the wallet flow actually created a transaction history item.
 */
export interface TransactionNotificationResult {
  submitted: boolean;
  submittedAt?: number;
  transaction?: HistoryItem;
  historyTimedOut?: boolean;
  error?: unknown;
}

const TRANSACTION_HISTORY_LOOKUP_TIMEOUT_MS = 15_000;
const TRANSACTION_HISTORY_LOOKUP_POLL_MS = 50;
const TRANSACTION_HISTORY_LOOKUP_ATTEMPTS = Math.ceil(
  TRANSACTION_HISTORY_LOOKUP_TIMEOUT_MS / TRANSACTION_HISTORY_LOOKUP_POLL_MS
);

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

  const findLastTransaction = (time: number): HistoryItem | undefined =>
    findLast((item: HistoryItem) => Number(item.startTime) > time, api.historyList as HistoryItem[]);

  const waitForLastTransaction = async (time: number): Promise<HistoryItem | undefined> => {
    const tx = findLastTransaction(time);
    if (tx) return tx;

    for (let attempt = 0; attempt < TRANSACTION_HISTORY_LOOKUP_ATTEMPTS; attempt += 1) {
      await delay(TRANSACTION_HISTORY_LOOKUP_POLL_MS);
      const nextTx = findLastTransaction(time);
      if (nextTx) return nextTx;
    }

    return undefined;
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

  const withNotifications = async (func: AsyncFnWithoutArgs): Promise<TransactionNotificationResult> => {
    let result: TransactionNotificationResult = { submitted: false };

    await withChainApi(api, async () => {
      await notification.withAppNotification(async () => {
        await walletStore.beforeTransactionSign(api);

        const time = Date.now();
        await func();
        notification.showAppNotification(t('transactionSubmittedText'), 'info');
        const tx = await waitForLastTransaction(time);

        if (tx) {
          addActiveTransaction(tx.id as string);
          result = { submitted: true, submittedAt: time, transaction: tx };
        } else {
          result = { submitted: true, submittedAt: time, historyTimedOut: true };
        }
      });
    });

    return result;
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
    shouldBalanceBeHidden,
    handleChangeTransaction,
    withNotifications,
  };
}
