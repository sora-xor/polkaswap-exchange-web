import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SSpinner from '@/lib/soramitsu-ui/components/Spinner/SSpinner.vue';

describe('SSpinner', () => {
  it('renders loader element without legacy svg circle markup', () => {
    const wrapper = mount(SSpinner);

    expect(wrapper.get('.s-spinner').exists()).toBe(true);
    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.find('circle').exists()).toBe(false);
  });

  it('accepts numeric size props and still renders the loader host', () => {
    const wrapper = mount(SSpinner, {
      props: {
        size: 20,
      },
    });

    expect(wrapper.get('.s-spinner').exists()).toBe(true);
    expect(wrapper.find('svg').exists()).toBe(false);
  });
});
