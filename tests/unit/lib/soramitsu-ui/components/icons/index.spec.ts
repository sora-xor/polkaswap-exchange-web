import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import type { Component } from 'vue';

import { IconEye, IconEyeOff } from '@/lib/soramitsu-ui/components/icons';

function mountIcon(icon: Component) {
  return mount(
    defineComponent({
      render: () => h(icon),
    })
  );
}

describe('soramitsu-ui icon exports', () => {
  it('uses generated eye icon assets for visibility controls', () => {
    const eye = mountIcon(IconEye);
    const eyeOff = mountIcon(IconEyeOff);

    expect(eye.html()).toContain('M12 5c-6.307');
    expect(eye.html()).toContain('stroke-linecap');

    expect(eyeOff.html()).toContain('M7 6.362A9.7');
    expect(eyeOff.html()).toContain('stroke-linecap');
  });
});
