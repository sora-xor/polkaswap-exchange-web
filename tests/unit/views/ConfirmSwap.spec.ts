import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import ConfirmSwap from '@/components/ConfirmSwap.vue'
import { tokens } from '@/mocks/tokens'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(SoramitsuElements)

describe('ConfirmSwap.vue', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    TranslationMock(ConfirmSwap)

    actions = {
      setSwapConfirm: jest.fn()
    }

    getters = {
      tokenFrom: () => tokens[0],
      tokenTo: () => tokens[1],
      fromValue: () => 150.123654,
      toValue: () => 0
    }

    store = new Vuex.Store({
      actions,
      getters
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(ConfirmSwap, { localVue, store })
    expect(wrapper.element).toMatchSnapshot()
  })
})
