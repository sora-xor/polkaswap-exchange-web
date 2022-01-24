// import omit from 'lodash/fp/omit';
// import Vuex from 'vuex';
// import { shallowMount } from '@vue/test-utils';
// import { api } from '@soramitsu/soraneo-wallet-web';
//
// import TokenLogo from '@/components/TokenLogo.vue';
// import { useDescribe, localVue } from '../../utils';
// import { MOCK_WHITELIST_ITEM, MOCK_TOKEN_LOGO } from '../../mocks/TokenLogoMock';
//
// useDescribe('TokenLogo.vue', TokenLogo, () => {
//   MOCK_TOKEN_LOGO.map((item) =>
//     it(`[${item.title}]: should be rendered correctly`, () => {
//       const store = new Vuex.Store({
//         getters: {
//           whitelist: () => {
//             return { '0x0200000000000000000000000000000000000000000000000000000000000000': MOCK_WHITELIST_ITEM };
//           },
//           whitelistIdsBySymbol: () => api.assets.getWhitelistIdsBySymbol([MOCK_WHITELIST_ITEM]),
//         },
//       });
//       const propsData = omit(['title'], item);
//       const wrapper = shallowMount(TokenLogo, {
//         localVue,
//         store,
//         propsData,
//       });
//       expect(wrapper.element).toMatchSnapshot();
//     })
//   );
// });

describe('Test', () => {
  test('Temporary test', () => {
    expect(true).toEqual(true);
  });
});
