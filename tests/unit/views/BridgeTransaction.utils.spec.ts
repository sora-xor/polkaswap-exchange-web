import { describe, expect, it } from 'vitest';

import {
  buildBridgeAddressAriaLabel,
  ETH_BRIDGE_APPROVAL_ALLOWANCE_MS,
  formatBridgeCountdown,
  getEthBridgeApprovalDelayProgress,
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

  describe('getEthBridgeApprovalDelayProgress', () => {
    const delayMs = 120_000;
    const totalMs = delayMs + ETH_BRIDGE_APPROVAL_ALLOWANCE_MS;

    it('counts SORA blocks since registration against the delay plus the allowance', () => {
      expect(getEthBridgeApprovalDelayProgress({ delayMs, submissionHeight: 100, currentBlockNumber: 100 })).toEqual({
        percent: 0,
        remainingMs: totalMs,
      });
      expect(getEthBridgeApprovalDelayProgress({ delayMs, submissionHeight: 100, currentBlockNumber: 110 })).toEqual({
        percent: 40,
        remainingMs: totalMs - 60_000,
      });
    });

    it('stops at 100% with nothing remaining once the estimate has passed', () => {
      expect(getEthBridgeApprovalDelayProgress({ delayMs, submissionHeight: 100, currentBlockNumber: 125 })).toEqual({
        percent: 100,
        remainingMs: 0,
      });
      expect(getEthBridgeApprovalDelayProgress({ delayMs, submissionHeight: 100, currentBlockNumber: 5_000 })).toEqual({
        percent: 100,
        remainingMs: 0,
      });
    });

    it('treats a live block behind the registration height as no progress', () => {
      expect(getEthBridgeApprovalDelayProgress({ delayMs, submissionHeight: 100, currentBlockNumber: 90 })).toEqual({
        percent: 0,
        remainingMs: totalMs,
      });
    });

    it('honours custom block time and allowance', () => {
      expect(
        getEthBridgeApprovalDelayProgress({
          delayMs: 60_000,
          submissionHeight: 10,
          currentBlockNumber: 13,
          blockTimeMs: 10_000,
          allowanceMs: 0,
        })
      ).toEqual({ percent: 50, remainingMs: 30_000 });
    });

    it('returns null without a delay, a registration height or a live block', () => {
      expect(
        getEthBridgeApprovalDelayProgress({ delayMs: 0, submissionHeight: 100, currentBlockNumber: 110 })
      ).toBeNull();
      expect(getEthBridgeApprovalDelayProgress({ delayMs, submissionHeight: 0, currentBlockNumber: 110 })).toBeNull();
      expect(getEthBridgeApprovalDelayProgress({ delayMs, submissionHeight: 100, currentBlockNumber: 0 })).toBeNull();
      expect(
        getEthBridgeApprovalDelayProgress({ delayMs: Number.NaN, submissionHeight: 100, currentBlockNumber: 110 })
      ).toBeNull();
    });
  });

  describe('formatBridgeCountdown', () => {
    it('formats minutes and zero-padded seconds, rounding up', () => {
      expect(formatBridgeCountdown(150_000)).toBe('2:30');
      expect(formatBridgeCountdown(59_001)).toBe('1:00');
      expect(formatBridgeCountdown(5_000)).toBe('0:05');
      expect(formatBridgeCountdown(1)).toBe('0:01');
    });

    it('never goes below 0:00', () => {
      expect(formatBridgeCountdown(0)).toBe('0:00');
      expect(formatBridgeCountdown(-3_000)).toBe('0:00');
      expect(formatBridgeCountdown(Number.NaN)).toBe('0:00');
    });
  });
});
