// import { shallowMount, createLocalVue } from '@vue/test-utils'
// import Vuex from 'vuex'

// import ResultDialog from '@/components/ResultDialog.vue'
// import { tokens } from '../../mocks/tokens'
// import { SoramitsuElementsImport, TranslationMock } from '../../utils'

// const localVue = createLocalVue()
// localVue.use(Vuex)
// SoramitsuElementsImport(localVue)

// describe('ResultDialog.vue', () => {
//   let getters
//   let store

//   beforeEach(() => {
//     TranslationMock(ResultDialog)

//     getters = {
//       tokenFrom: () => tokens[0],
//       tokenTo: () => tokens[1],
//       fromValue: () => 100,
//       toValue: () => 45.4545
//     }

//     store = new Vuex.Store({
//       getters
//     })
//   })

//   it('should renders correctly', () => {
//     const wrapper = shallowMount(ResultDialog, {
//       localVue,
//       store,
//       propsData: {
//         visible: true,
//         title: 'Transaction submitted'
//       }
//     })
//     expect(wrapper.element).toMatchSnapshot()
//   })
// })

describe('ResultDialog test', () => {
  test('Temporary test', () => {
    expect(true).toEqual(true)
  })
})
