import Vuex from 'vuex';
import { shallowMount } from '@vue/test-utils';

import SwapInfo from '@/components/SwapInfo.vue';

import { useDescribe, localVue } from '../../utils';
import { MOCK_SWAP_INFO, MOCK_FIAT_PRICE_AND_APY_OBJECT } from '../../mocks/components/SwapInfo';

useDescribe('SwapInfo.vue', SwapInfo, () => {
  MOCK_SWAP_INFO.map((item) =>
    it(`[${item.title}]: should be rendered correctly`, () => {
      const store = new Vuex.Store({
        modules: {
          swap: {
            namespaced: true,
            getters: {
              tokenFrom: () => item.tokenFrom,
              tokenTo: () => item.tokenTo,
              minMaxReceived: () => item.minMaxReceived,
              isExchangeB: () => item.isExchangeB,
              liquidityProviderFee: () => item.liquidityProviderFee,
              rewards: () => item.rewards,
              priceImpact: () => item.priceImpact,
            },
          },
          prices: {
            namespaced: true,
            getters: {
              price: () => item.price,
              priceReversed: () => item.priceReversed,
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
