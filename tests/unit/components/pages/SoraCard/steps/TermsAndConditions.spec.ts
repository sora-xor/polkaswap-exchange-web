import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { TosExternalLinks } from '@/consts';
import { Theme } from '@/consts/theme';

const storeStub = {
  getters: {
    get libraryTheme() {
      return Theme.LIGHT;
    },
  },
};

vi.mock('@/store', () => ({
  __esModule: true,
  default: storeStub,
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

vi.mock('@/utils', () => ({
  __esModule: true,
  delay: () => Promise.resolve(),
}));

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () => ({
    name: 'TosDialogStub',
    props: ['visible', 'srcLink', 'title'],
    emits: ['update:visible'],
    template: '<div class="tos-dialog-stub"></div>',
  }),
}));

const TermsAndConditions = (await import('@/components/pages/SoraCard/steps/TermsAndConditions.vue')).default;

const mountComponent = () =>
  mount(TermsAndConditions, {
    global: {
      stubs: {
        's-button': {
          name: 'SButtonStub',
          emits: ['click'],
          template: '<button class="s-button" @click="$emit(\'click\')"><slot /></button>',
        },
        's-icon': {
          name: 'SIconStub',
          template: '<span class="s-icon"></span>',
        },
      },
    },
  });

describe('TermsAndConditions.vue', () => {
  it('emits confirm when accepting terms', async () => {
    const wrapper = mountComponent();

    const button = wrapper.findComponent({ name: 'SButtonStub' });
    await button.vm.$emit('click', new Event('click') as unknown as Event);

    expect(wrapper.emitted('confirm')).toBeTruthy();
  });

  it('opens dialog with terms link', async () => {
    const wrapper = mountComponent();

    await (wrapper.vm as any).openDialog('t&c');
    await flushPromises();

    const links = TosExternalLinks.getLinks(Theme.LIGHT);
    expect((wrapper.vm as any).link).toBe(links.Terms);
    expect((wrapper.vm as any).dialogTitle).toBe('card.termsAndConditions');
    expect((wrapper.vm as any).showDialog).toBe(true);
  });

  it('opens dialog with privacy link', async () => {
    const wrapper = mountComponent();

    await (wrapper.vm as any).openDialog('privacyPolicy');
    await flushPromises();

    const links = TosExternalLinks.getLinks(Theme.LIGHT);
    expect((wrapper.vm as any).link).toBe(links.Privacy);
    expect((wrapper.vm as any).dialogTitle).toBe('card.privacyPolicy');
  });

  it('opens dialog without link for unsupported countries', async () => {
    const wrapper = mountComponent();

    await (wrapper.vm as any).openDialog('unsupported');
    await flushPromises();

    expect((wrapper.vm as any).link).toBe('');
    expect((wrapper.vm as any).dialogTitle).toBe('card.unsupportedCountries');
  });
});
