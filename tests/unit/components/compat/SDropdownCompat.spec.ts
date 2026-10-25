import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import SDropdown from '@/lib/soramitsu-ui/components/Select/SDropdown.vue';
import SDropdownItem from '@/lib/soramitsu-ui/components/Select/SDropdownItem.vue';

const mountedWrappers: Array<{ unmount: () => void }> = [];

const SIconStub = {
  name: 'SIconStub',
  props: ['name', 'size'],
  template: '<i class="s-icon-stub" :class="$attrs.class" :data-icon="name"></i>',
};

const mountDropdown = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(SDropdown, {
    attachTo: document.body,
    props,
    global: {
      components: {
        SDropdownItem,
        's-dropdown-item': SDropdownItem,
      },
      stubs: {
        's-icon': SIconStub,
      },
    },
    slots: {
      default: '<span class="trigger-content">Open</span>',
      menu: `
        <s-dropdown-item value="foo">Foo</s-dropdown-item>
        <s-dropdown-item value="bar">Bar</s-dropdown-item>
      `,
    },
  });

  mountedWrappers.push(wrapper);

  return wrapper;
};

describe('SDropdown', () => {
  afterEach(() => {
    while (mountedWrappers.length) {
      mountedWrappers.pop()?.unmount();
    }
    document.body.innerHTML = '';
  });

  it('emits selected value and hides menu by default', async () => {
    const wrapper = mountDropdown();
    const dropdownRef = (wrapper.vm as any).$refs.dropdown as { handleClick: () => void };

    dropdownRef.handleClick();
    await nextTick();

    const firstItem = document.body.querySelector('.el-dropdown-menu__item') as HTMLElement;
    expect(firstItem).not.toBeNull();

    firstItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(wrapper.emitted('select')?.[0]).toEqual(['foo']);
    expect((wrapper.vm as unknown as { visible: boolean }).visible).toBe(false);
  });

  it('keeps menu visible when hideOnClick is disabled', async () => {
    const wrapper = mountDropdown({ hideOnClick: false });
    const dropdownRef = (wrapper.vm as any).$refs.dropdown as { handleClick: () => void };

    dropdownRef.handleClick();
    await nextTick();

    const firstItem = document.body.querySelector('.el-dropdown-menu__item') as HTMLElement;
    firstItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(wrapper.emitted('select')?.[0]).toEqual(['foo']);
    expect((wrapper.vm as unknown as { visible: boolean }).visible).toBe(true);
  });

  it('exposes a legacy handleClick on $refs.dropdown for class-based callers', async () => {
    const wrapper = mountDropdown();
    const dropdownRef = (wrapper.vm as any).$refs.dropdown as { handleClick: () => void };

    expect(typeof dropdownRef.handleClick).toBe('function');

    dropdownRef.handleClick();
    await nextTick();
    await nextTick();
    expect((wrapper.vm as unknown as { visible: boolean }).visible).toBe(true);

    dropdownRef.handleClick();
    await nextTick();
    await nextTick();
    expect((wrapper.vm as unknown as { visible: boolean }).visible).toBe(false);
  });

  it('forwards class, style and data attributes to the dropdown trigger element', () => {
    const wrapper = mount(SDropdown, {
      attrs: {
        class: 'custom-trigger-class',
        style: 'border: 1px solid red;',
        'data-test-id': 'header-settings-trigger',
      },
      slots: {
        default: '<span>Open</span>',
        menu: '<s-dropdown-item value="foo">Foo</s-dropdown-item>',
      },
      global: {
        components: {
          SDropdownItem,
          's-dropdown-item': SDropdownItem,
        },
      },
    });

    mountedWrappers.push(wrapper);

    const trigger = wrapper.get('.s-dropdown');
    expect(trigger.classes()).toContain('custom-trigger-class');
    expect(trigger.attributes('data-test-id')).toBe('header-settings-trigger');
    expect(trigger.attributes('style')).toContain('border: 1px solid red');
  });

  it('closes an open dropdown on window resize', async () => {
    const wrapper = mountDropdown();
    const dropdownRef = (wrapper.vm as any).$refs.dropdown as { handleClick: () => void };

    dropdownRef.handleClick();
    await nextTick();
    expect((wrapper.vm as unknown as { visible: boolean }).visible).toBe(true);

    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect((wrapper.vm as unknown as { visible: boolean }).visible).toBe(false);
  });

  it('renders legacy dropdown arrow icon class for button triggers', () => {
    const wrapper = mountDropdown();
    const arrow = wrapper.get('.s-dropdown__arrow');

    expect(arrow.attributes('data-icon')).toBe('el-icon-arrow-down el-icon--right');
  });
});
