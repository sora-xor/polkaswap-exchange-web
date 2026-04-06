import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, watch } from 'vue';

import appDisclaimerSource from '@/components/App/Header/AppDisclaimer.vue?raw';

const {
  settingsStoreMock,
  setUserDisclaimerApproveMock,
  setDisclaimerDialogVisibilityMock,
  disconnectMock,
  observeMock,
  modalPropsSnapshots,
  routeNameRef,
} = vi.hoisted(() => {
  const setUserDisclaimerApproveMock = vi.fn();
  const setDisclaimerDialogVisibilityMock = vi.fn();
  const observeMock = vi.fn();
  const disconnectMock = vi.fn();
  const modalPropsSnapshots: Array<Record<string, unknown>> = [];
  const routeNameRef = { value: 'Swap' };

  const settingsStoreMock = {
    disclaimerVisibility: true,
    userDisclaimerApprove: false,
    setUserDisclaimerApprove: setUserDisclaimerApproveMock,
    setDisclaimerDialogVisibility: setDisclaimerDialogVisibilityMock,
  };

  return {
    settingsStoreMock,
    setUserDisclaimerApproveMock,
    setDisclaimerDialogVisibilityMock,
    disconnectMock,
    observeMock,
    modalPropsSnapshots,
    routeNameRef,
  };
});

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, args?: Record<string, string>) => {
      if (key === 'disclaimer') {
        return `${args?.disclaimerPrefix} ${args?.polkaswapFaqLink} ${args?.memorandumLink} ${args?.privacyLink}`;
      }
      if (key === 'disclaimerTitle') return 'Disclaimer';
      if (key === 'acceptText') return 'Accept & Hide';
      if (key === 'acceptOnScrollText') return 'Scroll to accept';
      if (key === 'fiatDisclaimer') return 'Fiat disclaimer';
      if (key === 'memorandum') return 'Memorandum';
      if (key === 'helpDialog.privacyPolicy') return 'Privacy Policy';
      if (key === 'FAQ') return 'FAQ';
      return key;
    },
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    name: routeNameRef.value,
  }),
}));

vi.mock('@/utils', () => ({
  delay: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/soramitsu-ui/components/Modal', () => ({
  SModal: defineComponent({
    name: 'SModal',
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      teleportTo: {
        type: [String, null],
        default: 'body',
      },
      absolute: {
        type: Boolean,
        default: false,
      },
      lockScroll: {
        type: Boolean,
        default: true,
      },
      focusTrap: {
        type: [Boolean, Object],
        default: true,
      },
      rootClass: {
        type: [String, Array, Object],
        default: '',
      },
      modalClass: {
        type: [String, Array, Object],
        default: '',
      },
      closeOnOverlayClick: {
        type: Boolean,
        default: true,
      },
      closeOnEsc: {
        type: Boolean,
        default: true,
      },
      showOverlay: {
        type: Boolean,
        default: true,
      },
    },
    emits: ['update:show'],
    setup(props, { slots, emit }) {
      watch(
        () => ({
          teleportTo: props.teleportTo,
          absolute: props.absolute,
          lockScroll: props.lockScroll,
          focusTrap: props.focusTrap,
          rootClass: props.rootClass,
          modalClass: props.modalClass,
          closeOnOverlayClick: props.closeOnOverlayClick,
          closeOnEsc: props.closeOnEsc,
          showOverlay: props.showOverlay,
        }),
        (value) => {
          modalPropsSnapshots.push(value);
        },
        { immediate: true, deep: true }
      );

      return () =>
        h('div', { class: 's-modal-stub', 'data-show': String(Boolean(props.show)) }, [
          h('div', {
            'data-testid': 'overlay',
            onClick: () => {
              if (props.closeOnOverlayClick) {
                emit('update:show', false);
              }
            },
          }),
          h('div', { 'data-testid': 'modal' }, slots.default?.()),
        ]);
    },
  }),
}));

