import { Operation } from '@sora-substrate/sdk';

import { ETH_BRIDGE_STATES } from '../consts';

import type { HistoryItem } from '@sora-substrate/sdk';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';

export function useEthBridgeTransaction() {
  const isEthBridgeTx = (transaction: HistoryItem): boolean => {
    return [Operation.EthBridgeOutgoing, Operation.EthBridgeIncoming].includes(transaction.type);
  };

  const getEthBridgeTxState = (transaction: HistoryItem): string => {
    return (transaction as EthHistory).transactionState ?? ETH_BRIDGE_STATES.INITIAL;
  };

  const isSoraToEthTx = (transaction: HistoryItem): boolean => {
    return (transaction as EthHistory).type === Operation.EthBridgeOutgoing;
  };

  const isEthBridgeTxStarted = (transaction: HistoryItem): boolean => {
    return getEthBridgeTxState(transaction) !== ETH_BRIDGE_STATES.INITIAL;
  };

  const isEthBridgeTxFromPending = (transaction: HistoryItem): boolean => {
    return (
      getEthBridgeTxState(transaction) ===
      (isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_PENDING : ETH_BRIDGE_STATES.EVM_PENDING)
    );
  };

  const isEthBridgeTxFromFailed = (transaction: HistoryItem): boolean => {
    return (
      getEthBridgeTxState(transaction) ===
      (isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_REJECTED : ETH_BRIDGE_STATES.EVM_REJECTED)
    );
  };

  const isEthBridgeTxToFailed = (transaction: HistoryItem): boolean => {
    return (
      getEthBridgeTxState(transaction) ===
      (!isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_REJECTED : ETH_BRIDGE_STATES.EVM_REJECTED)
    );
  };

  const isEthBridgeTxFromCompleted = (transaction: HistoryItem): boolean => {
    return (
      isEthBridgeTxStarted(transaction) &&
      !isEthBridgeTxFromPending(transaction) &&
      !isEthBridgeTxFromFailed(transaction)
    );
  };

  const isEthBridgeTxToCompleted = (transaction: HistoryItem): boolean => {
    return (
      getEthBridgeTxState(transaction) ===
      (!isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_COMMITED : ETH_BRIDGE_STATES.EVM_COMMITED)
    );
  };

  return {
    isEthBridgeTx,
    getEthBridgeTxState,
    isSoraToEthTx,
    isEthBridgeTxStarted,
    isEthBridgeTxFromPending,
    isEthBridgeTxFromFailed,
    isEthBridgeTxToFailed,
    isEthBridgeTxFromCompleted,
    isEthBridgeTxToCompleted,
  };
}
