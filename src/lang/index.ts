import first from 'lodash/fp/first'
import Vue from 'vue'
import VueI18n from 'vue-i18n'

import { Language } from '@/consts'
import { settingsStorage } from '@/utils/storage'

import en from './en.json'
import ru from './ru.json'

Vue.use(VueI18n)

const messages = {
  en,
  ru
}

export function getLocale (): string {
  const locale = first((navigator.language || (navigator as any).userLanguage).split('-')) as string
  if (!Object.values(Language).includes(locale as any)) {
    return Language.EN
  }
  return locale
}

const i18n = new VueI18n({
  locale: settingsStorage.get('language') || getLocale(),
  messages
})

export default i18n
