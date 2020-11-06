import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import TransactionSubmit from '@/components/TransactionSubmit.vue'
import { tokens } from '@/mocks/swap'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(SoramitsuElements)

describe('TransactionSubmit.vue', () => {
  let getters
  let store

  beforeEach(() => {
    TranslationMock(TransactionSubmit)

    getters = {
      tokenFrom: () => tokens.XOR,
      tokenTo: () => tokens.KSM,
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
