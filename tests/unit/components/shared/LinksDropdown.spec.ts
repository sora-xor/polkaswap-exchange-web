import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import LinksDropdown from '@/components/shared/LinksDropdown.vue';

const explorerLinks = [
  { type: 'Subscan', value: 'https://subscan.io' },
  { type: 'Sorascan', value: 'https://sorascan.io' },
];

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => `${key}:${params?.explorer ?? ''}`,
  }),
}));

describe('LinksDropdown.vue', () => {
  it('renders provided explorer links', () => {
    const wrapper = shallowMount(LinksDropdown, {
      props: { links: explorerLinks },
      global: {
        components: {
          's-dropdown': {
            template: '<div class="dropdown-stub"><slot name="menu" /></div>',
          },
          's-dropdown-item': {
            template: '<div class="dropdown-item"><slot /></div>',
          },
        },
        stubs: {
          SDropdown: false,
          SDropdownItem: false,
        },
      },
    });

    const exposed = wrapper.vm as unknown as { links: typeof explorerLinks };
    expect(exposed.links).toEqual(explorerLinks);
  });
});
