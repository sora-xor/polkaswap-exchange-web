import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Fragment, defineComponent, h, nextTick, ref } from 'vue';

import SPopoverPanel from '@/lib/soramitsu-ui/components/Popover/SPopoverPanel';
import { OVERLAY_TARGET_KEY } from '@/lib/soramitsu-ui/composables/overlayTarget';

describe('SPopoverPanel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('renders popper content only after trigger click', async () => {
    const wrapper = mount(SPopoverPanel, {
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
    const wrapper = mount(SPopoverPanel, {
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

    const openEvents = wrapper.emitted('update:show') ?? [];
    expect(openEvents[0]).toEqual([true]);

    (wrapper.vm as { doClose: () => void }).doClose();
    await nextTick();

    const closeEvents = wrapper.emitted('update:show') ?? [];
    expect(closeEvents[1]).toEqual([false]);
  });

  it('closes visible popover on Escape key press', async () => {
    const wrapper = mount(SPopoverPanel, {
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
    expect(document.body.textContent).toContain('Popover content');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(document.body.textContent).not.toContain('Popover content');
  });

  it('closes visible popover on outside pointer interaction', async () => {
    const wrapper = mount(SPopoverPanel, {
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
    expect(document.body.textContent).toContain('Popover content');

    const outsideTarget = document.createElement('div');
    document.body.appendChild(outsideTarget);

    if ('PointerEvent' in window) {
      outsideTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    } else {
      outsideTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }

    await nextTick();
    expect(document.body.textContent).not.toContain('Popover content');
  });

  it('closes visible popover on navigation hash change', async () => {
    const wrapper = mount(SPopoverPanel, {
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
    expect(document.body.textContent).toContain('Popover content');

    window.dispatchEvent(new Event('hashchange'));
    await nextTick();

    expect(document.body.textContent).not.toContain('Popover content');
  });

  it('closes visible popover on history popstate event', async () => {
    const wrapper = mount(SPopoverPanel, {
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
    expect(document.body.textContent).toContain('Popover content');

    window.dispatchEvent(new PopStateEvent('popstate'));
    await nextTick();

    expect(document.body.textContent).not.toContain('Popover content');
  });

  it('closes visible popover on window resize', async () => {
    const wrapper = mount(SPopoverPanel, {
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
    expect(document.body.textContent).toContain('Popover content');

    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(document.body.textContent).not.toContain('Popover content');
  });

  it('opens popover when reference is a component that does not forward attrs', async () => {
    const OpaqueTrigger = defineComponent({
      name: 'OpaqueTrigger',
      inheritAttrs: false,
      template: '<button class="opaque-trigger">Open</button>',
    });

    const wrapper = mount(SPopoverPanel, {
      attachTo: document.body,
      global: {
        components: {
          OpaqueTrigger,
        },
      },
      props: {
        trigger: 'click',
      },
      slots: {
        reference: '<opaque-trigger />',
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    await wrapper.get('.opaque-trigger').trigger('click');
    await nextTick();

    expect(document.body.textContent).toContain('Popover content');
  });

  it('uses the first element node from reference slot when text nodes are present', async () => {
    const wrapper = mount(SPopoverPanel, {
      attachTo: document.body,
      props: {
        trigger: 'click',
      },
      slots: {
        reference: () => ['\n  ', h('button', { class: 'trigger' }, 'Open')],
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    await wrapper.get('.trigger').trigger('click');
    await nextTick();

    expect(document.body.textContent).toContain('Popover content');
  });

  it('ignores non-vnode slot children before resolving popover trigger', async () => {
    const wrapper = mount(SPopoverPanel, {
      attachTo: document.body,
      props: {
        trigger: 'click',
      },
      slots: {
        reference: () => [false, 0, null, ' ', h('button', { class: 'trigger' }, 'Open')],
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    await wrapper.get('.trigger').trigger('click');
    await nextTick();

    expect(document.body.textContent).toContain('Popover content');
  });

  it('unwraps fragment children in reference slot to resolve trigger element', async () => {
    const wrapper = mount(SPopoverPanel, {
      attachTo: document.body,
      props: {
        trigger: 'click',
      },
      slots: {
        reference: () => h(Fragment, null, ['\n', h('button', { class: 'trigger' }, 'Open')]),
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    await wrapper.get('.trigger').trigger('click');
    await nextTick();

    expect(document.body.textContent).toContain('Popover content');
  });

  it('applies viewport bounds styles to visible popovers', async () => {
    const wrapper = mount(SPopoverPanel, {
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

    const popover = document.body.querySelector('.el-popover');
    expect(popover).not.toBeNull();
    expect(popover?.getAttribute('style')).toContain('max-width: calc(100vw - 16px)');
    expect(popover?.getAttribute('style')).toContain('max-height: calc(100vh - 16px)');
    expect(popover?.getAttribute('style')).toContain('overflow-y: auto');
  });

  it('uses a provided overlay target instead of the document body', async () => {
    const overlayTarget = document.createElement('div');
    document.body.appendChild(overlayTarget);

    const wrapper = mount(SPopoverPanel, {
      attachTo: document.body,
      props: {
        trigger: 'click',
        popperClass: 'test-popper',
      },
      global: {
        provide: {
          [OVERLAY_TARGET_KEY as symbol]: ref(overlayTarget),
        },
      },
      slots: {
        reference: '<button class="trigger">Open</button>',
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    await wrapper.get('.trigger').trigger('click');
    await nextTick();

    expect(overlayTarget.querySelector('.test-popper')).not.toBeNull();
    expect(overlayTarget.textContent).toContain('Popover content');
  });

  it('repositions a visible popover when observed content size changes', async () => {
    const resizeCallbacks: Array<() => void> = [];

    class ResizeObserverMock {
      constructor(callback: () => void) {
        resizeCallbacks.push(callback);
      }

      observe(): void {}

      disconnect(): void {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    const wrapper = mount(SPopoverPanel, {
      attachTo: document.body,
      props: {
        trigger: 'click',
      },
      slots: {
        reference: '<button class="trigger">Open</button>',
        default: '<div class="popover-content">Popover content</div>',
      },
    });

    const trigger = wrapper.get('.trigger').element as HTMLElement;
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      x: 250,
      y: 80,
      width: 50,
      height: 20,
      top: 80,
      right: 300,
      bottom: 100,
      left: 250,
      toJSON: () => ({}),
    } as DOMRect);

    await wrapper.get('.trigger').trigger('click');
    await nextTick();

    const popover = document.body.querySelector('.el-popover') as HTMLElement;
    expect(popover).not.toBeNull();

    let popoverWidth = 120;
    vi.spyOn(popover, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: 0,
          y: 0,
          width: popoverWidth,
          height: 120,
          top: 0,
          right: popoverWidth,
          bottom: 120,
          left: 0,
          toJSON: () => ({}),
        }) as DOMRect
    );

    (wrapper.vm as { updatePopper: () => void }).updatePopper();
    await nextTick();
    expect(popover.style.left).toBe('215px');

    popoverWidth = 1400;
    resizeCallbacks.at(0)?.();
    await nextTick();

    expect(popover.style.left).toBe('8px');
  });

  it('applies temporary slide-in class for header menu poppers on open', async () => {
    vi.useFakeTimers();

    try {
      const wrapper = mount(SPopoverPanel, {
        attachTo: document.body,
        props: {
          trigger: 'click',
          popperClass: 'header-menu',
        },
        slots: {
          reference: '<button class="trigger">Open</button>',
          default: '<div class="popover-content">Popover content</div>',
        },
      });

      await wrapper.get('.trigger').trigger('click');
      await nextTick();

      const openingPopover = document.body.querySelector('.header-menu');
      expect(openingPopover?.classList.contains('slide-in')).toBe(true);

      vi.runAllTimers();
      await nextTick();

      const settledPopover = document.body.querySelector('.header-menu');
      expect(settledPopover?.classList.contains('slide-in')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
