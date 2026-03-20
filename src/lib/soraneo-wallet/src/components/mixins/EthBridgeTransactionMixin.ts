import { Operation } from '@sora-substrate/sdk';
import { defineComponent } from 'vue';

import { ETH_BRIDGE_STATES } from '../../consts';

import type { HistoryItem } from '@sora-substrate/sdk';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';

export default defineComponent({
  methods: {
    isEthBridgeTx(transaction: HistoryItem): boolean {
      return [Operation.EthBridgeOutgoing, Operation.EthBridgeIncoming].includes(transaction.type);
    },
    getEthBridgeTxState(transaction: HistoryItem): string {
      return (transaction as EthHistory).transactionState ?? ETH_BRIDGE_STATES.INITIAL;
    },
    isSoraToEthTx(transaction: HistoryItem): boolean {
      return (transaction as EthHistory).type === Operation.EthBridgeOutgoing;
    },
    isEthBridgeTxStarted(this: any, transaction: HistoryItem): boolean {
      return this.getEthBridgeTxState(transaction) !== ETH_BRIDGE_STATES.INITIAL;
    },
    isEthBridgeTxFromPending(this: any, transaction: HistoryItem): boolean {
      return (
        this.getEthBridgeTxState(transaction) ===
        (this.isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_PENDING : ETH_BRIDGE_STATES.EVM_PENDING)
      );
    },
    isEthBridgeTxFromFailed(this: any, transaction: HistoryItem): boolean {
      return (
        this.getEthBridgeTxState(transaction) ===
        (this.isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_REJECTED : ETH_BRIDGE_STATES.EVM_REJECTED)
      );
    },
    isEthBridgeTxToFailed(this: any, transaction: HistoryItem): boolean {
      return (
        this.getEthBridgeTxState(transaction) ===
        (!this.isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_REJECTED : ETH_BRIDGE_STATES.EVM_REJECTED)
      );
    },
    isEthBridgeTxFromCompleted(this: any, transaction: HistoryItem): boolean {
      return (
        this.isEthBridgeTxStarted(transaction) &&
        !this.isEthBridgeTxFromPending(transaction) &&
        !this.isEthBridgeTxFromFailed(transaction)
      );
    },
    isEthBridgeTxToCompleted(this: any, transaction: HistoryItem): boolean {
      return (
        this.getEthBridgeTxState(transaction) ===
        (!this.isSoraToEthTx(transaction) ? ETH_BRIDGE_STATES.SORA_COMMITED : ETH_BRIDGE_STATES.EVM_COMMITED)
      );
    },
  },
});
