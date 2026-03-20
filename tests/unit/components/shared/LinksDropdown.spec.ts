import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import LinksDropdown from '@/components/shared/LinksDropdown.vue';

const explorerLinks = [
  { type: 'sorametrics', value: 'https://sorametrics.org/#tx=0x123' },
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

  it('maps known explorer ids to readable labels', () => {
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

    const exposed = wrapper.vm as unknown as { getExplorerLabel: (value: string) => string };
    expect(exposed.getExplorerLabel('sorametrics')).toBe('SoraMetrics');
    expect(exposed.getExplorerLabel('polkadot')).toBe('Polkadot');
  });

  it('filters out unsafe explorer links', () => {
    const wrapper = shallowMount(LinksDropdown, {
      props: {
        links: [
          { type: 'Good', value: 'https://example.com' },
          { type: 'Bad', value: 'javascript:alert(1)' },
        ] as any,
      },
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

    const exposed = wrapper.vm as unknown as { links: Array<{ type: string; value: string }> };
    expect(exposed.links).toEqual([{ type: 'Good', value: 'https://example.com' }]);
  });
});
