import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reconciliationMocks = vi.hoisted(() => ({
  getTransactionDetails: vi.fn(),
  prepareNetworkParam: vi.fn((network) => `prepared:${network}`),
  transactions: vi.fn(),
}));

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: {
    api: {
      query: {
        bridgeProxy: {
          transactions: reconciliationMocks.transactions,
        },
      },
    },
    getTransactionDetails: reconciliationMocks.getTransactionDetails,
    prepareNetworkParam: reconciliationMocks.prepareNetworkParam,
  },
}));

import {
  getSubBridgeFailureCode,
  isDisplayOnlyRecoveredSubBridgeHistory,
  isSubBridgeTerminalFailureStatus,
  reconcileSubBridgeRequest,
  SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
  SubBridgeAuthoritativeStatus,
  SubBridgeReconciliationErrorCode,
} from '@/utils/bridge/sub/reconciliation';

const none = { isSome: false };
const some = (status: Record<string, unknown>) => ({
  isSome: true,
  unwrap: () => ({ status }),
});

describe('Sub bridge request reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconciliationMocks.getTransactionDetails.mockResolvedValue(null);
    reconciliationMocks.transactions.mockResolvedValue(none);
  });

  it('uses direct formatted storage details for a completed request', async () => {
    const transaction = { status: BridgeTxStatus.Done, endBlock: 77 };
    reconciliationMocks.getTransactionDetails.mockResolvedValue(transaction);

    await expect(reconcileSubBridgeRequest('sora-account', 'Liberland' as never, '0xrequest')).resolves.toEqual({
      status: SubBridgeAuthoritativeStatus.Done,
      transaction,
      endBlock: 77,
    });
    expect(reconciliationMocks.transactions).toHaveBeenCalledWith(['prepared:Liberland', 'sora-account'], '0xrequest');
  });

  it('preserves raw Refunded when the SDK collapses it into Failed', async () => {
    const transaction = { status: BridgeTxStatus.Failed, endBlock: 78 };
    reconciliationMocks.getTransactionDetails.mockResolvedValue(transaction);
    reconciliationMocks.transactions.mockResolvedValue(some({ isRefunded: true, type: 'Refunded' }));

    await expect(reconcileSubBridgeRequest('sora-account', 'Liberland' as never, '0xrequest')).resolves.toEqual({
      status: SubBridgeAuthoritativeStatus.Refunded,
      transaction,
      endBlock: 78,
    });
  });

  it('classifies a raw request even when formatted SDK data is unavailable', async () => {
    reconciliationMocks.transactions.mockResolvedValue({
      isSome: true,
      unwrap: () => ({
        status: { isCommitted: true, type: 'Committed' },
        endTimepoint: { isSora: true, asSora: { toNumber: () => 79 } },
      }),
    });

    await expect(reconcileSubBridgeRequest('sora-account', 'Liberland' as never, '0xrequest')).resolves.toEqual({
      status: SubBridgeAuthoritativeStatus.Done,
      transaction: null,
      endBlock: 79,
    });
  });

  it('returns null when neither formatted nor raw storage contains the request', async () => {
    await expect(reconcileSubBridgeRequest('sora-account', 'Liberland' as never, '0xmissing')).resolves.toBeNull();
  });

  it('provides distinct translatable codes for Failed and Refunded', () => {
    expect(isSubBridgeTerminalFailureStatus(SubBridgeAuthoritativeStatus.Failed)).toBe(true);
    expect(isSubBridgeTerminalFailureStatus(SubBridgeAuthoritativeStatus.Refunded)).toBe(true);
    expect(isSubBridgeTerminalFailureStatus(SubBridgeAuthoritativeStatus.Done)).toBe(false);
    expect(getSubBridgeFailureCode(SubBridgeAuthoritativeStatus.Failed)).toBe(SubBridgeReconciliationErrorCode.Failed);
    expect(getSubBridgeFailureCode(SubBridgeAuthoritativeStatus.Refunded)).toBe(
      SubBridgeReconciliationErrorCode.Refunded
    );
  });

  it('does not normalize a pending or malformed zero end block as completed', async () => {
    const transaction = { status: BridgeTxStatus.Done, endBlock: 0 };
    reconciliationMocks.getTransactionDetails.mockResolvedValue(transaction);

    await expect(reconcileSubBridgeRequest('sora-account', 'Liberland' as never, '0xrequest')).resolves.toEqual({
      status: SubBridgeAuthoritativeStatus.Done,
      transaction,
      endBlock: null,
    });
  });

  it('recognizes only the exact display-only recovery marker on Liberland incoming history', () => {
    const history = {
      type: Operation.SubstrateIncoming,
      externalNetworkType: BridgeNetworkType.Sub,
      externalNetwork: SubNetworkId.Liberland,
      payload: { subBridgeHistoryRecovery: SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY },
    };

    expect(Object.isFrozen(SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY)).toBe(true);
    expect(isDisplayOnlyRecoveredSubBridgeHistory(history)).toBe(true);

    for (const patch of [
      { version: 2 },
      { source: 'other' },
      { mode: 'retryable' },
      { settlementVerified: false },
      { extra: true },
    ]) {
      expect(
        isDisplayOnlyRecoveredSubBridgeHistory({
          ...history,
          payload: {
            subBridgeHistoryRecovery: {
              ...SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
              ...patch,
            },
          },
        })
      ).toBe(false);
    }

    expect(isDisplayOnlyRecoveredSubBridgeHistory({ ...history, type: Operation.SubstrateOutgoing })).toBe(false);
    expect(isDisplayOnlyRecoveredSubBridgeHistory({ ...history, externalNetworkType: BridgeNetworkType.Eth })).toBe(
      false
    );
    expect(isDisplayOnlyRecoveredSubBridgeHistory({ ...history, externalNetwork: SubNetworkId.Kusama })).toBe(false);
    expect(isDisplayOnlyRecoveredSubBridgeHistory({ ...history, payload: {} })).toBe(false);
  });
});
