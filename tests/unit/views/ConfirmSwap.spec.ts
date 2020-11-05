import { shallowMount, createLocalVue } from '@vue/test-utils'

import ConfirmSwap from '@/components/ConfirmSwap.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()

describe('ConfirmSwap.vue', () => {
  beforeEach(() => {
    TranslationMock(ConfirmSwap)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(ConfirmSwap, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
