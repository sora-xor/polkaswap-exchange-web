import { api, BridgeTxStatus, Operation } from '@sora-substrate/util';

export const bridgeApi = api.bridge;

export enum STATES {
  INITIAL = 'INITIAL',
  SORA_SUBMITTED = 'SORA_SUBMITTED',
  SORA_PENDING = 'SORA_PENDING',
  SORA_REJECTED = 'SORA_REJECTED',
  SORA_COMMITED = 'SORA_COMMITED',
  EVM_SUBMITTED = 'EVM_SUBMITTED',
  EVM_PENDING = 'EVM_PENDING',
  EVM_REJECTED = 'EVM_REJECTED',
  EVM_COMMITED = 'EVM_COMMITED',
}

type HandleTransactionPayload = {
  store: any;
  status: BridgeTxStatus;
  nextState: STATES;
  rejectState: STATES;
  handler?: (store: any) => Promise<void>;
};

const handleTransactionState = async ({ store, status, nextState, rejectState, handler }: HandleTransactionPayload) => {
  console.log('handleTransactionState', status, nextState, rejectState);
  const { historyItem } = store.state;
  try {
    if (historyItem.status === BridgeTxStatus.Done) return;

    await store.dispatch('updateHistoryParams', { status });

    if (typeof handler === 'function') {
      await handler(store);
    }

    await store.dispatch('updateHistoryParams', { transactionState: nextState });

    handleBridgeTransaction(store);
  } catch (error) {
    console.error(error);

    const unsigned = !historyItem.hash && !historyItem.ethereumHash;
    const failed = historyItem.status === BridgeTxStatus.Failed;

    await store.dispatch('updateHistoryParams', {
      status: BridgeTxStatus.Failed,
      transactionState: rejectState,
      endTime: failed ? historyItem.endTime : Date.now(),
    });

    if (unsigned) {
      await store.dispatch('removeHistoryById', historyItem.id);
    }
  }
};

export const handleBridgeTransaction = async (store) => {
  if (!store.state.historyItem) return;

  const { type, transactionState } = store.state.historyItem;

  if (type === Operation.EthBridgeOutgoing) {
    await handleEthBridgeOutgoingTxState(transactionState, store);
  } else if (type === Operation.EthBridgeIncoming) {
    await handleEthBridgeIncomingTxState(transactionState, store);
  }
};

const handleEthBridgeOutgoingTxState = async (transactionState, store) => {
  switch (transactionState) {
    case STATES.INITIAL: {
      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_SUBMITTED,
        rejectState: STATES.SORA_REJECTED,
      });
    }

    case STATES.SORA_SUBMITTED: {
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          transactionState: STATES.SORA_PENDING,
        });

        if (!store.state.historyItem.signed) {
          await store.dispatch('signSoraTransactionSoraToEvm', {
            txId: store.state.historyItem.id,
          });
          await store.dispatch('updateHistoryParams', {
            signed: true,
          });
        }
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_PENDING,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_PENDING: {
      const handler = async (store) => {
        const { to, hash } = await store.dispatch('sendSoraTransactionSoraToEvm', {
          txId: store.state.historyItem.id,
        });

        await store.dispatch('updateHistoryParams', {
          to,
          hash,
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_COMMITED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_COMMITED: {
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          transactionStep: 2,
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_REJECTED:
      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_SUBMITTED,
        rejectState: STATES.SORA_REJECTED,
      });

    case STATES.EVM_SUBMITTED: {
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          transactionState: STATES.EVM_PENDING,
          signed: false,
        });

        if (!store.state.historyItem.signed) {
          const ethereumHash = await store.dispatch('signEvmTransactionSoraToEvm', {
            hash: store.state.historyItem.hash,
          });

          await store.dispatch('updateHistoryParams', {
            ethereumHash,
            signed: true,
          });
        }
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_PENDING,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_PENDING: {
      const handler = async (store) => {
        await store.dispatch('sendEvmTransactionSoraToEvm', {
          ethereumHash: store.state.historyItem.ethereumHash,
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_COMMITED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_COMMITED: {
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          endTime: Date.now(),
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Done,
        nextState: STATES.EVM_COMMITED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_REJECTED: {
      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
      });
    }
  }
};

const handleEthBridgeIncomingTxState = async (transactionState, store) => {
  switch (transactionState) {
    case STATES.INITIAL: {
      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
      });
    }

    case STATES.EVM_SUBMITTED: {
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          transactionState: STATES.EVM_PENDING,
        });

        if (!store.state.historyItem.signed) {
          const ethereumHash = await store.dispatch('signEvmTransactionEvmToSora');

          await store.dispatch('updateHistoryParams', {
            ethereumHash,
            signed: true,
          });
        }
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_PENDING,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_PENDING: {
      const handler = async (store) => {
        await store.dispatch('sendEvmTransactionEvmToSora', {
          ethereumHash: store.state.historyItem.ethereumHash,
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_COMMITED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_COMMITED: {
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          transactionStep: 2,
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_REJECTED: {
      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
      });
    }

    case STATES.SORA_SUBMITTED: {
      // this handler has redundant logic!
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          transactionState: STATES.SORA_PENDING,
          signed: false,
        });

        if (!store.state.historyItem.signed) {
          await store.dispatch('signSoraTransactionEvmToSora', {
            ethereumHash: store.state.historyItem.ethereumHash,
          });

          await store.dispatch('updateHistoryParams', {
            signed: true,
          });
        }
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_PENDING,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_PENDING: {
      const handler = async () => {
        await store.dispatch('sendSoraTransactionEvmToSora', {
          ethereumHash: store.state.historyItem.ethereumHash,
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_COMMITED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_COMMITED: {
      const handler = async (store) => {
        await store.dispatch('updateHistoryParams', {
          endTime: Date.now(),
        });
      };

      return await handleTransactionState({
        store,
        status: BridgeTxStatus.Done,
        nextState: STATES.SORA_COMMITED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }
  }
};
