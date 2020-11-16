import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import CreatePair from '@/views/CreatePair.vue'
import { tokens } from '@/mocks/tokens'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(SoramitsuElements)

describe('CreatePair.vue', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    TranslationMock(CreatePair)

    actions = {
      setFirstToken: jest.fn(),
      setSecondToken: jest.fn(),
      setFirstTokenValue: jest.fn(),
      setSecondTokenValue: jest.fn()
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
    const wrapper = shallowMount(CreatePair, { localVue, store })
    expect(wrapper.element).toMatchSnapshot()
  })
})
