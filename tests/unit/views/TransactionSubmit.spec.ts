import { shallowMount, createLocalVue } from '@vue/test-utils'

import TransactionSubmit from '@/components/TransactionSubmit.vue'
import { TranslationMock } from '../../utils'

const localVue = createLocalVue()

describe('TransactionSubmit.vue', () => {
  beforeEach(() => {
    TranslationMock(TransactionSubmit)
  })

  it('should renders correctly', () => {
    const wrapper = shallowMount(TransactionSubmit, { localVue })
    expect(wrapper.element).toMatchSnapshot()
  })
})
