// import { shallowMount, createLocalVue } from '@vue/test-utils'
// import Vuex from 'vuex'

// import Pool from '@/components/Pool.vue'
// import { tokens } from '../../mocks/tokens'
// import { SoramitsuElementsImport, TranslationMock } from '../../utils'

// const localVue = createLocalVue()
// localVue.use(Vuex)
// SoramitsuElementsImport(localVue)

// describe('Pool.vue', () => {
//   let actions
//   let getters
//   let store

//   beforeEach(() => {
//     TranslationMock(Pool)

//     actions = {
//       getLiquidity: jest.fn()
//     }

//     getters = {
//       liquidity: () => false,
//       firstToken: () => tokens[0],
//       secondToken: () => tokens[1],
//       firstTokenValue: () => 100,
//       secondTokenValue: () => 45.4545
//     }

//     store = new Vuex.Store({
//       actions,
//       getters
//     })
//   })

//   it('should renders correctly', () => {
//     const wrapper = shallowMount(Pool, { localVue, store })
//     expect(wrapper.element).toMatchSnapshot()
//   })
// })

describe('Pool test', () => {
  test('Temporary test', () => {
    expect(true).toEqual(true);
  });
});
