import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HashType, SoraNetwork } from '@/consts';

const settingsState = vi.hoisted(() => ({
  soraNetwork: 'Dev',
}));

const copyAddressMock = vi.hoisted(() => vi.fn());

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get soraNetwork() {
      return settingsState.soraNetwork;
    },
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.explorer ? `${key}:${params.explorer}` : key,
    TranslationConsts: {
      Polkadot: 'Polkadot',
      SORAScan: 'SORAScan',
      SoraMetrics: 'SoraMetrics',
      Subscan: 'Subscan',
      Etherscan: 'Etherscan',
    },
  }),
}));

vi.mock('@/composables/useCopyAddress', () => ({
  useCopyAddress: () => ({
    copyTooltip: (label: string) => `Copy ${label}`,
    handleCopyAddress: copyAddressMock,
  }),
}));

import TransactionHashView from '@/lib/soraneo-wallet/src/components/TransactionHashView.vue';

const mountHashView = (props: Record<string, unknown>) =>
  mount(TransactionHashView as any, {
    props,
    global: {
      stubs: {
        's-button': {
          template: '<button><slot /></button>',
        },
        's-dropdown': {
          template: '<div class="s-dropdown"><slot /><slot name="menu" /></div>',
        },
        's-dropdown-item': {
          template: '<div><slot /></div>',
        },
        's-input': {
          props: ['value'],
          template: '<div class="s-input"><input class="el-input__inner" :value="value" /></div>',
        },
      },
    },
  });

const expectNoExplorerActions = (wrapper: ReturnType<typeof mountHashView>) => {
  expect(wrapper.get('.transaction-hash-view').classes()).not.toContain('transaction-hash-view--with-menu');
  expect(wrapper.find('.transaction-hash-view__menu').exists()).toBe(false);
  expect(wrapper.get('.transaction-hash-view__copy').classes()).not.toContain('with-dropdown');
};

