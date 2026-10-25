import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const walletStoreMock: Record<string, any> = {
  whitelist: {},
  whitelistIdsBySymbol: {},
};

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/api', () => ({
  api: {
    assets: {
      isNft: () => false,
    },
  },
}));

import TokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

describe('TokenLogo', () => {
  beforeEach(() => {
    walletStoreMock.whitelist = {};
    walletStoreMock.whitelistIdsBySymbol = {};
  });

  it('falls back to the info glyph when whitelist icon source is empty', () => {
    walletStoreMock.whitelist = {
      '0x-token': {
        icon: '',
        symbol: 'TEST',
      },
    };

    const wrapper = mount(TokenLogo, {
      props: {
        token: {
          address: '0x-token',
        },
        size: 'small',
      },
    });

    const logo = wrapper.find('.asset-logo');
    expect(logo.classes()).toContain('s-icon-notifications-info-24');
    expect(logo.attributes('style') ?? '').not.toContain('background-image');
  });

  it('uses background image when whitelist icon source is valid', () => {
    walletStoreMock.whitelist = {
      '0x-token': {
        icon: 'https://assets.example.com/token.png',
        symbol: 'TEST',
      },
    };

    const wrapper = mount(TokenLogo, {
      props: {
        token: {
          address: '0x-token',
        },
        size: 'small',
      },
    });

    const logo = wrapper.find('.asset-logo');
    expect(logo.classes()).not.toContain('s-icon-notifications-info-24');
    expect(logo.attributes('style') ?? '').toContain('background-image');
  });

  it('supports url-encoded svg data URIs used by token logos', () => {
    walletStoreMock.whitelist = {
      '0x-token': {
        icon: "data:image/svg+xml,%3C%3Fxml%20version='1.0'%20encoding='UTF-8'%3F%3E%3Csvg%20viewBox='0%200%2040%2040'%20xmlns='http://www.w3.org/2000/svg'%3E%3Crect%20width='40'%20height='40'%20rx='20'%20fill='%23E6007A'/%3E%3C/svg%3E",
        symbol: 'TEST',
      },
    };

    const wrapper = mount(TokenLogo, {
      props: {
        token: {
          address: '0x-token',
        },
        size: 'small',
      },
    });

    const logo = wrapper.find('.asset-logo');
    expect(logo.attributes('style') ?? '').toContain('background-image');
    expect(logo.attributes('style') ?? '').toContain('data:image/svg+xml;base64');
  });

  it('normalizes token symbols with whitespace/newlines when resolving whitelist IDs', () => {
    walletStoreMock.whitelist = {
      '0x-xor': {
        icon: 'https://assets.example.com/xor.png',
        symbol: 'XOR',
      },
    };
    walletStoreMock.whitelistIdsBySymbol = {
      XOR: '0x-xor',
    };

    const wrapper = mount(TokenLogo, {
      props: {
        tokenSymbol: '\n x o r \n',
        size: 'small',
      },
    });

    const logo = wrapper.find('.asset-logo');
    expect(logo.classes()).not.toContain('s-icon-notifications-info-24');
    expect(logo.attributes('style') ?? '').toContain('background-image');
  });

  it('falls back to token.symbol when token.address is empty', () => {
    walletStoreMock.whitelist = {
      '0x-ss': {
        icon: 'https://assets.example.com/ss.png',
        symbol: 'SS',
      },
    };
    walletStoreMock.whitelistIdsBySymbol = {
      SS: '0x-ss',
    };

    const wrapper = mount(TokenLogo, {
      props: {
        token: {
          address: '',
          symbol: 'SS',
        },
        size: 'small',
      },
    });

    const logo = wrapper.find('.asset-logo');
    expect(logo.classes()).not.toContain('s-icon-notifications-info-24');
    expect(logo.attributes('style') ?? '').toContain('background-image');
  });

  it('uses a safe token icon for synthetic assets that are not in the whitelist yet', () => {
    const wrapper = mount(TokenLogo, {
      props: {
        token: {
          address: '',
          symbol: 'SS',
          icon: '/assets/solswap-mark.svg',
        },
        size: 'small',
      },
    });

    const logo = wrapper.find('.asset-logo');
    expect(logo.classes()).not.toContain('s-icon-notifications-info-24');
    expect(logo.attributes('style') ?? '').toContain('background-image');
    expect(logo.attributes('style') ?? '').toContain('/assets/solswap-mark.svg');
  });
});
