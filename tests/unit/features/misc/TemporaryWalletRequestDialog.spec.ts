import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Real SS58 encoding for the SORA recipient: TextEncoder returns Node-realm arrays, so SS58 hashing must use that
// same constructor in jsdom.
vi.hoisted(() => {
  vi.stubGlobal('Uint8Array', new TextEncoder().encode('').constructor);
});
vi.unmock('@polkadot/util-crypto');

import liveFixtures from './fixtures/tonswapConversion.json';
import TemporaryWalletRequestDialog from '@/features/misc/components/buy-xor/TemporaryWalletRequestDialog.vue';
import dialogSource from '@/features/misc/components/buy-xor/TemporaryWalletRequestDialog.vue?raw';
import {
  rejectTemporaryWalletRequest,
  requestTemporaryWalletApproval,
  temporaryWalletSession,
  type TemporaryWalletApproval,
} from '@/utils/connection/evm/temporaryWalletSession';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  }),
}));
const soraWallet = vi.hoisted(() => ({ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => soraWallet }));
vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBase',
    props: ['visible', 'title', 'showCloseButton', 'closeOnClickModal', 'closeOnEsc'],
    emits: ['update:visible'],
    template:
      '<div v-if="visible" class="dialog"><h2><slot name="title">{{ title }}</slot></h2><slot /><slot name="footer" />' +
      '<button v-if="showCloseButton" class="dialog-close" @click="$emit(\'update:visible\', false)">x</button></div>',
  },
}));

const BUYER = '0x196a45c9ca4270bb714042b7254fbdb50277881b';
const SButtonStub = {
  props: ['disabled', 'loading'],
  emits: ['click'],
  template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
};
/** The captured ETH → DAI conversion, with fees of 0.00042 ETH likely and 0.0012345678901 ETH at most. */
const conversion = {
  from: BUYER,
  to: liveFixtures.eth.tx.to,
  data: liveFixtures.eth.tx.data,
  value: liveFixtures.eth.tx.value,
  gasLimit: '250000',
  maxFeePerGas: '21000000000',
  estimatedFee: '420000000000000',
  maxFee: '1234567890100000',
};

function open(approve: () => Promise<TemporaryWalletApproval>) {
  const result = requestTemporaryWalletApproval(conversion, approve);
  result.catch(() => undefined);
  const wrapper = mount(TemporaryWalletRequestDialog, { global: { stubs: { SButton: SButtonStub } } });
  return { result, wrapper };
}
const button = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('button').find((node) => node.text() === label)!;

afterEach(() => {
  const pending = temporaryWalletSession.request;
  if (pending && !pending.busy) rejectTemporaryWalletRequest(pending.id);
});

