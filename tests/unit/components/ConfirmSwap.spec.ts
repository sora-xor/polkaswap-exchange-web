import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import DialogBase from '@/components/DialogBase.vue'
import ConfirmSwap from '@/components/ConfirmSwap.vue'
import { tokens } from '@/mocks/tokens'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
SoramitsuElementsImport(localVue)

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
    const wrapper = shallowMount(DialogBase, {
      propsData: {
        visible: true,
        customClass: '',
        title: 'Confirm Swap'
      },
      slots: {
        // Add ConfirmSwap slot
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
