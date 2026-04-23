import { describe, expect, it, vi } from 'vitest';

import { getAccountLabel, getAccountTooltip } from '@/components/App/Header/accountButton.utils';

describe('accountButton.utils', () => {
  const t = (key: string) => `t:${key}`;

  it('returns the tooltip text for connected and disconnected states', () => {
    expect(getAccountTooltip(true, t)).toBe('t:connectedAccount');
    expect(getAccountTooltip(false, t)).toBe('t:connectWalletTextTooltip');
  });

  it('returns the connect label when the account is not usable', () => {
    expect(getAccountLabel(false, { name: 'Alice', address: 'addr' } as any, t, vi.fn())).toBe('t:connectWalletText');
    expect(getAccountLabel(true, undefined, t, vi.fn())).toBe('t:connectWalletText');
  });

  it('prefers account names and falls back to formatted addresses', () => {
    const formatAddress = vi.fn((address: string, symbols: number) => `${address}:${symbols}`);

    expect(getAccountLabel(true, { name: 'Alice', address: 'addr-a' } as any, t, formatAddress)).toBe('Alice');
    expect(formatAddress).not.toHaveBeenCalled();

    expect(getAccountLabel(true, { name: '', address: 'addr-b' } as any, t, formatAddress)).toBe('addr-b:8');
    expect(formatAddress).toHaveBeenCalledWith('addr-b', 8);
  });
});
