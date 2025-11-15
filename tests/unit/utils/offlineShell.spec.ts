import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { renderOfflineShell } from '@/utils/offlineShell';

describe('utils/offlineShell', () => {
  it('injects offline markup into the #app container', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>');
    const { document } = dom.window;

    const rendered = renderOfflineShell(document);

    expect(rendered).toBe(true);
    const shell = document.querySelector('.offline-shell');
    expect(shell).not.toBeNull();
    expect(shell?.querySelector('h1')?.textContent).toContain('Polkaswap');
    expect(shell?.textContent || '').toContain('Offline preview');

    dom.window.close();
  });

  it('returns false when #app container missing', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="missing"></div></body></html>');

    expect(renderOfflineShell(dom.window.document)).toBe(false);

    dom.window.close();
  });
});
