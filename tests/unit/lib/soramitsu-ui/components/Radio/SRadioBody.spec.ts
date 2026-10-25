import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRadioBody from '@/lib/soramitsu-ui/components/Radio/SRadioBody';

describe('SRadioBody', () => {
  it('renders atom and label slots with default body semantics', () => {
    const wrapper = mount(SRadioBody, {
      props: {
        type: 'default',
        size: 'md',
        labelId: 'radio-label',
        descriptionId: 'radio-description',
      },
      slots: {
        atom: '<span class="radio-atom" />',
        label: 'Fast path',
        description: 'Hidden for the default radio type',
      },
    });

    const label = wrapper.find('label');

    expect(wrapper.classes()).toContain('s-radio-body');
    expect(wrapper.attributes('data-type')).toBe('default');
    expect(wrapper.attributes('data-size')).toBe('md');
    expect(wrapper.attributes('aria-labelledby')).toBe('radio-label');
    expect(wrapper.attributes('aria-describedby')).toBe('radio-description');
    expect(wrapper.find('.radio-atom').exists()).toBe(true);
    expect(label.attributes('id')).toBe('radio-label');
    expect(label.classes()).toContain('sora-tpg-p4');
    expect(label.text()).toBe('Fast path');
    expect(wrapper.find('.s-radio-body__description').exists()).toBe(false);
  });

  it('renders description content only for bordered radios with descriptions', () => {
    const wrapper = mount(SRadioBody, {
      props: {
        type: 'bordered-with-description',
        size: 'xl',
        labelId: 'large-radio-label',
        descriptionId: 'large-radio-description',
      },
      slots: {
        label: 'Route order',
        description: '<span class="description-slot">Routes are evaluated by price impact.</span>',
      },
    });

    const label = wrapper.find('label');
    const description = wrapper.find('.s-radio-body__description');

    expect(wrapper.attributes('data-type')).toBe('bordered-with-description');
    expect(wrapper.attributes('data-size')).toBe('xl');
    expect(label.classes()).toContain('sora-tpg-p3');
    expect(description.exists()).toBe(true);
    expect(description.attributes('id')).toBe('large-radio-description');
    expect(description.classes()).toContain('sora-tpg-p4');
    expect(description.find('.description-slot').text()).toBe('Routes are evaluated by price impact.');
  });
});
