import { describe, expect, it } from 'vitest';

import { ensureRelativeAssetPath, getEnvConfigFilename, resolveStaticAssetUrl } from '@/utils/staticAssets';

describe('getEnvConfigFilename', () => {
  it('returns dev env file when override is true', () => {
    expect(getEnvConfigFilename(true)).toBe('env.dev.json');
  });

  it('returns prod env file by default', () => {
    expect(getEnvConfigFilename(false)).toBe('env.json');
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
  });

  it('throws when an empty asset path is provided', () => {
    expect(() => ensureRelativeAssetPath('')).toThrowError('Static asset path is required');
  });

  it('resolves to an absolute URL when window is available', () => {
    const originalWindow = (global as any).window;
    (global as any).window = {
      location: { href: 'https://example.com/app/index.html#/swap' },
    } as Window;

    expect(resolveStaticAssetUrl('env.json')).toBe('https://example.com/app/env.json');

    (global as any).window = originalWindow;
  });

  it('falls back to the relative path when window.location is unavailable', () => {
    const originalWindow = (global as any).window;
    (global as any).window = {};
    expect(resolveStaticAssetUrl('env.json')).toBe('env.json');
    (global as any).window = originalWindow;
  });

  it('keeps asset URLs scoped under IPFS gateway paths', () => {
    const originalWindow = (global as any).window;
    (global as any).window = {
      location: { href: 'http://127.0.0.1:8080/ipfs/QmHash/index.html' },
    } as Window;

    expect(resolveStaticAssetUrl('marketing/banner.png')).toBe(
      'http://127.0.0.1:8080/ipfs/QmHash/marketing/banner.png'
    );

    (global as any).window = originalWindow;
  });

  it('strips leading slashes before resolving asset URLs', () => {
    const originalWindow = (global as any).window as Window;
    const stubWindow = Object.create(originalWindow) as Window;

    Object.defineProperty(stubWindow, 'location', {
      configurable: true,
      value: { href: 'https://example.org/ipfs/cid/?foo=bar#/swap' } as Location,
    });

    (global as any).window = stubWindow;

    expect(resolveStaticAssetUrl('/env.json')).toBe('https://example.org/ipfs/cid/env.json');

    (global as any).window = originalWindow;
  });
});
