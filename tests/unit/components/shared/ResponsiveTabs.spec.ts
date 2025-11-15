import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const DropdownStub = {
  name: 'SDropdownStub',
  emits: ['select'],
  template: '<div class="dropdown-stub"><slot /> <div class="menu"><slot name="menu" /></div></div>',
};

const DropdownItemStub = {
  name: 'SDropdownItemStub',
  props: ['value', 'icon', 'disabled'],
  template: '<div class="dropdown-item" @click="$emit(\'click\', value)"><slot /></div>',
};

const TabsStub = {
  name: 'STabsStub',
  props: ['value'],
  emits: ['input'],
  template: '<div class="tabs-stub" @click="$emit(\'input\', value)"><slot /></div>',
};

const TabStub = {
  name: 'STabStub',
  props: ['name', 'label', 'disabled'],
  template: '<div class="tab-stub" :data-name="name">{{ label }}<slot /></div>',
};

import ResponsiveTabs from '@/components/shared/ResponsiveTabs.vue';

describe('ResponsiveTabs', () => {
  const sampleTabs = [
    { name: 'overview', label: 'Overview' },
    { name: 'details', label: 'Details' },
  ];

  const mountComponent = (props?: Record<string, unknown>) =>
    mount(ResponsiveTabs, {
      props: {
        value: 'overview',
        tabs: sampleTabs,
        ...props,
      },
      global: {
        stubs: {
          's-dropdown': DropdownStub,
          's-dropdown-item': DropdownItemStub,
          's-tabs': TabsStub,
          's-tab': TabStub,
        },
      },
    });

  it('renders dropdown when mobile and emits input on selection', async () => {
    const wrapper = mountComponent({ isMobile: true });

    expect(wrapper.find('.dropdown-stub').exists()).toBe(true);
    expect(wrapper.text()).toContain('Overview');

    const dropdown = wrapper.findComponent(DropdownStub);
    dropdown.vm.$emit('select', 'details');
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe('details');
  });

  it('renders tabs when not mobile and updates value', async () => {
    const wrapper = mountComponent({ isMobile: false });

    expect(wrapper.find('.tabs-stub').exists()).toBe(true);
    const tabs = wrapper.findAll('.tab-stub');
    expect(tabs).toHaveLength(2);
    expect(wrapper.text()).toContain('Overview');

    wrapper.findComponent(TabsStub).vm.$emit('input', 'overview');
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe('overview');
  });
});
