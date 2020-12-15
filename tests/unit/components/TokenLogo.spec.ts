import { shallowMount, createLocalVue } from '@vue/test-utils'

import TokenLogo from '@/components/TokenLogo.vue'
import { tokens } from '../../mocks/tokens'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
SoramitsuElementsImport(localVue)

describe('TokenLogo.vue', () => {
  beforeEach(() => {
    TranslationMock(TokenLogo)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(TokenLogo, {
      localVue,
      propsData: {
        token: tokens[0]
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
