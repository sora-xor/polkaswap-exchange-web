import { shallowMount, createLocalVue } from '@vue/test-utils'

import Pool from '@/components/Pool.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()

describe('Pool.vue', () => {
  beforeEach(() => {
    TranslationMock(Pool)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(Pool, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
