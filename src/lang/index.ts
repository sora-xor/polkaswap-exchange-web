import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { en as walletEn } from '@soramitsu/soraneo-wallet-web'

import en from './en'

Vue.use(VueI18n)

const messages = {
  en: { ...en, ...walletEn }
}

const i18n = new VueI18n({
  locale: 'en',
  messages
})

export default i18n
