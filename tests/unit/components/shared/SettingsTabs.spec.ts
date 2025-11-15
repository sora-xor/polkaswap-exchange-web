import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SettingsTabs from '@/components/shared/Settings/Tabs.vue';

const STabsStub = {
  name: 'STabsStub',
  props: ['value', 'type'],
  emits: ['input'],
  template: '<div class="s-tabs-stub"><slot /></div>',
};

const STabStub = {
  name: 'STabStub',
  props: ['name', 'label'],
  template: '<div class="s-tab-stub"><slot /></div>',
};

describe('SettingsTabs', () => {
  const mountComponent = (props?: Record<string, unknown>) =>
    mount(SettingsTabs, {
      props,
      global: {
        stubs: {
          's-tabs': STabsStub,
          's-tab': STabStub,
        },
      },
    });

  it('renders tabs with sanitized content', () => {
    const wrapper = mountComponent({
      value: 'tab1',
      tabs: [
        {
          name: 'tab1',
          label: 'Tab 1',
          content: '<p>Hello <script>alert(1)</script><a href="http://example.com">link</a></p>',
        },
      ],
    });

    const content = wrapper.find('.settings-content');
    expect(content.text()).toContain('link');
    expect(content.html()).not.toContain('<script>');
  });

  it('passes value to tabs', () => {
    const wrapper = mountComponent({
      value: 'settings',
      tabs: [],
    });

    expect(wrapper.findComponent(STabsStub).props('value')).toBe('settings');
  });
});
