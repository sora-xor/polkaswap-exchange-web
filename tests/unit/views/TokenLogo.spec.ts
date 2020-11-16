import { shallowMount, createLocalVue } from '@vue/test-utils'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'
import { tokens } from '@/mocks/tokens'

import TokenLogo from '@/components/TokenLogo.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(SoramitsuElements)

describe('TokenLogo.vue', () => {
  beforeEach(() => {
    TranslationMock(TokenLogo)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(TokenLogo, {
      localVue,
      propsData: {
        token: tokens[0].symbol
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
