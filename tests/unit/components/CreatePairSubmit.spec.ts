import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import CreatePairSubmit from '@/components/CreatePairSubmit.vue'
import { tokens } from '@/mocks/tokens'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
SoramitsuElementsImport(localVue)

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
    const wrapper = shallowMount(CreatePairSubmit, {
      localVue,
      store,
      propsData: {
        visible: true,
        title: 'Transaction submitted'
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
