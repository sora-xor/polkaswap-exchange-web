import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SoraNexusAccountGenerator from '@/features/misc/components/burn/SoraNexusAccountGenerator.vue';

const phrase =
  'absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice comic';
const address = 'sorauﾛ1PaQｽGh1ｴ6pAﾜnqｸfJuｿMﾑVqﾏvQﾐﾚｼｾﾋaﾈｳﾊc1ｺﾊ1GGM2D';
const generateMock = vi.hoisted(() => vi.fn());
const registerRouteGuard = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({ onBeforeRouteLeave: registerRouteGuard }));
vi.mock('@/features/misc/lib/nexusAccountGenerator', () => ({
  generateSoraNexusAccount: generateMock,
}));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { number?: number }) => `${key}${params?.number ? ` ${params.number}` : ''}`,
  }),
}));
vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBase',
    props: ['visible', 'showCloseButton', 'closeOnClickModal', 'closeOnEsc'],
    emits: ['update:visible'],
    template:
      '<div v-if="visible" data-testid="nexus-dialog"><slot name="header-actions"/><slot/><slot name="footer"/></div>',
  },
}));

function mountGenerator(burnAvailable = true) {
  return mount(SoraNexusAccountGenerator, {
    props: { burnAvailable },
    global: {
      stubs: {
        's-button': {
          props: ['disabled'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
        },
      },
    },
  });
}

async function startBackup(wrapper: ReturnType<typeof mountGenerator>) {
  await wrapper.find('.nexus-generator__generate').trigger('click');
  await nextTick();
}

async function showChallenge(wrapper: ReturnType<typeof mountGenerator>) {
  await wrapper.find('[data-testid="nexus-backup-acknowledgement"]').setValue(true);
  await clickDialogButton(wrapper, 'burnPage.nexusGenerator.continue');
  await nextTick();
}

async function clickDialogButton(wrapper: ReturnType<typeof mountGenerator>, key: string) {
  const button = wrapper.findAll('[data-testid="nexus-dialog"] button').find((item) => item.text() === key);
  expect(button, `Missing ${key} button`).toBeDefined();
  await button!.trigger('click');
}

function challengePositions(wrapper: ReturnType<typeof mountGenerator>): number[] {
  return wrapper
    .findAll('[data-testid^="nexus-word-"]')
    .map((input) => Number(input.attributes('data-testid')!.slice('nexus-word-'.length)));
}

async function answerChallenge(wrapper: ReturnType<typeof mountGenerator>, wrongFirst = false) {
  const phraseWords = phrase.split(' ');
  const inputs = wrapper.findAll('[data-testid^="nexus-word-"]');
  expect(inputs).toHaveLength(3);
  for (const [position, input] of inputs.entries()) {
    const number = Number(input.attributes('data-testid')!.slice('nexus-word-'.length));
    await input.setValue(wrongFirst && position === 0 ? 'wrong' : phraseWords[number - 1]);
  }
}

async function showAddressStep(wrapper: ReturnType<typeof mountGenerator>) {
  await showChallenge(wrapper);
  await answerChallenge(wrapper);
  await clickDialogButton(wrapper, 'burnPage.nexusGenerator.continueToAddress');
  await nextTick();
}

async function finishAddressBackup(wrapper: ReturnType<typeof mountGenerator>) {
  await wrapper.find('[data-testid="nexus-address-acknowledgement"]').setValue(true);
  await clickDialogButton(wrapper, 'burnPage.nexusGenerator.finish');
  await nextTick();
}

describe('SoraNexusAccountGenerator', () => {
  beforeEach(() => {
    generateMock.mockReset();
    generateMock.mockReturnValue({ phrase, address });
    registerRouteGuard.mockReset();
  });

  it('reveals the address only after the word spot-check and enables use only after its backup is acknowledged', async () => {
    const wrapper = mountGenerator();
    await startBackup(wrapper);

    expect(wrapper.findAll('.nexus-generator__words li')).toHaveLength(24);
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
    expect(wrapper.html()).not.toContain(address);
    expect(
      wrapper
        .findAll('[data-testid="nexus-dialog"] button')
        .find((item) => item.text().endsWith('.continue'))
        ?.attributes('disabled')
    ).toBeDefined();

    await showChallenge(wrapper);
    expect(wrapper.find('[data-testid="nexus-recovery-words"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
    expect(wrapper.html()).not.toContain(address);

    await answerChallenge(wrapper, true);
    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.continueToAddress');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
    expect(wrapper.html()).not.toContain(address);

    await answerChallenge(wrapper);
    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.continueToAddress');
    expect(wrapper.find('[data-testid="nexus-pending-address"]').text()).toBe(address);
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
    expect(wrapper.emitted('useAddress')).toBeUndefined();
    expect(
      wrapper
        .findAll('[data-testid="nexus-dialog"] button')
        .find((item) => item.text().endsWith('.finish'))
        ?.attributes('disabled')
    ).toBeDefined();

    await finishAddressBackup(wrapper);
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').text()).toBe(address);
    expect(wrapper.html()).not.toContain(phrase);
    expect(wrapper.find('[data-testid="nexus-dialog"]').exists()).toBe(false);
  });

  it('requires an explicit discard confirmation and preserves the backup when cancelled', async () => {
    const wrapper = mountGenerator();
    await startBackup(wrapper);

    const dialog = wrapper.findComponent({ name: 'DialogBase' });
    expect(dialog.props('showCloseButton')).toBe(false);
    expect(dialog.props('closeOnClickModal')).toBe(false);
    expect(dialog.props('closeOnEsc')).toBe(false);

    await clickDialogButton(wrapper, 'cancelText');
    expect(wrapper.find('[role="alert"]').text()).toBe('burnPage.nexusGenerator.discardWarning');
    expect(wrapper.findAll('.nexus-generator__words li')).toHaveLength(0);

    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.keepBackingUp');
    expect(wrapper.findAll('.nexus-generator__words li')).toHaveLength(24);
    expect(wrapper.find('[data-testid="nexus-dialog"]').exists()).toBe(true);

    await clickDialogButton(wrapper, 'cancelText');
    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.confirmDiscard');

    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nexus-dialog"]').exists()).toBe(false);
    expect(wrapper.vm.$.setupState.words).toEqual([]);
  });

  it.each(['display', 'verify', 'address'] as const)(
    'offers Close and Cancel during the %s step without accepting the account',
    async (step) => {
      const wrapper = mountGenerator();
      await startBackup(wrapper);
      if (step === 'verify') await showChallenge(wrapper);
      if (step === 'address') await showAddressStep(wrapper);

      await wrapper.find('[data-testid="nexus-close"]').trigger('click');
      expect(wrapper.find('[role="alert"]').text()).toBe('burnPage.nexusGenerator.discardWarning');
      await wrapper.find('[data-testid="nexus-close"]').trigger('click');
      expect(wrapper.vm.$.setupState.discardRequested).toBe(false);
      expect(wrapper.vm.$.setupState.stage).toBe(step);
      await clickDialogButton(wrapper, 'cancelText');
      await clickDialogButton(wrapper, 'burnPage.nexusGenerator.confirmDiscard');

      expect(wrapper.find('[data-testid="nexus-dialog"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
      expect(wrapper.emitted('useAddress')).toBeUndefined();
      expect(generateMock).toHaveBeenCalledTimes(1);
      expect(wrapper.vm.$.setupState.words).toEqual([]);
      expect(wrapper.vm.$.setupState.pendingAddress).toBe('');

      await startBackup(wrapper);
      expect(generateMock).toHaveBeenCalledTimes(2);
      expect(wrapper.vm.$.setupState.stage).toBe('display');
      expect(wrapper.vm.$.setupState.backupAcknowledged).toBe(false);
      expect(wrapper.vm.$.setupState.addressBackupAcknowledged).toBe(false);
      expect(wrapper.vm.$.setupState.challengeAnswers).toEqual(['', '', '']);
    }
  );

  it('handles Escape with confirmation and removes its listener after cancellation', async () => {
    const wrapper = mountGenerator();
    await startBackup(wrapper);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(escape);
    await nextTick();
    expect(escape.defaultPrevented).toBe(true);
    expect(wrapper.find('[role="alert"]').text()).toBe('burnPage.nexusGenerator.discardWarning');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.findAll('.nexus-generator__words li')).toHaveLength(24);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.confirmDiscard');
    const afterClose = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(afterClose);
    expect(afterClose.defaultPrevented).toBe(false);
    expect(wrapper.emitted('useAddress')).toBeUndefined();
  });

  it('guards route changes and browser unloads while recovery words are pending', async () => {
    const wrapper = mountGenerator();
    const routeGuard = registerRouteGuard.mock.calls.at(-1)?.[0] as () => boolean;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    expect(routeGuard()).toBe(true);
    await startBackup(wrapper);

    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    expect(routeGuard()).toBe(false);
    expect(wrapper.findAll('.nexus-generator__words li')).toHaveLength(24);
    expect(routeGuard()).toBe(true);
    expect(confirm).toHaveBeenCalledWith(
      'burnPage.nexusGenerator.discardTitle\n\nburnPage.nexusGenerator.discardWarning'
    );

    const setupState = wrapper.vm.$.setupState;
    wrapper.unmount();
    expect(setupState.words).toEqual([]);
    const afterLeave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(afterLeave);
    expect(afterLeave.defaultPrevented).toBe(false);
    const afterUnmountEscape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(afterUnmountEscape);
    expect(afterUnmountEscape.defaultPrevented).toBe(false);
    confirm.mockRestore();
  });

  it('asks for three new word positions after the user reviews the phrase', async () => {
    const wrapper = mountGenerator();
    await startBackup(wrapper);
    await showChallenge(wrapper);
    const firstPositions = challengePositions(wrapper);

    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.showWords');
    expect(wrapper.findAll('.nexus-generator__words li')).toHaveLength(24);
    expect(wrapper.findAll('[data-testid^="nexus-word-"]')).toHaveLength(0);
    expect(wrapper.html()).not.toContain(address);

    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.continue');
    const secondPositions = challengePositions(wrapper);
    expect(secondPositions).toHaveLength(3);
    expect(secondPositions.every((position) => !firstPositions.includes(position))).toBe(true);
  });

  it('resets address acknowledgement if the user reviews the phrase again', async () => {
    const wrapper = mountGenerator();
    await startBackup(wrapper);
    await showAddressStep(wrapper);
    await wrapper.find('[data-testid="nexus-address-acknowledgement"]').setValue(true);

    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.showWords');
    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.continue');
    await answerChallenge(wrapper);
    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.continueToAddress');

    expect((wrapper.find('[data-testid="nexus-address-acknowledgement"]').element as HTMLInputElement).checked).toBe(
      false
    );
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
  });

  it('copies only the public address and emits it after both backup acknowledgements', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const wrapper = mountGenerator();
    await startBackup(wrapper);
    await showAddressStep(wrapper);
    await clickDialogButton(wrapper, 'burnPage.nexusGenerator.copyAddress');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(address);
    expect(wrapper.emitted('useAddress')).toBeUndefined();

    await finishAddressBackup(wrapper);

    await wrapper.findAll('.nexus-generator__address-actions button').at(0)!.trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(writeText).toHaveBeenNthCalledWith(2, address);
    await wrapper.findAll('.nexus-generator__address-actions button').at(1)!.trigger('click');
    expect(wrapper.emitted('useAddress')).toEqual([[address]]);
    vi.unstubAllGlobals();
  });

  it('hides unused generation after SOLSWAP ends but keeps a verified address copyable', async () => {
    const endedWrapper = mountGenerator(false);
    expect(endedWrapper.find('.nexus-generator').exists()).toBe(false);
    expect(generateMock).not.toHaveBeenCalled();

    const wrapper = mountGenerator();
    await startBackup(wrapper);
    await showAddressStep(wrapper);
    await finishAddressBackup(wrapper);
    await wrapper.setProps({ burnAvailable: false });

    expect(wrapper.find('.nexus-generator').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').text()).toBe(address);
    expect(wrapper.find('.nexus-generator__generate').exists()).toBe(false);
    expect(wrapper.findAll('.nexus-generator__address-actions button').at(1)!.attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('useAddress')).toBeUndefined();
  });

  it('does not show or use an address when generation fails', async () => {
    generateMock.mockImplementationOnce(() => {
      throw new Error('Secure randomness unavailable');
    });
    const wrapper = mountGenerator();
    await startBackup(wrapper);
    expect(wrapper.find('[data-testid="nexus-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nexus-confirmed-address"]').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
});
