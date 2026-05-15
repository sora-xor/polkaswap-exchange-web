import { describe, expect, it } from 'vitest';

import { buildBridgeAddressAriaLabel } from '@/features/bridge/pages/bridgeTransactionPage.utils';

describe('bridgeTransactionPage.utils', () => {
  it('builds bridge address labels with explicit direction and network context', () => {
    expect(buildBridgeAddressAriaLabel('From', 'SORA Account address')).toBe('From: SORA Account address');
    expect(buildBridgeAddressAriaLabel(' To ', ' Ethereum Account address ')).toBe('To: Ethereum Account address');
  });

  it('omits empty address label parts', () => {
    expect(buildBridgeAddressAriaLabel('', 'SORA Account address')).toBe('SORA Account address');
    expect(buildBridgeAddressAriaLabel('From', '')).toBe('From');
  });
});
