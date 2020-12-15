import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import VueRouter from 'vue-router'

import RemoveLiquidity from '@/views/RemoveLiquidity.vue'
import { tokens } from '../../mocks/tokens'
import { liquidities } from '../../mocks/liquidity'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
SoramitsuElementsImport(localVue)
localVue.use(VueRouter)
const router = new VueRouter()

describe('RemoveLiquidity.vue', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    TranslationMock(RemoveLiquidity)

    actions = {
      getLiquidity: jest.fn(),
      setRemovePart: jest.fn()
    }

    getters = {
      liquidity: () => liquidities[0],
      firstToken: () => tokens[0],
      secondToken: () => tokens[1],
      removePart: () => 100,
      liquidityAmount: () => 100,
      firstTokenAmount: () => 100,
      secondTokenAmount: () => 100,
      liquidityBalance: () => 100,
      firstTokenBalance: () => 100,
      secondTokenBalance: () => 100
    }

    store = new Vuex.Store({
      modules: {
        removeLiquidity: {
          namespaced: true,
          actions,
          getters
        }
      },
      actions: {
        getTokens: jest.fn()
      },
      getters: {
        tokens: () => tokens
      }
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(RemoveLiquidity, {
      localVue,
      store,
      router
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
