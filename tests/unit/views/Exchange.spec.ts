import { shallowMount, createLocalVue } from '@vue/test-utils'

import Exchange from '@/views/Exchange.vue'
import { SoramitsuElementsImport, TranslationMock } from '../../utils'

const localVue = createLocalVue()
SoramitsuElementsImport(localVue)

describe('Exchange.vue', () => {
  beforeEach(() => {
    TranslationMock(Exchange)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(Exchange, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