describe('AppDisclaimer', () => {
  beforeEach(() => {
    modalPropsSnapshots.length = 0;
    routeNameRef.value = 'Swap';
    settingsStoreMock.disclaimerVisibility = true;
    settingsStoreMock.userDisclaimerApprove = false;
    setUserDisclaimerApproveMock.mockReset();
    setDisclaimerDialogVisibilityMock.mockReset();
    observeMock.mockReset();
    disconnectMock.mockReset();

    class IntersectionObserverMock {
      private readonly callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element): void {
        observeMock(target);
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }

      disconnect(): void {
        disconnectMock();
      }
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  it('renders a viewport-level modal while first-launch acceptance is pending', async () => {
    const component = (await import('@/components/App/Header/AppDisclaimer.vue')).default;
    const wrapper = mount(component, {
      global: {
        stubs: {
          's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
        },
      },
    });

    await vi.dynamicImportSettled();
    await Promise.resolve();
    await nextTick();

    const modalProps = modalPropsSnapshots.at(-1);

    expect(wrapper.find('.s-modal-stub').exists()).toBe(true);
    expect(modalProps?.teleportTo).toBe('body');
    expect(modalProps?.absolute).toBe(false);
    expect(modalProps?.lockScroll).toBe(false);
    expect(modalProps?.focusTrap).toBe(true);
    expect(modalProps?.showOverlay).toBe(true);
    expect(modalProps?.rootClass).toEqual(['disclaimer-modal', { 'disclaimer-modal--nonblocking': false }]);
    expect(modalProps?.modalClass).toBe('disclaimer-modal__dialog');
    expect(modalProps?.closeOnOverlayClick).toBe(false);
    expect(modalProps?.closeOnEsc).toBe(false);
  });

  it('keeps the disclaimer non-blocking off the swap route', async () => {
    routeNameRef.value = 'VaultsContainer';

    const component = (await import('@/components/App/Header/AppDisclaimer.vue')).default;
    const wrapper = mount(component, {
      global: {
        stubs: {
          's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
        },
      },
    });

    await vi.dynamicImportSettled();
    await Promise.resolve();
    await nextTick();

    const modalProps = modalPropsSnapshots.at(-1);

    expect(wrapper.find('.s-modal-stub').attributes('data-show')).toBe('false');
    expect(modalProps?.showOverlay).toBe(false);
    expect(modalProps?.focusTrap).toBe(false);
    expect(modalProps?.rootClass).toEqual(['disclaimer-modal', { 'disclaimer-modal--nonblocking': true }]);
    expect(modalProps?.closeOnOverlayClick).toBe(false);
  });

  it('keeps nonblocking disclaimer hit testing global for modal roots outside the component scope', () => {
    expect(appDisclaimerSource).toContain(':global(.disclaimer-modal--nonblocking)');
    expect(appDisclaimerSource).toContain(':global(.disclaimer-modal--nonblocking .s-modal__modal)');
    expect(appDisclaimerSource).toContain(':global(.disclaimer-modal--nonblocking .disclaimer)');
  });

  it('centers the disclaimer modal through global modal root styles', () => {
    expect(appDisclaimerSource).toMatch(
      /:global\(\.disclaimer-modal\)\s*\{[\s\S]*?justify-content: center;[\s\S]*?align-items: center;/
    );
    expect(appDisclaimerSource).toMatch(/:global\(\.disclaimer-modal__dialog\)\s*\{[\s\S]*?justify-content: center;/);
  });

  it('activates accept state and handles accept action', async () => {
    const component = (await import('@/components/App/Header/AppDisclaimer.vue')).default;
    const wrapper = mount(component, {
      global: {
        stubs: {
          's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
        },
      },
    });

    await vi.dynamicImportSettled();
    await Promise.resolve();
    await nextTick();

    expect(observeMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Accept & Hide');

    const acceptButton = wrapper.find('.s-button-stub');
    expect(acceptButton.attributes('data-loading')).toBe('false');

    await acceptButton.trigger('click');
    expect(wrapper.find('.s-button-stub').attributes('data-loading')).toBe('false');

    expect(setUserDisclaimerApproveMock).toHaveBeenCalledTimes(1);
    expect(setDisclaimerDialogVisibilityMock).toHaveBeenCalledTimes(1);
    expect(setDisclaimerDialogVisibilityMock).toHaveBeenCalledWith(false);
  });

  it('falls back to timed activation when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const component = (await import('@/components/App/Header/AppDisclaimer.vue')).default;
    const wrapper = mount(component, {
      global: {
        stubs: {
          's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
        },
      },
    });

    await vi.dynamicImportSettled();
    await Promise.resolve();
    await nextTick();

    expect(observeMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Accept & Hide');
  });

  it('shows close button when disclaimer already approved', async () => {
    settingsStoreMock.userDisclaimerApprove = true;

    const component = (await import('@/components/App/Header/AppDisclaimer.vue')).default;
    const wrapper = mount(component, {
      global: {
        stubs: {
          's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
        },
      },
    });

    await wrapper.find('.s-icon-stub').trigger('click');

    expect(wrapper.find('.s-button-stub').exists()).toBe(false);
    expect(setDisclaimerDialogVisibilityMock).toHaveBeenCalledTimes(1);
    expect(setDisclaimerDialogVisibilityMock).toHaveBeenCalledWith(false);
  });

  it('allows overlay dismissal only after the disclaimer was already approved', async () => {
    settingsStoreMock.userDisclaimerApprove = true;

    const component = (await import('@/components/App/Header/AppDisclaimer.vue')).default;
    const wrapper = mount(component, {
      global: {
        stubs: {
          's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
        },
      },
    });

    await vi.dynamicImportSettled();
    await Promise.resolve();
    await nextTick();

    const modalProps = modalPropsSnapshots.at(-1);

    expect(modalProps?.showOverlay).toBe(true);
    expect(modalProps?.teleportTo).toBe(null);
    expect(modalProps?.absolute).toBe(true);
    expect(modalProps?.closeOnOverlayClick).toBe(true);
    expect(modalProps?.closeOnEsc).toBe(true);

    await wrapper.get('[data-testid="overlay"]').trigger('click');
    expect(setDisclaimerDialogVisibilityMock).toHaveBeenCalledTimes(1);
    expect(setDisclaimerDialogVisibilityMock).toHaveBeenCalledWith(false);
  });
});
