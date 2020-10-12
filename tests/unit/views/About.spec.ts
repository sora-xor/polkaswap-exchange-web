import { shallowMount, createLocalVue } from '@vue/test-utils'

import About from '@/views/About.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()

describe('About.vue', () => {
  beforeEach(() => {
    TranslationMock(About)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(About, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
