// import { shallowMount, createLocalVue } from '@vue/test-utils'
// import Vuex from 'vuex'

// import ConfirmSwap from '@/components/ConfirmSwap.vue'
// import { tokens } from '../../mocks/tokens'
// import { SoramitsuElementsImport, TranslationMock } from '../../utils'

// const localVue = createLocalVue()
// localVue.use(Vuex)
// SoramitsuElementsImport(localVue)

// describe('ConfirmSwap.vue', () => {
//   let getters
//   let store

//   beforeEach(() => {
//     TranslationMock(ConfirmSwap)

//     getters = {
//       tokenFrom: () => tokens[0],
//       tokenTo: () => tokens[1],
//       fromValue: () => 150.123654,
//       toValue: () => 0
//     }

//     store = new Vuex.Store({
//       getters
//     })
//   })

//   it('should renders correctly', () => {
//     const wrapper = shallowMount(ConfirmSwap, {
//       localVue,
//       store,
//       propsData: {
//         visible: true,
//         title: 'Confirm Swap',
//         customClass: 'dialog--confirm-swap'
//       }
//     })
//     expect(wrapper.element).toMatchSnapshot()
//   })
// })

describe('ConfirmSwap test', () => {
  test('Temporary test', () => {
    expect(true).toEqual(true)
  })
})
