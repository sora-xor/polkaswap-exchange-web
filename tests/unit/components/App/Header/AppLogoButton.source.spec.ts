import { describe, expect, it } from 'vitest';

import appLogoButtonSource from '@/components/App/Header/AppLogoButton.vue?raw';

describe('AppLogoButton source styles', () => {
  it('keeps the header logo neutral instead of inheriting link button chrome', () => {
    expect(appLogoButtonSource).toContain('.app-logo.el-button');
    expect(appLogoButtonSource).toContain('border-radius: 0 !important;');
    expect(appLogoButtonSource).toContain('color: var(--s-color-base-content-primary) !important;');
    expect(appLogoButtonSource).toContain('display: block !important;');
    expect(appLogoButtonSource).toContain('font-size: 14px !important;');
    expect(appLogoButtonSource).toContain('font-weight: 500 !important;');
    expect(appLogoButtonSource).toContain('line-height: 14px !important;');
  });
});
