import { describe, expect, it } from 'vitest';

import { ensureHttps, ensureIpfsHashRoute, ensureTrailingSlash, shouldForceHttps } from '@/redirect';

type MockLocation = {
  protocol: string;
  hostname: string;
  pathname: string;
  hash: string;
};

function createLocation(overrides: Partial<MockLocation> = {}): MockLocation {
  return {
    protocol: 'http:',
    hostname: 'example.com',
    pathname: '/ipfs/QmHash/index.html',
    hash: '',
    ...overrides,
  };
}

describe('redirect helpers', () => {
  it('forces HTTPS for non-local HTTP origins', () => {
    const location = createLocation();

    expect(shouldForceHttps(location)).toBe(true);

    ensureHttps(location);
    expect(location.protocol).toBe('https:');
  });

  it('keeps HTTP for localhost and private gateways', () => {
    const localhost = createLocation({ hostname: 'localhost' });
    const loopback = createLocation({ hostname: '127.0.0.1' });
    const privateNet = createLocation({ hostname: '192.168.1.5' });

    for (const location of [localhost, loopback, privateNet]) {
      expect(shouldForceHttps(location)).toBe(false);
      ensureHttps(location);
      expect(location.protocol).toBe('http:');
    }
  });

  it('does not change paths that already end with a slash', () => {
    const location = createLocation({ pathname: '/ipfs/QmHash/' });

    ensureTrailingSlash(location);
    expect(location.pathname).toBe('/ipfs/QmHash/');
  });

  it('preserves index documents under IPFS-style paths', () => {
    const location = createLocation({ pathname: '/ipfs/QmHash/index.html' });

    ensureTrailingSlash(location);
    expect(location.pathname).toBe('/ipfs/QmHash/index.html');
  });

  it('normalises non-IPFS index documents to their directory root', () => {
    const location = createLocation({ pathname: '/app/index.html' });

    ensureTrailingSlash(location);
    expect(location.pathname).toBe('/app/');
  });

  it('appends trailing slashes to CID directory paths', () => {
    const location = createLocation({ pathname: '/ipfs/QmHash' });

    ensureTrailingSlash(location);
    expect(location.pathname).toBe('/ipfs/QmHash/');
  });

  it('rewrites deep IPFS paths to hash-based routes', () => {
    const location = createLocation({ pathname: '/ipfs/QmHash/swap/XOR/DAI' });

    ensureIpfsHashRoute(location);

    expect(location.pathname).toBe('/ipfs/QmHash/');
    expect(location.hash).toBe('#/swap/XOR/DAI');
  });

  it('does not override an existing hash while normalizing deep IPFS paths', () => {
    const location = createLocation({
      pathname: '/ipfs/QmHash/swap/XOR/DAI',
      hash: '#/bridge',
    });

    ensureIpfsHashRoute(location);

    expect(location.pathname).toBe('/ipfs/QmHash/');
    expect(location.hash).toBe('#/bridge');
  });

  it('keeps explicit IPFS index documents unchanged', () => {
    const location = createLocation({ pathname: '/ipfs/QmHash/index.html' });

    ensureIpfsHashRoute(location);

    expect(location.pathname).toBe('/ipfs/QmHash/index.html');
    expect(location.hash).toBe('');
  });
});
