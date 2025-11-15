import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidatorsListMode } from '@/modules/staking/sora/consts';
import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

type Validator = {
  address: string;
  commission: string;
  apy: string;
  blocked?: boolean;
  isOversubscribed?: boolean;
  identity?: {
    info: {
      display?: string;
      image?: string;
    };
  };
};

const createValidator = (address: string, extra: Partial<Validator> = {}): Validator => ({
  address,
  commission: '100000000',
  apy: '12',
  ...extra,
});

const tMock = vi.fn((key: string) => key);

const validatorsRef = ref<Validator[]>([]);
const validatorsFilterRef = ref({
  hasIdentity: false,
  notSlashed: false,
  notOversubscribed: false,
  twoValidatorsPerIdentity: false,
});
const maxNominationsRef = ref<number | null>(null);
const stakingInfoRef = ref<{ myValidators: string[] } | null>({ myValidators: [] });
const setShowFiltersMock = vi.fn();
const setValidatorsFilterMock = vi.fn();

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAddress: defineComponent({
        name: 'FormattedAddressStub',
        props: {
          value: { type: String, required: true },
        },
        setup(props) {
          return () => h('span', { class: 'formatted-address-stub' }, props.value);
        },
      }),
    },
  });
});

vi.mock('@/modules/staking/router', () => {
  const ValidatorAvatarStub = defineComponent({
    name: 'ValidatorAvatarStub',
    props: {
      validator: { type: Object, required: true },
    },
    setup(props, { slots }) {
      return () =>
        h(
          'div',
          { class: 'validator-avatar-stub', 'data-address': (props.validator as Validator).address },
          slots.icon?.()
        );
    },
  });

  return {
    __esModule: true,
    soraStakingLazyComponent: () => ValidatorAvatarStub,
  };
});

vi.mock('vue-i18n', () => ({
  __esModule: true,
  useI18n: () => ({
    t: tMock,
  }),
}));

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    validators: computed(() => validatorsRef.value),
    validatorsFilter: computed(() => validatorsFilterRef.value),
    setShowValidatorsFilterDialog: setShowFiltersMock,
    setValidatorsFilter: setValidatorsFilterMock,
    maxNominations: computed(() => maxNominationsRef.value),
    stakingInfo: computed(() => stakingInfoRef.value),
  }),
}));

vi.mock('@/modules/staking/sora/composables/useValidatorsFormatting', () => ({
  __esModule: true,
  useValidatorsFormatting: () => ({
    formatName: (validator: Validator) => validator.identity?.info.display ?? validator.address,
    decodeName: (validator: Validator) => validator.identity?.info.display ?? validator.address,
    formatCommission: (value: string) => value,
    formatReturn: (value: string) => value,
  }),
}));

import ValidatorsList from '@/modules/staking/sora/components/ValidatorsList.vue';

const globalMountOptions = {
  stubs: {
    's-scrollbar': {
      template: '<div class="scrollbar-stub"><slot /></div>',
    },
    's-button': defineComponent({
      name: 'SButtonStub',
      inheritAttrs: false,
      emits: ['click'],
      setup(_, { attrs, emit, slots }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              class: ['s-button-stub', attrs.class],
              onClick: (event: Event) => emit('click', event),
            },
            slots.default?.()
          );
      },
    }),
    SButton: defineComponent({
      name: 'SButtonStubPascal',
      inheritAttrs: false,
      emits: ['click'],
      setup(_, { attrs, emit, slots }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              class: ['s-button-stub', attrs.class],
              onClick: (event: Event) => emit('click', event),
            },
            slots.default?.()
          );
      },
    }),
    's-tooltip': {
      template: '<span class="tooltip-stub"><slot /></span>',
    },
    's-icon': {
      template: '<span class="icon-stub" />',
    },
    's-input': defineComponent({
      name: 'SInputStub',
      inheritAttrs: false,
      props: {
        modelValue: { type: String, default: '' },
      },
      emits: ['update:modelValue'],
      setup(props, { emit, slots }) {
        return () =>
          h('div', { class: 'input-stub' }, [
            h('input', {
              value: props.modelValue,
              onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
            }),
            slots.right?.(),
          ]);
      },
    }),
    SInput: defineComponent({
      name: 'SInputStubPascal',
      inheritAttrs: false,
      props: {
        modelValue: { type: String, default: '' },
      },
      emits: ['update:modelValue'],
      setup(props, { emit, slots }) {
        return () =>
          h('div', { class: 'input-stub' }, [
            h('input', {
              value: props.modelValue,
              onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
            }),
            slots.right?.(),
          ]);
      },
    }),
  },
  directives: {
    button: vi.fn(),
  },
  config: {
    compilerOptions: {
      isCustomElement: (tag: string) => ['s-icon', 's-tooltip'].includes(tag),
    },
  },
};

const mountComponent = (props: Partial<{ mode: ValidatorsListMode; selectedValidators: Validator[] }> = {}) =>
  mount(ValidatorsList, {
    props: {
      mode: ValidatorsListMode.RECOMMENDED,
      selectedValidators: [],
      ...props,
    },
    global: globalMountOptions,
  });

const mountParentForSelect = () => {
  const Parent = defineComponent({
    components: { ValidatorsList },
    setup() {
      const selected = ref<Validator[]>([]);
      const handleUpdate = (value: Validator[]) => {
        selected.value = value;
      };
      return { selected, handleUpdate };
    },
    render() {
      return h(ValidatorsList, {
        mode: ValidatorsListMode.SELECT,
        selectedValidators: this.selected,
        'onUpdate:selected': this.handleUpdate,
      });
    },
  });

  return mount(Parent, { global: globalMountOptions });
};

describe('ValidatorsList.vue', () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'prefix', {
      configurable: true,
      get() {
        return undefined;
      },
      set() {},
    });
  });

  beforeEach(() => {
    validatorsRef.value = [createValidator('addr-1'), createValidator('addr-2'), createValidator('addr-3')];
    validatorsFilterRef.value = {
      hasIdentity: false,
      notSlashed: false,
      notOversubscribed: false,
      twoValidatorsPerIdentity: false,
    };
    maxNominationsRef.value = 2;
    stakingInfoRef.value = { myValidators: ['addr-1'] };
    setShowFiltersMock.mockClear();
    setValidatorsFilterMock.mockClear();
    tMock.mockImplementation((key: string) => key);
  });

  it('auto-selects recommended validators and limits by max nominations', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    const emitted = wrapper.emitted('update:selected');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toHaveLength(2);
    expect(setValidatorsFilterMock).toHaveBeenCalledWith(expect.objectContaining({ hasIdentity: false }));
  });

  it('emits selection in select mode', async () => {
    const wrapper = mountParentForSelect();
    await flushPromises();

    const list = wrapper.getComponent(ValidatorsList);

    await list.vm.toggleSelectValidator(validatorsRef.value[0] as ValidatorInfoFull);
    await flushPromises();

    const emitted = list.emitted('update:selected') ?? [];
    expect(emitted).toHaveLength(1);
    expect((emitted[0][0] as Validator[]).length).toBe(1);
  });

  it('opens filter dialog via exposed handler', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    wrapper.vm.openFilters();
    expect(setShowFiltersMock).toHaveBeenCalledWith(true);
  });
});
