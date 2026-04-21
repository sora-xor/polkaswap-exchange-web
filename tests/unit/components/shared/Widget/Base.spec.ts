import { mount } from '@vue/test-utils';
import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from 'vitest';

const observeMock = vi.fn();
const disconnectMock = vi.fn();
const resizeObserverInstances: ResizeObserverMock[] = [];
const requestAnimationFrameMock = vi.fn<(callback: FrameRequestCallback) => number>();
const cancelAnimationFrameMock = vi.fn<(handle: number) => void>();
const animationFrameCallbacks = new Map<number, FrameRequestCallback>();
let animationFrameHandle = 0;

class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverInstances.push(this);
  }
  observe = observeMock;
  disconnect = disconnectMock;
}

class MutationObserverMock {
  constructor() {}
  observe = vi.fn();
  disconnect = vi.fn();
}

const SCardStub = {
  name: 'SCardStub',
  props: ['size', 'primary', 'shadow'],
  template: '<div class="s-card-stub"><slot name="header" /><slot /></div>',
};

const SButtonStub = {
  name: 'SButtonStub',
  emits: ['click'],
  template:
    '<button class="s-button-stub" @click="$emit(\'click\')"><span class="icon-slot"><slot name="icon"></slot></span><span class="default-slot"><slot></slot></span></button>',
};

const STooltipStub = {
  name: 'STooltipStub',
  props: ['content'],
  template: '<span class="s-tooltip-stub"><slot /></span>',
};

const SIconStub = {
  name: 'SIconStub',
  props: ['name'],
  template: '<i class="s-icon-stub" :data-name="name"></i>',
};

const InfoLineStub = vi.hoisted(() => ({
  name: 'InfoLineStub',
  props: ['label', 'labelTooltip', 'value'],
  template: '<div class="info-line-stub"><slot /></div>',
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      InfoLine: InfoLineStub,
    },
  });
});

import BaseWidget from '@/components/shared/Widget/Base.vue';

function flushAnimationFrame(timestamp = 0): void {
  const callbacks = Array.from(animationFrameCallbacks.values());
  animationFrameCallbacks.clear();
  callbacks.forEach((callback) => callback(timestamp));
}

