import { shallowMount, createLocalVue } from '@vue/test-utils'
import SoramitsuElements from '@soramitsu/soramitsu-js-ui'

import Exchange from '@/views/Exchange.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()
localVue.use(SoramitsuElements)

describe('Exchange.vue', () => {
  beforeEach(() => {
    TranslationMock(Exchange)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(Exchange, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
