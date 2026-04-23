import { describe, expect, it } from 'vitest';

import { isLocalhostHostname, toSafeExternalLink } from '@/utils/externalLinks';

describe('externalLinks utility', () => {
  it('accepts https links', () => {
    expect(toSafeExternalLink('https://polkaswap.io')).toBe('https://polkaswap.io');
  });

  it('rejects non-string, blank, and malformed links', () => {
    expect(toSafeExternalLink(null)).toBe('');
    expect(toSafeExternalLink(42)).toBe('');
    expect(toSafeExternalLink('   ')).toBe('');
    expect(toSafeExternalLink('not a url')).toBe('');
  });

  it('rejects non-https links by default', () => {
    expect(toSafeExternalLink('http://example.com')).toBe('');
    expect(toSafeExternalLink('http://localhost:3000')).toBe('');
    expect(toSafeExternalLink('javascript:alert(1)')).toBe('');
  });

  it('allows http localhost links only when explicitly enabled', () => {
    expect(toSafeExternalLink('http://localhost:3000', { allowHttpLocalhost: true })).toBe('http://localhost:3000');
    expect(toSafeExternalLink('http://127.0.0.1:8080', { allowHttpLocalhost: true })).toBe('http://127.0.0.1:8080');
    expect(toSafeExternalLink('http://0.0.0.0:8080', { allowHttpLocalhost: true })).toBe('http://0.0.0.0:8080');
    expect(toSafeExternalLink('http://[::1]:8080', { allowHttpLocalhost: true })).toBe('http://[::1]:8080');
    expect(toSafeExternalLink('http://example.com', { allowHttpLocalhost: true })).toBe('');
  });

  it('detects localhost hostnames including bracketed IPv6 loopback', () => {
    expect(isLocalhostHostname('localhost')).toBe(true);
    expect(isLocalhostHostname(' LOCALHOST ')).toBe(true);
    expect(isLocalhostHostname('127.0.0.1')).toBe(true);
    expect(isLocalhostHostname('0.0.0.0')).toBe(true);
    expect(isLocalhostHostname('[::1]')).toBe(true);
    expect(isLocalhostHostname(' [::1] ')).toBe(true);
    expect(isLocalhostHostname('example.com')).toBe(false);
  });
});
