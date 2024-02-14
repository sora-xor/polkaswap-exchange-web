import { api } from '@soramitsu/soraneo-wallet-web';
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
    commit.updateDisplayRegions(); // based on locale
  },
  async setBlockNumber(context): Promise<void> {
    const { commit } = settingsActionContext(context);
    commit.resetBlockNumberSubscription();

    const blockNumberSubscription = api.system.getBlockNumberObservable().subscribe((blockNumber) => {
      commit.setBlockNumber(blockNumber);
    });
    commit.setBlockNumberUpdates(blockNumberSubscription);
  },
  async fetchAdsArray(context): Promise<void> {
    const { commit } = settingsActionContext(context);
    try {
      const { data } = await axiosInstance.get('/marketing.json');
      commit.setAdsArray(data);
    } catch {
      commit.setAdsArray([]);
    }
  },
});

export default actions;
