import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import ethersUtil from '@/utils/ethers-util';

import store from '@/store';

import { bridgeApi } from './api';
import { STATES } from './types';
import {
  getTransaction,
  waitForRequest,
  waitForApprovedRequest,
  waitForExtrinsicFinalization,
  waitForEvmTransactionStatus,
} from './utils';

import type { BridgeHistory } from '@sora-substrate/util';
import type { HandleTransactionPayload, BridgeTransactionHandler } from './types';

const updateTransactionParams = async (id: string, params = {}) => {
  const tx = getTransaction(id);
  bridgeApi.saveHistory({ ...tx, ...params });

  await store.dispatch('bridge/getHistory');
};

const waitForEvmTransaction = async (id: string) => {
  const transaction = getTransaction(id);

  if (!transaction.ethereumHash) throw new Error('Hash cannot be empty!');

  await waitForEvmTransactionStatus(
    transaction.ethereumHash,
    (ethereumHash: string) => {
      updateTransactionParams(id, { ethereumHash });
      waitForEvmTransaction(id);
    },
    () => {
      throw new Error('The transaction was canceled by the user');
    }
  );
};

const handleTransactionState = async (
  id: string,
  { status, nextState, rejectState, handler }: HandleTransactionPayload
) => {
  try {
    const transaction = getTransaction(id);

    console.log('handleTransactionState', transaction.transactionState, nextState);

    if (transaction.status === BridgeTxStatus.Done) return;
    if (status && transaction.status !== status) {
      await updateTransactionParams(id, { status });
    }

    if (typeof handler === 'function') {
      await handler(id);
    }

    await updateTransactionParams(id, { transactionState: nextState });
  } catch (error) {
    console.error(error);

    const transaction = getTransaction(id);
    const failed = transaction.status === BridgeTxStatus.Failed;
    const unsigned = !transaction.hash && !transaction.ethereumHash;

    await updateTransactionParams(id, {
      status: BridgeTxStatus.Failed,
      transactionState: rejectState,
      endTime: failed ? transaction.endTime : Date.now(),
    });

    if (unsigned) {
      bridgeApi.removeHistory(id);
    }
  }
};

