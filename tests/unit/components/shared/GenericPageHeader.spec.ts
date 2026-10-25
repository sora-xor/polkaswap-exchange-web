import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const SButtonStub = {
  name: 'SButtonStub',
  emits: ['click'],
  template: '<button class="s-button-stub" @click="$emit(\'click\', $event)"><slot /></button>',
};

const STooltipStub = {
  name: 'STooltipStub',
  props: ['content', 'placement', 'tabindex', 'borderRadius', 'popperClass'],
  template: '<div class="s-tooltip-stub" :data-content="content"><slot /></div>',
};

const SIconStub = {
  name: 'SIconStub',
  template: '<i class="s-icon-stub"></i>',
};

// Import component after setting stubs
import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';

describe('GenericPageHeader', () => {
  it('renders title and default layout', () => {
    const wrapper = mount(GenericPageHeader, {
      props: { title: 'Overview' },
      global: {
        stubs: {
          's-button': SButtonStub,
          's-tooltip': STooltipStub,
          's-icon': SIconStub,
        },
      },
    });

    expect(wrapper.classes()).toContain('page-header');
    expect(wrapper.classes()).not.toContain('page-header--center');
    expect(wrapper.find('.page-header-title').text()).toContain('Overview');
  });

  it('emits back event when back button clicked', async () => {
    const wrapper = mount(GenericPageHeader, {
      props: { hasButtonBack: true },
      global: {
        stubs: {
          's-button': SButtonStub,
          's-tooltip': STooltipStub,
          's-icon': SIconStub,
        },
      },
    });

    expect(wrapper.classes()).toContain('page-header--center');
    wrapper.findComponent({ name: 'SButtonStub' }).vm.$emit('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('shows tooltip and bold title styling when props set', () => {
    const wrapper = mount(GenericPageHeader, {
      props: {
        title: 'Dashboard',
        tooltip: 'Info',
        bold: true,
      },
      global: {
        stubs: {
          's-button': SButtonStub,
          's-tooltip': STooltipStub,
          's-icon': SIconStub,
        },
      },
    });

    expect(wrapper.find('.s-tooltip-stub').attributes('data-content')).toBe('Info');
    expect(wrapper.find('.page-header-title').classes()).toContain('bold');
  });
});
