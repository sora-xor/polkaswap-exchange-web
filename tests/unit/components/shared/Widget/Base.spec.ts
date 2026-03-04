import { mount } from '@vue/test-utils';
import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from 'vitest';

const observeMock = vi.fn();
const disconnectMock = vi.fn();

class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
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

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      InfoLine: InfoLineStub,
    },
  });
});

import BaseWidget from '@/components/shared/Widget/Base.vue';

describe('BaseWidget', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock as unknown as ResizeObserver);
    vi.stubGlobal('MutationObserver', MutationObserverMock as unknown as MutationObserver);
  });

  beforeEach(() => {
    observeMock.mockClear();
    disconnectMock.mockClear();
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
});
