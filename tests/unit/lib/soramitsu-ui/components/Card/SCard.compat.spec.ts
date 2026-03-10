import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { SCard } from '@/lib/soramitsu-ui/components/Card';

vi.mock('@soramitsu-ui/ui/composables/prop-type-filter', () => ({
  usePropTypeFilter: (props: Record<string, unknown>) => (name: string, values: string[], fallback: string) => {
    const value = props[name];
    return { value: values.includes(value as string) ? value : fallback };
  },
}));

describe('SCard compatibility', () => {
  it('keeps default status class for neumorphic parity styles', () => {
    const wrapper = mount(SCard, {
      slots: {
        default: () => 'Card',
      },
    });

    expect(wrapper.classes()).toContain('s-status-default');
  });
});
