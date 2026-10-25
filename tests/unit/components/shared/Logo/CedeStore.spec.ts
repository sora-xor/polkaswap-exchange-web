import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import CedeStoreLogo from '@/components/shared/Logo/CedeStore.vue';
import { Theme } from '@/consts/theme';

describe('CedeStoreLogo', () => {
  it('defaults to black fill for light theme', () => {
    const wrapper = mount(CedeStoreLogo);
    const fills = wrapper.findAll('path').map((path) => path.attributes('fill'));
    expect(fills).toContain('#000');
  });

  it('uses white fill for dark theme', () => {
    const wrapper = mount(CedeStoreLogo, {
      props: { theme: Theme.DARK },
    });
    const fills = wrapper.findAll('path').map((path) => path.attributes('fill'));
    expect(fills).toContain('#fff');
  });
});
