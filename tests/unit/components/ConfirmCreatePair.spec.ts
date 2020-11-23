import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import DialogBase from '@/components/DialogBase.vue'
import ConfirmCreatePair from '@/components/ConfirmCreatePair.vue'
import { tokens } from '@/mocks/tokens'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(Vuex)
SoramitsuElementsImport(localVue)

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
    const wrapper = shallowMount(DialogBase, {
      propsData: {
        visible: true,
        customClass: '',
        title: 'You will receive'
      },
      slots: {
        // Add ConfirmCreatePair slot
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
