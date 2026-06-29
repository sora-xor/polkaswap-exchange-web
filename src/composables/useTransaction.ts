import { Operation, TransactionStatus, type HistoryItem } from '@/lib/substrate/sdk/types';
import findLast from 'lodash/fp/findLast';
import { computed } from 'vue';

import { api } from '@/lib/soraneo-wallet/src/api';
import { delay } from '@/lib/soraneo-wallet/src/util';
import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { useNotification } from './useNotification';
import { useLoading } from './useLoading';
import { useOperations } from './useOperations';
import { useTranslation } from './useTranslation';

import type { AsyncFnWithoutArgs } from './useNotification';

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

  const findLastTransaction = (time: number): HistoryItem | undefined =>
    findLast((item: HistoryItem) => Number(item.startTime) > time, api.historyList);

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

  const withNotifications = async (handler: AsyncFnWithoutArgs): Promise<TransactionNotificationResult> => {
    let result: TransactionNotificationResult = { submitted: false };

    await withChainApi(api, async () => {
      await notification
        .withAppNotification(async () => {
          await walletStore.beforeTransactionSign(api);
          const time = Date.now();
          await handler();
          notification.showAppNotification(t('transactionSubmittedText'), 'info');
          const tx = await waitForLastTransaction(time);

          if (tx) {
            addActiveTransaction(tx.id as string);
            result = { submitted: true, submittedAt: time, transaction: tx };
          } else {
            result = { submitted: true, submittedAt: time, historyTimedOut: true };
          }
        }, true)
        .catch((error: unknown) => {
          result = { submitted: false, error };
        });
    });

    return result;
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
