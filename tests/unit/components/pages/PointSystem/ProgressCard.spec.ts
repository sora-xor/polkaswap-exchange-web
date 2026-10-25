import { shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenLogoStub } from '@stubs/walletComponents';

const isTokenImageMock = vi.fn();
const getImageSrcMock = vi.fn();

vi.mock('@/consts/pointSystem', () => ({
  getImageSrc: (name: string) => getImageSrcMock(name),
  isTokenImage: (name: string) => isTokenImageMock(name),
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

import ProgressCard from '@/features/rewards/components/point-system/ProgressCard.vue';

describe('ProgressCard.vue', () => {
  beforeEach(() => {
    getImageSrcMock.mockReturnValue('token-image-src');
    isTokenImageMock.mockReset();
    isTokenImageMock.mockReturnValue(false);
  });

  afterEach(() => {
    getImageSrcMock.mockClear();
  });

  it('renders a token logo when the asset icon is token-based', () => {
    isTokenImageMock.mockReturnValue(true);
    const wrapper = shallowMount(ProgressCard, {
      props: {
        imageName: 'xor',
        progressPercentage: 50,
      },
      global: {
        stubs: {
          TokenLogo: tokenLogoStub,
        },
      },
    });

    expect(wrapper.find('.token-logo-stub').exists()).toBe(true);
    expect(wrapper.find('img').exists()).toBe(false);
    expect(getImageSrcMock).toHaveBeenCalledWith('xor');
  });

  it('renders an image when the icon is not token-based', () => {
    isTokenImageMock.mockReturnValue(false);
    const wrapper = shallowMount(ProgressCard, {
      props: {
        imageName: 'badge',
        progressPercentage: 25,
      },
      global: {
        stubs: {
          TokenLogo: tokenLogoStub,
        },
      },
    });

    const image = wrapper.find('img.progress-circle__image');
    expect(image.exists()).toBe(true);
    expect(image.attributes('src')).toBe('token-image-src');
    expect(image.attributes('alt')).toBe('badge');
  });

  it('calculates the progress dash offset based on the percentage', () => {
    isTokenImageMock.mockReturnValue(false);
    const wrapper = shallowMount(ProgressCard, {
      props: {
        imageName: 'badge',
        progressPercentage: 75,
      },
      global: {
        stubs: {
          TokenLogo: tokenLogoStub,
        },
      },
    });

    const radius = (72 - 3) / 2;
    const circumference = 2 * Math.PI * radius;
    const expectedOffset = circumference * (1 - 0.75);

    const bar = wrapper.find('circle.progress-circle__bar');
    expect(bar.exists()).toBe(true);
    expect(Number.parseFloat(bar.attributes('stroke-dashoffset') ?? '0')).toBeCloseTo(expectedOffset);
  });
});
