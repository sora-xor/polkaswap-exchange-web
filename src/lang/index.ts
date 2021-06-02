import Vue from 'vue'
import VueI18n from 'vue-i18n'

import { Language } from '@/consts'

import en from './en.json'

Vue.use(VueI18n)

const messages = {
  en
}

const i18n = new VueI18n({
  locale: Language.EN,
  messages
})

export default i18n
