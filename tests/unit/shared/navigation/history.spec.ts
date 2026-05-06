import { describe, expect, it, vi } from 'vitest';

import { hasHistoryBackPrefix, resolveHistoryBackLocation } from '@/shared/navigation/history';

describe('shared navigation history', () => {
  it('reads the browser history back location', () => {
    const originalState = window.history.state;
    vi.stubGlobal('history', {
      ...window.history,
      state: { back: '/swap/XOR-ETH' },
    });

    expect(resolveHistoryBackLocation()).toBe('/swap/XOR-ETH');

    vi.stubGlobal('history', window.history);
    Object.defineProperty(window.history, 'state', { value: originalState, configurable: true });
  });

  it('returns null when the browser history state does not expose a string back location', () => {
    const originalState = window.history.state;
    vi.stubGlobal('history', {
      ...window.history,
      state: { back: 123 },
    });

    expect(resolveHistoryBackLocation()).toBeNull();

    vi.stubGlobal('history', window.history);
    Object.defineProperty(window.history, 'state', { value: originalState, configurable: true });
  });

  it('matches normalized back locations by route prefix', () => {
    expect(hasHistoryBackPrefix('/swap', 'http://localhost:3000/#/swap/XOR-ETH')).toBe(true);
    expect(hasHistoryBackPrefix('/swap', 'swap/XOR-ETH')).toBe(true);
    expect(hasHistoryBackPrefix('/swap', '   ')).toBe(false);
    expect(hasHistoryBackPrefix('/swap', '/trade/XOR-ETH')).toBe(false);
  });
});
