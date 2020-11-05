import { shallowMount, createLocalVue } from '@vue/test-utils'

import SwapInfo from '@/components/SwapInfo.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()

describe('SwapInfo.vue', () => {
  beforeEach(() => {
    TranslationMock(SwapInfo)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(SwapInfo, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
