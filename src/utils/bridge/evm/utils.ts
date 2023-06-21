import { Operation } from '@sora-substrate/util';

import { evmBridgeApi } from '@/utils/bridge/evm/api';

import type { EvmHistory } from '@sora-substrate/util/build/bridgeProxy/evm/types';

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
