import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TONSWAP_INTENT_MAX_AGE_MS,
  TONSWAP_INTENT_STORAGE_KEY,
  buildTonswapFundingRoute,
  buildTonswapReturnRoute,
  clearTonswapIntent,
  createTonswapIntent,
  isTonswapIntentAmount,
  parseTonswapIntent,
  readTonswapIntent,
  writeTonswapIntent,
} from '@/features/misc/lib/tonswapOnboarding';

const now = 1_790_000_000_000;

describe('Tonswap onboarding intent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it('preserves exact positive XOR strings and rejects invalid or excessive precision', () => {
    expect(isTonswapIntentAmount('0.000000000000000001')).toBe(true);
    expect(isTonswapIntentAmount('123456789123456789.123456789123456789')).toBe(true);
    for (const value of ['0', '0.000', '-1', '1e3', '01', ' 2 ', '0.0000000000000000001', '9'.repeat(98), 1]) {
      expect(isTonswapIntentAmount(value)).toBe(false);
    }
  });

  it('creates optional-amount intent without account or private data', () => {
    expect(createTonswapIntent('newWallet')).toEqual({
      version: 1,
      campaign: 'tonswap',
      startingPoint: 'newWallet',
      returnPath: '/burn',
      savedAt: now,
    });
    expect(createTonswapIntent('xor', '0.000000000000000001')?.amount).toBe('0.000000000000000001');
    expect(createTonswapIntent('xor', 'NaN')).toBeNull();
  });

  it('rejects foreign campaigns, arbitrary redirects, unknown fields and stale or future dates', () => {
    const valid = createTonswapIntent('sora', '1')!;
    const invalidRecords = [
      null,
      [],
      'not an object',
      { ...valid, version: 2 },
      { ...valid, campaign: 'solswap' },
      { ...valid, startingPoint: 'ton' },
      { ...valid, returnPath: '//outside.example' },
      { ...valid, returnPath: '/wallet' },
      { ...valid, address: 'private-user-data' },
      { ...valid, savedAt: now + 1 },
      { ...valid, savedAt: now - TONSWAP_INTENT_MAX_AGE_MS - 1 },
      { ...valid, savedAt: Number.NaN },
      { ...valid, savedAt: -1 },
      { ...valid, amount: '0' },
    ];
    for (const record of invalidRecords) expect(parseTonswapIntent(record)).toBeNull();
    expect(parseTonswapIntent(valid, Number.NaN)).toBeNull();
    expect(parseTonswapIntent({ ...valid, savedAt: now - TONSWAP_INTENT_MAX_AGE_MS })).not.toBeNull();
  });

  it('round-trips in session storage and clears only its own entry', () => {
    const intent = createTonswapIntent('exchange', '2.500')!;
    sessionStorage.setItem('unrelated', 'preserve');
    expect(writeTonswapIntent(intent)).toBe(true);
    expect(readTonswapIntent()).toEqual(intent);
    clearTonswapIntent();
    expect(readTonswapIntent()).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('preserve');
  });

  it('tolerates blocked storage and rejects malformed or oversized serialized records', () => {
    const fail = () => {
      throw new Error('Storage blocked');
    };
    const storage = { getItem: fail, setItem: fail, removeItem: fail };
    expect(readTonswapIntent(storage)).toBeNull();
    expect(writeTonswapIntent(createTonswapIntent('sora')!, storage)).toBe(false);
    expect(() => clearTonswapIntent(storage)).not.toThrow();
    sessionStorage.setItem(TONSWAP_INTENT_STORAGE_KEY, '{malformed');
    expect(readTonswapIntent()).toBeNull();
    sessionStorage.setItem(TONSWAP_INTENT_STORAGE_KEY, ' '.repeat(513));
    expect(readTonswapIntent()).toBeNull();
    const intent = createTonswapIntent('xor')!;
    expect(writeTonswapIntent({ ...intent, returnPath: '//evil.example' } as typeof intent)).toBe(false);
    const getter = vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(fail);
    expect(readTonswapIntent()).toBeNull();
    expect(writeTonswapIntent(intent)).toBe(false);
    expect(() => clearTonswapIntent()).not.toThrow();
    getter.mockRestore();
  });

  it('builds only existing internal funding routes and fixes the return route', () => {
    expect(buildTonswapReturnRoute()).toEqual({ path: '/burn', query: { campaign: 'tonswap' } });
    expect(buildTonswapFundingRoute('xor')).toEqual(buildTonswapReturnRoute());
    expect(buildTonswapFundingRoute('sora')).toEqual({
      path: '/swap',
      query: { campaign: 'tonswap', acquire: 'XOR' },
    });
    expect(buildTonswapFundingRoute('exchange')).toEqual({
      path: '/deposit/transfer-from-cex',
      query: { campaign: 'tonswap' },
    });
    expect(buildTonswapFundingRoute('newWallet')).toEqual({ path: '/deposit', query: { campaign: 'tonswap' } });
  });
});
