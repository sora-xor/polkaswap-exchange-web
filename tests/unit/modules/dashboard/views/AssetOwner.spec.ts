import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, watch } from 'vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import AssetOwner from '@/modules/dashboard/views/AssetOwner.vue';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { setLegacyStoreOverride } from '@/utils/legacy-store';

const connectWalletMock = vi.fn();
const isLoggedInRef = ref(false);
const assetsStoreRef = ref<OwnedAsset[]>([]);
var routerPushMock: ReturnType<typeof vi.fn> | undefined;

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: isLoggedInRef,
    connectSoraWallet: connectWalletMock,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      TokenLogo: { name: 'TokenLogoStub', template: '<div><slot /></div>' },
      FormattedAmount: { name: 'FormattedAmountStub', template: '<div><slot /></div>' },
    },
  });
});

const dialogVisibleRef = ref(false);

vi.mock('@/modules/dashboard/router', () => ({
  dashboardLazyComponent: () =>
    defineComponent({
      name: 'CreateTokenDialogStub',
      props: {
        visible: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['update:visible'],
      setup(props) {
        watch(
          () => props.visible,
          (value) => {
            dialogVisibleRef.value = value;
          },
          { immediate: true }
        );
        return () => h('div');
      },
    }),
}));

vi.mock('@/router', () => {
  routerPushMock = vi.fn();
  return {
    __esModule: true,
    default: {
      push: routerPushMock,
    },
    lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
  };
});

const storeModule = vi.hoisted(() => {
  return {
    __esModule: true,
    default: {
      state: {},
      getters: {
        get libraryTheme() {
          return 'light';
        },
        get dashboard() {
          return { ownedAssets: assetsStoreRef.value };
        },
      },
    },
  };
});

vi.mock('@/store', () => storeModule);

const { default: store } = storeModule as { default: unknown };

const buttonStub = { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' };
const cardStub = { template: '<div v-bind="$attrs" @click="$emit(\'click\')"><slot /></div>' };

const globalStubs = {
  's-row': { template: '<div><slot /></div>' },
  SRow: { template: '<div><slot /></div>' },
  's-col': { template: '<div><slot /></div>' },
  SCol: { template: '<div><slot /></div>' },
  's-card': cardStub,
  SCard: cardStub,
  's-image': { template: '<img />' },
  SImage: { template: '<img />' },
  's-icon': { template: '<i />' },
  SIcon: { template: '<i />' },
  's-button': buttonStub,
  SButton: buttonStub,
  's-divider': { template: '<hr />' },
  SDivider: { template: '<hr />' },
};

describe('AssetOwner.vue', () => {
  beforeEach(() => {
    isLoggedInRef.value = false;
    assetsStoreRef.value = [];
    connectWalletMock.mockClear();
    routerPushMock?.mockClear();
    dialogVisibleRef.value = false;
    setLegacyStoreOverride(store as any);
  });

  it('flags empty asset state when logged out', () => {
    const wrapper = mount(AssetOwner, {
      global: { stubs: globalStubs },
    });

    expect(wrapper.html()).toContain('Create &amp; launch your token');
  });

  it('opens create token dialog when action handler is invoked', async () => {
    isLoggedInRef.value = true;
    const wrapper = mount(AssetOwner, {
      global: { stubs: globalStubs },
    });

    expect(dialogVisibleRef.value).toBe(false);

    const exposed = (wrapper.vm as any).$?.exposed!;
    expect(typeof exposed.handleCreateAsset).toBe('function');
    exposed.handleCreateAsset();
    await wrapper.vm.$nextTick();

    expect(exposed.showCreateTokenDialog.value).toBe(true);
  });

  it('navigates to asset details via handler', async () => {
    isLoggedInRef.value = true;
    assetsStoreRef.value = [
      {
        address: '0x01',
        name: 'Token',
        symbol: 'TKN',
        precision: 18,
        balance: {} as any,
      } as OwnedAsset,
    ];

    const wrapper = mount(AssetOwner, {
      global: { stubs: globalStubs },
    });

    const exposed = (wrapper.vm as any).$?.exposed!;
    exposed.handleOpenAssetDetails(assetsStoreRef.value[0]);
    await wrapper.vm.$nextTick();

    expect(routerPushMock).toBeDefined();
    expect(routerPushMock!).toHaveBeenCalledWith({
      name: 'AssetOwnerDetails',
      params: { asset: '0x01' },
    });
  });
});