const handleEthBridgeOutgoingTxState: BridgeTransactionHandler = async (transaction: BridgeHistory) => {
  if (!transaction.id) throw new Error('TX ID cannot be empty');

  switch (transaction.transactionState) {
    case STATES.INITIAL: {
      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_SUBMITTED,
        rejectState: STATES.SORA_REJECTED,
      });
    }

    case STATES.SORA_SUBMITTED: {
      const handler = async (id: string) => {
        await updateTransactionParams(id, { transactionState: STATES.SORA_PENDING });

        const tx = getTransaction(id);

        if (!tx.signed) {
          const evmAccount = await ethersUtil.getAccount();

          if (!tx.amount) throw new Error('[Bridge]: TX amount cannot be empty');

          const asset = store.getters['assets/getAssetDataByAddress'](tx.assetAddress);

          if (!asset || !asset.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

          await bridgeApi.transferToEth(asset, evmAccount, tx.amount, tx.id);

          await updateTransactionParams(id, { signed: true });
        }
      };

      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_PENDING,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_PENDING: {
      const handler = async (id: string) => {
        const tx = await waitForExtrinsicFinalization(id);

        await updateTransactionParams(id, tx);

        if (!tx.hash) throw new Error('[Bridge]: TX hash cannot be empty');

        const { to, hash } = await waitForApprovedRequest(tx.hash);

        await updateTransactionParams(id, { to, hash });
      };

      return await handleTransactionState(transaction.id, {
        nextState: STATES.SORA_COMMITED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_COMMITED: {
      const handler = async (id: string) => {
        await updateTransactionParams(id, { transactionStep: 2 });
      };

      return await handleTransactionState(transaction.id, {
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_REJECTED:
      return await handleTransactionState(transaction.id, {
        nextState: STATES.SORA_SUBMITTED,
        rejectState: STATES.SORA_REJECTED,
      });

    case STATES.EVM_SUBMITTED: {
      const handler = async (id: string) => {
        await updateTransactionParams(id, { transactionState: STATES.EVM_PENDING, signed: false });

        const tx = getTransaction(id);

        if (!tx.signed) {
          const ethereumHash = await store.dispatch('bridge/signEvmTransactionSoraToEvm', id);

          await updateTransactionParams(id, { ethereumHash, signed: true });
        }
      };

      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_PENDING,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_PENDING: {
      const handler = async (id: string) => {
        await waitForEvmTransaction(id);
      };

      return await handleTransactionState(transaction.id, {
        nextState: STATES.EVM_COMMITED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_COMMITED: {
      const handler = async (id: string) => {
        await updateTransactionParams(id, { endTime: Date.now() });
      };

      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Done,
        nextState: STATES.EVM_COMMITED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_REJECTED: {
      return await handleTransactionState(transaction.id, {
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
      });
    }
  }
};

const handleEthBridgeIncomingTxState: BridgeTransactionHandler = async (transaction: BridgeHistory) => {
  if (!transaction.id) throw new Error('TX ID cannot be empty');

  switch (transaction.transactionState) {
    case STATES.INITIAL: {
      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
      });
    }

    case STATES.EVM_SUBMITTED: {
      const handler = async (id: string) => {
        await updateTransactionParams(id, { transactionState: STATES.EVM_PENDING });

        const tx = getTransaction(id);

        if (!tx.signed) {
          const ethereumHash = await store.dispatch('bridge/signEvmTransactionEvmToSora', id);

          await updateTransactionParams(id, { ethereumHash, signed: true });
        }
      };

      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Pending,
        nextState: STATES.EVM_PENDING,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_PENDING: {
      const handler = async (id: string) => {
        await waitForEvmTransaction(id);
      };

      return await handleTransactionState(transaction.id, {
        nextState: STATES.EVM_COMMITED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_COMMITED: {
      const handler = async (id: string) => {
        await updateTransactionParams(id, { transactionStep: 2 });
      };

      return await handleTransactionState(transaction.id, {
        nextState: STATES.SORA_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
        handler,
      });
    }

    case STATES.EVM_REJECTED: {
      return await handleTransactionState(transaction.id, {
        nextState: STATES.EVM_SUBMITTED,
        rejectState: STATES.EVM_REJECTED,
      });
    }

    case STATES.SORA_SUBMITTED: {
      const handler = async (id) => {
        await updateTransactionParams(id, { transactionState: STATES.SORA_PENDING, signed: false });

        const tx = getTransaction(id);

        if (!tx.signed) {
          // TODO: check it for other types of bridge
          // const transferType = isXorAccountAsset(getters.asset) ? RequestType.TransferXOR : RequestType.Transfer
          // await bridgeApi.requestFromEth(ethereumHash, transferType)

          await updateTransactionParams(id, { signed: true });
        }
      };

      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Pending,
        nextState: STATES.SORA_PENDING,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_PENDING: {
      const handler = async (id) => {
        const tx = getTransaction(id);

        if (!tx.ethereumHash) throw new Error('Hash cannot be empty!');

        await waitForRequest(tx.ethereumHash);
      };

      return await handleTransactionState(transaction.id, {
        nextState: STATES.SORA_COMMITED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_COMMITED: {
      const handler = async (id) => {
        await updateTransactionParams(id, { endTime: Date.now() });
      };

      return await handleTransactionState(transaction.id, {
        status: BridgeTxStatus.Done,
        nextState: STATES.SORA_COMMITED,
        rejectState: STATES.SORA_REJECTED,
        handler,
      });
    }

    case STATES.SORA_REJECTED: {
      return await handleTransactionState(transaction.id, {
        nextState: STATES.SORA_SUBMITTED,
        rejectState: STATES.SORA_REJECTED,
      });
    }
  }
};

const BridgeTransactionHandlers = {
  [Operation.EthBridgeOutgoing]: handleEthBridgeOutgoingTxState,
  [Operation.EthBridgeIncoming]: handleEthBridgeIncomingTxState,
};

const process = async (transaction: BridgeHistory, handler: BridgeTransactionHandler) => {
  await handler(transaction);

  const tx = getTransaction(transaction.id as string);

  if (![BridgeTxStatus.Done, BridgeTxStatus.Failed].includes(tx.status as BridgeTxStatus)) {
    await process(tx, handler);
  }
};

const handleBridgeTransaction = async (id: string) => {
  const transaction = getTransaction(id);

  const { type } = transaction;
  const handler = BridgeTransactionHandlers[type];

  if (!handler) throw new Error(`[Bridge]: Unsupported operation '${type}'`);

  await process(transaction, handler);
};

export { handleBridgeTransaction, bridgeApi };
export * from './utils';
export * from './types';
