import { describe, expect, it } from 'vitest';

import { resolveAppBaseUrl, resolveRouteUrl } from '../../../../scripts/playwright/url-helpers.mjs';

describe('playwright smoke URL helpers', () => {
  it('defaults root base URLs to the IPFS preview prefix', () => {
    expect(resolveAppBaseUrl('http://127.0.0.1:41733')).toBe('http://127.0.0.1:41733/ipfs/polkaswap-e2e/');
    expect(resolveRouteUrl('http://127.0.0.1:41733', '#/swap')).toBe(
      'http://127.0.0.1:41733/ipfs/polkaswap-e2e/#/swap'
    );
  });

  it('supports root-prefix preview runs through an explicit empty prefix override', () => {
    expect(resolveAppBaseUrl('http://127.0.0.1:41733', '')).toBe('http://127.0.0.1:41733/');
    expect(resolveRouteUrl('http://127.0.0.1:41733', '#/bridge', '')).toBe('http://127.0.0.1:41733/#/bridge');
  });

  it('preserves an explicit path already present in the base URL', () => {
    expect(resolveAppBaseUrl('http://127.0.0.1:41733/custom-prefix')).toBe('http://127.0.0.1:41733/custom-prefix/');
    expect(resolveRouteUrl('http://127.0.0.1:41733/custom-prefix', '#/wallet')).toBe(
      'http://127.0.0.1:41733/custom-prefix/#/wallet'
    );
  });
});
