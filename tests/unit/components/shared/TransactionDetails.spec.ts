import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const PopoverStub = {
  name: 'ElPopover',
  props: ['modelValue', 'disabled', 'placement', 'popperClass', 'trigger', 'visibleArrow'],
  emits: ['update:modelValue'],
  template: '<div class="popover-stub"><slot name="reference" /><div class="popover-content"><slot /></div></div>',
};

const IconStub = {
  name: 'SIconStub',
  props: ['name', 'size'],
  template: '<i class="s-icon-stub" :data-name="name" :data-size="size"></i>',
};

import TransactionDetails from '@/components/shared/TransactionDetails.vue';

describe('TransactionDetails', () => {
  const mountComponent = (
    props?: Record<string, unknown>,
    slots?: Record<string, string>,
    attrs?: Record<string, string>
  ) =>
    mount(TransactionDetails, {
      props,
      slots,
      attrs,
      global: {
        stubs: {
          'el-popover': PopoverStub,
          's-icon': IconStub,
        },
        directives: {
          button: {
            created: () => undefined,
          },
        },
      },
    });

  it('renders passthrough content when infoOnly', () => {
    const wrapper = mountComponent(undefined, { default: '<div class="content-slot">Details</div>' });

    expect(wrapper.find('.content-slot').exists()).toBe(true);
    expect(wrapper.find('.popover-stub').exists()).toBe(false);
  });

  it('forwards attrs to infoOnly root container', () => {
    const wrapper = mountComponent(
      { infoOnly: true },
      { default: '<div class="content-slot">Details</div>' },
      { class: 'swap-details', 'data-test-id': 'details-wrapper' }
    );

    expect(wrapper.classes()).toContain('swap-details');
    expect(wrapper.attributes('data-test-id')).toBe('details-wrapper');
  });

  it('shows popover trigger with default icon and toggles icon when visible', async () => {
    const wrapper = mountComponent({ infoOnly: false }, { default: '<p class="details">Content</p>' });

    expect(wrapper.find('.transaction-details').exists()).toBe(true);
    expect(wrapper.find('.s-icon-stub').attributes('data-name')).toBe('arrows-chevron-bottom-24');

    const visibleRef = (wrapper.vm as unknown as { $: { exposed: { visible: { value: boolean } } } }).$.exposed.visible;
    visibleRef.value = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.s-icon-stub').attributes('data-name')).toBe('arrows-chevron-top-24');
  });

  it('keeps external class on wrapper when rendered through popover branch', () => {
    const wrapper = mountComponent({ infoOnly: false }, undefined, {
      class: 'swap-details',
      'data-test-id': 'details-wrapper',
    });

    const wrapperHost = wrapper.find('.swap-details');
    expect(wrapperHost.exists()).toBe(true);
    expect(wrapperHost.attributes('data-test-id')).toBe('details-wrapper');
    expect(wrapper.find('.transaction-details').exists()).toBe(true);
  });

  it('disables trigger when disabled prop passed', () => {
    const wrapper = mountComponent({ infoOnly: false, disabled: true });

    expect(wrapper.find('.transaction-details').classes()).toContain('disabled');
    const visibleRef = (wrapper.vm as unknown as { $: { exposed: { visible: { value: boolean } } } }).$.exposed.visible;
    expect(visibleRef.value).toBe(false);
  });
});
