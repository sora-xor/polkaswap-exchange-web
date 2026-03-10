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

    expect(icon.classes()).toContain('s-icon-arrows-refresh-cw-24');
    expect(icon.classes()).toContain('s-icon--spin');
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('maps element arrow icons to soramitsu chevron svg icons', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'el-icon-arrow-down',
      },
    });

    const icon = wrapper.get('i');

    expect(icon.classes()).toContain('s-icon-arrows-chevron-bottom-24');
    expect(icon.classes()).toContain('el-icon-arrow-down');
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(icon.attributes('style')).toContain('font-size: 24px;');
  });

  it('applies numeric size as pixel-based icon font size', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'basic-close-24',
        size: 20,
      },
    });

    const icon = wrapper.get('i');
    const style = icon.attributes('style');

    expect(style).toContain('font-size: 20px;');
    expect(style).toContain('line-height: 20px;');
  });

  it('infers icon size from the icon name when explicit size is omitted', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'arrows-chevron-right-rounded-24',
      },
    });

    expect(wrapper.get('i').attributes('style')).toContain('font-size: 24px;');
  });

  it('normalizes numeric string size props to pixel values', () => {
    const wrapper = mount(SIcon, {
      props: {
        name: 'chevron-down-rounded-16',
        size: '18',
      },
    });

    const style = wrapper.get('i').attributes('style');

    expect(style).toContain('font-size: 18px;');
    expect(style).toContain('line-height: 18px;');
  });
});
