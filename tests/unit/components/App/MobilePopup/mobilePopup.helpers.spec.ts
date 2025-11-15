import { describe, expect, it } from 'vitest';

import { buildMobilePopupHeadline } from '@/components/App/MobilePopup/mobilePopup.helpers';

describe('buildMobilePopupHeadline', () => {
  const translate = (key: string, params?: Record<string, unknown>): string => {
    if (key === 'mobilePopup.header') {
      return `Hello ${params?.polkaswapHighlight ?? ''}`;
    }
    return key;
  };

  it('escapes app name and injects highlight span', () => {
    const result = buildMobilePopupHeadline({ appName: '<Polkaswap>', translate });

    expect(result).toContain('popup-info__headline--highlight');
    expect(result).not.toContain('<Polkaswap>');
    expect(result).toContain('&lt;Polkaswap&gt;');
  });

  it('allows overriding sanitize options', () => {
    const result = buildMobilePopupHeadline({
      appName: 'Polkaswap',
      translate,
      sanitizeOptions: {
        allowedTags: ['strong'],
        allowedAttributes: {},
      },
    });

    expect(result).toBe('Hello Polkaswap');
  });
});
