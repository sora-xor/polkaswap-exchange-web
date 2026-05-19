import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

const makeValidator = (address: string): ValidatorInfoFull =>
  ({
    address,
    apy: '12',
  }) as unknown as ValidatorInfoFull;

const StakingHeaderStub = defineComponent({
  name: 'StakingHeaderStub',
  props: {
    previousPage: { type: String, default: '' },
  },
  setup(_props, { slots }) {
    return () => h('header', { class: 'staking-header-stub' }, slots.default?.());
  },
});

const ValidatorsListStub = defineComponent({
  name: 'ValidatorsListStub',
  props: {
    selectedValidators: { type: Array, default: () => [] },
    showSelectionControls: { type: Boolean, default: false },
  },
  emits: ['update:selected'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          class: 'validators-list-stub',
          onClick: () => emit('update:selected', [...props.selectedValidators, makeValidator('clicked')]),
        },
        'validators-list'
      );
  },
});

const StakeDialogStub = defineComponent({
  name: 'StakeDialogStub',
  props: {
    visible: { type: Boolean, default: false },
    parentLoading: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'confirm'],
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'stake-dialog-stub',
          'data-visible': String(props.visible),
          'data-parent-loading': String(props.parentLoading),
        },
        'stake-dialog'
      );
  },
});

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  props: {
    disabled: { type: Boolean, default: false },
    type: { type: String, default: 'button' },
  },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          class: ['s-button-stub', attrs.class],
          type: props.type,
          disabled: props.disabled,
          onClick: (event: Event) => emit('click', event),
        },
        slots.default?.()
      );
  },
});

let modeRef: ReturnType<typeof ref<string>>;
let validatorsRef: ReturnType<typeof ref<ValidatorInfoFull[]>>;
let selectedValidatorsRef: ReturnType<typeof ref<ValidatorInfoFull[]>>;
let selectValidatorsMock: ReturnType<typeof vi.fn>;
let routerPushMock: ReturnType<typeof vi.fn>;
let loadingRef: ReturnType<typeof ref<boolean>>;

vi.mock('vue-i18n', () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
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

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

vi.mock('vue-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/modules/staking/sora/consts', () => ({
  __esModule: true,
  SoraStakingPageNames: {
    Overview: 'Overview',
    ValidatorsType: 'ValidatorsType',
  },
  StakeDialogMode: {
    NEW: 'new',
  },
  ValidatorsListMode: {
    RECOMMENDED: 'recommended',
    SELECT: 'select',
  },
}));

vi.mock('@/modules/staking/sora/components/StakingHeader.vue', () => ({
  __esModule: true,
  default: {
    name: 'StakingHeaderStub',
    props: {
      previousPage: { type: String, default: '' },
    },
    template: '<header class="staking-header-stub"><slot /></header>',
  },
}));

vi.mock('@/modules/staking/sora/components/ValidatorsList.vue', () => ({
  __esModule: true,
  default: {
    name: 'ValidatorsListStub',
    props: {
      selectedValidators: { type: Array, default: () => [] },
      showSelectionControls: { type: Boolean, default: false },
    },
    emits: ['update:selected'],
    template:
      '<div class="validators-list-stub" :data-show-selection-controls="String(showSelectionControls)">validators-list</div>',
  },
}));

vi.mock('@/modules/staking/sora/components/StakeDialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'StakeDialogStub',
    props: {
      visible: { type: Boolean, default: false },
      parentLoading: { type: Boolean, default: false },
    },
    emits: ['update:visible', 'confirm'],
    template:
      '<div class="stake-dialog-stub" :data-visible="String(visible)" :data-parent-loading="String(parentLoading)">stake-dialog</div>',
  },
}));

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    newStakeValidatorsMode: computed(() => modeRef.value),
    validators: computed(() => validatorsRef.value),
    selectedValidators: computed(() => selectedValidatorsRef.value),
    selectValidators: (value: ValidatorInfoFull[]) => {
      selectValidatorsMock(value);
      selectedValidatorsRef.value = value;
    },
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: loadingRef,
  }),
}));

import SelectValidators from '@/features/staking/pages/SoraSelectValidatorsPage.vue';

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SelectValidators, {
    props,
    global: {
      stubs: {
        's-button': SButtonStub,
        SButton: SButtonStub,
      },
      directives: {
        loading: vi.fn(),
      },
    },
  });

