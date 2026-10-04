import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'polkaswap-bots-runs-v1';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});
afterEach(() => vi.restoreAllMocks());

describe('top-bar bot runs hint', () => {
  it('reads the saved hint once at startup', async () => {
    localStorage.setItem(KEY, '1');
    const { botRunsHint } = await import('@/features/bot-trading/run-hint');
    expect(botRunsHint.value).toBe(true);
  });

  it('stores only a flag and clears it when no bot needs showing', async () => {
    const { botRunsHint, setBotRunsHint } = await import('@/features/bot-trading/run-hint');
    expect(botRunsHint.value).toBe(false);
    setBotRunsHint(true);
    expect(botRunsHint.value).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('1');
    setBotRunsHint(false);
    expect(botRunsHint.value).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('follows another tab through the storage event', async () => {
    const { botRunsHint } = await import('@/features/bot-trading/run-hint');
    localStorage.setItem(KEY, '1');
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(botRunsHint.value).toBe(true);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(botRunsHint.value).toBe(false);
  });

  it('still updates this tab when storage is refused', async () => {
    const { botRunsHint, setBotRunsHint } = await import('@/features/bot-trading/run-hint');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setBotRunsHint(true)).not.toThrow();
    expect(botRunsHint.value).toBe(true);
  });
});
