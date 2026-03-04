import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import SDropdownCompat from '@/components/compat/SDropdownCompat.vue';
import SDropdownItemCompat from '@/components/compat/SDropdownItemCompat.vue';

const mountDropdown = (props: Record<string, unknown> = {}) =>
  mount(SDropdownCompat, {
    attachTo: document.body,
    props,
    global: {
      components: {
        SDropdownItem: SDropdownItemCompat,
        's-dropdown-item': SDropdownItemCompat,
      },
      stubs: {
        'el-popover': false,
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

describe('SDropdownCompat', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('emits selected value and hides menu by default', async () => {
    const wrapper = mountDropdown();

    await wrapper.get('.s-dropdown').trigger('click');
    await nextTick();

    const firstItem = document.body.querySelector('.el-dropdown-menu__item') as HTMLElement;
    expect(firstItem).not.toBeNull();

    firstItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(wrapper.emitted('select')?.[0]).toEqual(['foo']);
    expect(document.body.querySelector('.el-dropdown-menu__item')).toBeNull();
  });

  it('keeps menu visible when hideOnClick is disabled', async () => {
    const wrapper = mountDropdown({ hideOnClick: false });

    await wrapper.get('.s-dropdown').trigger('click');
    await nextTick();

    const firstItem = document.body.querySelector('.el-dropdown-menu__item') as HTMLElement;
    firstItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(wrapper.emitted('select')?.[0]).toEqual(['foo']);
    expect(document.body.querySelectorAll('.el-dropdown-menu__item').length).toBeGreaterThan(0);
  });

  it('exposes a legacy handleClick on $refs.dropdown for class-based callers', async () => {
    const wrapper = mountDropdown();
    const dropdownRef = (wrapper.vm as any).$refs.dropdown as { handleClick: () => void };

    expect(typeof dropdownRef.handleClick).toBe('function');

    dropdownRef.handleClick();
    await nextTick();
    await nextTick();
    expect(document.body.querySelectorAll('.el-dropdown-menu__item').length).toBeGreaterThan(0);

    dropdownRef.handleClick();
    await nextTick();
    await nextTick();
    expect(document.body.querySelector('.el-dropdown-menu__item')).toBeNull();
  });

  it('forwards class, style and data attributes to the dropdown trigger element', () => {
    const wrapper = mount(SDropdownCompat, {
      attrs: {
        class: 'custom-trigger-class',
        style: 'border: 1px solid red;',
        'data-test-id': 'header-settings-trigger',
      },
      slots: {
        default: '<span>Open</span>',
      },
    });

    const trigger = wrapper.get('.s-dropdown');
    expect(trigger.classes()).toContain('custom-trigger-class');
    expect(trigger.attributes('data-test-id')).toBe('header-settings-trigger');
    expect(trigger.attributes('style')).toContain('border: 1px solid red');
  });

  it('closes an open dropdown on window resize', async () => {
    const wrapper = mountDropdown();

    await wrapper.get('.s-dropdown').trigger('click');
    await nextTick();
    expect(document.body.querySelectorAll('.el-dropdown-menu__item').length).toBeGreaterThan(0);

    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(document.body.querySelector('.el-dropdown-menu__item')).toBeNull();
  });
});
