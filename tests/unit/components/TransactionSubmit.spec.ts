import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import TransactionSubmit from '@/components/TransactionSubmit.vue'
import { tokens } from '@/mocks/tokens'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
SoramitsuElementsImport(localVue)

describe('TransactionSubmit.vue', () => {
  let getters
  let store

  beforeEach(() => {
    TranslationMock(TransactionSubmit)

    getters = {
      tokenFrom: () => tokens[0],
      tokenTo: () => tokens[1],
      fromValue: () => 100,
      toValue: () => 45.4545
    }

    store = new Vuex.Store({
      getters
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(TransactionSubmit, { localVue, store })
    expect(wrapper.element).toMatchSnapshot()
  })
})
