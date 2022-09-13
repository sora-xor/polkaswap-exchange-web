import { Operation } from '@sora-substrate/util';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

export const isOutgoingTransaction = (tx: Nullable<EvmHistory>): boolean => {
  return tx?.type === Operation.EvmOutgoing;
};

export const isUnsignedTx = (tx: EvmHistory): boolean => {
  if (tx.type === Operation.EvmOutgoing) {
    return !tx.blockId && !tx.txId;
  } else if (tx.type === Operation.EvmIncoming) {
    // TODO [EVM]
    return true;
  } else {
    return true;
  }
};
