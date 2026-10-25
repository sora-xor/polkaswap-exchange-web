import { afterEach, describe, expect, it, vi } from 'vitest';

describe('grid dom helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('reads and writes the document direction through the root element', async () => {
    const dom = await import('@/lib/grid/helpers/dom');

    dom.setDocumentDir('rtl');

    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(dom.getDocumentDir()).toBe('rtl');
  });

  it('reads the effective direction from a grid element before falling back to the document', async () => {
    const dom = await import('@/lib/grid/helpers/dom');
    const element = document.createElement('div');

    dom.setDocumentDir('rtl');
    element.style.direction = 'ltr';
    document.body.appendChild(element);

    expect(dom.getElementDir(element)).toBe('ltr');
    expect(dom.getElementDir(null)).toBe('rtl');

    element.remove();
  });

  it('falls back to cached direction and immediate callbacks when document or window are unavailable', async () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);

    const dom = await import('@/lib/grid/helpers/dom');
    const callback = vi.fn();

    dom.setDocumentDir('ltr');
    expect(dom.getDocumentDir()).toBe('ltr');

    dom.addWindowEventListener('resize', callback);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.any(Event));

    expect(() => dom.removeWindowEventListener('resize', callback)).not.toThrow();
  });

  it('delegates window listener registration and removal when the browser window exists', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const dom = await import('@/lib/grid/helpers/dom');
    const callback = vi.fn();

    dom.addWindowEventListener('scroll', callback);
    dom.removeWindowEventListener('scroll', callback);

    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', callback);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', callback);
  });
});
