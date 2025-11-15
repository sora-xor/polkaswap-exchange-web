import { Operation, TransactionStatus, type HistoryItem } from '@sora-substrate/sdk';
import { api } from '@wallet';
import { beforeTransactionSign, delay } from '@wallet/src/util';
import findLast from 'lodash/fp/findLast';
import { computed } from 'vue';

import store from '@/store';
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

  const shouldBalanceBeHidden = computed(() => Boolean(store.state.wallet.settings.shouldBalanceBeHidden));
  const walletStore = useWalletStore();
  const addAsset = walletStore.addAsset;
  const addActiveTransaction = store.commit.wallet.transactions.addActiveTx;
  const removeActiveTxs = store.commit.wallet.transactions.removeActiveTxs;

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
      const assetsTable = store.getters.wallet.account.accountAssetsAddressTable as Record<string, unknown>;
      const alreadyExists = assetsTable?.[value.assetAddress];

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

  const withNotifications = async (handler: AsyncFnWithoutArgs): Promise<void> => {
    await withLoading(async () => {
      await notification.withAppNotification(async () => {
        await beforeTransactionSign(store.original, api);
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
