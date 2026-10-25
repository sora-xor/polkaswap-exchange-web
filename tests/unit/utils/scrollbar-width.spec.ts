import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getScrollbarWidth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns zero when the browser window is unavailable', async () => {
    vi.stubGlobal('window', undefined);

    const { default: getScrollbarWidth } = await import('@/utils/scrollbar-width');

    expect(getScrollbarWidth()).toBe(0);
  });

  it('measures the scrollbar width once and reuses the cached value', async () => {
    const originalCreateElement = document.createElement.bind(document);
    let createdDivCount = 0;

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);

      if (tagName === 'div') {
        const offsetWidth = createdDivCount === 0 ? 100 : 82;
        createdDivCount += 1;

        Object.defineProperty(element, 'offsetWidth', {
          configurable: true,
          get: () => offsetWidth,
        });
      }

      return element;
    });

    const { default: getScrollbarWidth } = await import('@/utils/scrollbar-width');

    expect(getScrollbarWidth()).toBe(18);
    expect(getScrollbarWidth()).toBe(18);
    expect(createElementSpy.mock.calls.filter(([tagName]) => tagName === 'div')).toHaveLength(2);
  });
});
