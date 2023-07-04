import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export const isUnsignedTx = (tx: SubHistory): boolean => {
  return !tx.blockId && !tx.txId;
};

export const getTransaction = (id: string): SubHistory => {
  const tx = subBridgeApi.getHistory(id) as SubHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = (id: string, params = {}): void => {
  const tx = getTransaction(id);
  const data = { ...tx, ...params };
  subBridgeApi.saveHistory(data);
};
