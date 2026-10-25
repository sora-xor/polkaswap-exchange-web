import { describe, expect, it } from 'vitest';

import { isAppNavigation, safeExternalUrl } from '../../../../electron/main/security';

describe('Electron URL boundaries', () => {
  it('allows browser links and preserves their destination', () => {
    expect(safeExternalUrl('https://polkaswap.io/#/swap')).toBe('https://polkaswap.io/#/swap');
    expect(safeExternalUrl('http://localhost:8080/')).toBe('http://localhost:8080/');
  });

  it.each([
    'file:///tmp/payload.app',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'custom-app://run',
    'https://polkaswap.io@evil.example/',
    'https://user:password@example.com/',
    '//example.com/',
    'not a URL',
  ])('rejects non-browser or misleading external URL %s', (url) => {
    expect(safeExternalUrl(url)).toBeNull();
  });

  it('allows hash routes only within the exact application document', () => {
    const app = 'file:///app/index.html';
    expect(isAppNavigation(`${app}#/swap`, app)).toBe(true);
    expect(isAppNavigation(`${app}#/bots`, `${app}#/swap`)).toBe(true);
    expect(isAppNavigation('https://example.com/', app)).toBe(false);
    expect(isAppNavigation('file:///app/other.html', app)).toBe(false);
    expect(isAppNavigation('file:///app/index.html?redirect=evil', app)).toBe(false);
    expect(isAppNavigation('invalid', app)).toBe(false);
    expect(isAppNavigation(app, 'invalid')).toBe(false);
  });

  it('does not permit a lookalike origin or another document during development', () => {
    const app = 'http://localhost:5173/';
    expect(isAppNavigation(`${app}#/swap`, app)).toBe(true);
    expect(isAppNavigation('http://localhost:5173.evil.example/', app)).toBe(false);
    expect(isAppNavigation('http://localhost:5174/', app)).toBe(false);
    expect(isAppNavigation('http://localhost:5173/other.html', app)).toBe(false);
  });
});
