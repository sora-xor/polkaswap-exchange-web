import { api } from '@soramitsu/soraneo-wallet-web';
import { Operation } from '@sora-substrate/util';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import { delay } from '@/utils';
import { evmBridgeApi } from '@/utils/bridge/evm/api';

export const SORA_REQUESTS_TIMEOUT = 6_000; // Block production time

export const isUnsignedTx = (tx: EvmHistory): boolean => {
  if (tx.type === Operation.EvmOutgoing) {
    return !tx.blockId && !tx.txId;
  } else if (tx.type === Operation.EvmIncoming) {
    return true;
  } else {
    return true;
  }
};

export const getTransaction = (id: string): EvmHistory => {
  const tx = evmBridgeApi.getHistory(id) as EvmHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = (id: string, params = {}): void => {
  const tx = getTransaction(id);
  evmBridgeApi.saveHistory({ ...tx, ...params });
};

export const waitForSoraTransactionHash = async (id: string): Promise<string> => {
  const tx = getTransaction(id);

  if (tx.hash) return tx.hash;

  const blockId = tx.blockId;

  if (!blockId)
    throw new Error(
      '[waitForSoraTransactionHash]: Unable to retrieve transaction hash, transaction "blockId" is empty'
    );

  const extrinsics = await api.system.getExtrinsicsFromBlock(blockId);

  if (extrinsics.length) {
    const blockEvents = await api.system.getBlockEvents(blockId);

    const extrinsicIndex = extrinsics.findIndex((item) => {
      const {
        signer,
        method: { method, section },
      } = item;

      return signer.toString() === tx.from && section === 'evmBridgeProxy' && method === 'burn';
    });

    if (!Number.isFinite(extrinsicIndex)) throw new Error('[Bridge]: Transaction was failed');

    const event = blockEvents.find(
      ({ phase, event }) =>
        phase.isApplyExtrinsic &&
        phase.asApplyExtrinsic.eq(extrinsicIndex) &&
        event.section === 'evmBridgeProxy' &&
        event.method === 'RequestStatusUpdate'
    );

    if (!event) {
      throw new Error('[Bridge]: Transaction was failed');
    }

    const hash = event.event.data[0].toString();

    return hash;
  }

  await delay(SORA_REQUESTS_TIMEOUT);

  return await waitForSoraTransactionHash(id);
};
