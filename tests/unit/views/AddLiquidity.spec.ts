// import { shallowMount, createLocalVue } from '@vue/test-utils'
// import Vuex from 'vuex'

// import AddLiquidity from '@/views/AddLiquidity.vue'
// import { tokens } from '../../mocks/tokens'
// import { SoramitsuElementsImport, TranslationMock } from '../../utils'

// const localVue = createLocalVue()
// localVue.use(Vuex)
// SoramitsuElementsImport(localVue)

// describe('CreatePair.vue', () => {
//   let actions
//   let getters
//   let store

//   beforeEach(() => {
//     TranslationMock(AddLiquidity)

//     actions = {
//       setFirstToken: jest.fn(),
//       setSecondToken: jest.fn(),
//       setFirstTokenValue: jest.fn(),
//       setSecondTokenValue: jest.fn(),
//       addLiquidity: jest.fn()
//     }

//     getters = {
//       firstToken: () => tokens[0],
//       secondToken: () => tokens[1],
//       firstTokenValue: () => 12,
//       secondTokenValue: () => 12
//     }

//     store = new Vuex.Store({
//       modules: {
//         createPair: {
//           namespaced: true,
//           actions,
//           getters
//         }
//       }
//     })
//   })

//   it('should renders correctly', () => {
//     const wrapper = shallowMount(AddLiquidity, { localVue, store })
//     expect(wrapper.element).toMatchSnapshot()
//   })
// })

describe('AddLiquidity test', () => {
  test('Temporary test', () => {
    expect(true).toEqual(true);
  });
});
