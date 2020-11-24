import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import { tokens } from '@/mocks/tokens'
import SelectToken from '@/components/SelectToken.vue'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
SoramitsuElementsImport(localVue)

describe('SelectToken.vue', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    TranslationMock(SelectToken)

    actions = {
      getTokens: jest.fn()
    }

    getters = {
      tokens: () => tokens
    }

    store = new Vuex.Store({
      actions,
      getters
    })
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(SelectToken, {
      localVue,
      store,
      propsData: {
        visible: true,
        title: 'Select a token'
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })

  // TODO: fix the test
  it('should close correctly', async () => {
    const wrapper = shallowMount(SelectToken, {
      localVue,
      store,
      propsData: {
        visible: true,
        title: 'Select a token'
      }
    })
    const token = wrapper.find('.token-item')
    token.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
