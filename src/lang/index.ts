import first from 'lodash/fp/first'
import Vue from 'vue'
import VueI18n from 'vue-i18n'

import { Language } from '@/consts/lang'

import en from './en.json'

Vue.use(VueI18n)

const messages = {
  en
}

function getLocale (): string {
  const locale = first((navigator.language || (navigator as any).userLanguage).split('-')) as string
  if (!Object.values(Language).includes(locale as any)) {
    return Language.EN
  }
  return locale
}

const i18n = new VueI18n({
  locale: getLocale(),
  messages
})

export default i18n
