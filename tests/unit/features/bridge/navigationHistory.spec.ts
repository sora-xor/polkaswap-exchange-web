import { afterEach, describe, expect, it } from 'vitest';

import { resolveBridgeBackLocation, resolveHistoryBackLocation } from '@/features/bridge/services/navigationHistory';

const resetHistoryState = () => {
  window.history.replaceState({}, '', '/bridge/transaction');
};

describe('bridge navigation history', () => {
  afterEach(() => {
    resetHistoryState();
  });

  it('reads the browser history back location when available', () => {
    window.history.replaceState({ back: '/bridge/history' }, '', '/bridge/transaction');

    expect(resolveHistoryBackLocation()).toBe('/bridge/history');
    expect(resolveBridgeBackLocation()).toBe('/bridge/history');
  });

  it('ignores history back locations that point to the current route', () => {
    window.history.replaceState({ back: '/bridge/transaction' }, '', '/bridge/transaction');

    expect(resolveBridgeBackLocation()).toBeNull();
  });

  it('normalizes hash-history locations into app-relative paths', () => {
    window.history.replaceState({ back: '#/bridge/history' }, '', '#/bridge/transaction');

    expect(resolveBridgeBackLocation()).toBe('/bridge/history');
  });
});
