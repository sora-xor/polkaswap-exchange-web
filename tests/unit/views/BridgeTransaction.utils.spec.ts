import { describe, expect, it } from 'vitest';

import {
  buildBridgeAddressAriaLabel,
  isBridgeWaitingForSoraConfirmation,
  requiresBridgeExternalAccountMatch,
  requiresBridgeExternalNetworkMatch,
  resolveBridgePendingNetworkName,
} from '@/features/bridge/pages/bridgeTransactionPage.utils';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

describe('bridgeTransactionPage.utils', () => {
  it('builds bridge address labels with explicit direction and network context', () => {
    expect(buildBridgeAddressAriaLabel('From', 'SORA Account address')).toBe('From: SORA Account address');
    expect(buildBridgeAddressAriaLabel(' To ', ' Ethereum Account address ')).toBe('To: Ethereum Account address');
  });

  it('omits empty address label parts', () => {
    expect(buildBridgeAddressAriaLabel('', 'SORA Account address')).toBe('SORA Account address');
    expect(buildBridgeAddressAriaLabel('From', '')).toBe('From');
  });

  it('requires the external signer only for EVM phases and unsigned incoming Substrate transfers', () => {
    expect(
      requiresBridgeExternalAccountMatch({
        isEvmTransaction: true,
        isSubTransaction: false,
        isOutgoing: true,
        isUnsigned: false,
      })
    ).toBe(true);
    expect(
      requiresBridgeExternalAccountMatch({
        isEvmTransaction: false,
        isSubTransaction: true,
        isOutgoing: false,
        isUnsigned: true,
      })
    ).toBe(true);
    expect(
      requiresBridgeExternalAccountMatch({
        isEvmTransaction: false,
        isSubTransaction: true,
        isOutgoing: true,
        isUnsigned: true,
      })
    ).toBe(false);
    expect(
      requiresBridgeExternalAccountMatch({
        isEvmTransaction: false,
        isSubTransaction: true,
        isOutgoing: false,
        isUnsigned: false,
      })
    ).toBe(false);
  });

  it('identifies legacy ETH bridge states that still wait on SORA confirmation', () => {
    expect(isBridgeWaitingForSoraConfirmation(ETH_BRIDGE_STATES.SORA_SUBMITTED)).toBe(true);
    expect(isBridgeWaitingForSoraConfirmation(ETH_BRIDGE_STATES.SORA_PENDING)).toBe(true);
    expect(isBridgeWaitingForSoraConfirmation(ETH_BRIDGE_STATES.EVM_PENDING)).toBe(false);
  });

  it.each([
    [ETH_BRIDGE_STATES.INITIAL, false],
    [ETH_BRIDGE_STATES.SORA_SUBMITTED, false],
    [ETH_BRIDGE_STATES.SORA_PENDING, false],
    [ETH_BRIDGE_STATES.EVM_SUBMITTED, true],
    [ETH_BRIDGE_STATES.EVM_REJECTED, true],
    [ETH_BRIDGE_STATES.EVM_PENDING, false],
    [ETH_BRIDGE_STATES.EVM_COMMITED, false],
  ])('requires the outgoing Ethereum network in %s only when confirmation is needed', (transactionState, required) => {
    expect(
      requiresBridgeExternalNetworkMatch({
        isEvmTransaction: true,
        isOutgoing: true,
        isUnsigned: false,
        transactionState,
      })
    ).toBe(required);
  });

  it('requires the incoming source network before signing but permits submitted transfer tracking', () => {
    const incoming = { isEvmTransaction: true, isOutgoing: false, transactionState: 'Pending' };

    expect(requiresBridgeExternalNetworkMatch({ ...incoming, isUnsigned: true })).toBe(true);
    expect(requiresBridgeExternalNetworkMatch({ ...incoming, isUnsigned: false })).toBe(false);
    expect(
      requiresBridgeExternalNetworkMatch({
        isEvmTransaction: false,
        isOutgoing: true,
        isUnsigned: false,
        transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
      })
    ).toBe(false);
  });

  it('resolves the pending network for legacy ETH bridge phases', () => {
    const base = {
      isOutgoing: true,
      internalNetworkName: 'SORA',
      externalNetworkName: 'Ethereum',
    };

    expect(
      resolveBridgePendingNetworkName({
        ...base,
        transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      })
    ).toBe('SORA');
    expect(
      resolveBridgePendingNetworkName({
        ...base,
        transactionState: ETH_BRIDGE_STATES.EVM_PENDING,
      })
    ).toBe('Ethereum');
  });

  it('falls back to the source network for single-step pending bridge states', () => {
    expect(
      resolveBridgePendingNetworkName({
        transactionState: 'Pending',
        isOutgoing: true,
        internalNetworkName: 'SORA',
        externalNetworkName: 'Ethereum',
      })
    ).toBe('SORA');
    expect(
      resolveBridgePendingNetworkName({
        transactionState: 'Pending',
        isOutgoing: false,
        internalNetworkName: 'SORA',
        externalNetworkName: 'Ethereum',
      })
    ).toBe('Ethereum');
  });
});
