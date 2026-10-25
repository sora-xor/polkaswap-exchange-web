import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import appDisclaimerSource from '@/components/App/Header/AppDisclaimer.vue?raw';

const { settingsStoreMock, route } = vi.hoisted(() => ({
  settingsStoreMock: {
    disclaimerVisibility: true,
    userDisclaimerApprove: false,
    setUserDisclaimerApprove: vi.fn(),
    setDisclaimerDialogVisibility: vi.fn(),
  },
  route: { name: 'Swap' },
}));

vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settingsStoreMock }));
vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, args?: Record<string, string>) => {
      if (key === 'disclaimer') {
        return `<p>${args?.disclaimerPrefix} Full legal notice ${args?.polkaswapFaqLink} ${args?.memorandumLink} ${args?.privacyLink}</p><script>unsafe()</script>`;
      }
      return (
        {
          disclaimerTitle: 'Disclaimer',
          acceptText: 'Accept & Hide',
          fiatDisclaimer: 'Fiat values are approximate.',
          memorandum: 'Memorandum',
          'helpDialog.privacyPolicy': 'Privacy Policy',
          FAQ: 'FAQ',
          closeText: 'Close',
          'disclaimerSummary.title': 'Before you continue',
          'disclaimerSummary.fullTerms': 'Full terms',
          'disclaimerSummary.acknowledgement': 'I have read and understand the risks and terms.',
        }[key] ?? key
      );
    },
  }),
}));

vi.mock('@/lib/soramitsu-ui/components/Modal', () => ({
  SModal: defineComponent({
    name: 'SModal',
    props: [
      'show',
      'teleportTo',
      'absolute',
      'lockScroll',
      'focusTrap',
      'rootClass',
      'modalClass',
      'closeOnOverlayClick',
      'closeOnEsc',
      'showOverlay',
      'labelledBy',
    ],
    emits: ['update:show'],
    setup(props, { slots, emit }) {
      return () =>
        h('div', { class: 's-modal-stub', 'data-show': String(Boolean(props.show)) }, [
          h('div', {
            'data-testid': 'overlay',
            onClick: () => {
              if (props.closeOnOverlayClick) emit('update:show', false);
            },
          }),
          slots.default?.(),
        ]);
    },
  }),
}));

import AppDisclaimer from '@/components/App/Header/AppDisclaimer.vue';

const createWrapper = () => mount(AppDisclaimer);

describe('AppDisclaimer', () => {
  beforeEach(() => {
    route.name = 'Swap';
    settingsStoreMock.disclaimerVisibility = true;
    settingsStoreMock.userDisclaimerApprove = false;
    vi.clearAllMocks();
  });

  it('uses a named viewport modal with first-launch dismissal protection', () => {
    const wrapper = createWrapper();
    const modal = wrapper.getComponent({ name: 'SModal' });
    expect(modal.props()).toMatchObject({
      teleportTo: 'body',
      absolute: false,
      lockScroll: false,
      focusTrap: true,
      showOverlay: true,
      closeOnOverlayClick: false,
      closeOnEsc: false,
      modalClass: 'disclaimer-modal__dialog',
    });
    expect(modal.props('labelledBy')).toBe(wrapper.get('h2').attributes('id'));
    expect(wrapper.find('.disclaimer__header-close-btn').exists()).toBe(false);
  });

  it('requires explicit acknowledgement without scroll or timer gating', async () => {
    const wrapper = createWrapper();
    const accept = wrapper.get('.disclaimer__accept-btn');
    expect((accept.element as HTMLButtonElement).disabled).toBe(true);
    await accept.trigger('click');
    expect(settingsStoreMock.setUserDisclaimerApprove).not.toHaveBeenCalled();
    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect((accept.element as HTMLButtonElement).disabled).toBe(false);
    await wrapper.get('input[type="checkbox"]').setValue(false);
    expect((accept.element as HTMLButtonElement).disabled).toBe(true);
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await accept.trigger('click');
    expect(settingsStoreMock.setUserDisclaimerApprove).toHaveBeenCalledTimes(1);
    expect(settingsStoreMock.setDisclaimerDialogVisibility).toHaveBeenCalledWith(false);
    expect(appDisclaimerSource).not.toContain('IntersectionObserver');
  });

  it('retains full sanitized terms and document links below the risk summary', () => {
    const wrapper = createWrapper();
    expect(wrapper.findAll('.disclaimer__summary li')).toHaveLength(3);
    expect(wrapper.text()).toContain('Full legal notice');
    expect(wrapper.text()).toContain('Fiat values are approximate.');
    expect(wrapper.get('[role="region"]').attributes('tabindex')).toBe('0');
    expect(wrapper.get('.disclaimer__acknowledgement').text()).toContain('I have read');
    expect(wrapper.findAll('a')).toHaveLength(3);
    expect(wrapper.find('script').exists()).toBe(false);
    for (const link of wrapper.findAll('a')) {
      expect(link.attributes('rel')).toContain('noopener');
      expect(link.attributes('target')).toBe('_blank');
    }
  });

  it('keeps a manually opened disclaimer nonblocking off Swap after approval', () => {
    route.name = 'VaultsContainer';
    settingsStoreMock.userDisclaimerApprove = true;
    const wrapper = createWrapper();
    const modal = wrapper.getComponent({ name: 'SModal' });
    expect(modal.props('showOverlay')).toBe(false);
    expect(modal.props('focusTrap')).toBe(false);
    expect(modal.props('rootClass')).toEqual(['disclaimer-modal', { 'disclaimer-modal--nonblocking': true }]);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
  });

  it('allows close and overlay dismissal after approval', async () => {
    settingsStoreMock.userDisclaimerApprove = true;
    const wrapper = createWrapper();
    const modal = wrapper.getComponent({ name: 'SModal' });
    expect(modal.props('closeOnOverlayClick')).toBe(true);
    expect(modal.props('closeOnEsc')).toBe(true);
    expect(wrapper.get('.disclaimer__header-close-btn').attributes('aria-label')).toBe('Close');
    await wrapper.get('.disclaimer__header-close-btn').trigger('click');
    expect(settingsStoreMock.setDisclaimerDialogVisibility).toHaveBeenCalledWith(false);
    settingsStoreMock.setDisclaimerDialogVisibility.mockClear();
    await wrapper.get('[data-testid="overlay"]').trigger('click');
    expect(settingsStoreMock.setDisclaimerDialogVisibility).toHaveBeenCalledWith(false);
  });

  it('fits readable text and a fixed acknowledgement footer within the viewport', () => {
    expect(appDisclaimerSource).toContain('max-width: 640px;');
    expect(appDisclaimerSource).toContain('max-height: calc(100dvh - 32px);');
    expect(appDisclaimerSource).toContain('font-size: 16px;');
    expect(appDisclaimerSource).toContain('overflow-y: auto;');
    expect(appDisclaimerSource).toContain(':global(.s-modal__root.disclaimer-modal--nonblocking)');
    expect(appDisclaimerSource).toContain(':global(.s-modal__root.disclaimer-modal--nonblocking .s-modal__modal)');
  });
});
