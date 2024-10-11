import first from 'lodash/fp/first';
import Vue from 'vue';
import VueI18n from 'vue-i18n';

import { Language } from '@/consts';
import { settingsStorage } from '@/utils/storage';

import enCard from './card/en.json';
import en from './en.json';

Vue.use(VueI18n);

const i18n = new VueI18n({
  locale: Language.EN,
  fallbackLocale: Language.EN,
  messages: {
    [Language.EN]: { ...en, ...enCard },
  },
  silentTranslationWarn: process.env.NODE_ENV === 'production',
});

const loadedLanguages: Array<string> = [Language.EN];

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
  let code = first(locale.split('-')) as string;
  // There is no "no" lang, let's keep it for now, "en" will be used by default
  switch (code) {
    case 'zh':
      code = 'zh-cn';
      break;
    case 'hy':
      code = 'hy-am';
      break;
  }

  try {
    // importing dayjs locale file automatically runs `dayjs.locale(code)`
    await import(`dayjs/locale/${code}.js`);
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

    i18n.setLocaleMessage(locale, { ...messagesModule.default, ...cardMessagesModule.default });
    loadedLanguages.push(locale);
  }

  i18n.locale = locale;
}

export default i18n;
