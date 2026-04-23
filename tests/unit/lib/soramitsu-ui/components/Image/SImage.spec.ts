import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SImage from '@/lib/soramitsu-ui/components/Image/SImage.vue';

describe('SImage', () => {
  it('renders an image with default fit and no empty src attribute', () => {
    const wrapper = mount(SImage, {
      props: {
        alt: 'Token logo',
      },
    });
    const image = wrapper.get('img.s-image');

    expect(image.attributes('src')).toBeUndefined();
    expect(image.attributes('alt')).toBe('Token logo');
    expect(image.attributes('draggable')).toBe('false');
    expect(image.attributes('style')).toContain('object-fit: fill');
  });

  it('applies src, fit, and boolean draggable props', () => {
    const wrapper = mount(SImage, {
      props: {
        src: '/assets/token.png',
        alt: 'XOR',
        fit: 'contain',
        draggable: true,
      },
    });
    const image = wrapper.get('img');

    expect(image.attributes('src')).toBe('/assets/token.png');
    expect(image.attributes('alt')).toBe('XOR');
    expect(image.attributes('draggable')).toBe('true');
    expect(image.attributes('style')).toContain('object-fit: contain');
  });

  it('normalizes string draggable props', async () => {
    const wrapper = mount(SImage, {
      props: {
        draggable: 'true',
      },
    });

    expect(wrapper.get('img').attributes('draggable')).toBe('true');

    await wrapper.setProps({ draggable: 'false' });

    expect(wrapper.get('img').attributes('draggable')).toBe('false');
  });
});
