import { mount } from '@vue/test-utils';
import { h, inject } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { STab, STabs } from '@/lib/soramitsu-ui/components/Tabs';

vi.mock('@soramitsu-ui/ui/util', () => ({
  forceInject: (key: symbol) => {
    const injected = inject(key, null);

    if (!injected) {
      throw new Error(`Injection of "${String(key)}" failed`);
    }

    return injected;
  },
}));

describe('STab compatibility', () => {
  it('renders label prop when slot is not provided', () => {
    const wrapper = mount(STabs, {
      props: {
        value: 'one',
      },
      slots: {
        default: () => [h(STab, { name: 'one', label: 'One Label' }), h(STab, { name: 'two', label: 'Two Label' })],
      },
    });

    const labels = wrapper.findAll('[role="tab"]').map((node) => node.text());

    expect(labels).toContain('One Label');
    expect(labels).toContain('Two Label');
  });

  it('does not emit selection when disabled tab is clicked or keyboard-activated', async () => {
    const onInput = vi.fn();
    const wrapper = mount(STabs, {
      props: {
        value: 'one',
        onInput,
      },
      slots: {
        default: () => [h(STab, { name: 'one', label: 'One' }), h(STab, { name: 'two', label: 'Two', disabled: true })],
      },
    });

    const tabs = wrapper.findAll('[role="tab"]');
    const disabledTab = tabs[1];

    await disabledTab?.trigger('click');
    await disabledTab?.trigger('keydown.enter');
    await disabledTab?.trigger('keydown.space');

    expect(onInput).not.toHaveBeenCalled();
  });

  it('uses tab element geometry to align active bar', async () => {
    const wrapper = mount(STabs, {
      props: {
        value: 'two',
      },
      slots: {
        default: () => [h(STab, { name: 'one', label: 'One' }), h(STab, { name: 'two', label: 'Two' })],
      },
    });

    const nav = wrapper.find('.el-tabs__nav').element as HTMLElement;
    const tabs = wrapper.findAll('[role="tab"]');
    const activeTab = tabs[1]?.element as HTMLElement;

    activeTab.style.paddingLeft = '12px';
    activeTab.style.paddingRight = '12px';

    vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 0,
      width: 262,
      height: 42,
      top: 0,
      right: 362,
      bottom: 42,
      left: 100,
      toJSON: () => ({}),
    } as DOMRect);

    vi.spyOn(activeTab, 'getBoundingClientRect').mockReturnValue({
      x: 231,
      y: 0,
      width: 131,
      height: 42,
      top: 0,
      right: 362,
      bottom: 42,
      left: 231,
      toJSON: () => ({}),
    } as DOMRect);

    window.dispatchEvent(new Event('resize'));
    await wrapper.vm.$nextTick();

    const activeBarStyle = wrapper.find('.el-tabs__active-bar').attributes('style');

    expect(activeBarStyle).toContain('width: 107px;');
    expect(activeBarStyle).toContain('translateX(143px)');
  });

  it('renders non-tab slot nodes alongside tab content', () => {
    const wrapper = mount(STabs, {
      props: {
        value: 'assets',
      },
      slots: {
        default: () => [
          h('div', { class: 'tabs-extra-content' }, 'Extra controls'),
          h(STab, { name: 'assets', label: 'Assets' }, () => h('div', { class: 'assets-panel' }, 'Assets panel')),
          h(STab, { name: 'custom', label: 'Custom' }, () => h('div', { class: 'custom-panel' }, 'Custom panel')),
        ],
      },
    });

    expect(wrapper.find('.tabs-extra-content').text()).toBe('Extra controls');
    expect(wrapper.find('.assets-panel').exists()).toBe(true);
    expect(wrapper.find('.custom-panel').exists()).toBe(false);
  });
});