describe('BaseWidget', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock as unknown as ResizeObserver);
    vi.stubGlobal('MutationObserver', MutationObserverMock as unknown as MutationObserver);
    requestAnimationFrameMock.mockImplementation((callback: FrameRequestCallback) => {
      animationFrameHandle += 1;
      animationFrameCallbacks.set(animationFrameHandle, callback);
      return animationFrameHandle;
    });
    cancelAnimationFrameMock.mockImplementation((handle: number) => {
      animationFrameCallbacks.delete(handle);
    });
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
  });

  beforeEach(() => {
    observeMock.mockClear();
    disconnectMock.mockClear();
    resizeObserverInstances.length = 0;
    requestAnimationFrameMock.mockClear();
    cancelAnimationFrameMock.mockClear();
    animationFrameCallbacks.clear();
    animationFrameHandle = 0;
  });

  afterEach(() => {
    delete (window as any).documentPictureInPicture;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mountComponent = (props?: Record<string, unknown>, slots?: Record<string, string>) =>
    mount(BaseWidget, {
      props,
      slots,
      global: {
        stubs: {
          's-card': SCardStub,
          's-button': SButtonStub,
          's-tooltip': STooltipStub,
          's-icon': SIconStub,
        },
        directives: {
          loading: {
            mounted: () => undefined,
          },
        },
      },
    });

  const mockRect = (element: Element, rect: Partial<DOMRect>): void => {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          x: rect.left ?? 0,
          y: rect.top ?? 0,
          top: rect.top ?? 0,
          left: rect.left ?? 0,
          bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
          right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
          width: rect.width ?? 0,
          height: rect.height ?? 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });
  };

  it('renders title slot and applies capitalize', () => {
    const wrapper = mountComponent({ title: 'overview' }, { default: '<div class="content">Body</div>' });

    expect(wrapper.find('.base-widget-title').text()).toContain('Overview');
  });

  it('adds layout modifiers when props provided', () => {
    const wrapper = mountComponent({ full: true, flat: true, delimeter: true }, { default: 'content' });

    const container = wrapper.find('.base-widget');
    expect(container.classes()).toEqual(expect.arrayContaining(['full', 'flat', 'delimeter']));
  });

  it('hides pip control when disabled', () => {
    const wrapper = mountComponent({ pipDisabled: true }, { default: 'content' });

    expect(wrapper.find('.base-widget-pip').exists()).toBe(false);
  });

  it('renders pip icon when picture-in-picture is available', () => {
    Object.defineProperty(window, 'documentPictureInPicture', {
      value: {},
      configurable: true,
    });

    const wrapper = mountComponent({ title: 'details' }, { default: 'content' });

    expect(wrapper.find('.base-widget-pip').exists()).toBe(true);
    expect(wrapper.find('.base-widget-pip .s-icon-stub[data-name="finance-receive-24"]').exists()).toBe(true);
  });

  it('reports required widget height from expanded content, not the stale widget box height', async () => {
    const onResize = vi.fn();
    const wrapper = mountComponent({ id: 'swapForm', onResize }, { default: '<div class="content">Body</div>' });

    const containerEl = wrapper.find('.s-card-stub').element as HTMLElement;
    const contentEl = wrapper.find('.base-widget-content').element as HTMLElement;
    const childEl = wrapper.find('.content').element as HTMLElement;

    mockRect(containerEl, { top: 0, left: 0, width: 320, height: 504 });
    mockRect(contentEl, { top: 56, left: 0, width: 288, height: 516 });
    mockRect(childEl, { top: 56, left: 0, width: 288, height: 516 });
    Object.defineProperty(contentEl, 'scrollHeight', {
      configurable: true,
      value: 516,
    });
    Object.defineProperty(childEl, 'scrollHeight', {
      configurable: true,
      value: 516,
    });

    resizeObserverInstances.at(-1)?.callback([], {} as ResizeObserver);
    flushAnimationFrame();
    await wrapper.vm.$nextTick();

    expect(onResize).toHaveBeenCalledWith(
      'swapForm',
      expect.objectContaining({
        width: 320,
        height: 572,
      })
    );
  });

  it('batches repeated resize observer updates into a single animation frame', async () => {
    const onResize = vi.fn();
    const wrapper = mountComponent({ id: 'swapForm', onResize }, { default: '<div class="content">Body</div>' });

    const containerEl = wrapper.find('.s-card-stub').element as HTMLElement;
    const contentEl = wrapper.find('.base-widget-content').element as HTMLElement;
    const childEl = wrapper.find('.content').element as HTMLElement;

    mockRect(containerEl, { top: 0, left: 0, width: 320, height: 504 });
    mockRect(contentEl, { top: 56, left: 0, width: 288, height: 516 });
    mockRect(childEl, { top: 56, left: 0, width: 288, height: 516 });
    Object.defineProperty(contentEl, 'scrollHeight', {
      configurable: true,
      value: 516,
    });
    Object.defineProperty(childEl, 'scrollHeight', {
      configurable: true,
      value: 516,
    });

    resizeObserverInstances.at(-1)?.callback([], {} as ResizeObserver);
    resizeObserverInstances.at(-1)?.callback([], {} as ResizeObserver);

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);

    flushAnimationFrame();
    await wrapper.vm.$nextTick();

    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it('observes direct content children so nested layout changes can trigger resize updates', () => {
    const wrapper = mountComponent({ id: 'swapForm' }, { default: '<div class="content">Body</div>' });

    const contentEl = wrapper.find('.base-widget-content').element;
    const childEl = wrapper.find('.content').element;

    expect(observeMock).toHaveBeenCalledWith(contentEl);
    expect(observeMock).toHaveBeenCalledWith(childEl);
  });
});
