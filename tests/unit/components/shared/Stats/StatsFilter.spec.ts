import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';
import type { SnapshotFilter } from '@/types/filters';

const filters: SnapshotFilter[] = [
  { name: 'all', label: 'All' },
  { name: 'day', label: 'Last 24h' },
];

const mountComponent = (props: Partial<{ value: SnapshotFilter | null; disabled: boolean }> = {}) =>
  mount(StatsFilter, {
    props: {
      filters,
      value: filters[0],
      ...props,
    },
    attachTo: document.body,
    global: {
      stubs: {
        's-button': {
          name: 'SButtonStub',
          emits: ['click'],
          template: '<button class="stats-filter-list-item" @click="$emit(\'click\', $event)"><slot></slot></button>',
        },
        's-icon': {
          template: '<i class="s-icon-stub"></i>',
        },
      },
    },
  });

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StatsFilter.vue', () => {
  it('emits both update:value and input when a filter is selected', async () => {
    const wrapper = mountComponent();
    await nextTick();
    const exposed = (wrapper.vm as { $: { exposed?: { toggleMenu: () => void } } }).$?.exposed;
    expect(exposed).toBeTruthy();
    exposed?.toggleMenu();
    await nextTick();
    const buttons = wrapper.findAllComponents({ name: 'SButtonStub' });
    const target = buttons.find((button) => button.text() === filters[1].label);
    expect(target).toBeTruthy();

    target!.vm.$emit('click', new MouseEvent('click'));
    await nextTick();

    expect(wrapper.emitted('update:value')).toBeTruthy();
    expect(wrapper.emitted('input')).toBeTruthy();
    expect(wrapper.emitted('update:value')?.[0][0]).toEqual(filters[1]);
    expect(wrapper.emitted('input')?.[0][0]).toEqual(filters[1]);

    wrapper.unmount();
  });

  it('removes the document listener when closeMenu is called', async () => {
    const wrapper = mountComponent();
    await nextTick();
    const exposed = (
      wrapper.vm as {
        $: { exposed?: { toggleMenu: () => void; visibility: { value: boolean }; closeMenu: () => void } };
      }
    ).$?.exposed;
    expect(exposed).toBeTruthy();
    const ownerDocument = wrapper.find('.stats-filter').element.ownerDocument;
    const addListenerSpy = vi.spyOn(ownerDocument, 'addEventListener');
    const removeListenerSpy = vi.spyOn(ownerDocument, 'removeEventListener');
    exposed?.toggleMenu();
    await nextTick();
    expect(exposed?.visibility.value).toBe(true);
    expect(addListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));

    const clickListenerCall = addListenerSpy.mock.calls.find(([event]) => event === 'click');
    expect(clickListenerCall).toBeTruthy();
    const clickHandler = clickListenerCall?.[1] as EventListener;
    expect(clickHandler).toBeTypeOf('function');

    exposed?.closeMenu();
    await nextTick();
    expect(exposed?.visibility.value).toBe(false);
    expect(removeListenerSpy).toHaveBeenCalledWith('click', clickHandler);

    wrapper.unmount();
    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });

  it('closes the menu when disabled and removes listeners', async () => {
    const wrapper = mountComponent({ disabled: false });
    await nextTick();
    const exposed = (
      wrapper.vm as {
        $: { exposed?: { toggleMenu: () => void; visibility: { value: boolean }; closeMenu: () => void } };
      }
    ).$?.exposed;
    expect(exposed).toBeTruthy();
    const ownerDocument = wrapper.find('.stats-filter').element.ownerDocument;
    const addListenerSpy = vi.spyOn(ownerDocument, 'addEventListener');
    const removeListenerSpy = vi.spyOn(ownerDocument, 'removeEventListener');
    exposed?.toggleMenu();
    await nextTick();
    expect(exposed?.visibility.value).toBe(true);
    expect(addListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));

    const clickListenerCall = addListenerSpy.mock.calls.find(([event]) => event === 'click');
    expect(clickListenerCall).toBeTruthy();
    const clickHandler = clickListenerCall?.[1] as EventListener;
    expect(clickHandler).toBeTypeOf('function');

    await wrapper.setProps({ disabled: true });
    expect(wrapper.props('disabled')).toBe(true);
    await nextTick();
    await nextTick();
    await nextTick();

    exposed?.closeMenu();
    await nextTick();

    expect(exposed?.visibility.value).toBe(false);
    exposed?.toggleMenu();
    await nextTick();
    expect(exposed?.visibility.value).toBe(false);
    expect(removeListenerSpy).toHaveBeenCalledWith('click', clickHandler);

    wrapper.unmount();
    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });
});
