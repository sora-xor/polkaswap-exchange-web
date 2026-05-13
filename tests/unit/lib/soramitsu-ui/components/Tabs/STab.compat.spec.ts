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

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

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

  it('preserves vnode label content when tab labels are provided through the default slot', () => {
    const wrapper = mount(STabs, {
      props: {
        value: 'one',
      },
      slots: {
        default: () => [
          h(STab, { name: 'one' }, () => [h('span', { class: 'slot-label' }, 'One'), h('i', { class: 'slot-icon' })]),
          h(STab, { name: 'two' }, () => 'Two'),
        ],
      },
    });

    const firstTab = wrapper.findAll('[role="tab"]')[0];

    expect(firstTab?.text()).toContain('One');
    expect(firstTab?.find('.slot-label').exists()).toBe(true);
    expect(firstTab?.find('.slot-icon').exists()).toBe(true);
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

  it('recomputes active bar when observed tab geometry changes after mount', async () => {
    ResizeObserverMock.instances = [];
    vi.stubGlobal('ResizeObserver', ResizeObserverMock as unknown as ResizeObserver);
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
    try {
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

      let activeWidth = 90;

      vi.spyOn(activeTab, 'getBoundingClientRect').mockImplementation(
        () =>
          ({
            x: 231,
            y: 0,
            width: activeWidth,
            height: 42,
            top: 0,
            right: 231 + activeWidth,
            bottom: 42,
            left: 231,
            toJSON: () => ({}),
          }) as DOMRect
      );

      await wrapper.vm.$nextTick();

      const lastCall = ResizeObserverMock.instances.at(-1);

      expect(lastCall).toBeTruthy();

      activeWidth = 131;
      lastCall?.trigger();
      await wrapper.vm.$nextTick();

      const activeBarStyle = wrapper.find('.el-tabs__active-bar').attributes('style');

      expect(activeBarStyle).toContain('width: 107px;');
      expect(activeBarStyle).toContain('translateX(143px)');
    } finally {
      requestAnimationFrameSpy.mockRestore();
      vi.unstubAllGlobals();
    }
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

  it('does not evaluate inactive labelled tab content while parsing tab labels', () => {
    const activeSlot = vi.fn(() => h('div', { class: 'assets-panel' }, 'Assets panel'));
    const inactiveSlot = vi.fn(() => h('div', { class: 'custom-panel' }, 'Custom panel'));

    const wrapper = mount(STabs, {
      props: {
        value: 'assets',
      },
      slots: {
        default: () => [
          h(STab, { name: 'assets', label: 'Assets' }, activeSlot),
          h(STab, { name: 'custom', label: 'Custom' }, inactiveSlot),
        ],
      },
    });

    expect(wrapper.find('.assets-panel').exists()).toBe(true);
    expect(activeSlot).toHaveBeenCalled();
    expect(inactiveSlot).not.toHaveBeenCalled();
  });
});
