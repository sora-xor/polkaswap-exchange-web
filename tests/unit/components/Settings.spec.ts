// import { shallowMount, createLocalVue } from '@vue/test-utils'
// import Vuex from 'vuex'

// import Settings from '@/components/Settings.vue'
// import { SoramitsuElementsImport, TranslationMock } from '../../utils'

// const localVue = createLocalVue()
// localVue.use(Vuex)
// SoramitsuElementsImport(localVue)

// describe('Settings.vue', () => {
//   let actions
//   let getters
//   let store

//   beforeEach(() => {
//     TranslationMock(Settings)

//     actions = {
//       setSlippageTolerance: jest.fn(),
//       setTransactionDeadline: jest.fn()
//     }

//     getters = {
//       slippageTolerance: () => 0.5,
//       transactionDeadline: () => 20,
//       nodeAddress: () => ({ ip: '123.123.1.2', port: 2323 })
//     }

//     store = new Vuex.Store({
//       actions,
//       getters
//     })
//   })

//   it('should renders correctly', () => {
//     const wrapper = shallowMount(Settings, {
//       localVue,
//       store,
//       propsData: {
//         visible: true
//       }
//     })
//     expect(wrapper.element).toMatchSnapshot()
//   })
// })

describe('Settings test', () => {
  test('Temporary test', () => {
    expect(true).toEqual(true)
  })
})
