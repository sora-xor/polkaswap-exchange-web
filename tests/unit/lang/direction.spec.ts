import { describe, expect, it } from 'vitest';

import { Language } from '@/consts/language';
import { getLocaleDirection, RTL_LOCALES } from '@/lang/direction';

describe('locale direction', () => {
  it('marks supported RTL locales as right-to-left', () => {
    expect(RTL_LOCALES).toEqual([Language.AR, Language.HE, Language.UR, Language.DV]);

    for (const locale of RTL_LOCALES) {
      expect(getLocaleDirection(locale)).toBe('rtl');
    }
  });

  it('normalizes region and separator variants before resolving direction', () => {
    expect(getLocaleDirection('ar-EG')).toBe('rtl');
    expect(getLocaleDirection('he_IL')).toBe('rtl');
  });

  it('keeps non-RTL locales left-to-right', () => {
    expect(getLocaleDirection(Language.EN)).toBe('ltr');
    expect(getLocaleDirection(Language.AKK)).toBe('ltr');
    expect(getLocaleDirection(Language.EGY)).toBe('ltr');
    expect(getLocaleDirection(undefined)).toBe('ltr');
  });
});
