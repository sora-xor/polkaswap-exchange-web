import dayjs from 'dayjs';
import first from 'lodash/fp/first';
import { createI18n } from 'vue-i18n'; // eslint-disable-line import/named

import { Language, TranslationConsts } from '@/consts';
import { settingsStorage } from '@/utils/storage';

import enCard from './card/en.json';
import en from './en.json';

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: Language.EN,
  fallbackLocale: Language.EN,
  messages: {
    [Language.EN]: { ...en, ...enCard },
  },
  warnHtmlMessage: false,
});

const i18nGlobal = i18n.global;
const loadedLanguages: Array<string> = [Language.EN];
applyDocumentDirection(Language.EN);

// Set document direction for RTL languages
const rtlLocales = [Language.AR, Language.HE, Language.UR, Language.DV];
function applyDocumentDirection(locale: string): void {
  try {
    if (typeof document !== 'undefined') {
      const dir = rtlLocales.includes(locale as Language) ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
    }
  } catch (e) {
    // noop: environment may not have document (tests)
  }
}

const hasLocale = (locale: string) => Object.values(Language).includes(locale as any);

export const getSupportedLocale = (locale: Language): string => {
  if (hasLocale(locale)) return locale;

  if (locale.includes('-')) {
    return getSupportedLocale(first(locale.split('-')) as Language);
  }

  return Language.EN;
};

export function getLocale(): string {
  const locale = settingsStorage.get('language') || ((navigator.language || (navigator as any).userLanguage) as string);

  return getSupportedLocale(locale as Language);
}

export async function setDayJsLocale(lang: Language): Promise<void> {
  const locale = getSupportedLocale(lang);
  let code: string = locale;

  if (locale !== Language.ZH_CN && locale !== Language.ZH_TW && locale.includes('-')) {
    code = first(locale.split('-')) as string;
  }

  if (code === 'zh') {
    code = Language.ZH_CN;
  }

  if (locale === Language.ZH_CN || locale === Language.ZH_TW) {
    code = locale;
  }

  const dayjsLocale = code.toLowerCase();

  try {
    const { default: preset } = dayjsLocale !== Language.EN ? await import(`dayjs/esm/locale/${dayjsLocale}.js`) : {};
    dayjs.locale(dayjsLocale, preset, false);
  } catch (error) {
    console.warn(`[dayjs]: unsupported locale "${code}"`, error);
  }
}

export async function setI18nLocale(lang: Language): Promise<void> {
  const locale = getSupportedLocale(lang) as Language;

  if (!loadedLanguages.includes(locale)) {
    // transform locale string 'eu-ES' to filename 'eu_ES' like in localise
    const filename = locale.replace('-', '_');
    const messagesModule = await import(`@/lang/${filename}.json`);
    const cardMessagesModule = await import(`@/lang/card/${filename}.json`);

    i18nGlobal.setLocaleMessage(locale, { ...messagesModule.default, ...cardMessagesModule.default });
    loadedLanguages.push(locale);
  }

  i18nGlobal.locale.value = locale;
  applyDocumentDirection(locale);

  // Apply locale-specific constant overrides (non-critical, optional)
  if (locale === Language.AKK) {
    try {
      (TranslationConsts as any).AppName = '𒊹𒂵𒆜'; // Polkaswap
      if ((TranslationConsts as any).Sora) (TranslationConsts as any).Sora = '𒀭'; // SORA
      (TranslationConsts as any).VAL = '𒋾';
    } catch (e) {
      // noop
    }
  }
}

export default i18n;
