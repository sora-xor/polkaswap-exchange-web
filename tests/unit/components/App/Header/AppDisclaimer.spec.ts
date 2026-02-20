import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

const {
  settingsStoreMock,
  setUserDisclaimerApproveMock,
  toggleDisclaimerDialogVisibilityMock,
  disconnectMock,
  observeMock,
} = vi.hoisted(() => {
  const setUserDisclaimerApproveMock = vi.fn();
  const toggleDisclaimerDialogVisibilityMock = vi.fn();
  const observeMock = vi.fn();
  const disconnectMock = vi.fn();

  const settingsStoreMock = {
    userDisclaimerApprove: false,
    setUserDisclaimerApprove: setUserDisclaimerApproveMock,
    toggleDisclaimerDialogVisibility: toggleDisclaimerDialogVisibilityMock,
  };

  return {
    settingsStoreMock,
    setUserDisclaimerApproveMock,
    toggleDisclaimerDialogVisibilityMock,
    disconnectMock,
    observeMock,
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

vi.mock('@/utils', () => ({
  delay: vi.fn(() => Promise.resolve()),
}));

describe('AppDisclaimer', () => {
  beforeEach(() => {
    settingsStoreMock.userDisclaimerApprove = false;
    setUserDisclaimerApproveMock.mockReset();
    toggleDisclaimerDialogVisibilityMock.mockReset();
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

    await wrapper.find('.s-button-stub').trigger('click');

    expect(setUserDisclaimerApproveMock).toHaveBeenCalledTimes(1);
    expect(toggleDisclaimerDialogVisibilityMock).toHaveBeenCalledTimes(1);
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
    expect(toggleDisclaimerDialogVisibilityMock).toHaveBeenCalledTimes(1);
  });
});
