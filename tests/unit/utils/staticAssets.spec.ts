import { afterEach, describe, expect, it } from 'vitest';

import {
  ensureRelativeAssetPath,
  getEnvConfigCandidates,
  getEnvConfigFilename,
  resolveStaticAssetUrl,
} from '@/utils/staticAssets';

describe('getEnvConfigFilename', () => {
  it('returns dev env file when override is true', () => {
    expect(getEnvConfigFilename(true)).toBe('env.dev.json');
  });

  it('returns prod env file by default', () => {
    expect(getEnvConfigFilename(false)).toBe('env.json');
  });
});

describe('getEnvConfigCandidates', () => {
  it('returns dev and prod candidates in dev mode', () => {
    expect(getEnvConfigCandidates(true)).toEqual(['env.dev.json', 'env.json']);
  });

  it('returns only prod candidate in non-dev mode', () => {
    expect(getEnvConfigCandidates(false)).toEqual(['env.json']);
  });
});

describe('ensureRelativeAssetPath', () => {
  it('returns the same path when it is already relative', () => {
    expect(ensureRelativeAssetPath('env.json')).toBe('env.json');
  });

  it('drops a single leading slash for relative assets', () => {
    expect(ensureRelativeAssetPath('/marketing.json')).toBe('marketing.json');
  });

  it('drops multiple leading slashes for relative assets', () => {
    expect(ensureRelativeAssetPath('///nested/config.json')).toBe('nested/config.json');
  });

  it('keeps absolute URLs unchanged', () => {
    expect(ensureRelativeAssetPath('https://cdn.example.com/env.json')).toBe('https://cdn.example.com/env.json');
    expect(ensureRelativeAssetPath('//cdn.example.com/env.json')).toBe('//cdn.example.com/env.json');
    expect(ensureRelativeAssetPath('ipfs://bafy-test/env.json')).toBe('ipfs://bafy-test/env.json');
  });

  it('throws when an empty asset path is provided', () => {
    expect(() => ensureRelativeAssetPath('')).toThrowError('Static asset path is required');
  });
});

describe('resolveStaticAssetUrl', () => {
  const originalWindow = (global as any).window;

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it('resolves to an absolute URL when window is available', () => {
    (global as any).window = {
      location: { href: 'https://example.com/app/index.html#/swap' },
    } as Window;
    expect(resolveStaticAssetUrl('env.json')).toBe('https://example.com/app/env.json');
  });

  it('falls back to the relative path when window.location is unavailable', () => {
    (global as any).window = {};
    expect(resolveStaticAssetUrl('env.json')).toBe('env.json');
  });

  it('falls back to the relative path when location href is missing or malformed', () => {
    (global as any).window = {
      location: { href: '' },
    } as Window;
    expect(resolveStaticAssetUrl('env.json')).toBe('env.json');

    (global as any).window = {
      location: { href: 'not a valid absolute URL' },
    } as Window;
    expect(resolveStaticAssetUrl('env.json')).toBe('env.json');
  });

  it('keeps asset URLs scoped under IPFS gateway paths', () => {
    (global as any).window = {
      location: { href: 'http://127.0.0.1:8080/ipfs/QmHash/index.html' },
    } as Window;

    expect(resolveStaticAssetUrl('marketing/banner.png')).toBe(
      'http://127.0.0.1:8080/ipfs/QmHash/marketing/banner.png'
    );
  });

  it('strips leading slashes before resolving asset URLs', () => {
    const stubWindow = Object.create(originalWindow || {}) as Window;
    Object.defineProperty(stubWindow, 'location', {
      configurable: true,
      value: { href: 'https://example.org/ipfs/cid/?foo=bar#/swap' } as Location,
    });
    (global as any).window = stubWindow;
    expect(resolveStaticAssetUrl('/env.json')).toBe('https://example.org/ipfs/cid/env.json');
  });

  it('handles IPFS gateway URLs without trailing slashes', () => {
    (global as any).window = {
      location: { href: 'http://127.0.0.1:8080/ipfs/QmHash' },
    } as Window;

    expect(resolveStaticAssetUrl('env.json')).toBe('http://127.0.0.1:8080/ipfs/QmHash/env.json');
  });

  it('keeps static assets rooted at the IPFS scope for deep links', () => {
    (global as any).window = {
      location: { href: 'https://example.org/ipfs/QmHash/swap' },
    } as Window;

    expect(resolveStaticAssetUrl('env.json')).toBe('https://example.org/ipfs/QmHash/env.json');
  });

  it('keeps static assets rooted at the IPNS scope for deep links', () => {
    (global as any).window = {
      location: { href: 'https://example.org/ipns/polkaswap.example/wallet' },
    } as Window;

    expect(resolveStaticAssetUrl('env.json')).toBe('https://example.org/ipns/polkaswap.example/env.json');
  });

  it('keeps static assets beside index.htm documents', () => {
    (global as any).window = {
      location: { href: 'https://example.org/app/index.htm#/wallet' },
    } as Window;

    expect(resolveStaticAssetUrl('env.json')).toBe('https://example.org/app/env.json');
  });

  it('keeps static assets rooted at the SoraFS CID scope for deep links', () => {
    (global as any).window = {
      location: { href: 'https://example.org/sorafs/cid/bafytestcid/#/swap' },
    } as Window;

    expect(resolveStaticAssetUrl('env.json')).toBe('https://example.org/sorafs/cid/bafytestcid/env.json');
    expect(resolveStaticAssetUrl('marketing.json')).toBe('https://example.org/sorafs/cid/bafytestcid/marketing.json');
  });

  it('does not scope static assets to non-IPFS route paths', () => {
    (global as any).window = {
      location: { href: 'https://example.org/swap' },
    } as Window;

    expect(resolveStaticAssetUrl('env.dev.json')).toBe('https://example.org/env.dev.json');
  });

  it('normalizes bare origins without trailing slashes', () => {
    (global as any).window = {
      location: { href: 'https://example.org' },
    } as Window;

    expect(resolveStaticAssetUrl('env.json')).toBe('https://example.org/env.json');
  });
});
