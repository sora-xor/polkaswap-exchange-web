import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SIcon from '@/lib/soramitsu-ui/components/Icon/SIcon.vue';

describe('SIcon', () => {
  it('renders class-based icons and mounts inline svg components when available', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'arrows-swap-90-24',
      },
    });

    const icon = wrapper.get('i');

    expect(icon.classes()).toContain('s-icon');
    expect(icon.classes()).toContain('s-icon-arrows-swap-90-24');
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('keeps the original swap icon stroke color used by polkaswap assets', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'arrows-swap-90-24',
      },
    });

    const swapPaths = wrapper.findAll('path');
    expect(swapPaths.length).toBeGreaterThan(0);
    expect(swapPaths.every((path) => path.attributes('stroke') === '#000')).toBe(true);
  });

  it('maps element loading icon class to soramitsu icon class and keeps spin behavior', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'el-icon-loading',
      },
    });

    const icon = wrapper.get('i');

    expect(icon.classes()).toContain('el-icon-loading');
    expect(icon.classes()).toContain('s-icon-arrows-refresh-cw-24');
    expect(icon.classes()).toContain('s-icon--spin');
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('applies numeric size as pixel-based icon dimensions', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'basic-close-24',
        size: 20,
      },
    });

    const icon = wrapper.get('i');
    const style = icon.attributes('style');

    expect(style).toContain('width: 20px;');
    expect(style).toContain('height: 20px;');
    expect(style).toContain('font-size: 20px;');
  });
});
