import { describe, expect, it } from 'vitest';

import { buildInitialBridgeState, normalizeBridgeHistoryPage } from '@/stores/bridge/state';

describe('bridge store state helpers', () => {
  it('normalizes bridge history pages to positive integers', () => {
    expect(normalizeBridgeHistoryPage()).toBe(1);
    expect(normalizeBridgeHistoryPage(0)).toBe(1);
    expect(normalizeBridgeHistoryPage(-5)).toBe(1);
    expect(normalizeBridgeHistoryPage(Number.NaN)).toBe(1);
    expect(normalizeBridgeHistoryPage(3.9)).toBe(3);
  });

  it('builds a fresh bridge state object for each store instance', () => {
    const first = buildInitialBridgeState();
    const second = buildInitialBridgeState();

    expect(first).not.toBe(second);
    expect(first.connector).not.toBe(second.connector);
    expect(first.form).toEqual({
      isSoraToEvm: true,
      assetAddress: '',
      amountSend: '',
      amountReceived: '',
      focusedField: null,
    });
    expect(first.history.page).toBe(1);
    expect(first.flags.isSignTxDialogVisible).toBe(false);
  });
});
