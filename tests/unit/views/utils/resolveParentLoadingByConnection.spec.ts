import { describe, expect, it } from 'vitest';

import { resolveParentLoadingByConnection } from '@/views/utils/resolveParentLoadingByConnection';

describe('resolveParentLoadingByConnection', () => {
  it('returns true when transaction loading is active', () => {
    expect(
      resolveParentLoadingByConnection({
        transactionLoading: true,
        nodeConnected: true,
        nodeGateExpired: true,
        hasNodeConfiguration: true,
      })
    ).toBe(true);
  });

  it('does not keep route loading forever when bootstrap is stalled and gate expired', () => {
    expect(
      resolveParentLoadingByConnection({
        transactionLoading: true,
        nodeConnected: false,
        nodeGateExpired: true,
        hasNodeConfiguration: true,
      })
    ).toBe(false);
  });

  it('keeps loading during initial node bootstrap gate', () => {
    expect(
      resolveParentLoadingByConnection({
        transactionLoading: false,
        nodeConnected: false,
        nodeGateExpired: false,
        hasNodeConfiguration: true,
      })
    ).toBe(true);
  });

  it('stops global loading after gate timeout when node remains disconnected', () => {
    expect(
      resolveParentLoadingByConnection({
        transactionLoading: false,
        nodeConnected: false,
        nodeGateExpired: true,
        hasNodeConfiguration: true,
      })
    ).toBe(false);
  });

  it('does not block loading when no node configuration exists', () => {
    expect(
      resolveParentLoadingByConnection({
        transactionLoading: false,
        nodeConnected: false,
        nodeGateExpired: false,
        hasNodeConfiguration: false,
      })
    ).toBe(false);
  });
});
