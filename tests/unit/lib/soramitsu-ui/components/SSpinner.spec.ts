import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SSpinner from '@/lib/soramitsu-ui/components/Spinner/SSpinner.vue';

describe('SSpinner', () => {
  it('renders the live spinner svg markup', () => {
    const wrapper = mount(SSpinner);

    const spinner = wrapper.get('svg.s-spinner');
    const path = wrapper.get('circle.s-spinner__path');

    expect(spinner.attributes('viewBox')).toBe('25 25 50 50');
    expect(path.attributes('cx')).toBe('50');
    expect(path.attributes('cy')).toBe('50');
    expect(path.attributes('r')).toBe('20');
  });

  it('accepts numeric size props and still renders the spinner circle', () => {
    const wrapper = mount(SSpinner, {
      props: {
        size: 20,
      },
    });

    expect(wrapper.get('svg.s-spinner').exists()).toBe(true);
    expect(wrapper.get('circle.s-spinner__path').exists()).toBe(true);
  });
});
