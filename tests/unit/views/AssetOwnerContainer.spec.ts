import { mount } from '@vue/test-utils';
import type { Ref } from 'vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import AssetOwnerContainer from '@/views/AssetOwnerContainer.vue';
import { PageNames } from '@/consts';
import type { Nullable } from '@/types/common';

const routerViewStub = {
  name: 'RouterViewStub',
  props: {
    parentLoading: {
      type: Boolean,
      default: undefined,
    },
  },
  template: '<div class="router-view-stub" :data-parent-loading="String(parentLoading)"><slot /></div>',
};

vi.mock('@/store', () => {
  const subscribeOnOwnedAssets = vi.fn();
  const resetOwnedAssets = vi.fn();

  return {
    default: {
      dispatch: {
        dashboard: {
          subscribeOnOwnedAssets,
          reset: resetOwnedAssets,
        },
      },
    },
    __mocks: {
      subscribeOnOwnedAssets,
      resetOwnedAssets,
    },
  };
});

vi.mock('@/router', () => {
  const goTo = vi.fn();
  return {
    __esModule: true,
    goTo,
    lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
    __mocks: {
      goTo,
    },
  };
});

vi.mock('@/stores/settings', () => {
  const { ref } = require('vue') as typeof import('vue');
  const assetOwnerEnabledRef = ref<Nullable<boolean>>(true);

  return {
    useSettingsStore: () => ({
      get assetOwnerEnabled() {
        return assetOwnerEnabledRef.value;
      },
    }),
    __mocks: {
      assetOwnerEnabledRef,
    },
  };
});

vi.mock('@/composables/useSubscriptions', () => {
  const { ref } = require('vue') as typeof import('vue');
  const subscriptionsDataLoading = ref(false);
  const startHandlers: Array<(() => unknown) | undefined> = [];
  const resetHandlers: Array<(() => unknown) | undefined> = [];

  return {
    useSubscriptions: (
      options: {
        startSubscriptions?: Array<(() => unknown) | undefined>;
        resetSubscriptions?: Array<(() => unknown) | undefined>;
      } = {}
    ) => {
      startHandlers.splice(0, startHandlers.length, ...(options.startSubscriptions ?? []));
      resetHandlers.splice(0, resetHandlers.length, ...(options.resetSubscriptions ?? []));

      return {
        subscriptionsDataLoading,
      };
    },
    __mocks: {
      subscriptionsDataLoading,
      startHandlers,
      resetHandlers,
    },
  };
});

type StoreMocks = {
  subscribeOnOwnedAssets: ReturnType<typeof vi.fn>;
  resetOwnedAssets: ReturnType<typeof vi.fn>;
};

type SubscriptionsMocks = {
  subscriptionsDataLoading: Ref<boolean>;
  startHandlers: Array<(() => unknown) | undefined>;
  resetHandlers: Array<(() => unknown) | undefined>;
};

let storeMocks: StoreMocks;
let routerMocks: { goTo: ReturnType<typeof vi.fn> };
let subscriptionsMocks: SubscriptionsMocks;
let settingsMocks: { assetOwnerEnabledRef: Ref<Nullable<boolean>> };

beforeEach(async () => {
  storeMocks = (await import('@/store')).__mocks;
  routerMocks = (await import('@/router')).__mocks;
  subscriptionsMocks = (await import('@/composables/useSubscriptions')).__mocks;
  settingsMocks = (await import('@/stores/settings')).__mocks;

  storeMocks.subscribeOnOwnedAssets.mockClear();
  storeMocks.resetOwnedAssets.mockClear();
  routerMocks.goTo.mockClear();
  subscriptionsMocks.subscriptionsDataLoading.value = false;
  subscriptionsMocks.startHandlers.splice(0, subscriptionsMocks.startHandlers.length);
  subscriptionsMocks.resetHandlers.splice(0, subscriptionsMocks.resetHandlers.length);
  settingsMocks.assetOwnerEnabledRef.value = true;
});

describe('AssetOwnerContainer.vue', () => {
  it('binds loading state from subscriptions by default', async () => {
    subscriptionsMocks.subscriptionsDataLoading.value = true;

    const wrapper = mount(AssetOwnerContainer, {
      global: {
        directives: {
          loading: vi.fn(),
        },
        stubs: {
          'router-view': routerViewStub,
        },
      },
    });

    const routerView = wrapper.get('.router-view-stub');
    expect(routerView.attributes('data-parent-loading')).toBe('true');
    expect(subscriptionsMocks.startHandlers).toHaveLength(1);
    await subscriptionsMocks.startHandlers[0]?.();
    expect(storeMocks.subscribeOnOwnedAssets).toHaveBeenCalledTimes(1);
    expect(subscriptionsMocks.resetHandlers).toHaveLength(1);
    await subscriptionsMocks.resetHandlers[0]?.();
    expect(storeMocks.resetOwnedAssets).toHaveBeenCalledTimes(1);
  });

  it('allows parent provided parentLoading override', () => {
    subscriptionsMocks.subscriptionsDataLoading.value = true;

    const wrapper = mount(AssetOwnerContainer, {
      attrs: {
        parentLoading: false,
      },
      global: {
        directives: {
          loading: vi.fn(),
        },
        stubs: {
          'router-view': routerViewStub,
        },
      },
    });

    const routerView = wrapper.get('.router-view-stub');
    expect(routerView.attributes('data-parent-loading')).toBe('false');
  });

  it('redirects to swap when asset owner is disabled', () => {
    settingsMocks.assetOwnerEnabledRef.value = false;

    mount(AssetOwnerContainer, {
      global: {
        directives: {
          loading: vi.fn(),
        },
        stubs: {
          'router-view': routerViewStub,
        },
      },
    });

    expect(routerMocks.goTo).toHaveBeenCalledWith(PageNames.Swap);
  });
});
