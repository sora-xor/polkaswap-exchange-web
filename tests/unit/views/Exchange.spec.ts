import { shallowMount, createLocalVue } from '@vue/test-utils'

import Exchange from '@/views/Exchange.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()

describe('Exchange.vue', () => {
  beforeEach(() => {
    TranslationMock(Exchange)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(Exchange, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
