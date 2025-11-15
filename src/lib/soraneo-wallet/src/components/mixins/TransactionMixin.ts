import { TransactionStatus, Operation } from '@sora-substrate/sdk';
import findLast from 'lodash/fp/findLast';
import { Options, mixins } from 'vue-property-decorator';

import { api } from '../../api';
import { getter, mutation, action, state } from '../../store/decorators';
import { delay, beforeTransactionSign } from '../../util';

import LoadingMixin from './LoadingMixin';
import OperationsMixin from './OperationsMixin';

import type { AccountAssetsTable } from '../../types/common';
import type { HistoryItem } from '@sora-substrate/sdk';

@Options({})
export default class TransactionMixin extends mixins(LoadingMixin, OperationsMixin) {
  declare $store: any;

  @state.settings.shouldBalanceBeHidden shouldBalanceBeHidden!: boolean;

  @getter.account.accountAssetsAddressTable accountAssetsAddressTable!: AccountAssetsTable;

  @mutation.transactions.addActiveTx addActiveTransaction!: (id: string) => void;
  @mutation.transactions.removeActiveTxs removeActiveTxs!: (ids: string[]) => void;

  @action.account.addAsset private addAsset!: (address?: string) => Promise<void>;

  private async getLastTransaction(time: number): Promise<HistoryItem> {
    const tx = findLast((item) => Number(item.startTime) > time, api.historyList);
    if (!tx) {
      await delay();
      return await this.getLastTransaction(time);
    }
    return tx;
  }

  /** Should be used with @Watch like a singletone in a root of the project */
  handleChangeTransaction(value: Nullable<HistoryItem>, oldValue: Nullable<HistoryItem>): void {
    if (
      !value ||
      !value.status ||
      ![TransactionStatus.InBlock, TransactionStatus.Finalized, TransactionStatus.Error].includes(
        value.status as TransactionStatus
      )
    ) {
      return;
    }

    const message = this.getOperationMessage(value, this.shouldBalanceBeHidden);
    // is transaction has not been processed before
    const isNewTx = !oldValue || oldValue.id !== value.id;

    if (value.status === TransactionStatus.Error) {
      this.showAppNotification(message, 'error');
    } else if (value.status === TransactionStatus.InBlock || isNewTx) {
      if (isNewTx) {
        this.showAppNotification(message, 'success');
      }
      if (value.status === TransactionStatus.InBlock) return;
    } else if (value.type === Operation.RegisterAsset && value.assetAddress) {
      // If user was really fast and already added tx
      const alreadyExists = this.accountAssetsAddressTable[value.assetAddress];
      if (!alreadyExists) {
        // Add asset automatically for registered assets for finalized txs made by the account
        this.addAsset(value.assetAddress).then(() => {
          this.showAppNotification(this.t('addAsset.success', { symbol: value.symbol || '' }), 'success');
        });
      }
    }
    // remove active tx on finalized or error status
    this.removeActiveTxs([value.id as string]);
  }

  async withNotifications(func: AsyncFnWithoutArgs): Promise<void> {
    await this.withLoading(async () => {
      await this.withAppNotification(async () => {
        await beforeTransactionSign(this.$store, api);
        const time = Date.now();
        await func();
        const tx = await this.getLastTransaction(time);
        this.addActiveTransaction(tx.id as string);
        this.showAppNotification(this.t('transactionSubmittedText'));
      });
    });
  }
}
