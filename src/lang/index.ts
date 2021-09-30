import first from 'lodash/fp/first';
import Vue from 'vue';
import VueI18n from 'vue-i18n';

import { Language } from '@/consts';
import { settingsStorage } from '@/utils/storage';

import en from './en.json';

Vue.use(VueI18n);

const i18n = new VueI18n({
  locale: Language.EN,
  fallbackLocale: Language.EN,
  messages: {
    [Language.EN]: en,
  },
});

const loadedLanguages: Array<string> = [Language.EN];

export const getSupportedLocale = (locale: Language): string => {
  return Object.values(Language).includes(locale as any) ? locale : Language.EN;
};

export function getLocale(): string {
  const locale =
    settingsStorage.get('language') ||
    (first((navigator.language || (navigator as any).userLanguage).split('-')) as string);

  return getSupportedLocale(locale as any);
}

export async function setI18nLocale(lang: Language): Promise<void> {
  const locale = getSupportedLocale(lang) as any;

  if (!loadedLanguages.includes(locale)) {
    const { default: messages } = await import(
      /* webpackChunkName: "lang-[request]" */
      /* webpackMode: "lazy" */
      `@/lang/${locale}.json`
    );

    i18n.setLocaleMessage(locale, messages);
    loadedLanguages.push(locale);
  }

  i18n.locale = locale;
}

export default i18n;
