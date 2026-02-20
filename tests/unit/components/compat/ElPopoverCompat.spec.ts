import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import ElPopoverCompat from '@/components/compat/ElPopoverCompat';

describe('ElPopoverCompat', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders popper content only after trigger click', async () => {
    const wrapper = mount(ElPopoverCompat, {
      attachTo: document.body,
      props: {
        trigger: 'click',
        popperClass: 'test-popper',
      },
      slots: {
        reference: '<button class="trigger">Open</button>',
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    expect(document.body.textContent).not.toContain('Popover content');

    await wrapper.get('.trigger').trigger('click');
    await nextTick();

    expect(document.body.textContent).toContain('Popover content');
    expect(document.body.querySelector('.test-popper')).not.toBeNull();
  });

  it('emits model updates and supports imperative close', async () => {
    const wrapper = mount(ElPopoverCompat, {
      attachTo: document.body,
      props: {
        trigger: 'click',
      },
      slots: {
        reference: '<button class="trigger">Open</button>',
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    await wrapper.get('.trigger').trigger('click');
    await nextTick();

    const openEvents = wrapper.emitted('update:modelValue') ?? [];
    expect(openEvents[0]).toEqual([true]);

    (wrapper.vm as { doClose: () => void }).doClose();
    await nextTick();

    const closeEvents = wrapper.emitted('update:modelValue') ?? [];
    expect(closeEvents[1]).toEqual([false]);
  });
});
