import { shallowMount } from '@vue/test-utils'

import DialogBase from '@/components/DialogBase.vue'

describe('DialogBase.vue', () => {
  it('should renders correctly', () => {
    const wrapper = shallowMount(DialogBase, {
      propsData: {
        visible: true,
        customClass: 'custom-dialog-class',
        title: 'Dialog title'
      }
    })
    expect(wrapper.element).toMatchSnapshot()
  })
})
