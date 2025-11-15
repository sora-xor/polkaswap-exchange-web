import { createI18n } from 'vue-i18n';

import en from './en';

const messages = {
  en,
};

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages,
  warnHtmlMessage: false,
});

export default i18n;
