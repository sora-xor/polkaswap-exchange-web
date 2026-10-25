import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const walletStoreMock = {
  libraryTheme: 'dark',
};

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

import ThemeProvider from '@/lib/soraneo-wallet/src/components/ThemeProvider.vue';

describe('ThemeProvider', () => {
  it('reads the current theme from the Pinia wallet store', () => {
    const wrapper = mount(ThemeProvider, {
      slots: {
        default: '<span class="theme-slot">content</span>',
      },
    });

    expect(wrapper.attributes('data-theme')).toBe('dark');
    expect(wrapper.find('.theme-slot').exists()).toBe(true);
  });
});
