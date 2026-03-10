import { describe, expect, it } from 'vitest';

import { isLocalWsUrl, secureWsRegexp, wsRegexp } from '@/utils/regexp';

describe('node websocket regexp helpers', () => {
  it('detects ws and wss protocols', () => {
    expect(wsRegexp.test('wss://ws.sora.org')).toBe(true);
    expect(wsRegexp.test('ws://localhost:9944')).toBe(true);
    expect(wsRegexp.test('https://example.com')).toBe(false);
  });

  it('detects secure websocket protocol', () => {
    expect(secureWsRegexp.test('wss://ws.sora.org')).toBe(true);
    expect(secureWsRegexp.test('ws://localhost:9944')).toBe(false);
  });

  it('allows insecure ws only for localhost hosts', () => {
    expect(isLocalWsUrl('ws://localhost:9944')).toBe(true);
    expect(isLocalWsUrl('ws://127.0.0.1:9944')).toBe(true);
    expect(isLocalWsUrl('ws://0.0.0.0:9944')).toBe(true);
    expect(isLocalWsUrl('ws://example.com:9944')).toBe(false);
    expect(isLocalWsUrl('wss://localhost:9944')).toBe(false);
  });
});
