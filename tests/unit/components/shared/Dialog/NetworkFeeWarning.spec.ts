import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import NetworkFeeWarningDialog from '@/components/shared/Dialog/NetworkFeeWarning.vue';

describe('shared NetworkFeeWarning dialog', () => {
  it('uses warning-specific dialog chrome and closes on warning confirmation', async () => {
    const wrapper = mount(NetworkFeeWarningDialog, {
      props: {
        visible: true,
        fee: '0.1',
      },
      global: {
        stubs: {
          DialogBase: {
            props: ['visible', 'customClass', 'appendToBody', 'modalAppendToBody'],
            emits: ['update:visible'],
            template: '<div :class="customClass"><slot /></div>',
          },
          NetworkFeeWarning: {
            emits: ['confirm'],
            template: '<button class="confirm-warning" @click="$emit(\'confirm\')"></button>',
          },
        },
      },
    });

    expect(wrapper.find('.network-fee-warning-dialog').exists()).toBe(true);

    await wrapper.find('.confirm-warning').trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
  });
});
