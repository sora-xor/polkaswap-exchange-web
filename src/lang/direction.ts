import { Language } from '@/consts/language';

export type LocaleDirection = 'ltr' | 'rtl';

export const RTL_LOCALES = [Language.AR, Language.HE, Language.UR, Language.DV] as const;

const RTL_LOCALE_CODES = new Set<string>(RTL_LOCALES);

/**
 * Resolves the writing direction for a locale without coupling it to app layout.
 */
export function getLocaleDirection(locale?: Nullable<string>): LocaleDirection {
  if (!locale) return 'ltr';

  const normalizedLocale = locale.trim().replace('_', '-').toLowerCase();
  const baseLocale = normalizedLocale.split('-')[0] ?? normalizedLocale;

  return RTL_LOCALE_CODES.has(normalizedLocale) || RTL_LOCALE_CODES.has(baseLocale) ? 'rtl' : 'ltr';
}
