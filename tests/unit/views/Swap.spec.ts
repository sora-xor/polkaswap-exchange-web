import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import Swap from '@/components/Swap.vue'
import { tokens } from '@/mocks/tokens'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(SoramitsuElements)

describe('Swap.vue', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    TranslationMock(Swap)

    actions = {
      connectWallet: jest.fn(),
      setTokenFrom: jest.fn(),
      setTokenTo: jest.fn(),
      setFromValue: jest.fn(),
      setToValue: jest.fn(),
      setTokenFromPrice: jest.fn()
    }

    getters = {
      isWalletConnected: () => false,
      tokenFrom: () => tokens[0],
      tokenTo: () => tokens[1],
      fromValue: () => 100,
      toValue: () => 45.4545,
      isSwapConfirmed: () => false
    }

    store = new Vuex.Store({
      actions,
      getters
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(Swap, { localVue, store })
    expect(wrapper.element).toMatchSnapshot()
  })
})
