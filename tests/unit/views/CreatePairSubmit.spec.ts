import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import CreatePairSubmit from '@/components/CreatePairSubmit.vue'
import { tokens } from '@/mocks/tokens'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(SoramitsuElements)

describe('CreatePairSubmit.vue', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    TranslationMock(CreatePairSubmit)

    actions = {
      createPair: jest.fn()
    }

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
          actions,
          getters
        }
      }
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(CreatePairSubmit, { localVue, store })
    expect(wrapper.element).toMatchSnapshot()
  })
})
