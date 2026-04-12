import { describe, expect, it } from 'vitest';

import {
  canAutoStartPreviewServer,
  resolvePreviewServerConfig,
} from '../../../../scripts/playwright/preview-server-helper.mjs';

describe('playwright smoke preview server helper', () => {
  it('auto-starts only for loopback http origins', () => {
    expect(canAutoStartPreviewServer('http://127.0.0.1:8896')).toBe(true);
    expect(canAutoStartPreviewServer('http://localhost:4173')).toBe(true);
    expect(canAutoStartPreviewServer('https://polkaswap.io')).toBe(false);
  });

  it('derives preview host, port, prefix, and health URL from the effective app base URL', () => {
    expect(resolvePreviewServerConfig('http://127.0.0.1:8896/ipfs/polkaswap-e2e/')).toEqual({
      host: '127.0.0.1',
      port: '8896',
      prefix: '/ipfs/polkaswap-e2e/',
      healthUrl: 'http://127.0.0.1:8896/healthz',
    });
  });

  it('supports root-prefix preview runs', () => {
    expect(resolvePreviewServerConfig('http://127.0.0.1:43123/')).toEqual({
      host: '127.0.0.1',
      port: '43123',
      prefix: '/',
      healthUrl: 'http://127.0.0.1:43123/healthz',
    });
  });
});
