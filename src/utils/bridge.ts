import { api, BridgeTxStatus, Operation } from '@sora-substrate/util';
import { STATES } from '@/utils/fsm';

export const bridgeApi = api.bridge;

type HandleTransactionPayload = {
  store: any;
  status: BridgeTxStatus;
  nextState: STATES;
  rejectState: STATES;
  handler?: (store: any) => Promise<void>;
};

const handleTransactionState = async ({ store, status, nextState, rejectState, handler }: HandleTransactionPayload) => {
  console.log('handleTransactionState', status, nextState, rejectState);
  try {
    if (store.state.historyItem.status === BridgeTxStatus.Done) return;

    await store.dispatch('updateHistoryParams', { status });

    if (typeof handler === 'function') {
      await handler(store);
    }

    await store.dispatch('updateHistoryParams', { transactionState: nextState });

    handleBridgeTransaction(store);
  } catch (error) {
    console.error(error);
    const wasInFailedStatus = store.state.historyItem.status === BridgeTxStatus.Failed;

    await store.dispatch('updateHistoryParams', {
      status: BridgeTxStatus.Failed,
      transactionState: rejectState,
      endTime: wasInFailedStatus ? store.state.historyItem.endTime : Date.now(),
    });
  }
};

// TODO: remove history by id
// if (
//   !state.context.history.hash?.length &&
//   !state.context.history.ethereumHash?.length &&
//   [STATES.SORA_REJECTED, STATES.EVM_REJECTED].includes(state.value)
// ) {
//   if (state.event.data?.message.includes('Cancelled') || state.event.data?.code === MetamaskCancellationCode) {
//     await this.removeHistoryById(state.context.history.id);
//   }
// }
export const handleBridgeTransaction = async (store) => {
  console.log('handleBridgeTransaction');

  const {
    state: { historyItem },
  } = store;

  if (!historyItem) return;

  const { type, transactionState } = historyItem;

  if (type === Operation.EthBridgeOutgoing) {
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
            transactionState: STATES.EVM_SUBMITTED,
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
  }
};
