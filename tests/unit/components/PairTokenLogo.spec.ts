import { shallowMount, createLocalVue } from '@vue/test-utils'

import { tokens } from '@/mocks/tokens'
import PairTokenLogo from '@/components/PairTokenLogo.vue'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
SoramitsuElementsImport(localVue)

describe('TokenLogo.vue', () => {
  beforeEach(() => {
    TranslationMock(PairTokenLogo)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(PairTokenLogo, {
      localVue,
      propsData: {
        firstToken: tokens[0],
        secondToken: tokens[1],
        size: 'mini'
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
