import { describe, expect, it } from 'vitest';

import { shouldPolyfillCountryFlagEmojis } from '@/plugins/countryFlagEmoji';

describe('country flag emoji startup polyfill', () => {
  it('only targets Windows browsers without native flag emoji support', () => {
    expect(
      shouldPolyfillCountryFlagEmojis(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
      )
    ).toBe(true);
    expect(
      shouldPolyfillCountryFlagEmojis(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
      )
    ).toBe(false);
    expect(
      shouldPolyfillCountryFlagEmojis(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 Safari/605.1.15'
      )
    ).toBe(false);
  });
});
