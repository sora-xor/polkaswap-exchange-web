import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const filterStub = reactive({
  hasIdentity: false,
  notSlashed: false,
  notOversubscribed: false,
  twoValidatorsPerIdentity: false,
});

vi.mock('@/modules/staking/sora/consts', async () => {
  const actual = await vi.importActual<typeof import('@/modules/staking/sora/consts')>('@/modules/staking/sora/consts');
  return {
    __esModule: true,
    ...actual,
  };
});

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n');
  return {
    __esModule: true,
    ...actual,
    useI18n: () => ({
      t: (key: string) => {
        if (key === 'soraStaking.validatorsFilterDialog.filters') {
          return {
            hasIdentity: { name: 'Identity', description: 'has identity' },
            notSlashed: { name: 'Not slashed', description: 'not slashed' },
            notOversubscribed: { name: 'Not oversubscribed', description: 'not over' },
            twoValidatorsPerIdentity: { name: 'Two per identity', description: 'two per identity' },
          };
        }
        return key;
      },
    }),
  };
});

import ValidatorsFilterDialog from '@/modules/staking/sora/components/ValidatorsFilterDialog.vue';

const mountComponent = (overrides: Partial<{ visible: boolean }> = {}) =>
  mount(ValidatorsFilterDialog, {
    props: {
      visible: overrides.visible ?? true,
      filter: { ...filterStub },
    },
    global: {
      stubs: {
        'dialog-base': {
          template: '<div class="dialog-base-stub"><slot /></div>',
        },
        's-switch': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<button class="switch-stub" @click="$emit(\'update:modelValue\', !$props.modelValue)"></button>',
        },
      },
    },
  });

describe('ValidatorsFilterDialog.vue', () => {
  it('syncs filter when opened and emits save', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const api = wrapper.vm as unknown as {
      $: { exposed: { localFilter: typeof filterStub; save: () => void; resetAll: () => void } };
    };
    const local = api.$.exposed.localFilter;
    local.hasIdentity = true;

    api.$.exposed.save();
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ hasIdentity: true });
  });

  it('resets filters and closes when visible toggled', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const api = wrapper.vm as unknown as {
      $: { exposed: { localFilter: typeof filterStub; resetAll: () => void } };
    };
    api.$.exposed.resetAll();

    const local = api.$.exposed.localFilter;
    expect(local.hasIdentity).toBe(false);
  });
});