describe('TemporaryWalletRequestDialog', () => {
  it('shows what the transaction does, both addresses, the ETH sent and the fee range', () => {
    const { wrapper } = open(vi.fn());
    expect(wrapper.find('h2').text()).toBe('temporaryWallet.request.title');
    expect(wrapper.get('[data-test-name="temporaryWalletAction"]').text()).toBe(
      'temporaryWallet.request.convert {"amount":"0.03015","minimum":"79.63253716"}'
    );
    expect(wrapper.findAll('code').map((node) => node.text())).toEqual([
      '0x196A45c9ca4270bb714042b7254FbdB50277881B',
      '0xE7e68D336F90f98D22A479253eafA5f2424aCaD8',
    ]);
    expect(wrapper.get('[data-test-name="temporaryWalletValue"]').text()).toBe('0.03015 ETH');
    // The maximum rounds up so it never reads lower than the real cap.
    expect(wrapper.get('[data-test-name="temporaryWalletFee"]').text()).toBe(
      'temporaryWallet.request.feeValue {"estimate":"0.00042","max":"0.00123457"}'
    );
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('temporaryWallet.request.note');
  });

  it('signs only after Approve, and shows the sending state meanwhile', async () => {
    let finish!: (value: TemporaryWalletApproval) => void;
    const approve = vi.fn(() => new Promise<TemporaryWalletApproval>((resolve) => (finish = resolve)));
    const { result, wrapper } = open(approve);
    expect(approve).not.toHaveBeenCalled();
    await button(wrapper, 'temporaryWallet.request.approve').trigger('click');
    expect(approve).toHaveBeenCalledOnce();
    await flushPromises();
    expect(wrapper.text()).toContain('temporaryWallet.request.sending');
    expect(button(wrapper, 'temporaryWallet.request.reject').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.dialog-close').exists()).toBe(false);
    finish({ hash: '0xhash' });
    await expect(result).resolves.toBe('0xhash');
    await flushPromises();
    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it('rejects on Reject and on closing the dialog', async () => {
    const approve = vi.fn();
    let { result, wrapper } = open(approve);
    await button(wrapper, 'temporaryWallet.request.reject').trigger('click');
    await expect(result).rejects.toMatchObject({ code: 4001 });
    wrapper.unmount();

    ({ result, wrapper } = open(approve));
    await wrapper.get('.dialog-close').trigger('click');
    await expect(result).rejects.toMatchObject({ code: 4001 });
    expect(approve).not.toHaveBeenCalled();
  });

  it('warns when fees went up and the new figures need another approval', async () => {
    const approve = vi
      .fn<() => Promise<TemporaryWalletApproval>>()
      .mockResolvedValueOnce({
        retry: {
          gasLimit: '250000',
          maxFeePerGas: '41000000000',
          estimatedFee: '800000000000000',
          maxFee: '10250000000000000',
        },
      })
      .mockResolvedValueOnce({ hash: '0xsecond' });
    const { result, wrapper } = open(approve);
    await button(wrapper, 'temporaryWallet.request.approve').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('temporaryWallet.request.feeIncreased');
    expect(wrapper.get('[data-test-name="temporaryWalletFee"]').text()).toBe(
      'temporaryWallet.request.feeValue {"estimate":"0.0008","max":"0.01025"}'
    );
    await button(wrapper, 'temporaryWallet.request.approve').trigger('click');
    await expect(result).resolves.toBe('0xsecond');
  });

  it('names an unlimited DAI allowance for the bridge without printing the maximum integer', () => {
    const data = '0x095ea7b3000000000000000000000000313416870a4da6f12505a550b67bb73c8e21d5d3' + 'f'.repeat(64);
    requestTemporaryWalletApproval(
      { ...conversion, to: '0x6B175474E89094C44Da98b954EedeAC495271d0F', data, value: '0' },
      vi.fn()
    ).catch(() => undefined);
    const wrapper = mount(TemporaryWalletRequestDialog, { global: { stubs: { SButton: SButtonStub } } });
    expect(wrapper.get('[data-test-name="temporaryWalletAction"]').text()).toBe(
      'temporaryWallet.request.allowBridgeAll'
    );
  });

  describe('DAI transfer to SORA', () => {
    const BRIDGE = '0x313416870a4da6f12505a550b67bb73c8e21d5d3';
    /** `sendERC20ToSidechain(recipient, 10 DAI, DAI)`. */
    const transfer = (recipient: string) =>
      '0x03ef9d1f' +
      recipient +
      '0000000000000000000000000000000000000000000000008ac7230489e80000' +
      '0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f';
    const show = (recipient: string) => {
      requestTemporaryWalletApproval(
        { ...conversion, to: BRIDGE, data: transfer(recipient), value: '0' },
        vi.fn()
      ).catch(() => undefined);
      return mount(TemporaryWalletRequestDialog, { global: { stubs: { SButton: SButtonStub } } });
    };
    afterEach(() => {
      soraWallet.address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    });

    it('names the receiving SORA account, which the bridge contract address alone does not show', () => {
      // The connected account's public key, so the transfer is to the buyer and needs no warning.
      const wrapper = show('d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d');
      expect(wrapper.get('[data-test-name="temporaryWalletAction"]').text()).toBe(
        'temporaryWallet.request.bridge {"amount":"10"}'
      );
      expect(wrapper.get('[data-test-name="temporaryWalletSoraAccount"]').text()).toBe(
        'cnWHXYTKQwMV96ZuTKbqTA23FuPcmWjrDyLNzCXYL92G9tmtm'
      );
      expect(wrapper.text()).toContain('temporaryWallet.request.soraAccount');
      expect(wrapper.find('[data-test-name="temporaryWalletOtherSoraAccount"]').exists()).toBe(false);
    });

    it('warns when the DAI would go to a SORA account other than the connected one', () => {
      const wrapper = show('22'.repeat(32));
      expect(wrapper.get('[data-test-name="temporaryWalletSoraAccount"]').text()).toBe(
        'cnSG3F5hh3Z5JzV2Qzn6Ez71CL8NUTi68wr9zrjdNedrJht1C'
      );
      expect(wrapper.get('[data-test-name="temporaryWalletOtherSoraAccount"]').text()).toBe(
        'temporaryWallet.request.otherSoraAccount'
      );
    });

    it('cannot compare without a connected SORA account, so it only names the recipient', () => {
      soraWallet.address = '';
      const wrapper = show('22'.repeat(32));
      expect(wrapper.find('[data-test-name="temporaryWalletSoraAccount"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-name="temporaryWalletOtherSoraAccount"]').exists()).toBe(false);
    });
  });

  it('names the ETH transfer to SORA of a card purchase and its receiving account', () => {
    // `sendEthToSidechain(recipient)` with 0.00622871875 ETH: the connected account's public key.
    requestTemporaryWalletApproval(
      {
        ...conversion,
        to: '0x313416870a4da6f12505a550b67bb73c8e21d5d3',
        data: '0xfdfba25dd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
        value: '6228718750000000',
      },
      vi.fn()
    ).catch(() => undefined);
    const wrapper = mount(TemporaryWalletRequestDialog, { global: { stubs: { SButton: SButtonStub } } });
    expect(wrapper.get('[data-test-name="temporaryWalletAction"]').text()).toBe(
      'temporaryWallet.request.bridgeEth {"amount":"0.00622872"}'
    );
    expect(wrapper.get('[data-test-name="temporaryWalletSoraAccount"]').text()).toBe(
      'cnWHXYTKQwMV96ZuTKbqTA23FuPcmWjrDyLNzCXYL92G9tmtm'
    );
    expect(wrapper.find('[data-test-name="temporaryWalletOtherSoraAccount"]').exists()).toBe(false);
  });

  it('shows no SORA account for transactions that do not bridge', () => {
    const { wrapper } = open(vi.fn());
    expect(wrapper.find('[data-test-name="temporaryWalletSoraAccount"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-name="temporaryWalletOtherSoraAccount"]').exists()).toBe(false);
  });

  it('colours its warnings with the status text token, which stays legible on the dialog', () => {
    // The plain warning colour measured 2.0:1 on the light dialog; the text token keeps 4.5:1 in both themes.
    const alertRule = dialogSource.match(/&__alert \{[^}]*\}/)?.[0] ?? '';
    expect(alertRule).toContain('color: var(--s-color-status-warning-text, var(--s-color-status-warning));');
  });

  it('describes an unknown call generically', () => {
    requestTemporaryWalletApproval({ ...conversion, data: '0xdeadbeef', value: '0' }, vi.fn()).catch(() => undefined);
    const wrapper = mount(TemporaryWalletRequestDialog, { global: { stubs: { SButton: SButtonStub } } });
    expect(wrapper.get('[data-test-name="temporaryWalletAction"]').text()).toBe('temporaryWallet.request.contract');
    expect(wrapper.find('[data-test-name="temporaryWalletValue"]').exists()).toBe(false);
  });
});
