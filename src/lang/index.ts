import first from 'lodash/fp/first';
import Vue from 'vue';
import VueI18n from 'vue-i18n';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { Language } from '@/consts';
import { settingsStorage } from '@/utils/storage';

import en from './en.json';

dayjs.extend(localizedFormat);

Vue.use(VueI18n);

const i18n = new VueI18n({
  locale: Language.EN,
  fallbackLocale: Language.EN,
  messages: {
    [Language.EN]: en,
  },
});

const loadedLanguages: Array<string> = [Language.EN];

const hasLocale = (locale: string) => Object.values(Language).includes(locale as any);

export const getSupportedLocale = (locale: Language): string => {
  if (hasLocale(locale)) return locale;

  if (locale.includes('-')) {
    return getSupportedLocale(first(locale.split('-')) as any);
  }

  return Language.EN;
};

export function getLocale(): string {
  const locale = settingsStorage.get('language') || ((navigator.language || (navigator as any).userLanguage) as string);

  return getSupportedLocale(locale as any);
}

// export async function setDayJsLocale(lang: Language): Promise<void> {

// }

export async function setI18nLocale(lang: Language): Promise<void> {
  const locale = getSupportedLocale(lang) as any;

  if (!loadedLanguages.includes(locale)) {
    // transform locale string 'eu-ES' to filename 'eu_ES' like in localise
    const code = first(locale.split('-')) as string;
    const filename = locale.replace('-', '_');
    const { default: messages } = await import(
      /* webpackChunkName: "lang-[request]" */
      /* webpackMode: "lazy" */
      `@/lang/${filename}.json`
    );

    await import(`dayjs/locale/${code}.js`);

    i18n.setLocaleMessage(locale, messages);
    loadedLanguages.push(locale);
  }

  i18n.locale = locale;
}

export default i18n;
