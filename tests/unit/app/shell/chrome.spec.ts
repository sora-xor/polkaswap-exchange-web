import { describe, expect, it, vi } from 'vitest';

const asyncMocks = vi.hoisted(() => ({
  createAsyncComponent: vi.fn((loader: () => Promise<unknown>) => ({ loader, source: String(loader) })),
  preloadAsyncComponents: vi.fn(async (_components: Iterable<unknown>) => undefined),
}));

vi.mock('@/shared/ui/async', () => asyncMocks);

import * as chrome from '@/app/shell/chrome';

type MockWrapper = { source: string };

describe('app shell chrome', () => {
  it('keeps each chrome component behind its own lazy boundary', () => {
    const sources = (
      [
        chrome.AppDisclaimer,
        chrome.AppFooter,
        chrome.AppHeader,
        chrome.AppLogoButton,
        chrome.AppMenu,
        chrome.TonswapJourneyNotice,
      ] as unknown as MockWrapper[]
    ).map(({ source }) => source);

    expect(sources[0]).toContain('AppDisclaimer.vue');
    expect(sources[1]).toContain('AppFooter.vue');
    expect(sources[2]).toContain('AppHeader.vue');
    expect(sources[3]).toContain('AppLogoButton.vue');
    expect(sources[4]).toContain('AppMenu.vue');
    expect(sources[5]).toContain('TonswapJourneyNotice.vue');
  });

  it('preloads the same wrappers the layout renders', async () => {
    await chrome.preloadAppShellChrome();

    expect(asyncMocks.preloadAsyncComponents).toHaveBeenCalledTimes(1);
    const preloaded = [...(asyncMocks.preloadAsyncComponents.mock.calls[0][0] as Iterable<unknown>)];
    expect(preloaded).toEqual(
      expect.arrayContaining([
        chrome.AppHeader,
        chrome.AppMenu,
        chrome.AppLogoButton,
        chrome.AppFooter,
        chrome.AppDisclaimer,
        chrome.TonswapJourneyNotice,
      ])
    );
    expect(preloaded).toHaveLength(6);
  });
});
