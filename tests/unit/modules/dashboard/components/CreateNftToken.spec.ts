import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const formatterMocks = vi.hoisted(() => ({
  formatStringValue: vi.fn((value: string) => `formatted-${value}`),
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

import CreateNftToken from '@/modules/dashboard/components/CreateNftToken.vue';

const mountComponent = () =>
  mount(CreateNftToken, {
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

describe('CreateNftToken.vue', () => {
  it('computes disabled state and formats supply', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    expect(exposed.isCreateDisabled.value).toBe(true);

    exposed.tokenSymbol.value = 'NFT';
    exposed.tokenName.value = 'Collectible';
    exposed.tokenSupply.value = '1';

    await flushPromises();

    expect(exposed.isCreateDisabled.value).toBe(false);
    expect(exposed.formattedTokenSupply.value).toBe('formatted-1');
  });
});
