import type { Router } from 'vue-router';

import { describe, expect, it } from 'vitest';

import { detectBaseUrl, sanitizeConfiguredBaseUrl } from '@/api';

describe('sanitizeConfiguredBaseUrl', () => {
  it('strips empty-like base urls', () => {
    expect(sanitizeConfiguredBaseUrl(undefined)).toBe('');
    expect(sanitizeConfiguredBaseUrl('')).toBe('');
    expect(sanitizeConfiguredBaseUrl('   ')).toBe('');
    expect(sanitizeConfiguredBaseUrl('/')).toBe('');
    expect(sanitizeConfiguredBaseUrl('./')).toBe('');
    expect(sanitizeConfiguredBaseUrl('.')).toBe('');
  });

  it('preserves configured absolute or relative base urls', () => {
    expect(sanitizeConfiguredBaseUrl('https://example.com/app/')).toBe('https://example.com/app/');
    expect(sanitizeConfiguredBaseUrl('/app/')).toBe('/app/');
    expect(sanitizeConfiguredBaseUrl('app/')).toBe('app/');
  });
});

describe('detectBaseUrl', () => {
  it('falls back to current origin and pathname for hash history routers', () => {
    const runtimeLocation = {
      origin: 'http://127.0.0.1:8080',
      pathname: '/ipfs/abc123/',
    } as Location;

    const router = {
      options: {
        history: { type: 'hash' },
      },
    } as Router;

    expect(detectBaseUrl(router, runtimeLocation)).toBe('http://127.0.0.1:8080/ipfs/abc123/');
  });

  it('normalises index documents to their directory root', () => {
    const runtimeLocation = {
      origin: 'https://gateway.example.com',
      pathname: '/ipfs/abc123/index.html',
    } as Location;

    const router = {
      options: {
        history: { type: 'hash' },
      },
    } as Router;

    expect(detectBaseUrl(router, runtimeLocation)).toBe('https://gateway.example.com/ipfs/abc123/');
  });
});
