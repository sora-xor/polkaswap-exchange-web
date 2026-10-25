import { describe, expect, it } from 'vitest';

import { Operation } from '@sora-substrate/sdk';

import { ETH_BRIDGE_STATES } from '@/lib/soraneo-wallet/src/consts';
import { useEthBridgeTransaction } from '@/lib/soraneo-wallet/src/composables/useEthBridgeTransaction';

describe('wallet useEthBridgeTransaction', () => {
  it('identifies ethereum bridge transactions and derives outgoing bridge states correctly', () => {
    const bridge = useEthBridgeTransaction();
    const outgoingPending = {
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
    } as any;
    const outgoingCommitted = {
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_COMMITED,
    } as any;
    const regularTx = {
      type: Operation.Transfer,
    } as any;

    expect(bridge.isEthBridgeTx(outgoingPending)).toBe(true);
    expect(bridge.isEthBridgeTx(regularTx)).toBe(false);
    expect(bridge.isSoraToEthTx(outgoingPending)).toBe(true);
    expect(bridge.isEthBridgeTxStarted(outgoingPending)).toBe(true);
    expect(bridge.isEthBridgeTxFromPending(outgoingPending)).toBe(true);
    expect(bridge.isEthBridgeTxFromFailed(outgoingPending)).toBe(false);
    expect(bridge.isEthBridgeTxToFailed(outgoingPending)).toBe(false);
    expect(bridge.isEthBridgeTxFromCompleted(outgoingPending)).toBe(false);
    expect(bridge.isEthBridgeTxToCompleted(outgoingCommitted)).toBe(true);
  });

  it('derives incoming bridge states and defaults missing state to the initial status', () => {
    const bridge = useEthBridgeTransaction();
    const incomingRejected = {
      type: 'incoming',
      transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
    } as any;
    const incomingCommitted = {
      type: 'incoming',
      transactionState: ETH_BRIDGE_STATES.SORA_COMMITED,
    } as any;
    const incomingInitial = {
      type: 'incoming',
    } as any;

    expect(bridge.getEthBridgeTxState(incomingInitial)).toBe(ETH_BRIDGE_STATES.INITIAL);
    expect(bridge.isSoraToEthTx(incomingRejected)).toBe(false);
    expect(bridge.isEthBridgeTxStarted(incomingInitial)).toBe(false);
    expect(bridge.isEthBridgeTxFromPending(incomingRejected)).toBe(false);
    expect(bridge.isEthBridgeTxFromFailed(incomingRejected)).toBe(true);
    expect(bridge.isEthBridgeTxToFailed(incomingRejected)).toBe(false);
    expect(bridge.isEthBridgeTxFromCompleted(incomingCommitted)).toBe(true);
    expect(bridge.isEthBridgeTxToCompleted(incomingCommitted)).toBe(true);
  });
});
