import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref, type Component } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidatorsListMode } from '@/modules/staking/sora/consts';

const StakingHeaderStub = defineComponent({
  name: 'StakingHeaderStub',
  props: {
    previousPage: { type: String, default: '' },
  },
  setup(_, { slots }) {
    return () => h('header', { class: 'staking-header-stub' }, slots.default?.());
  },
});

const SelectValidatorsModeStub = defineComponent({
  name: 'SelectValidatorsModeStub',
  emits: ['recommended', 'selected'],
  setup(_, { emit }) {
    return () =>
      h('div', { class: 'validators-mode-stub' }, [
        h(
          'button',
          {
            class: 'recommended-button',
            onClick: () => emit('recommended'),
          },
          'recommended'
        ),
        h(
          'button',
          {
            class: 'selected-button',
            onClick: () => emit('selected'),
          },
          'selected'
        ),
      ]);
  },
});

const ValidatorsAttentionDialogStub = defineComponent({
  name: 'ValidatorsAttentionDialogStub',
  props: {
    visible: { type: Boolean, default: false },
    parentLoading: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'proceed'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          class: 'validators-dialog-stub',
          'data-visible': String(props.visible),
          'data-parent-loading': String(props.parentLoading),
          onClick: () => emit('proceed'),
        },
        'dialog'
      );
  },
});

let setValidatorsTypeMock: ReturnType<typeof vi.fn>;
let routerPushMock: ReturnType<typeof vi.fn>;
let loadingRef: ReturnType<typeof ref<boolean>>;

vi.mock('vue-i18n', () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
  createI18n: () => ({
    global: {
      t: (key: string) => key,
      te: () => false,
      tm: () => ({}),
      locale: { value: 'en' },
    },
  }),
}));

vi.mock('vue-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/modules/staking/router', () => ({
  __esModule: true,
  soraStakingLazyComponent: (name: string): Component => {
    switch (name) {
      case 'StakingHeader':
        return StakingHeaderStub;
      case 'ValidatorsAttentionDialog':
        return ValidatorsAttentionDialogStub;
      case 'SelectValidatorsMode':
      default:
        return SelectValidatorsModeStub;
    }
  },
}));

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    setValidatorsType: (mode: ValidatorsListMode) => setValidatorsTypeMock(mode),
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: loadingRef,
  }),
}));

import ValidatorsType from '@/modules/staking/sora/views/ValidatorsType.vue';

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(ValidatorsType, {
    props,
    global: {
      components: {
        StakingHeader: StakingHeaderStub,
        SelectValidatorsMode: SelectValidatorsModeStub,
        ValidatorsAttentionDialog: ValidatorsAttentionDialogStub,
      },
    },
  });

describe('ValidatorsType.vue', () => {
  beforeEach(() => {
    setValidatorsTypeMock = vi.fn();
    routerPushMock = vi.fn();
    loadingRef = ref(false);
  });

  it('opens dialog with recommended validators and sets mode', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.findComponent(SelectValidatorsModeStub).vm.$emit('recommended');
    await flushPromises();

    expect(setValidatorsTypeMock).toHaveBeenCalledWith(ValidatorsListMode.RECOMMENDED);
    expect((wrapper.vm as unknown as { showValidatorsAttentionDialog: boolean }).showValidatorsAttentionDialog).toBe(
      true
    );
  });

  it('opens dialog with manual selection and sets mode', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.findComponent(SelectValidatorsModeStub).vm.$emit('selected');
    await flushPromises();

    expect(setValidatorsTypeMock).toHaveBeenCalledWith(ValidatorsListMode.SELECT);
    expect((wrapper.vm as unknown as { showValidatorsAttentionDialog: boolean }).showValidatorsAttentionDialog).toBe(
      true
    );
  });

  it('navigates to select validators on proceed and uses parent loading flag', async () => {
    const wrapper = mountComponent({ parentLoading: true });
    await flushPromises();

    await wrapper.findComponent(SelectValidatorsModeStub).vm.$emit('recommended');
    await flushPromises();

    const dialog = wrapper.find('.validators-dialog-stub');
    expect(dialog.attributes('data-parent-loading')).toBe('true');

    await wrapper.findComponent(ValidatorsAttentionDialogStub).vm.$emit('proceed');
    await flushPromises();

    expect(routerPushMock).toHaveBeenCalledWith({ name: 'SelectValidators' });
    expect((wrapper.vm as unknown as { showValidatorsAttentionDialog: boolean }).showValidatorsAttentionDialog).toBe(
      false
    );
  });
});
