import { TransactionStatus, Operation, type HistoryItem } from '@sora-substrate/sdk';
import findLast from 'lodash/fp/findLast';
import { computed } from 'vue';

import { api } from '@/api';
import { useLoading } from '@/composables/useLoading';
import { useNotification, type AsyncFnWithoutArgs } from '@/composables/useNotification';
import { useOperations } from '@/composables/useOperations';
import { useTranslation } from '@/composables/useTranslation';
import { getWalletStore } from '../store/instance';
import { beforeTransactionSign, delay } from '@/util';

export function useTransaction() {
  const store = getWalletStore();
  const { loading, withLoading, withApi, withChainApi, withParentLoading } = useLoading({
    isWalletLoaded: () => store.state.wallet.settings.isWalletLoaded,
  });
  const notification = useNotification();
  const { getOperationMessage } = useOperations();
  const { t } = useTranslation();

  const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden);

  const addAsset = store.dispatch.wallet.account.addAsset;
  const addActiveTransaction = store.commit.wallet.transactions.addActiveTx;
  const removeActiveTxs = store.commit.wallet.transactions.removeActiveTxs;

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
      const alreadyExists = store.getters['wallet/account/accountAssetsAddressTable'][value.assetAddress];
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
        await beforeTransactionSign(store.original, api);

        const time = Date.now();
        await func();
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