describe('SelectValidators.vue', () => {
  beforeEach(() => {
    modeRef = ref('recommended');
    validatorsRef = ref([makeValidator('A'), makeValidator('B')]);
    selectedValidatorsRef = ref([]);
    selectValidatorsMock = vi.fn();
    routerPushMock = vi.fn();
    loadingRef = ref(false);
  });

  it('renders recommended mode title and disables confirmation without selection', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      title: string;
      confirmText: string;
      confirmDisabled: boolean;
    };

    expect(vm.title).toBe('soraStaking.validators.recommended');
    expect(vm.confirmText).toBe('soraStaking.validators.next');
    expect(vm.confirmDisabled).toBe(true);
    expect(wrapper.classes()).toContain('container--validator-select');
    expect(wrapper.findComponent({ name: 'ValidatorsListStub' }).props('showSelectionControls')).toBe(true);
  });

  it('updates selection and confirmation text in manual mode', async () => {
    modeRef.value = 'select';
    const wrapper = mountComponent();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      confirmText: string;
      confirmDisabled: boolean;
    };

    expect(vm.confirmText).toBe('soraStaking.validators.selected:{"selected":0,"total":2}');
    expect(vm.confirmDisabled).toBe(true);

    const validatorsList = wrapper.findComponent({ name: 'ValidatorsListStub' });
    await validatorsList.vm.$emit('update:selected', [makeValidator('A')]);
    await flushPromises();

    expect(selectValidatorsMock).toHaveBeenCalled();
    expect(vm.confirmText).toBe('soraStaking.validators.selected:{"selected":1,"total":2}');
    expect(vm.confirmDisabled).toBe(false);
  });

  it('returns to a disabled confirmation state after an empty adversarial selection update', async () => {
    modeRef.value = 'select';
    selectedValidatorsRef.value = [makeValidator('A')];
    const wrapper = mountComponent();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      confirmText: string;
      confirmDisabled: boolean;
    };

    expect(vm.confirmDisabled).toBe(false);

    const validatorsList = wrapper.findComponent({ name: 'ValidatorsListStub' });
    await validatorsList.vm.$emit('update:selected', []);
    await flushPromises();

    expect(selectValidatorsMock).toHaveBeenCalledWith([]);
    expect(vm.confirmText).toBe('soraStaking.validators.selected:{"selected":0,"total":2}');
    expect(vm.confirmDisabled).toBe(true);
  });

  it('drops duplicate and stale validators from adversarial selection updates', async () => {
    modeRef.value = 'select';
    validatorsRef.value = [makeValidator('A'), makeValidator('B')];
    const wrapper = mountComponent();
    await flushPromises();

    const duplicateA = makeValidator('A');
    const validB = makeValidator('B');
    const stale = makeValidator('stale-validator');

    const validatorsList = wrapper.findComponent({ name: 'ValidatorsListStub' });
    await validatorsList.vm.$emit('update:selected', [duplicateA, stale, duplicateA, validB]);
    await flushPromises();

    expect(selectValidatorsMock).toHaveBeenCalledWith([duplicateA, validB]);
  });

  it('treats non-array adversarial selection updates as empty', async () => {
    modeRef.value = 'select';
    selectedValidatorsRef.value = [makeValidator('A')];
    const wrapper = mountComponent();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      confirmDisabled: boolean;
    };

    const validatorsList = wrapper.findComponent({ name: 'ValidatorsListStub' });
    await validatorsList.vm.$emit('update:selected', null);
    await flushPromises();

    expect(selectValidatorsMock).toHaveBeenCalledWith([]);
    expect(vm.confirmDisabled).toBe(true);
  });

  it('drops malformed validator entries from adversarial selection updates', async () => {
    modeRef.value = 'select';
    validatorsRef.value = [makeValidator('A'), makeValidator('B')];
    const wrapper = mountComponent();
    await flushPromises();

    const validA = makeValidator('A');
    const validB = makeValidator('B');
    const malformedPayload = [
      null,
      { address: '' },
      { address: 12 },
      { foo: 'bar' },
      validA,
      validB,
    ] as unknown as ValidatorInfoFull[];

    const validatorsList = wrapper.findComponent({ name: 'ValidatorsListStub' });
    await validatorsList.vm.$emit('update:selected', malformedPayload);
    await flushPromises();

    expect(selectValidatorsMock).toHaveBeenCalledWith([validA, validB]);
  });

  it('keeps the validators list visible while parent subscriptions refresh existing validators', async () => {
    const wrapper = mountComponent({ parentLoading: true });
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      containerLoading: boolean;
    };

    expect(vm.containerLoading).toBe(false);

    validatorsRef.value = [];
    await flushPromises();

    expect(vm.containerLoading).toBe(true);
  });

  it('opens the stake dialog and navigates on confirm', async () => {
    selectedValidatorsRef.value = [makeValidator('A')];
    const wrapper = mountComponent({ parentLoading: true });
    await flushPromises();

    const vm = wrapper.vm as unknown as { handleConfirm: () => void; showStakeDialog: boolean };
    vm.handleConfirm();
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(vm.showStakeDialog).toBe(true);
    expect(wrapper.find('.stake-dialog-stub').attributes('data-parent-loading')).toBe('true');

    await wrapper.findComponent({ name: 'StakeDialogStub' }).vm.$emit('confirm');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(routerPushMock).toHaveBeenCalledWith({ name: 'Overview' });
    expect(vm.showStakeDialog).toBe(false);
  });
});
