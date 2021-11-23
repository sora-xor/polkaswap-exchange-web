import { VueConstructor } from 'vue';
import Vuex from 'vuex';
import { shallowMount } from '@vue/test-utils';

import SwapInfo from '@/components/SwapInfo.vue';

import { SoramitsuElementsImport, localVue, TranslationMock } from '../../utils';
import { MOCK_SWAP_INFO, MOCK_FIAT_PRICE_AND_APY_OBJECT } from '../../mocks/components/SwapInfo';

const NumberFormatterMixin = (vue: VueConstructor) => vue.mixin({ name: 'NumberFormatterMixin' });

const FormattedAmountMixin = (vue: VueConstructor) => vue.mixin({ name: 'FormattedAmountMixin' });

export const useDescribe = (name: string, component: VueConstructor<Vue>, fn: jest.EmptyFunction) =>
  describe(name, () => {
    beforeAll(() => {
      SoramitsuElementsImport(localVue);
      TranslationMock(component);
      NumberFormatterMixin(component);
      FormattedAmountMixin(component);
    });
    fn();
  });

useDescribe('SwapInfo.vue', SwapInfo, () => {
  MOCK_SWAP_INFO.map((item) =>
    it(`[${item.title}]: should be rendered correctly`, () => {
      const store = new Vuex.Store({
        modules: {
          swap: {
            namespaced: true,
            getters: {
              liquidityProviderFee: () => item.liquidityProviderFee,
              isExchangeB: () => item.isExchangeB,
              rewards: () => item.rewards,
              tokenFrom: () => item.tokenFrom,
              tokenTo: () => item.tokenTo,
              minMaxReceived: () => item.minMaxReceived,
              priceImpact: () => item.priceImpact,
              priceReversed: () => item.priceReversed,
              price: () => item.price,
            },
          },
        },
        getters: {
          fiatPriceAndApyObject: () => MOCK_FIAT_PRICE_AND_APY_OBJECT,
          isLoggedIn: () => item.isLoggedIn,
          networkFees: () => item.networkFees,
        },
      });
      const wrapper = shallowMount(SwapInfo, {
        localVue,
        store,
      });
      expect(wrapper.element).toMatchSnapshot();
    })
  );
});
