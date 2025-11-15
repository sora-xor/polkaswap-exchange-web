import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectMock = vi.fn();
const clearKeysMock = vi.fn();
const isLoggedInRef = ref(false);

const storeState = {
  soraCard: {
    wasEuroBalanceLoaded: true,
  },
};

const storeGetters = {
  soraCard: {
    isEuroBalanceEnough: true,
  },
};

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: storeState,
    getters: storeGetters,
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  __esModule: true,
  useInternalConnect: () => ({
    connectSoraWallet: connectMock,
    isLoggedIn: computed(() => isLoggedInRef.value),
  }),
}));

vi.mock('@/utils/card', () => ({
  __esModule: true,
  clearPayWingsKeysFromLocalStorage: clearKeysMock,
}));

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () => ({
    name: 'LazyStub',
    props: ['visible'],
    emits: ['update:visible'],
    template: '<div class="lazy-stub" v-if="visible"><slot /></div>',
  }),
}));

const IntroPage = (await import('@/components/pages/SoraCard/SoraCardIntroPage.vue')).default;

const mountComponent = (options: Record<string, unknown> = {}) =>
  mount(IntroPage, {
    props: {
      maintenance: false,
      ...options.props,
    },
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
        's-image': {
          name: 'SImageStub',
          props: ['src'],
          template: '<img :src="src" />',
        },
        's-scrollbar': {
          name: 'SScrollbarStub',
          template: '<div class="scrollbar"><slot /></div>',
        },
      },
      directives: {
        loading: () => undefined,
      },
    },
    ...options,
  });

describe('SoraCardIntroPage.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoggedInRef.value = false;
    storeState.soraCard.wasEuroBalanceLoaded = true;
    storeGetters.soraCard.isEuroBalanceEnough = true;
  });

  it('triggers wallet connection when user is logged out', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    wrapper.findComponent({ name: 'SButtonStub' }).vm.$emit('click');
    await flushPromises();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it('emits confirm-apply when user is logged in', async () => {
    isLoggedInRef.value = true;
    const wrapper = mountComponent();
    await flushPromises();

    wrapper.findComponent({ name: 'SButtonStub' }).vm.$emit('click');
    await flushPromises();

    expect(wrapper.emitted('confirm-apply')).toBeTruthy();
  });

  it('shows maintenance content when maintenance flag enabled', async () => {
    const wrapper = mountComponent({ props: { maintenance: true } });
    await flushPromises();

    expect(wrapper.text()).toContain('Web applications are under maintenance');
  });

  it('opens unsupported countries dialog', async () => {
    isLoggedInRef.value = true;
    const wrapper = mountComponent();
    await flushPromises();

    (wrapper.vm as unknown as { openList: () => void }).openList();
    await flushPromises();

    expect((wrapper.vm as unknown as { showListDialog: boolean }).showListDialog).toBe(true);
  });

  it('clears PayWings storage on mount', async () => {
    mountComponent();
    await flushPromises();

    expect(clearKeysMock).toHaveBeenCalledTimes(1);
  });
});
