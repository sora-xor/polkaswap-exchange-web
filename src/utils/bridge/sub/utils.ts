import { Operation } from '@sora-substrate/util';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

import { subBridgeApi } from '@/utils/bridge/sub/api';

export const isUnsignedTx = (tx: SubHistory): boolean => {
  if (tx.type === Operation.SubstrateOutgoing) {
    return !tx.blockId && !tx.txId;
  } else if (tx.type === Operation.SubstrateIncoming) {
    return true;
  } else {
    return true;
  }
};

export const getTransaction = (id: string): SubHistory => {
  const tx = subBridgeApi.getHistory(id) as SubHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = (id: string, params = {}): void => {
  const tx = getTransaction(id);
  subBridgeApi.saveHistory({ ...tx, ...params });
};
