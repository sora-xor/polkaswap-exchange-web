import Wallet from '@soramitsu/soraneo-wallet-web';
import SoramitsuElements, { Message, MessageBox, Notification } from '@soramitsu-ui/ui-vue2';
import { createLocalVue } from '@vue/test-utils';
import Vue from 'vue';
import Vuex from 'vuex';

import i18n from '../../src/lang';

import type { VueConstructor } from 'vue';

export const localVue = createLocalVue();
localVue.use(Vuex);

export const TranslationMock = (vue: VueConstructor) =>
  vue.mixin({ name: 'TranslationMixin', methods: { t: (msg) => i18n.t(msg), tc: jest.fn() } });

export const SoramitsuElementsImport = (vue: VueConstructor) => {
  vue.use(Vuex);
  const store = new Vuex.Store({ modules: {} });
  vue.use(SoramitsuElements, { store });
  vue.prototype.$prompt = MessageBox.prompt;
  vue.prototype.$alert = MessageBox.alert;
  vue.prototype.$message = Message;
  vue.prototype.$notify = Notification;
};

export const WalletImport = (vue: VueConstructor) => {
  vue.use(Vuex);
  const store = new Vuex.Store({ modules: {} });
  vue.use(Wallet, { store });
};

export const useDescribe = (name: string, component: VueConstructor<Vue>, fn: jest.EmptyFunction) =>
  describe(name, () => {
    beforeAll(() => {
      SoramitsuElementsImport(localVue);
      TranslationMock(component);
    });
    fn();
  });
