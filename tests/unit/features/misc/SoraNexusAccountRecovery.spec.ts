import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SoraNexusAccountRecovery from '@/features/misc/components/burn/SoraNexusAccountRecovery.vue';
import * as accounts from '@/features/misc/lib/nexusAccountGenerator';

vi.unmock('@polkadot/util-crypto');
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const fixturePhrase =
  'absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice comic';
const legacyAddress = 'sorauﾛ1PaQｽGh1ｴ6pAﾜnqｸfJuｿMﾑVqﾏvQﾐﾚｼｾﾋaﾈｳﾊc1ｺﾊ1GGM2D';

afterEach(() => vi.restoreAllMocks());

/** Mounts the public verification flow without a wallet connection or network provider. */
function mountRecovery() {
  return mount(SoraNexusAccountRecovery, {
    global: {
      stubs: {
        's-button': {
          props: ['disabled', 'nativeType'],
          template: '<button :type="nativeType" :disabled="disabled"><slot /></button>',
        },
      },
    },
  });
}

/** Enters a public test backup using the same controls as the browser. */
async function enterBackup(wrapper: ReturnType<typeof mountRecovery>, address = legacyAddress) {
  (wrapper.get('details').element as HTMLDetailsElement).open = true;
  await wrapper.get('details').trigger('toggle');
  await wrapper.get('[data-testid="nexus-recovery-address"]').setValue(address);
  await wrapper.get('[data-testid="nexus-recovery-phrase"]').setValue(fixturePhrase);
}

describe('SORA Nexus burn backup verification', () => {
  it('requires both backup inputs and conceals words while they are entered', async () => {
    const wrapper = mountRecovery();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.get('[data-testid="nexus-recovery-check"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="nexus-recovery-phrase"]').attributes('type')).toBe('password');
    expect(wrapper.get('[data-testid="nexus-recovery-phrase"]').attributes('autocomplete')).toBe('off');
    await enterBackup(wrapper);
    expect(wrapper.get('[data-testid="nexus-recovery-check"]').attributes('disabled')).toBeUndefined();
  });

  it('handles Enter locally without submitting the surrounding burn form', async () => {
    const wrapper = mountRecovery();
    await enterBackup(wrapper);
    const field = wrapper.get('[data-testid="nexus-recovery-phrase"]');
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    field.element.dispatchEvent(event);
    await wrapper.vm.$nextTick();
    expect(event.defaultPrevented).toBe(true);
    expect(wrapper.get('[role="status"] code').text()).toBe(legacyAddress);
  });

  it('verifies the original legacy recipient and clears the words without replacing the account', async () => {
    const wrapper = mountRecovery();
    await enterBackup(wrapper);
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    expect(wrapper.get('[role="status"] code').text()).toBe(legacyAddress);
    expect(wrapper.get('[role="status"]').text()).toContain('burnPage.nexusRecovery.legacy');
    expect(wrapper.get('[role="status"]').attributes('data-recovery-format')).toBe('polkaswap-entropy-v1');
    expect(wrapper.get('[data-testid="nexus-recovery-limits"]').text()).toBe('burnPage.nexusRecovery.legacy');
    expect((wrapper.get('[data-testid="nexus-recovery-phrase"]').element as HTMLInputElement).value).toBe('');
    expect(wrapper.text()).not.toContain(fixturePhrase);
    expect(wrapper.emitted('useAddress')).toBeUndefined();
  });

  it('recognizes the same words under the standard method only for the matching saved address', async () => {
    const wrapper = mountRecovery();
    const address = accounts.deriveSoraNexusAddressFromPhrase(fixturePhrase);
    expect(address).not.toBe(legacyAddress);
    await enterBackup(wrapper, address);
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    expect(wrapper.get('[role="status"] code').text()).toBe(address);
    expect(wrapper.get('[role="status"]').text()).toContain('burnPage.nexusRecovery.standard');
    expect(wrapper.get('[role="status"]').attributes('data-recovery-format')).toBe('bip39-slip10');
  });

  it.each([
    ['legacy', legacyAddress],
    ['standard', undefined],
  ])('offers no restore, burn or copy action after a %s match', async (_label, saved) => {
    const wrapper = mountRecovery();
    await enterBackup(wrapper, saved ?? accounts.deriveSoraNexusAddressFromPhrase(fixturePhrase));
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    // Only the two controls that existed before the match remain; a match never unlocks another path.
    expect(wrapper.findAll('button').map((button) => button.attributes('data-testid'))).toEqual([
      'nexus-recovery-check',
      'nexus-recovery-clear',
    ]);
    expect(wrapper.findAll('a')).toHaveLength(0);
    expect(wrapper.findAll('[role="status"] button, [role="status"] a, [role="status"] input')).toHaveLength(0);
    expect(wrapper.emitted('useAddress')).toBeUndefined();
  });

  it('shows the strictest limits text if an unknown format is ever reported', async () => {
    vi.spyOn(accounts, 'recoverSoraNexusAccount').mockReturnValueOnce({
      address: legacyAddress,
      recoveryFormat: 'future-format' as accounts.SoraNexusRecoveryFormat,
    });
    const wrapper = mountRecovery();
    await enterBackup(wrapper);
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    expect(wrapper.get('[data-testid="nexus-recovery-limits"]').text()).toBe('burnPage.nexusRecovery.legacy');
  });

  it('rejects an invalid saved address and clears words on failure', async () => {
    const wrapper = mountRecovery();
    await enterBackup(wrapper, 'not-an-address');
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toBe('burnPage.nexusRecovery.failed');
    expect((wrapper.get('[data-testid="nexus-recovery-phrase"]').element as HTMLInputElement).value).toBe('');
  });

  it('never renders the exception or logs a private phrase', async () => {
    vi.spyOn(accounts, 'recoverSoraNexusAccount').mockImplementationOnce(() => {
      throw new Error(fixturePhrase);
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountRecovery();
    await enterBackup(wrapper);
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    expect(wrapper.text()).not.toContain(fixturePhrase);
    expect(log).not.toHaveBeenCalled();
  });

  it('does not send, save, or copy the recovery phrase', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const wrapper = mountRecovery();
    await enterBackup(wrapper);
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    expect(fetch).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it('invalidates a verified result when the recipient changes', async () => {
    const wrapper = mountRecovery();
    await enterBackup(wrapper);
    await wrapper.get('[data-testid="nexus-recovery-check"]').trigger('click');
    await wrapper.get('[data-testid="nexus-recovery-address"]').setValue('changed');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it.each(['clear', 'close', 'pagehide'] as const)('discards pending words on %s', async (action) => {
    const wrapper = mountRecovery();
    await enterBackup(wrapper);
    if (action === 'clear') await wrapper.get('[data-testid="nexus-recovery-clear"]').trigger('click');
    if (action === 'close') {
      (wrapper.get('details').element as HTMLDetailsElement).open = false;
      await wrapper.get('details').trigger('toggle');
    }
    if (action === 'pagehide') {
      window.dispatchEvent(new Event('pagehide'));
      await wrapper.vm.$nextTick();
    }
    expect((wrapper.get('[data-testid="nexus-recovery-phrase"]').element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('[data-testid="nexus-recovery-address"]').element as HTMLInputElement).value).toBe('');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});
