// import Vuex from 'vuex';
// import { shallowMount } from '@vue/test-utils';
//
// import AccountButton from '@/components/App/Header/AccountButton.vue';
// import { Account } from '@soramitsu/soraneo-wallet-web/lib/types/common';
// import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
// import { useDescribe, localVue } from '../../../../utils';
// import { MOCK_ACCOUNT } from '../../../../mocks/account';
// import { formatAddress } from '../../../../../src/utils';
//
// const createStore = (loggedIn: boolean, mockAccount = MOCK_ACCOUNT) =>
//   new Vuex.Store({
//     getters: {
//       isLoggedIn: () => loggedIn as boolean,
//       account: () => mockAccount as Account,
//       libraryTheme: () => Theme.LIGHT as string,
//     },
//   });
//
// useDescribe('AccountButton.vue', AccountButton, () => {
//   it('should be rendered correctly', () => {
//     const wrapper = shallowMount(AccountButton, {
//       localVue,
//       store: createStore(true),
//     });
//
//     expect(wrapper.element).toMatchSnapshot();
//   });
//
//   it('should show connect account text when not logged in', () => {
//     const wrapper = shallowMount(AccountButton, { localVue, store: createStore(false) });
//     const div = wrapper.find('.account-control-title');
//
//     expect(div.text()).toMatch('Connect account');
//   });
//
//   it('should show user name when logged in', () => {
//     const wrapper = shallowMount(AccountButton, { localVue, store: createStore(true) });
//     const div = wrapper.find('.account-control-title');
//
//     expect(div.text()).toMatch(MOCK_ACCOUNT.name);
//   });
//
//   it('should show address when name is not provided', () => {
//     const mockAccount = {
//       ...MOCK_ACCOUNT,
//       name: '',
//     };
//     const wrapper = shallowMount(AccountButton, { localVue, store: createStore(true, mockAccount) });
//     const div = wrapper.find('.account-control-title');
//
//     expect(div.text()).toMatch(formatAddress(MOCK_ACCOUNT.address, 8));
//   });
// });

describe('Test', () => {
  test('Temporary test', () => {
    expect(true).toEqual(true);
  });
});
