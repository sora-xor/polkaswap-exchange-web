import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import GetTsWalletSetup from '@/features/misc/components/burn/GetTsWalletSetup.vue';

const shared = vi.hoisted(() => ({ ctx: null as ReturnType<typeof createContext> | null }));
function createContext() {
  return {
    internal: {
      isLoggedIn: ref(false),
      soraAddress: ref(''),
      isSoraAccountDialogVisible: ref(false),
      connectSoraWallet: vi.fn(),
      connectGoogleWallet: vi.fn(),
    },
    external: {
      evmAddress: ref(''),
      isConnecting: ref(false),
      connectEvmWallet: vi.fn(),
      openSelectProviderDialog: vi.fn(),
    },
    ton: { address: ref(''), chain: ref(''), connect: vi.fn(), disconnect: vi.fn() },
    wallet: reactive({ availableWallets: [{ extensionName: 'google-drive' }] }),
  };
}
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { connected: number; total: number }) =>
      values ? `${key} ${values.connected}/${values.total}` : key,
  }),
}));
vi.mock('@/composables/useInternalConnect', () => ({ useInternalConnect: () => shared.ctx!.internal }));
vi.mock('@/composables/useWeb3Connection', () => ({ useWeb3Connection: () => shared.ctx!.external }));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => shared.ctx!.wallet }));
vi.mock('@/features/misc/composables/useTonswapTonWallet', () => ({ useTonswapTonWallet: () => shared.ctx!.ton }));
const wrappers: ReturnType<typeof mount>[] = [];
const attachedRoots: HTMLElement[] = [];
const SButtonStub = { name: 'SButton', props: ['loading'], template: '<button :disabled="loading"><slot /></button>' };
function setup(
  source: 'ethereum' | 'ton' | 'card' | 'xor' | 'sora' = 'ethereum',
  purpose: 'ts' | 'xor' = 'ts',
  attachTo?: HTMLElement
) {
  const wrapper = mount(GetTsWalletSetup, {
    attachTo,
    props: { source, purpose },
    global: { stubs: { SButton: SButtonStub } },
  });
  wrappers.push(wrapper);
  return wrapper;
}
function button(wrapper: ReturnType<typeof mount>, key: string) {
  return wrapper.findAll('button').find((node) => node.text() === key)!;
}
describe('Get TS wallet setup', () => {
  beforeEach(() => {
    shared.ctx = createContext();
  });
  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    attachedRoots.splice(0).forEach((root) => root.remove());
  });
  it('moves real DOM focus from entry through Ethereum, SORA and ready without starting unsolicited connections', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    attachedRoots.push(host);
    const wrapper = setup('card', 'xor', host);
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.get('h3').element);
    expect(document.activeElement?.textContent).toBe('getTs.connectEthereum');
    expect(wrapper.get('h3').attributes('tabindex')).toBe('-1');
    expect(shared.ctx!.external.connectEvmWallet).not.toHaveBeenCalled();
    expect(shared.ctx!.internal.connectGoogleWallet).not.toHaveBeenCalled();

    const ethereumButton = button(wrapper, 'getTs.connectEthereum');
    (ethereumButton.element as HTMLElement).focus();
    await ethereumButton.trigger('click');
    shared.ctx!.external.evmAddress.value = '0xwallet';
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.get('h3').element);
    expect(document.activeElement?.textContent).toBe('getTs.onboarding.soraTitle');
    expect(shared.ctx!.external.connectEvmWallet).toHaveBeenCalledOnce();
    expect(shared.ctx!.internal.connectGoogleWallet).not.toHaveBeenCalled();

    const googleButton = button(wrapper, 'getTs.onboarding.googleAction');
    (googleButton.element as HTMLElement).focus();
    await googleButton.trigger('click');
    shared.ctx!.internal.soraAddress.value = 'sora-wallet';
    shared.ctx!.internal.isLoggedIn.value = true;
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.get('.claim-wallets__ready').element);
    expect(document.activeElement?.textContent).toBe('getTs.walletsReady');
    expect(wrapper.get('.claim-wallets__ready').attributes('tabindex')).toBe('-1');
    expect(shared.ctx!.internal.connectGoogleWallet).toHaveBeenCalledOnce();
    expect(shared.ctx!.internal.connectSoraWallet).not.toHaveBeenCalled();
    expect(shared.ctx!.ton.connect).not.toHaveBeenCalled();
  });
  it('makes no unsolicited connection and starts Ethereum buyers with their payment wallet', async () => {
    const wrapper = setup();
    expect(shared.ctx!.external.connectEvmWallet).not.toHaveBeenCalled();
    expect(shared.ctx!.internal.connectGoogleWallet).not.toHaveBeenCalled();
    expect(wrapper.find('h3').text()).toBe('getTs.connectEthereum');
    await button(wrapper, 'getTs.connectEthereum').trigger('click');
    expect(shared.ctx!.external.connectEvmWallet).toHaveBeenCalledOnce();
    shared.ctx!.external.evmAddress.value = '0xwallet';
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('getTs.onboarding.soraTitle');
    await button(wrapper, 'getTs.onboarding.googleAction').trigger('click');
    expect(shared.ctx!.internal.connectGoogleWallet).toHaveBeenCalledOnce();
    expect(shared.ctx!.internal.connectSoraWallet).not.toHaveBeenCalled();
  });
  it('uses neutral receiving-wallet copy for general XOR purchases', async () => {
    const wrapper = setup('sora', 'xor');
    expect(wrapper.text()).toContain('getTs.onboarding.soraPurposeXor');
    expect(wrapper.text()).toContain('getTs.onboarding.soraWallet');
    expect(wrapper.find('h3').text()).toBe('getTs.onboarding.soraTitle');
    expect(wrapper.text()).not.toContain('getTs.claimWallet');
    expect(wrapper.text()).not.toContain('getTs.walletsDescription');
    expect(shared.ctx!.internal.connectSoraWallet).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('getTs.onboarding.soraPurposeTs');
    await button(wrapper, 'getTs.onboarding.otherSora').trigger('click');
    expect(shared.ctx!.internal.connectSoraWallet).toHaveBeenCalledOnce();
  });

  it('offers Google only when available and keeps the alternative SORA account chooser explicit', async () => {
    shared.ctx!.wallet.availableWallets = [];
    const wrapper = setup('xor');
    expect(wrapper.text()).not.toContain('getTs.onboarding.googleAction');
    expect(wrapper.text()).not.toContain('getTs.onboarding.googleSummary');
    expect(wrapper.text()).not.toContain('getTs.ethereumWallet');
    await button(wrapper, 'getTs.onboarding.chooseSora').trigger('click');
    expect(shared.ctx!.internal.connectSoraWallet).toHaveBeenCalledOnce();
  });
  it('connects TON first, replaces a wrong-network account, then asks for Ethereum and the claim wallet', async () => {
    shared.ctx!.ton.address.value = 'ton-test';
    shared.ctx!.ton.chain.value = '-3';
    const wrapper = setup('ton');
    expect(wrapper.find('h3').text()).toBe('getTs.connectTonFirst');
    expect(wrapper.find('[role="alert"]').text()).toBe('getTs.conversion.tonMainnet');
    await button(wrapper, 'getTs.conversion.connectTon').trigger('click');
    await flushPromises();
    expect(shared.ctx!.ton.disconnect).toHaveBeenCalledOnce();
    expect(shared.ctx!.ton.connect).toHaveBeenCalledOnce();
    shared.ctx!.ton.chain.value = '-239';
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('getTs.connectEthereum');
    shared.ctx!.external.evmAddress.value = '0xwallet';
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('getTs.onboarding.soraTitle');
  });
  it('shows readiness only after required connections and never opens a financial action', async () => {
    shared.ctx!.internal.isLoggedIn.value = true;
    shared.ctx!.internal.soraAddress.value = 'sora-wallet';
    const wrapper = setup('sora');
    expect(wrapper.find('[role="status"]').text()).toBe('getTs.walletsReady');
    expect(shared.ctx!.external.connectEvmWallet).not.toHaveBeenCalled();
    expect(shared.ctx!.ton.connect).not.toHaveBeenCalled();
    await button(wrapper, 'getTs.changeWallet').trigger('click');
    expect(shared.ctx!.internal.connectSoraWallet).toHaveBeenCalledOnce();
  });
  it('handles rejected connections as retryable errors and uses the chooser for an existing EVM wallet', async () => {
    shared.ctx!.external.connectEvmWallet.mockRejectedValueOnce(new Error('declined'));
    const wrapper = setup('card');
    await button(wrapper, 'getTs.connectEthereum').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('getTs.connectionFailed');
    shared.ctx!.external.evmAddress.value = '0xwallet';
    await flushPromises();
    await button(wrapper, 'getTs.changeWallet').trigger('click');
    expect(shared.ctx!.external.openSelectProviderDialog).toHaveBeenCalledOnce();
    shared.ctx!.internal.connectGoogleWallet.mockRejectedValueOnce(new Error('declined'));
    await button(wrapper, 'getTs.onboarding.googleAction').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('getTs.connectionFailed');
  });
  it.each([
    ['card', 2, 'ethereum'],
    ['ethereum', 2, 'ethereum'],
    ['ton', 3, 'ton'],
    ['sora', 1, 'sora'],
    ['xor', 1, 'sora'],
  ] as const)('shows the exact %s requirements with one current action', (source, count, current) => {
    const wrapper = setup(source);
    expect(wrapper.find('.claim-wallets__checklist summary').text()).toBe(`getTs.onboarding.walletProgress 0/${count}`);
    expect(wrapper.findAll('.claim-wallets__list li')).toHaveLength(count);
    expect(wrapper.findAll('[aria-current="step"]')).toHaveLength(1);
    expect(wrapper.find('[aria-current="step"]').text()).toContain(
      current === 'sora' ? 'getTs.onboarding.soraWallet' : `getTs.${current}Wallet`
    );
    expect(
      wrapper
        .findAll('.claim-wallets__action > button')
        .filter((node) => !node.classes().includes('claim-wallets__secondary'))
    ).toHaveLength(1);
    expect(wrapper.findAll('h3')).toHaveLength(1);
  });
  it('offers passive official creation help before Ethereum connection', async () => {
    const wrapper = setup('card');
    expect(wrapper.find('details summary').text()).toBe('getTs.onboarding.needEthereumWallet');
    await wrapper.find('details summary').trigger('click');
    expect(wrapper.findAll('.claim-wallets__instructions li')).toHaveLength(3);
    const link = wrapper.find('a');
    expect(link.attributes('href')).toBe('https://metamask.io/download');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
    expect(shared.ctx!.external.connectEvmWallet).not.toHaveBeenCalled();
    expect(shared.ctx!.internal.connectGoogleWallet).not.toHaveBeenCalled();
  });
  it('explains Google creation and recovery without auto-creating an account', async () => {
    const wrapper = setup('sora');
    expect(wrapper.text()).toContain('getTs.onboarding.googleCreate');
    expect(wrapper.text()).toContain('getTs.onboarding.googleRestore');
    expect(wrapper.text()).toContain('getTs.onboarding.googleRecovery');
    await wrapper.find('details summary').trigger('click');
    expect(shared.ctx!.internal.connectGoogleWallet).not.toHaveBeenCalled();
    expect(shared.ctx!.internal.connectSoraWallet).not.toHaveBeenCalled();
    expect(wrapper.find('a').attributes('href')).toBe('https://wiki.sora.org/polkaswap-connect-wallet.html');
    expect(wrapper.find('a').attributes('rel')).toBe('noopener noreferrer');
  });
  it('clears a previous connection error after wallet progress and keeps SORA chooser failures retryable', async () => {
    shared.ctx!.external.connectEvmWallet.mockRejectedValueOnce(new Error('declined'));
    const wrapper = setup();
    await button(wrapper, 'getTs.connectEthereum').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    shared.ctx!.external.evmAddress.value = '0xwallet';
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('.claim-wallets__checklist summary').text()).toBe('getTs.onboarding.walletProgress 1/2');
    shared.ctx!.internal.connectSoraWallet.mockRejectedValueOnce(new Error('declined'));
    await button(wrapper, 'getTs.onboarding.otherSora').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('getTs.onboarding.connectionHelp');
    await button(wrapper, 'getTs.onboarding.otherSora').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(shared.ctx!.internal.connectSoraWallet).toHaveBeenCalledTimes(2);
  });
  it('uses distinct accessible section labels when more than one setup is mounted', () => {
    const wrapper = mount(
      {
        components: { GetTsWalletSetup },
        template: '<div><GetTsWalletSetup source="sora" /><GetTsWalletSetup source="sora" /></div>',
      },
      { global: { stubs: { SButton: SButtonStub } } }
    );
    wrappers.push(wrapper);
    const sections = wrapper.findAll('section');
    const firstId = sections[0].attributes('aria-labelledby');
    expect(sections[0].find('h2').attributes('id')).toBe(firstId);
    expect(sections[1].attributes('aria-labelledby')).not.toBe(firstId);
  });
});
