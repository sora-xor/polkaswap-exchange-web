import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

import CreateTokenDialog from '@/modules/dashboard/components/CreateTokenDialog.vue';

const storeStateMocks = vi.hoisted(() => ({
  networkFees: {
    RegisterAsset: '1',
  } as Record<string, string>,
  accountXor: { balance: { transferable: '10' } } as { balance: { transferable: string } } | null,
}));

const transactionMocks = vi.hoisted(() => ({
  loading: { value: false },
}));

const formattedAmountMocks = vi.hoisted(() => {
  const createFp = (input: string | number) => {
    const value = Number(input);
    return {
      value,
      sub(other: ReturnType<typeof createFp>) {
        return createFp(value - other.value);
      },
      isLtZero() {
        return value < 0;
      },
      toString() {
        return String(value);
      },
    };
  };

  return {
    getFPNumberFromCodec: vi.fn((input: string | number) => createFp(input)),
    formatCodecNumber: vi.fn((value: string) => `formatted-${value}`),
    getFiatAmountByCodecString: vi.fn((value: string) => `fiat-${value}`),
  };
});

const WALLET_CONSTS_STUB = vi.hoisted(() => ({
  TokenTabs: {
    Token: 'CreateSimpleToken',
    NonFungibleToken: 'CreateNftToken',
  },
  TranslationConsts: {},
}));

const dialogBaseStub = vi.hoisted(() => ({
  name: 'DialogBaseStub',
  inheritAttrs: false,
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible'],
  setup:
    (props: { visible: boolean }, { slots, attrs }) =>
    () =>
      h(
        'div',
        {
          class: 'dialog-base-stub',
          'data-visible': String(Boolean(props.visible)),
          ...attrs,
        },
        slots.default?.()
      ),
}));

const infoLineStub = vi.hoisted(() => ({
  name: 'InfoLineStub',
  setup: () => () => null,
}));

const tabComponentStub = vi.hoisted(() => ({
  name: 'TabComponentStub',
  template: '<div />',
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: dialogBaseStub,
      InfoLine: infoLineStub,
    },
    WALLET_CONSTS: WALLET_CONSTS_STUB,
  });
});

vi.mock('@/modules/dashboard/router', () => ({
  dashboardLazyComponent: () => tabComponentStub,
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      wallet: {
        settings: {
          get networkFees() {
            return storeStateMocks.networkFees;
          },
        },
      },
    },
    getters: {
      assets: {
        get xor() {
          return storeStateMocks.accountXor;
        },
      },
    },
  },
  __mocks: storeStateMocks,
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: transactionMocks.loading,
  }),
  __mocks: transactionMocks,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    TranslationConsts: { NFT: 'NFT' },
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => formattedAmountMocks,
  __mocks: formattedAmountMocks,
}));

let wrapperStoreState: typeof storeStateMocks;
let wrapperTransactionState: typeof transactionMocks;

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(CreateTokenDialog, {
    props: {
      visible: true,
      ...props,
    },
    global: {
      stubs: {
        's-tabs': {
          props: ['value'],
          emits: ['input'],
          template: '<div class="tabs"><slot /></div>',
        },
        's-tab': {
          props: ['label', 'name'],
          template: '<div class="tab">{{ label }}</div>',
        },
        's-button': {
          props: { disabled: { type: Boolean, default: false } },
          emits: ['click'],
          template: '<button class="action-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

beforeEach(() => {
  wrapperStoreState = storeStateMocks;
  wrapperTransactionState = transactionMocks;

  wrapperTransactionState.loading.value = false;
  wrapperStoreState.networkFees.RegisterAsset = '1';
  wrapperStoreState.accountXor = { balance: { transferable: '10' } };
});

describe('CreateTokenDialog.vue', () => {
  it('enables create button when fee is affordable', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    expect(exposed.disabled.value).toBe(false);
  });

  it('disables create button when xor balance is insufficient', () => {
    wrapperStoreState.networkFees.RegisterAsset = '20';
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    expect(exposed.disabled.value).toBe(true);
  });

  it('updates current tab via handler', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    expect(exposed.currentTab.value).toBe(WALLET_CONSTS_STUB.TokenTabs.Token);
    exposed.handleChangeTab(WALLET_CONSTS_STUB.TokenTabs.NonFungibleToken);
    expect(exposed.currentTab.value).toBe(WALLET_CONSTS_STUB.TokenTabs.NonFungibleToken);
  });

  // Visibility sync covered implicitly via parent usage; no direct assertion required here.
});
