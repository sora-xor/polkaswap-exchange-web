import { settingsStorage } from '../../util/storage';

import type { TransactionsState } from './types';

function initialState(): TransactionsState {
  const isConfirmTxDialogDisabled = settingsStorage.get('confirmTxDialogDisabled');
  const isSignTxDialogDisabled = settingsStorage.get('signTxDialogDisabled');

  return {
    history: {}, // history items what not synced with subquery
    externalHistory: {},
    externalHistoryTotal: 0,
    externalHistorySubscription: null,
    externalHistoryUpdates: {}, // history items coming from subscription
    saveExternalHistoryUpdates: false, // should we save them in state
    activeTxsIds: [],
    updateActiveTxsId: null,
    selectedTxId: null,
    isConfirmTxDialogDisabled: isConfirmTxDialogDisabled ? Boolean(JSON.parse(isConfirmTxDialogDisabled)) : false,
    isSignTxDialogDisabled: isSignTxDialogDisabled ? Boolean(JSON.parse(isSignTxDialogDisabled)) : false,
    isSignTxDialogVisible: false,
    pendingMstTxsSubscription: null,
    pendingMstTransactions: [],
  };
}

const state = initialState();

export default state;
