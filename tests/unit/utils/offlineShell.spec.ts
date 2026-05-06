import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderOfflineShell } from '@/utils/offlineShell';

describe('utils/offlineShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('returns false when no document is available', () => {
    expect(renderOfflineShell(undefined)).toBe(false);
  });

  it('returns false when #app container missing', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="missing"></div></body></html>');

    expect(renderOfflineShell(dom.window.document)).toBe(false);

    dom.window.close();
  });

  it('switches offline pages and updates hash from fallback navigation links', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://polkaswap.test/#/swap',
    });
    vi.stubGlobal('window', dom.window);

    expect(renderOfflineShell(dom.window.document)).toBe(true);

    const swapSection = dom.window.document.querySelector<HTMLElement>('[data-offline-page="swap"]');
    const bridgeSection = dom.window.document.querySelector<HTMLElement>('[data-offline-page="bridge"]');
    const bridgeLink = dom.window.document.querySelector<HTMLAnchorElement>('[data-offline-link="bridge"]');
    const swapLink = dom.window.document.querySelector<HTMLAnchorElement>('[data-offline-link="swap"]');

    expect(swapSection?.hidden).toBe(false);
    expect(bridgeSection?.hidden).toBe(true);

    bridgeLink?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(swapSection?.hidden).toBe(true);
    expect(bridgeSection?.hidden).toBe(false);
    expect(dom.window.location.hash).toBe('#/bridge');

    swapLink?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(swapSection?.hidden).toBe(false);
    expect(bridgeSection?.hidden).toBe(true);
    expect(dom.window.location.hash).toBe('#/swap');

    dom.window.close();
  });
});
