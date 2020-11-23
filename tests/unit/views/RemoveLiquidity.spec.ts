import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import RemoveLiquidity from '@/views/RemoveLiquidity.vue'
import { tokens } from '@/mocks/tokens'
import { liquidity } from '@/mocks/liquidity'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
SoramitsuElementsImport(localVue)

describe('RemoveLiquidity.vue', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    TranslationMock(RemoveLiquidity)

    actions = {
      getLiquidity: jest.fn()
    }

    getters = {
      liquidity: () => liquidity[0]
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
      mocks: {
        $route: {
          params: {
            id: 1
          }
        }
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
