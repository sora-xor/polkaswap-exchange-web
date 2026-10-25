import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import TemporaryWalletPanel from '@/features/misc/components/buy-xor/TemporaryWalletPanel.vue';
import panelSource from '@/features/misc/components/buy-xor/TemporaryWalletPanel.vue?raw';
import { setTemporaryWalletAddress, temporaryWalletSession } from '@/utils/connection/evm/temporaryWalletSession';

const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const shared = vi.hoisted(() => ({
  backup: null as null | { address: string; phrase: string; path: string; createdAt: number },
  balances: { eth: 0n, tokens: [0n] } as { eth: bigint; tokens: bigint[] } | Error,
  evmAddress: null as unknown as { value: string },
  connect: null as unknown as (provider: unknown) => Promise<void>,
}));

vi.mock('@/utils/connection/evm/temporaryWallet', async () => {
  const session = await import('@/utils/connection/evm/temporaryWalletSession');
  const open = () => {
    shared.backup = { address: ADDRESS, phrase: PHRASE, path: "m/44'/60'/0'/0/0", createdAt: 0 };
    session.setTemporaryWalletAddress(ADDRESS);
    return shared.backup;
  };
  return {
    TemporaryWalletAppProvider: { uuid: 'polkaswap-temporary-wallet' },
    createTemporaryWallet: vi.fn(open),
    restoreTemporaryWallet: vi.fn((input: string) => {
      if (input.trim().toLowerCase() !== PHRASE) throw new Error('Invalid recovery phrase');
      return open();
    }),
    getTemporaryWalletBackup: vi.fn(() => shared.backup),
    forgetTemporaryWallet: vi.fn(() => {
      shared.backup = null;
      session.setTemporaryWalletAddress('');
    }),
    readTemporaryWalletBalances: vi.fn(async () => {
      if (shared.balances instanceof Error) throw shared.balances;
      return shared.balances;
    }),
    formatTemporaryWalletBackupFile: vi.fn(() => 'backup text'),
    temporaryWalletBackupFileName: vi.fn(() => 'polkaswap-temporary-wallet-f39fd6.txt'),
  };
});
vi.mock('@/features/misc/lib/getTsCardReadiness', () => ({
  GET_TS_CARD_DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
}));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  }),
}));
vi.mock('@/composables/useWeb3Connection', () => ({
  useWeb3Connection: () => ({
    evmAddress: shared.evmAddress,
    selectEvmProvider: (provider: unknown) => shared.connect(provider),
  }),
}));

const wallet = await import('@/utils/connection/evm/temporaryWallet');
const SButtonStub = {
  props: ['disabled', 'loading'],
  emits: ['click'],
  template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
};
const mountPanel = () =>
  mount(TemporaryWalletPanel, { attachTo: document.body, global: { stubs: { SButton: SButtonStub } } });
const button = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('button').find((node) => node.text() === label);
const writeText = vi.fn(async (_text: string) => undefined);