describe('TransactionHashView', () => {
  beforeEach(() => {
    settingsState.soraNetwork = SoraNetwork.Dev;
    copyAddressMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a hash-view action class instead of the dropdown menu list class for explorer actions', () => {
    const wrapper = mountHashView({
      translation: 'transaction.blockId',
      value: '123456',
      type: HashType.Block,
    });

    expect(wrapper.get('.transaction-hash-view').classes()).toContain('transaction-hash-view--with-menu');

    const menu = wrapper.get('.transaction-hash-view__menu');
    expect(menu.classes()).toContain('s-dropdown');
    expect(menu.classes()).not.toContain('s-dropdown-menu');
  });

  it('does not render an orphan explorer action when a dev account has no supported explorer link', () => {
    const wrapper = mountHashView({
      translation: 'transaction.sender',
      value: 'not-a-valid-substrate-account',
      type: HashType.Account,
    });

    expectNoExplorerActions(wrapper);
  });

  it('does not render an orphan explorer action for transaction ids that cannot resolve to any explorer URL', () => {
    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: 'non-hex-transaction-id-without-block',
      type: HashType.ID,
    });

    expectNoExplorerActions(wrapper);
  });

  it('does not render an explorer action for whitespace-only block values', () => {
    const wrapper = mountHashView({
      translation: 'transaction.blockId',
      value: '   ',
      type: HashType.Block,
    });

    expectNoExplorerActions(wrapper);
  });

  it('does not treat whitespace-only block ids as a usable transaction explorer fallback', () => {
    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: '0xabc',
      type: HashType.ID,
      block: '   ',
    });

    expectNoExplorerActions(wrapper);
  });

  it('does not render an explorer action for unsupported hash types even when production explorers exist', () => {
    settingsState.soraNetwork = SoraNetwork.Prod;

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: '0xabc',
      type: 'unsupported' as HashType,
    });

    expectNoExplorerActions(wrapper);
  });

  it('does not render production account explorer actions for invalid account values', () => {
    settingsState.soraNetwork = SoraNetwork.Prod;

    const wrapper = mountHashView({
      translation: 'transaction.sender',
      value: 'not-a-valid-substrate-account',
      type: HashType.Account,
    });

    expectNoExplorerActions(wrapper);
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
  });

  it('encodes adversarial block values before placing them in explorer links', () => {
    const value = '123/../../?redirect=https://evil.test/#fragment';
    const expectedPath = `/explorer/query/${encodeURIComponent(value)}`;

    const wrapper = mountHashView({
      translation: 'transaction.blockId',
      value,
      type: HashType.Block,
    });

    const href = wrapper.get('.transaction-link').attributes('href');
    expect(href).toContain(`polkadot.js.org/apps/?rpc=`);
    expect(href?.split('#')).toHaveLength(2);
    expect(href).toContain(expectedPath);
  });

  it('encodes transaction block fallbacks instead of appending raw route fragments', () => {
    const block = '987?panel=evil#fragment';

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: 'tx-with-block-fallback',
      type: HashType.ID,
      block,
    });

    const href = wrapper.get('.transaction-link').attributes('href');
    expect(href).toContain(`/explorer/query/${encodeURIComponent(block)}`);
    expect(href).not.toContain(`/explorer/query/${block}`);
  });

  it('truncates long hashes for display while copying the full value', async () => {
    const value = '0x1234567890abcdef1234567890abcdef1234567890abcdef';
    const expectedDisplayValue = `${value.slice(0, 12)}...${value.slice(-12)}`;

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value,
      type: HashType.ID,
      block: '123456',
    });

    expect((wrapper.get('input').element as HTMLInputElement).value).toBe(expectedDisplayValue);

    await wrapper.get('.transaction-hash-view__copy').trigger('click');

    expect(copyAddressMock).toHaveBeenCalledTimes(1);
    expect(copyAddressMock.mock.calls[0]?.[0]).toBe(value);
    expect(copyAddressMock.mock.calls[0]?.[1]).toBeInstanceOf(MouseEvent);
  });

  it('uses the explicit display hash only for display and still copies the canonical value', async () => {
    const value = '0xcanonical-value-that-should-be-copied';
    const hash = '0xdisplay-only-hash-that-should-be-shortened';
    const expectedDisplayValue = `${hash.slice(0, 12)}...${hash.slice(-12)}`;

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value,
      hash,
      type: HashType.ID,
      block: '123456',
    });

    expect((wrapper.get('input').element as HTMLInputElement).value).toBe(expectedDisplayValue);

    await wrapper.get('.transaction-hash-view__copy').trigger('click');

    expect(copyAddressMock.mock.calls[0]?.[0]).toBe(value);
  });

  it('does not render a dangling Ethereum explorer action for an empty hash value', () => {
    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: '',
      type: HashType.EthTransaction,
    });

    expectNoExplorerActions(wrapper);
  });

  it('does not render a dangling Ethereum explorer action for whitespace-only hash values', () => {
    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: '   ',
      type: HashType.EthTransaction,
    });

    expectNoExplorerActions(wrapper);
  });

  it('ignores display-only hashes when building Ethereum explorer links', () => {
    const value = '0xsafe-transaction-id';
    const hash = '0xdisplay-only?redirect=https://evil.test/#fragment';

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value,
      hash,
      type: HashType.EthTransaction,
    });

    const href = wrapper.get('.transaction-link').attributes('href');
    expect(href).toBe(`https://sepolia.etherscan.io/tx/${value}`);
    expect(href).not.toContain(encodeURIComponent(hash));
  });

  it('trims surrounding whitespace before building Ethereum explorer links', () => {
    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: '  0xabc  ',
      type: HashType.EthTransaction,
    });

    const href = wrapper.get('.transaction-link').attributes('href');
    expect(href).toBe('https://sepolia.etherscan.io/tx/0xabc');
    expect(href).not.toContain('%20');
  });

  it('keeps adversarial Ethereum transaction values inside the fixed Etherscan tx path', () => {
    const value = '0xabc?redirect=https://evil.test/#fragment';
    const expectedHref = `https://sepolia.etherscan.io/tx/${encodeURIComponent(value)}`;

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value,
      type: HashType.EthTransaction,
    });

    const href = wrapper.get('.transaction-link').attributes('href');
    expect(href).toBe(expectedHref);
    expect(new URL(href).hostname).toBe('sepolia.etherscan.io');
    expect(new URL(href).pathname).toBe(`/tx/${encodeURIComponent(value)}`);
    expect(new URL(href).search).toBe('');
    expect(new URL(href).hash).toBe('');
  });

  it('uses production Etherscan account links without the sepolia subdomain', () => {
    settingsState.soraNetwork = SoraNetwork.Prod;

    const value = '0xabc?redirect=https://evil.test/#fragment';
    const expectedHref = `https://etherscan.io/address/${encodeURIComponent(value)}`;

    const wrapper = mountHashView({
      translation: 'transaction.sender',
      value,
      type: HashType.EthAccount,
    });

    const href = wrapper.get('.transaction-link').attributes('href');
    expect(href).toBe(expectedHref);
    expect(new URL(href).hostname).toBe('etherscan.io');
    expect(new URL(href).pathname).toBe(`/address/${encodeURIComponent(value)}`);
  });

  it('encodes all production transaction explorer links for adversarial ids and block fallbacks', () => {
    settingsState.soraNetwork = SoraNetwork.Prod;

    const value = 'tx?redirect=https://evil.test/#fragment';
    const block = '987/../../?panel=evil#fragment';

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value,
      type: HashType.ID,
      block,
    });

    const hrefs = wrapper.findAll('.transaction-link').map((link) => link.attributes('href'));
    expect(hrefs).toHaveLength(2);
    expect(hrefs).toContain(`https://sorametrics.org/sorav2?tab=extrinsics&q=${encodeURIComponent(value)}`);
    expect(hrefs.some((href) => href?.includes(`/explorer/query/${encodeURIComponent(block)}`))).toBe(true);
    expect(hrefs.every((href) => !href?.includes(value))).toBe(true);
    expect(hrefs.every((href) => !href?.includes(block))).toBe(true);
  });

  it('opens encoded Etherscan links with opener isolation when selected directly', () => {
    const value = '0xabc?redirect=https://evil.test/#fragment';
    const openedWindow = {
      opener: 'parent',
      focus: vi.fn(),
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(openedWindow as unknown as Window);

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value,
      type: HashType.EthTransaction,
    });

    (wrapper.vm as any).handleOpenEtherscan();

    expect(openSpy).toHaveBeenCalledWith(
      `https://sepolia.etherscan.io/tx/${encodeURIComponent(value)}`,
      '_blank',
      'noopener,noreferrer'
    );
    expect(openedWindow.opener).toBeNull();
    expect(openedWindow.focus).toHaveBeenCalledTimes(1);
  });

  it('opens production Ethereum account links with the account path when selected directly', () => {
    settingsState.soraNetwork = SoraNetwork.Prod;

    const value = '0xabc?redirect=https://evil.test/#fragment';
    const openedWindow = {
      opener: 'parent',
      focus: vi.fn(),
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(openedWindow as unknown as Window);

    const wrapper = mountHashView({
      translation: 'transaction.sender',
      value,
      type: HashType.EthAccount,
    });

    (wrapper.vm as any).handleOpenEtherscan();

    expect(openSpy).toHaveBeenCalledWith(
      `https://etherscan.io/address/${encodeURIComponent(value)}`,
      '_blank',
      'noopener,noreferrer'
    );
    expect(openedWindow.opener).toBeNull();
    expect(openedWindow.focus).toHaveBeenCalledTimes(1);
  });

  it('does not open Etherscan when the exposed handler is invoked without a usable Ethereum value', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: '   ',
      type: HashType.EthTransaction,
    });

    (wrapper.vm as any).handleOpenEtherscan();

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('does not open Etherscan when the exposed handler is invoked for non-Ethereum hash types', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const wrapper = mountHashView({
      translation: 'transaction.blockId',
      value: '123456',
      type: HashType.Block,
    });

    (wrapper.vm as any).handleOpenEtherscan();

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('does not throw when the browser blocks the Etherscan popup', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const wrapper = mountHashView({
      translation: 'transaction.txId',
      value: '0xabc',
      type: HashType.EthTransaction,
    });

    expect(() => (wrapper.vm as any).handleOpenEtherscan()).not.toThrow();
    expect(openSpy).toHaveBeenCalledWith('https://sepolia.etherscan.io/tx/0xabc', '_blank', 'noopener,noreferrer');
  });
});
