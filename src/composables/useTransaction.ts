import { api } from '@soramitsu/soraneo-wallet-web';
import { useNotification } from '@soramitsu/soraneo-wallet-web/src/composables/useNotification';
import { beforeTransactionSign, delay } from '@soramitsu/soraneo-wallet-web/src/util';
import findLast from 'lodash/fp/findLast';

import store from '@/store';

import { useLoading } from './useLoading';
import { useTranslation } from './useTranslation';

import type { HistoryItem } from '@sora-substrate/sdk';
import type { AsyncFnWithoutArgs } from '@soramitsu/soraneo-wallet-web/src/composables/useNotification';

/**
 * Lightweight transaction helper extracted from the wallet's
 * `TransactionMixin`.
 */
export function useTransaction(options?: Parameters<typeof useLoading>[0]) {
  const loadingApi = useLoading(options);
  const { loading, withLoading, withApi, withChainApi, withParentLoading } = loadingApi;
  const { t } = useTranslation();
  const notification = useNotification();

  const addActiveTransaction = (id: string) => {
    store.commit.wallet.transactions.addActiveTx(id);
  };

  const getLastTransaction = async (time: number): Promise<HistoryItem> => {
    const tx = findLast((item: HistoryItem) => Number(item.startTime) > time, api.historyList);
    if (!tx) {
      await delay();
      return await getLastTransaction(time);
    }
    return tx;
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
    withNotifications,
  };
}

export type TransactionComposable = ReturnType<typeof useTransaction>;