beforeEach(() => {
  vi.clearAllMocks();
  shared.backup = null;
  shared.balances = { eth: 0n, tokens: [0n] };
  shared.evmAddress = ref('');
  shared.connect = vi.fn(async () => {
    shared.evmAddress.value = ADDRESS.toLowerCase();
  });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => {
  setTemporaryWalletAddress('');
  document.body.innerHTML = '';
});

describe('TemporaryWalletPanel', () => {
  it('escapes its grid minmax() so the global Sass minmax() cannot collapse the word grid', () => {
    const scss = [...panelSource.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)]
      .filter(([, attrs]) => /lang="scss"/.test(attrs))
      .map(([, , css]) => css)
      .join('\n');
    expect(scss.replace(/#\{'[^']*'\}/g, '')).not.toContain('minmax(');
    expect(scss).toContain("grid-template-columns: #{'repeat(3, minmax(0, 1fr))'};");
  });

  it('offers to make or restore a wallet, and an app link, without creating anything on its own', () => {
    const wrapper = mountPanel();
    expect(wrapper.get('h4').text()).toBe('temporaryWallet.offerTitle');
    expect(wrapper.text()).toContain('temporaryWallet.offerText');
    expect(button(wrapper, 'temporaryWallet.create')).toBeTruthy();
    expect(button(wrapper, 'temporaryWallet.restore')).toBeTruthy();
    expect(wrapper.get('a').attributes()).toMatchObject({
      href: 'https://metamask.io/download',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(wallet.createTemporaryWallet).not.toHaveBeenCalled();
  });

  it('shows the new phrase and connects only after the user confirms saving it', async () => {
    const wrapper = mountPanel();
    await button(wrapper, 'temporaryWallet.create')!.trigger('click');
    expect(wrapper.get('h4').text()).toBe('temporaryWallet.backupTitle');
    expect(document.activeElement).toBe(wrapper.get('h4').element);
    const list = wrapper.get('ol');
    expect(list.attributes('translate')).toBe('no');
    expect(list.attributes('dir')).toBe('ltr');
    expect(list.classes()).toContain('notranslate');
    expect(list.findAll('li').map((item) => item.text())).toEqual(
      PHRASE.split(' ').map((word, index) => `${index + 1}${word}`)
    );
    expect(wrapper.text()).toContain('temporaryWallet.privateWarning');
    expect(wrapper.text()).toContain(ADDRESS);

    const use = wrapper.get('[data-test-name="temporaryWalletUse"]');
    expect(use.attributes('disabled')).toBeDefined();
    await use.trigger('click');
    expect(shared.connect).not.toHaveBeenCalled();

    await wrapper.get('[data-test-name="temporaryWalletCopy"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(PHRASE);
    expect(wrapper.get('[data-test-name="temporaryWalletCopy"]').text()).toBe('temporaryWallet.copied');

    await wrapper.get('[data-test-name="temporaryWalletSaved"]').setValue(true);
    await wrapper.get('[data-test-name="temporaryWalletUse"]').trigger('click');
    await flushPromises();
    expect(shared.connect).toHaveBeenCalledWith(wallet.TemporaryWalletAppProvider);
    expect(wrapper.find('ol').exists()).toBe(false);
    expect(wrapper.text()).toContain('temporaryWallet.leftover');
  });

  it('downloads the backup as a text file on request', async () => {
    const createObjectURL = vi.fn(() => 'blob:backup');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('polkaswap-temporary-wallet-f39fd6.txt');
      expect(this.href).toBe('blob:backup');
    });
    let blob: Blob | undefined;
    vi.useFakeTimers();
    try {
      const wrapper = mountPanel();
      await button(wrapper, 'temporaryWallet.create')!.trigger('click');
      await wrapper.get('[data-test-name="temporaryWalletDownload"]').trigger('click');
      expect(click).toHaveBeenCalledOnce();
      blob = (createObjectURL.mock.calls[0] as unknown[])[0] as Blob;
      expect(blob.type).toBe('text/plain;charset=utf-8');
      expect(wallet.formatTemporaryWalletBackupFile).toHaveBeenCalledWith(shared.backup, {
        title: 'temporaryWallet.file.title',
        created: 'temporaryWallet.file.created',
        address: 'temporaryWallet.address',
        phrase: 'temporaryWallet.phrase',
        path: 'temporaryWallet.file.path',
        warning: 'temporaryWallet.privateWarning',
        help: 'temporaryWallet.file.help',
      });
      expect(revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(10_000);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
      expect(document.querySelector('a[download]')).toBeNull();
    } finally {
      vi.useRealTimers();
      click.mockRestore();
    }
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob!);
    });
    expect(text).toBe('backup text');
  });

  it('deletes a new wallet that the user cancels before saving it', async () => {
    const wrapper = mountPanel();
    await button(wrapper, 'temporaryWallet.create')!.trigger('click');
    await button(wrapper, 'temporaryWallet.cancel')!.trigger('click');
    expect(wallet.forgetTemporaryWallet).toHaveBeenCalledOnce();
    expect(temporaryWalletSession.address).toBe('');
    expect(wrapper.get('h4').text()).toBe('temporaryWallet.offerTitle');
  });

  it('restores from a phrase without spellcheck or autofill, and reports invalid words', async () => {
    const wrapper = mountPanel();
    await button(wrapper, 'temporaryWallet.restore')!.trigger('click');
    expect(wrapper.text()).toContain('temporaryWallet.restoreWarning');
    const input = wrapper.get('textarea');
    expect(input.attributes()).toMatchObject({
      dir: 'ltr',
      autocomplete: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      translate: 'no',
    });
    await input.setValue('wrong words');
    await button(wrapper, 'temporaryWallet.restoreAction')!.trigger('click');
    expect(wrapper.get('[role="alert"]').text()).toBe('temporaryWallet.invalidPhrase');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(shared.connect).not.toHaveBeenCalled();

    await input.setValue(` ${PHRASE.toUpperCase()} `);
    await button(wrapper, 'temporaryWallet.restoreAction')!.trigger('click');
    await flushPromises();
    expect(wallet.restoreTemporaryWallet).toHaveBeenLastCalledWith(` ${PHRASE.toUpperCase()} `);
    expect(shared.connect).toHaveBeenCalledOnce();
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.text()).toContain('temporaryWallet.leftover');
  });

  it('keeps an open wallet usable when connecting fails', async () => {
    shared.connect = vi.fn(async () => {
      throw new Error('declined');
    });
    const wrapper = mountPanel();
    await button(wrapper, 'temporaryWallet.create')!.trigger('click');
    await wrapper.get('[data-test-name="temporaryWalletSaved"]').setValue(true);
    await wrapper.get('[data-test-name="temporaryWalletUse"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('temporaryWallet.connectFailed');
    expect(temporaryWalletSession.address).toBe(ADDRESS.toLowerCase());

    shared.connect = vi.fn(async () => {
      shared.evmAddress.value = ADDRESS.toLowerCase();
    });
    wrapper.unmount();
    const reopened = mountPanel();
    expect(reopened.get('h4').text()).toBe('temporaryWallet.openTitle');
    await reopened.get('[data-test-name="temporaryWalletUseAgain"]').trigger('click');
    await flushPromises();
    expect(shared.connect).toHaveBeenCalledOnce();
    expect(reopened.find('[role="alert"]').exists()).toBe(false);
  });

  it('shows the phrase again on request and hides it without a confirmation step', async () => {
    wallet.restoreTemporaryWallet(PHRASE);
    shared.evmAddress.value = ADDRESS.toLowerCase();
    const wrapper = mountPanel();
    await wrapper.get('[data-test-name="temporaryWalletShow"]').trigger('click');
    expect(wrapper.findAll('ol li')).toHaveLength(12);
    expect(wrapper.find('[data-test-name="temporaryWalletSaved"]').exists()).toBe(false);
    await button(wrapper, 'temporaryWallet.hidePhrase')!.trigger('click');
    expect(wrapper.find('ol').exists()).toBe(false);
  });

  it('closes an empty wallet at once, and asks first when money is left or unknown', async () => {
    wallet.restoreTemporaryWallet(PHRASE);
    shared.evmAddress.value = ADDRESS.toLowerCase();
    let wrapper = mountPanel();
    await wrapper.get('[data-test-name="temporaryWalletClose"]').trigger('click');
    await flushPromises();
    expect(wallet.readTemporaryWalletBalances).toHaveBeenCalledWith(['0x6b175474e89094c44da98b954eedeac495271d0f']);
    expect(wallet.forgetTemporaryWallet).toHaveBeenCalledOnce();
    expect(wrapper.get('h4').text()).toBe('temporaryWallet.offerTitle');
    wrapper.unmount();

    wallet.restoreTemporaryWallet(PHRASE);
    shared.balances = { eth: 1_200_000_000_000_000n, tokens: [3_500_000_000_000_000_000n] };
    wrapper = mountPanel();
    await wrapper.get('[data-test-name="temporaryWalletClose"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('temporaryWallet.closeWarning {"amount":"0.0012 ETH, 3.5 DAI"}');
    await button(wrapper, 'temporaryWallet.keepOpen')!.trigger('click');
    expect(wallet.forgetTemporaryWallet).toHaveBeenCalledOnce();
    expect(temporaryWalletSession.address).toBe(ADDRESS.toLowerCase());

    shared.balances = new Error('offline');
    await wrapper.get('[data-test-name="temporaryWalletClose"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('temporaryWallet.closeWarningUnknown');
    await wrapper.get('[data-test-name="temporaryWalletCloseConfirm"]').trigger('click');
    expect(wallet.forgetTemporaryWallet).toHaveBeenCalledTimes(2);
    expect(temporaryWalletSession.address).toBe('');
  });
});
