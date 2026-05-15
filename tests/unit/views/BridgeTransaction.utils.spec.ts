import { describe, expect, it } from 'vitest';

import {
  buildBridgeAddressAriaLabel,
  isBridgeWaitingForSoraConfirmation,
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

  it('identifies legacy ETH bridge states that still wait on SORA confirmation', () => {
    expect(isBridgeWaitingForSoraConfirmation(ETH_BRIDGE_STATES.SORA_SUBMITTED)).toBe(true);
    expect(isBridgeWaitingForSoraConfirmation(ETH_BRIDGE_STATES.SORA_PENDING)).toBe(true);
    expect(isBridgeWaitingForSoraConfirmation(ETH_BRIDGE_STATES.EVM_PENDING)).toBe(false);
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
