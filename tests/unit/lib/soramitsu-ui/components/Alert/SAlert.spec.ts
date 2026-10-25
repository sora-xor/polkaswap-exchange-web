import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>();

  Object.assign(globalThis, {
    watchSyncEffect: actual.watchSyncEffect,
  });

  return actual;
});

vi.mock('@soramitsu-ui/ui/components/icons', () => ({
  IconClose: defineComponent({
    name: 'IconCloseStub',
    setup: () => () => h('svg', { 'data-testid': 'close-icon' }),
  }),
  STATUS_ICONS_MAP: {
    info: defineComponent({
      name: 'InfoIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-info-icon' }),
    }),
    warning: defineComponent({
      name: 'WarningIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-warning-icon' }),
    }),
    error: defineComponent({
      name: 'ErrorIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-error-icon' }),
    }),
    success: defineComponent({
      name: 'SuccessIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-success-icon' }),
    }),
  },
}));

import SAlert from '@/lib/soramitsu-ui/components/Alert/SAlert.vue';

describe('SAlert', () => {
  it('renders default title and description props with status semantics', () => {
    const wrapper = mount(SAlert, {
      props: {
        status: 'warning',
        title: 'Price impact',
        description: 'Route price changed.',
        inline: true,
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-alert', 's-alert_inline']));
    expect(wrapper.attributes('data-status')).toBe('warning');
    expect(wrapper.find('[data-testid="status-warning-icon"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Price impact');
    expect(wrapper.text()).toContain('Route price changed.');
    expect(wrapper.find('[data-testid="close-icon"]').exists()).toBe(false);
  });

  it('prefers title and description slots over prop text', () => {
    const wrapper = mount(SAlert, {
      props: {
        title: 'Prop title',
        description: 'Prop description',
      },
      slots: {
        title: '<strong class="slot-title">Slot title</strong>',
        description: '<span class="slot-description">Slot description</span>',
      },
    });

    expect(wrapper.find('.slot-title').text()).toBe('Slot title');
    expect(wrapper.find('.slot-description').text()).toBe('Slot description');
    expect(wrapper.text()).not.toContain('Prop title');
    expect(wrapper.text()).not.toContain('Prop description');
  });

  it('updates the rendered status icon and emits close clicks', async () => {
    const wrapper = mount(SAlert, {
      props: {
        status: 'info',
        showCloseBtn: true,
      },
    });

    expect(wrapper.find('[data-testid="status-info-icon"]').exists()).toBe(true);

    await wrapper.setProps({ status: 'success' });
    await nextTick();

    expect(wrapper.attributes('data-status')).toBe('success');
    expect(wrapper.find('[data-testid="status-info-icon"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="status-success-icon"]').exists()).toBe(true);

    await wrapper.get('[data-testid="close-btn"]').trigger('click');

    expect(wrapper.emitted('click:close')).toHaveLength(1);
    expect(wrapper.find('[data-testid="close-icon"]').exists()).toBe(true);
  });
});
