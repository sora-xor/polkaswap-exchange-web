import { shallowMount, createLocalVue } from '@vue/test-utils'

import Swap from '@/components/Swap.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()

describe('Swap.vue', () => {
  beforeEach(() => {
    TranslationMock(Swap)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(Swap, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
