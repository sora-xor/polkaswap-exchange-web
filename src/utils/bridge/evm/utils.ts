import { Operation } from '@sora-substrate/sdk';

import { evmBridgeApi } from '@/utils/bridge/evm/api';

import type { EvmHistory } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

export const isOutgoingTx = (tx: EvmHistory): boolean => {
  return tx.type === Operation.EvmOutgoing;
};

export const isUnsignedTx = (tx: EvmHistory): boolean => {
  if (isOutgoingTx(tx)) {
    return !tx.blockId && !tx.txId;
  } else {
    return !tx.externalHash;
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
