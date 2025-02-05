import { defineActions } from 'direct-vuex';

import axiosInstance from '@/api';
import { Language } from '@/consts';
import { getSupportedLocale, setDayJsLocale, setI18nLocale } from '@/lang';
import { settingsActionContext } from '@/store/settings';
import { updateDocumentTitle, updateFpNumberLocale } from '@/utils';

const actions = defineActions({
  async setLanguage(context, lang: Language): Promise<void> {
    const { commit } = settingsActionContext(context);
    const locale = getSupportedLocale(lang) as Language;
    // we should import dayjs locale first, then i18n
    // because i18n.locale is dependency for dayjs
    await setDayJsLocale(locale);
    await setI18nLocale(locale);
    updateDocumentTitle();
    updateFpNumberLocale(locale);
    commit.setLanguage(locale);
    commit.updateIntlUtils(); // based on locale
  },
});

export default actions;
