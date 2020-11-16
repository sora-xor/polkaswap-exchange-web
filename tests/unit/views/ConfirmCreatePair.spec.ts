import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import ConfirmCreatePair from '@/components/ConfirmCreatePair.vue'
import { tokens } from '@/mocks/tokens'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(SoramitsuElements)

describe('ConfirmCreatePair.vue', () => {
  let getters
  let store

  beforeEach(() => {
    TranslationMock(ConfirmCreatePair)

    getters = {
      firstToken: () => tokens[0],
      secondToken: () => tokens[1],
      firstTokenValue: () => 12,
      secondTokenValue: () => 12
    }

    store = new Vuex.Store({
      modules: {
        createPair: {
          namespaced: true,
          getters
        }
      }
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(ConfirmCreatePair, { localVue, store, propsData: { visible: true } })
    expect(wrapper.element).toMatchSnapshot()
  })
})
