import { beforeEach, describe, expect, it } from 'vitest';
import {
  GET_TS_STORAGE_KEY,
  BUY_XOR_STORAGE_KEY,
  parseGetTsFundingPurpose,
  getTsFundingQuery,
  clearGetTsView,
  buildGetTsBridgeRoute,
  getTsSteps,
  getTsWalletsReady,
  isGetTsCheckoutRoute,
  parseGetTsSource,
  parseGetTsView,
  readGetTsView,
  resolveGetTsView,
  writeGetTsView,
} from '@/features/misc/lib/getTsFlow';

describe('Get TS view state', () => {
  beforeEach(() => sessionStorage.clear());

  it('gives existing XOR and SORA funds shorter routes, without completion flags', () => {
    expect(getTsSteps(null)).toEqual(['source']);
    expect(getTsSteps('xor')).toEqual(['source', 'wallets', 'burn']);
    expect(getTsSteps('sora')).toEqual(['source', 'wallets', 'swap', 'burn']);
    for (const source of ['card', 'ethereum', 'ton'] as const) {
      expect(getTsSteps(source)).toEqual(['source', 'wallets', 'fund', 'bridge', 'swap', 'burn']);
      expect(getTsWalletsReady(source, true, false)).toBe(false);
      expect(getTsWalletsReady(source, true, true)).toBe(true);
    }
    expect(getTsWalletsReady('xor', true, false)).toBe(true);
    expect(getTsWalletsReady('sora', true, false)).toBe(true);
    expect(getTsWalletsReady(null, true, true)).toBe(false);
    expect(getTsWalletsReady('card', false, true)).toBe(false);
  });

  it('rejects unknown versions, secrets, addresses, completion flags, and invalid source steps', () => {
    const valid = { version: 1, source: 'card', step: 'fund' };
    expect(parseGetTsView(valid)).toEqual(valid);
    for (const value of [
      null,
      [],
      'card',
      { ...valid, version: 2 },
      { ...valid, address: '0xabc' },
      { ...valid, completed: true },
      { ...valid, source: 'unsupported' },
      { ...valid, step: '/outside' },
      { ...valid, source: 'xor', step: 'bridge' },
      { ...valid, source: null },
    ]) {
      expect(parseGetTsView(value)).toBeNull();
    }
    for (const value of [['card'], 'CARD', 'card&wallet=abc', '', null]) expect(parseGetTsSource(value)).toBeNull();
    expect(parseGetTsSource('ton')).toBe('ton');
  });

  it('round-trips only the minimal state and tolerates inaccessible or corrupt storage', () => {
    const view = { version: 1, source: 'ton', step: 'bridge' } as const;
    expect(writeGetTsView(view)).toBe(true);
    expect(readGetTsView()).toEqual(view);
    expect(JSON.parse(sessionStorage.getItem(GET_TS_STORAGE_KEY)!)).toEqual(view);
    sessionStorage.setItem(GET_TS_STORAGE_KEY, '{');
    expect(readGetTsView()).toBeNull();
    sessionStorage.setItem(GET_TS_STORAGE_KEY, ' '.repeat(161));
    expect(readGetTsView()).toBeNull();
    const fail = () => {
      throw new Error('Blocked');
    };
    expect(readGetTsView({ getItem: fail, setItem: fail, removeItem: fail })).toBeNull();
    expect(writeGetTsView(view, { getItem: fail, setItem: fail, removeItem: fail })).toBe(false);
    expect(writeGetTsView({ ...view, version: 2 } as unknown as typeof view)).toBe(false);
  });

  it('dismisses view storage without affecting other session records and tolerates failure', () => {
    writeGetTsView({ version: 1, source: 'xor', step: 'burn' });
    sessionStorage.setItem('unrelated', 'keep');
    expect(clearGetTsView()).toBe(true);
    expect(readGetTsView()).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
    const fail = () => {
      throw new Error('Blocked');
    };
    expect(clearGetTsView({ getItem: fail, setItem: fail, removeItem: fail })).toBe(false);
  });

  it('resumes safe source/step queries without restoring a transaction result', () => {
    const saved = { version: 1, source: 'ton', step: 'fund' };
    expect(resolveGetTsView(undefined, 'bridge', saved)).toEqual({ version: 1, source: 'ton', step: 'bridge' });
    expect(resolveGetTsView('xor', undefined, saved)).toEqual({ version: 1, source: 'xor', step: 'source' });
    expect(resolveGetTsView('xor', 'bridge', saved)).toEqual({ version: 1, source: 'xor', step: 'source' });
    expect(resolveGetTsView(['card'], '//outside.example', null)).toEqual({ version: 1, source: null, step: 'source' });
    expect(buildGetTsBridgeRoute()).toEqual({
      path: '/bridge',
      query: { campaign: 'tonswap', getTs: '1', asset: 'DAI' },
    });
  });

  it('keeps the focused shell restricted to this checkout and explicitly tagged bridge screens', () => {
    expect(isGetTsCheckoutRoute('/get-ts', {})).toBe(true);
    for (const path of ['/bridge', '/bridge/history', '/bridge/transaction/abc'])
      expect(isGetTsCheckoutRoute(path, { campaign: 'tonswap', getTs: '1' })).toBe(true);
    for (const path of ['/swap', '/bridge-other', '/get-ts-malicious'])
      expect(isGetTsCheckoutRoute(path, { campaign: 'tonswap', getTs: '1' })).toBe(false);
    expect(isGetTsCheckoutRoute('/bridge', { getTs: '1' })).toBe(false);
    expect(isGetTsCheckoutRoute('/bridge', { campaign: 'tonswap', getTs: ['1'] })).toBe(false);
  });
  it('isolates XOR navigation and rejects burn or already-owned XOR as a generic purchase route', () => {
    const ts = { version: 1, source: 'xor', step: 'burn' } as const;
    const xor = { version: 1, source: 'ethereum', step: 'swap' } as const;
    expect(writeGetTsView(ts)).toBe(true);
    expect(writeGetTsView(xor, undefined, 'xor')).toBe(true);
    expect(readGetTsView()).toEqual(ts);
    expect(readGetTsView(undefined, 'xor')).toEqual(xor);
    expect(sessionStorage.getItem(BUY_XOR_STORAGE_KEY)).not.toBe(sessionStorage.getItem(GET_TS_STORAGE_KEY));
    expect(parseGetTsSource('xor', 'xor')).toBeNull();
    expect(parseGetTsView(ts, 'xor')).toBeNull();
    expect(writeGetTsView({ ...xor, step: 'burn' }, undefined, 'xor')).toBe(false);
    expect(getTsSteps('ethereum', 'xor')).toEqual(['source', 'wallets', 'fund', 'bridge', 'swap']);
    expect(getTsSteps('xor', 'xor')).toEqual(['source']);
    expect(resolveGetTsView('xor', 'wallets', xor, 'xor')).toEqual({ version: 1, source: null, step: 'source' });
    expect(resolveGetTsView('ethereum', 'burn', null, 'xor').step).toBe('source');
    clearGetTsView(undefined, 'xor');
    expect(readGetTsView(undefined, 'xor')).toBeNull();
    expect(readGetTsView()).toEqual(ts);
  });
  it('builds unambiguous generic bridge hints without campaign parameters', () => {
    expect(buildGetTsBridgeRoute('xor')).toEqual({ path: '/bridge', query: { buyXor: '1', asset: 'DAI' } });
    expect(getTsFundingQuery('xor')).toEqual({ buyXor: '1' });
    expect(parseGetTsFundingPurpose({ buyXor: '1' })).toBe('xor');
    expect(parseGetTsFundingPurpose({ campaign: 'tonswap', getTs: '1' })).toBe('ts');
    for (const query of [
      { buyXor: ['1'] },
      { buyXor: 'true' },
      { buyXor: '1', campaign: 'tonswap' },
      { buyXor: '1', getTs: '1' },
    ])
      expect(parseGetTsFundingPurpose(query)).toBeNull();
    expect(isGetTsCheckoutRoute('/buy-xor', {})).toBe(true);
    expect(isGetTsCheckoutRoute('/bridge/history', { buyXor: '1' })).toBe(true);
    expect(isGetTsCheckoutRoute('/bridge/history', { buyXor: ['1'] })).toBe(false);
  });
});
