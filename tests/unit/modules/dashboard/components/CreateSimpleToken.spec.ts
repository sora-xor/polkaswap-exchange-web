import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const formatterMocks = vi.hoisted(() => ({
  formatStringValue: vi.fn((value: string) => `formatted-${value}`),
  getCorrectSupply: vi.fn((value: string) => `correct-${value}`),
}));

const walletMocks = vi.hoisted(() => ({
  registerAsset: vi.fn(async () => undefined),
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  __esModule: true,
  useNumberFormatter: () => formatterMocks,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      register: walletMocks.registerAsset,
    },
  },
}));

import CreateSimpleToken from '@/modules/dashboard/components/CreateSimpleToken.vue';

const mountComponent = () =>
  mount(CreateSimpleToken, {
    global: {
      stubs: {
        's-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input class="s-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        's-float-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input class="s-float-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        's-switch': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input type="checkbox" class="s-switch" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
      },
      directives: {
        maska: () => undefined,
      },
    },
  });

describe('CreateSimpleToken.vue', () => {
  beforeEach(() => {
    formatterMocks.getCorrectSupply.mockClear();
    walletMocks.registerAsset.mockClear();
  });

  it('computes disabled state and formats supply', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    expect(exposed.isCreateDisabled.value).toBe(true);

    exposed.tokenSymbol.value = 'AAA';
    exposed.tokenName.value = 'Token';
    exposed.tokenSupply.value = '10';

    await flushPromises();

    expect(exposed.isCreateDisabled.value).toBe(false);
    expect(exposed.formattedTokenSupply.value).toBe('formatted-10');
  });

  it('registers a simple token with normalized supply', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.tokenSymbol.value = 'TKN';
    exposed.tokenName.value = ' Token ';
    exposed.tokenSupply.value = '123.45';
    exposed.extensibleSupply.value = true;

    await flushPromises();
    await exposed.registerAsset();

    expect(formatterMocks.getCorrectSupply).toHaveBeenCalledWith('123.45', exposed.decimals);
    expect(walletMocks.registerAsset).toHaveBeenCalledWith('TKN', 'Token', 'correct-123.45', true);
  });
});
