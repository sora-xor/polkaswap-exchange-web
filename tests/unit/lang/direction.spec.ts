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
    expect(getLocaleDirection(' DV-MV ')).toBe('rtl');
    expect(getLocaleDirection('dv_MV')).toBe('rtl');
    expect(getLocaleDirection('UR-PK')).toBe('rtl');
    expect(getLocaleDirection('he--IL')).toBe('rtl');
    expect(getLocaleDirection('ar__EG')).toBe('rtl');
  });

  it.each([
    'en-dv',
    'en_ar',
    'dvx',
    'und-DV',
    'locale:ar',
    'x-ar-EG',
    'ar.eg',
    'ar/EG',
    'ar EG',
    'ar,he',
    'dv;en',
    'dv=rtl',
    'ar\nEG',
    '__proto__',
    'constructor',
    'hebrew',
    'rtl',
  ])('does not treat embedded RTL-looking fragment "%s" as an RTL locale', (locale) => {
    expect(getLocaleDirection(locale)).toBe('ltr');
  });

  it.each([
    ['leading right-to-left mark', '\u200fdv'],
    ['trailing right-to-left mark', 'dv\u200f'],
    ['leading right-to-left override', '\u202edv'],
    ['trailing right-to-left isolate', 'dv\u2067'],
  ])('keeps bidi-control-injected locale with %s left-to-right', (_, locale) => {
    expect(getLocaleDirection(locale)).toBe('ltr');
  });

  it.each(['az-Arab', 'fa', 'ps', 'sd-Arab', 'ku-Arab-IQ'])(
    'keeps unsupported RTL-script locale "%s" left-to-right',
    (locale) => {
      expect(getLocaleDirection(locale)).toBe('ltr');
    }
  );

  it('keeps non-RTL locales left-to-right', () => {
    expect(getLocaleDirection(Language.EN)).toBe('ltr');
    expect(getLocaleDirection(Language.AKK)).toBe('ltr');
    expect(getLocaleDirection(Language.EGY)).toBe('ltr');
    expect(getLocaleDirection(null)).toBe('ltr');
    expect(getLocaleDirection(undefined)).toBe('ltr');
    expect(getLocaleDirection('')).toBe('ltr');
    expect(getLocaleDirection('   ')).toBe('ltr');
  });
});
