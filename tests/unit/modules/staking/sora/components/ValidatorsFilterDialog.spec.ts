import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const filterStub = reactive({
  hasIdentity: false,
  notSlashed: false,
  notOversubscribed: false,
  twoValidatorsPerIdentity: false,
});

const translations: Record<string, string> = {
  'soraStaking.validatorsFilterDialog.filters.hasIdentity.name': 'Identity',
  'soraStaking.validatorsFilterDialog.filters.hasIdentity.description': 'has identity',
  'soraStaking.validatorsFilterDialog.filters.notSlashed.name': 'Not slashed',
  'soraStaking.validatorsFilterDialog.filters.notSlashed.description': 'not slashed',
  'soraStaking.validatorsFilterDialog.filters.notOversubscribed.name': 'Not oversubscribed',
  'soraStaking.validatorsFilterDialog.filters.notOversubscribed.description': 'not over',
  'soraStaking.validatorsFilterDialog.filters.twoValidatorsPerIdentity.name': 'Two per identity',
  'soraStaking.validatorsFilterDialog.filters.twoValidatorsPerIdentity.description': 'two per identity',
};

vi.mock('@/modules/staking/sora/consts', async () => {
  const actual = await vi.importActual<typeof import('@/modules/staking/sora/consts')>('@/modules/staking/sora/consts');
  return {
    __esModule: true,
    ...actual,
  };
});

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

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
  it('renders one translated row for each known filter', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const items = wrapper.findAll('.filter-item');

    expect(items).toHaveLength(4);
    expect(wrapper.text()).toContain('Identity');
    expect(wrapper.text()).toContain('has identity');
    expect(wrapper.text()).toContain('Two per identity');
    expect(wrapper.text()).not.toContain('soraStaking.validatorsFilterDialog.filters');
  });

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
