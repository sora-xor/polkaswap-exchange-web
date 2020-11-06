import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import SwapInfo from '@/components/SwapInfo.vue'
import { tokens, slippageTolerance, liquidityProviderFee } from '@/mocks/swap'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(SoramitsuElements)

describe('SwapInfo.vue', () => {
  let getters
  let store

  beforeEach(() => {
    TranslationMock(SwapInfo)

    getters = {
      tokenFrom: () => tokens.XOR,
      tokenTo: () => tokens.KSM,
      toValue: () => 100,
      isTokenFromPrice: () => true,
      slippageTolerance: () => slippageTolerance,
      liquidityProviderFee: () => liquidityProviderFee
    }

    store = new Vuex.Store({
      getters
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(SwapInfo, { localVue, store })
    expect(wrapper.element).toMatchSnapshot()
  })
})
